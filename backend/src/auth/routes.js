// Sign-in and account endpoints. Only the site itself (FRONTEND_ORIGIN) may call them with
// credentials; every request that changes something must come from that origin (CSRF guard on top
// of the SameSite cookie).
//   GET    /v1/auth/config    {enabled, clientId}         — whether to show "Sign in with Google"
//   POST   /v1/auth/google    {credential, termsAccepted: true} → {user} — verify Google's ID token,
//                             start a session; 400 terms_required unless the Terms box was ticked
//   POST   /v1/auth/signout                               — end this session
//   POST   /v1/auth/signout-all                           — end every session of this account
//   GET    /v1/me             {user} ({user: null} when signed out)
//   DELETE /v1/me                                         — delete the account and all its data
//   POST /v1/me/submissions/review {slug, design}         — the interviewer's review of a canvas design (Interview
//                                                           Questions), judged here; tech-katta-context/22 §12
//   POST   /v1/events         {visitor, device, events} → 204  — usage events for analysis (events.js)
//   GET    /v1/admin/summary?days=7   analytics summary (admin accounts only; also readable from
//                                      ANALYTICS_ORIGIN, the dashboard at analytics.katta.cc)
//   GET    /v1/admin/audience.csv     Meta Custom Audience file of the accounts that opted in (admin)
//   POST   /v1/me/submissions {slug, design, answer, hints} → the problem judged again here, stored (result
//                             only) → {verdict, passed, total, score, copied?, submissions, accepted, cheaperThan}
//                             (copied: the Solution tab's design unchanged; kept out of the stats)
//   GET    /v1/problems/stats per problem: submissions, accepted, solvers (public, cached a minute)
//   GET    /v1/me/lab         Lab data (designs, deletions, progress)
//   POST   /v1/me/lab         Lab data in → merged Lab data out (merge.js rules)
import { canvasEvidence, canvasProblem } from '../../../frontend/src/v3/adapters/eval.js';
import { runReview } from '../ai/jobs/review.js';
import { mergeLab } from '../../../frontend/src/lab/merge.js';
import { cleanDesign } from '../../../frontend/src/lab/store.js';
import { judge, gradeAnswer, score, sameDesign } from '../../../frontend/src/judge/judge.js';
import { AuthError, SESSION_DAYS, errorKind } from './index.js';
import { cleanBatch } from './events.js';
import { audienceCsv } from './audience.js';
import { JudgeError } from './judge-pool.js';

export const COOKIE = 'tk_session';
// Request bodies: a Lab sync can be big (many designs); everything else is a few hundred bytes.
const MAX_BODY = 2 * 1024 * 1024, SMALL_BODY = 64 * 1024;
// JSON never needs to run as a page; this stops it if it's ever opened as one.
export const JSON_CSP = "default-src 'none'; frame-ancestors 'none'";
// The visitor's address, for rate limits: the first of these request headers that is set, else the socket.
// On the VPS (the default) Nginx sets X-Real-IP from Cloudflare's CF-Connecting-IP, and only Cloudflare can
// reach the VPS (UFW), so neither can be set by a visitor; the socket is always Nginx (127.0.0.1).
// On another host, CLIENT_IP_HEADERS (comma separated) names the header its own proxy sets and a visitor
// can't, e.g. "cf-connecting-ip" when only Cloudflare is in front (see HOSTING.md).
export const DEFAULT_IP_HEADERS = 'x-real-ip,cf-connecting-ip';
export const ipReader = (list = DEFAULT_IP_HEADERS) => {
  const names = String(list).split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  return (request) => {
    for (const name of names) { const value = request.headers[name]; if (value) return String(value); }
    return String(request.socket?.remoteAddress || '?');
  };
};
export const clientIp = ipReader(process.env.CLIENT_IP_HEADERS || DEFAULT_IP_HEADERS);

// A few requests per key per window. Expired windows are swept out when the map is full. If it is
// still full of live windows (a flood of new addresses), new keys are refused until windows expire;
// keys already counted are never forgotten, so a flood can't reset an attacker's own count. (It used
// to clear the whole map at 10,000 keys.) limit(key, max, windowMs) → true when over the limit.
export function makeLimiter({ maxKeys = 100_000, now = () => Date.now() } = {}) {
  const hits = new Map(); let sweptAt = -Infinity;
  return function limit(key, max, windowMs) {
    const t = now(), h = hits.get(key);
    if (h && t - h.start <= windowMs) { h.n += 1; return h.n > max; }
    if (!h && hits.size >= maxKeys) {
      // sweep at most once a second, so a flood can't make every request scan the whole map
      if (t - sweptAt >= 1_000) { sweptAt = t; for (const [k, v] of hits) if (t - v.start > v.windowMs) hits.delete(k); }
      if (hits.size >= maxKeys) return true;
    }
    hits.set(key, { start: t, n: 1, windowMs }); return false;
  };
}

// What a visitor wrote in the answer steps, cut to sensible sizes before it is graded (never stored).
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
export function cleanAnswer(a) {
  const o = a && typeof a === 'object' ? a : {};
  const map = (m, keys) => Object.fromEntries(Object.entries(m && typeof m === 'object' ? m : {}).filter(([k]) => /^[a-zA-Z0-9-]{1,40}$/.test(k)).slice(0, keys).map(([k, v]) => [k, str(v, 40)]));
  // key decisions: {id: index of the chosen option}
  const decisions = Object.fromEntries(Object.entries(o.decisions && typeof o.decisions === 'object' ? o.decisions : {}).filter(([k, v]) => /^[a-zA-Z0-9-]{1,40}$/.test(k) && Number.isInteger(v) && v >= 0 && v < 10).slice(0, 12));
  return { fr: str(o.fr, 4000), nfr: map(o.nfr, 10), est: map(o.est, 10), decisions, api: (Array.isArray(o.api) ? o.api : []).slice(0, 30).map((x) => ({ method: str(x?.method, 8), path: str(x?.path, 200) })) };
}

// Every path accountRoutes answers; the server sends exactly these here (and nothing else).
export const ACCOUNT_PATHS = new Set(['/v1/admin/summary', '/v1/admin/audience.csv', '/v1/auth/config', '/v1/auth/google', '/v1/auth/signout', '/v1/auth/signout-all', '/v1/events', '/v1/me', '/v1/me/lab', '/v1/me/submissions', '/v1/me/submissions/review', '/v1/problems/stats']);

// A canvas design's evidence pack built in place, for callers without a pool (judge-worker.js task "evidence").
const evidenceInline = async ({ design, lab, practice, article }) => ({ judged: canvasEvidence(judge(design, lab, practice), article) });
// A design judged in place: what judge-pool.js does on a worker thread, for callers without a pool (tests).
const judgeInline = async ({ design, lab, practice }) => ({ judged: judge(design, lab, practice), copied: sameDesign(design, practice.reference && cleanDesign(practice.v === 2 ? { ...practice.reference, v: 2 } : practice.reference, lab, 'reference')) });

export function accountRoutes({ enabled, clientId, accounts, verify, labCatalogue, practiceFor = () => null, articleFor = () => null, judgeDesign = judgeInline, judgeEvidence = evidenceInline, ai = null, allowedOrigin, analyticsOrigin = '', secureCookie = true, log = console }) {
  const limiter = makeLimiter();
  const judging = new Set(); // accounts with a design being judged now
  const limited = (request, bucket, max, windowMs) => limiter(`${bucket}:${clientIp(request)}`, max, windowMs);
  // the site, and (for reading only) the owner's analytics dashboard
  const readers = new Set([allowedOrigin, analyticsOrigin].filter(Boolean));
  const cors = (request) => (readers.has(request.headers.origin)
    ? { 'Access-Control-Allow-Origin': request.headers.origin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : {});
  const send = (request, response, status, body, extra = {}) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': JSON_CSP, ...cors(request), ...extra });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
  };
  const cookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`;
  const tokenOf = (request) => {
    for (const part of String(request.headers.cookie || '').split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === COOKIE) return v.join('=');
    }
    return null;
  };
  const readJson = (request, limit = SMALL_BODY) => new Promise((resolve, reject) => {
    // Over the limit, the rest is read and thrown away, so the client gets a clean 413.
    let size = 0, over = Number(request.headers['content-length']) > limit; const chunks = [];
    request.on('data', (c) => { size += c.length; if (size > limit) over = true; if (!over) chunks.push(c); });
    request.on('end', () => { if (over) return reject(new AuthError('too_large')); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new AuthError('bad_json')); } });
    request.on('error', reject);
  });
  // Lab data as stored: only real challenge ids for stars/goals, only "tour:…", "practice:<slug>" and
  // "solved:<slug>" flags (keys become
  // MongoDB field names, so nothing else gets through).
  const storable = (data) => {
    const ids = new Set((labCatalogue().challenges || []).map((c) => c.id));
    const pick = (o, ok) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => ok(k)));
    return { ...data, progress: { steps: pick(data.progress.steps, (k) => /^tour:[a-z-]{1,40}$/.test(k) || /^(practice|solved):[a-z0-9][a-z0-9-]{0,63}$/.test(k)), stars: pick(data.progress.stars, (k) => ids.has(k)), goals: pick(data.progress.goals, (k) => ids.has(k)) } };
  };

  return async function handle(request, response, pathname) {
    const method = request.method || 'GET';
    if (method === 'OPTIONS') {
      response.writeHead(204, { ...cors(request), 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
      response.end(); return;
    }
    if (pathname === '/v1/auth/config') {
      if (method !== 'GET' && method !== 'HEAD') return send(request, response, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD, OPTIONS' });
      return send(request, response, 200, enabled ? { enabled: true, clientId } : { enabled: false });
    }
    if (pathname === '/v1/problems/stats') {
      if (method !== 'GET' && method !== 'HEAD') return send(request, response, 405, { error: 'method_not_allowed' }, { Allow: 'GET, HEAD, OPTIONS' });
      if (!enabled) return send(request, response, 200, { problems: {} });
      try { return send(request, response, 200, { problems: await accounts.problemStats() }, { 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' }); }
      catch (error) { log.error('Problem stats failed:', errorKind(error)); return send(request, response, 200, { problems: {} }); }
    }
    if (!enabled) return send(request, response, 503, { error: 'sign_in_not_configured' });
    if (method !== 'GET' && method !== 'HEAD' && request.headers.origin !== allowedOrigin) return send(request, response, 403, { error: 'bad_origin' });
    try {
      if (pathname === '/v1/auth/google' && method === 'POST') {
        if (limited(request, 'signin', 30, 10 * 60_000)) return send(request, response, 429, { error: 'too_many_requests' });
        const body = await readJson(request);
        if (body?.termsAccepted !== true) return send(request, response, 400, { error: 'terms_required' });
        const profile = await verify(body?.credential);
        // signing in again in this browser replaces its session; the old one ends rather than lingering
        const previous = tokenOf(request);
        if (previous) await accounts.signOut(previous);
        const cc = String(request.headers['cf-ipcountry'] || '').toUpperCase();
        const { token, user } = await accounts.signIn(profile, { country: /^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1' ? cc : '' });
        return send(request, response, 200, { user }, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86_400) });
      }
      if (pathname === '/v1/auth/signout' && method === 'POST') {
        await accounts.signOut(tokenOf(request));
        return send(request, response, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      const token = tokenOf(request), me = await accounts.userFor(token);
      // a renewed session gets a renewed cookie, so it lasts as long in the browser as on the server
      if (me?.renewedUntil) response.setHeader('Set-Cookie', cookie(token, Math.floor((me.renewedUntil.getTime() - Date.now()) / 1000)));
      if (pathname === '/v1/events' && method === 'POST') {
        if (limited(request, 'events', 60, 60_000)) return send(request, response, 429, { error: 'too_many_requests' });
        await accounts.logEvents(cleanBatch(await readJson(request), { userId: me ? me.id : null }));
        response.writeHead(204, { 'Cache-Control': 'no-store', ...cors(request) }); response.end(); return;
      }
      if (pathname === '/v1/me' && (method === 'GET' || method === 'HEAD')) return send(request, response, 200, { user: me ? me.user : null });
      if (!me) return send(request, response, 401, { error: 'signed_out' });
      if (pathname === '/v1/admin/summary' || pathname === '/v1/admin/audience.csv') {
        if (!me.user.admin) return send(request, response, 403, { error: 'not_admin' });
        if (method !== 'GET') return send(request, response, 405, { error: 'method_not_allowed' }, { Allow: 'GET' });
        if (pathname === '/v1/admin/summary') {
          const days = Math.min(Math.max(Math.round(Number(new URL(request.url || '/', 'http://x').searchParams.get('days')) || 7), 1), 395);
          return send(request, response, 200, await accounts.summary(days));
        }
        const csv = audienceCsv(await accounts.consentedUsers());
        response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="tech-katta-meta-audience.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors(request) });
        response.end(csv); return;
      }
      if (pathname === '/v1/auth/signout-all' && method === 'POST') {
        const ended = await accounts.signOutAll(me.id);
        return send(request, response, 200, { ok: true, ended }, { 'Set-Cookie': cookie('', 0) });
      }
      if (pathname === '/v1/me' && method === 'DELETE') {
        await accounts.deleteAccount(me.id);
        return send(request, response, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      if (pathname === '/v1/me/submissions' && method === 'POST') {
        if (limited(request, 'submit', 30, 10 * 60_000)) return send(request, response, 429, { error: 'too_many_requests' });
        const b = await readJson(request, 256 * 1024);
        const slug = typeof b?.slug === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(b.slug) ? b.slug : null;
        const practice = slug && practiceFor(slug);
        if (!practice) return send(request, response, 404, { error: 'no_such_problem' });
        const lab = labCatalogue();
        // a v2 problem's design keeps its v2 settings (zones, TTL, structures, arrows' carries) when cleaned
        const design = cleanDesign(practice.v === 2 && b.design && typeof b.design === 'object' ? { ...b.design, v: 2 } : b.design, lab, 'submitted');
        if (!design) return send(request, response, 400, { error: 'bad_design' });
        const hints = Number.isInteger(b.hints) && b.hints >= 0 && b.hints <= 50 ? b.hints : 0;
        // judged again here, the same way the page did, so the stored result can't be made up in a browser;
        // off the API's thread (judge-pool.js). `copied`: the Solution tab's design, copied unchanged:
        // stored, but it isn't counted in anyone's stats. The wrong designs are only for calibration.
        // One design judged at a time per account: a second Submit while the first is being judged gets a 429,
        // so one account can't fill the shared queue and keep everyone else's submissions from being recorded.
        const account = String(me.id);
        if (judging.has(account)) return send(request, response, 429, { error: 'judge_in_progress' });
        const { wrong, ...problem } = practice;
        judging.add(account);
        let judgedRun;
        try { judgedRun = await judgeDesign({ design, lab, practice: problem }); } finally { judging.delete(account); }
        const { judged: j, copied } = judgedRun;
        const g = gradeAnswer(cleanAnswer(b.answer), practice.rubric), sc = score(g, j, hints);
        const doc = { userId: me.id, slug, at: new Date(), verdict: j.verdict, passed: j.passed, total: j.total, score: sc.total, cost: j.metrics ? Math.round(j.metrics.avgMonthly) : null, p99: j.metrics ? Math.round(j.metrics.p99) : null, hints, ...(practice.v === 2 ? { engine: 2 } : {}), ...(copied ? { copied: true } : {}) };
        const stats = await accounts.addSubmission(doc);
        return send(request, response, 200, { verdict: j.verdict, passed: j.passed, total: j.total, score: sc.total, ...(copied ? { copied: true } : {}), ...stats });
      }
      // The interviewer on a canvas design (Interview Questions): judged here with every test, turned into the same
      // evidence pack as Practice (v3/adapters/eval.js), then the same review job, credits and cache (ai/jobs/review.js).
      if (pathname === '/v1/me/submissions/review' && method === 'POST') {
        if (limited(request, 'review', 5, 60_000)) return send(request, response, 429, { error: 'too_many_requests', message: 'Too many reviews at once. Wait a minute.' });
        const b = await readJson(request, 256 * 1024);
        const slug = typeof b?.slug === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(b.slug) ? b.slug : null;
        const practice = slug && practiceFor(slug), article = slug && articleFor(slug);
        if (!practice || !article) return send(request, response, 404, { error: 'no_such_problem' });
        const lab = labCatalogue();
        const design = cleanDesign(practice.v === 2 && b.design && typeof b.design === 'object' ? { ...b.design, v: 2 } : b.design, lab, 'submitted');
        if (!design) return send(request, response, 400, { error: 'bad_design' });
        const account = String(me.id);
        if (judging.has(account)) return send(request, response, 429, { error: 'judge_in_progress' });
        const { wrong, ...problem } = practice;
        judging.add(account);
        let pack;
        try { pack = (await judgeEvidence({ design, lab, practice: problem, article: { slug: article.slug } })).judged; } finally { judging.delete(account); }
        const off = { config: { enabled: false, monthly: 0, daily: 0 } }, noStore = { credits: async () => ({ month: { total: 0, used: 0, left: 0 }, day: { total: 0, used: 0, left: 0 } }) };
        const out = ai?.store ? await runReview({ pack, problem: canvasProblem(article), userId: me.id, ai, store: ai.store, log }) : await runReview({ pack, problem: canvasProblem(article), userId: me.id, ai: off, store: noStore, log });
        return send(request, response, 200, { slug, verdict: pack.verdict.word, passed: pack.verdict.passed, total: pack.verdict.total, ...out });
      }
      if (pathname === '/v1/me/lab' && method === 'GET') return send(request, response, 200, storable(mergeLab(await accounts.getLab(me.id), {}, labCatalogue())));
      if (pathname === '/v1/me/lab' && method === 'POST') {
        if (limited(request, 'lab', 120, 60_000)) return send(request, response, 429, { error: 'too_many_requests' });
        const incoming = await readJson(request, MAX_BODY);
        const merged = await accounts.updateLab(me.id, (stored) => storable(mergeLab(stored, incoming, labCatalogue())));
        return send(request, response, 200, merged);
      }
      return send(request, response, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof JudgeError) { log.error('Judging a submission failed:', error.code, error.detail || ''); return send(request, response, 503, { error: error.code }); }
      if (error instanceof AuthError) {
        const status = error.code === 'too_large' ? 413 : error.code === 'bad_json' ? 400 : error.code === 'keys_unavailable' ? 503 : 401;
        return send(request, response, status, { error: error.code });
      }
      log.error('Account request failed:', errorKind(error), error?.message || error);
      return send(request, response, 503, { error: 'accounts_unavailable' });
    }
  };
}

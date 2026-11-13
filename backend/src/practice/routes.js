// Practice, LeetCode style (tech-katta-context/21-PROBLEM-EXPERIENCE-LEETCODE-STYLE.md, sections 8, 10, 13–15, 21.7).
// All JSON; errors are {error: {code, message}}.
//   GET  /v1/practice/problems                       list (+ acceptance; + status when signed in)
//   GET  /v1/practice/problems/:slug                 the problem without hidden numbers, reference, wrong designs, editorial
//   POST /v1/practice/problems/:slug/submit {source} judged here, on every test, stored → the result (hidden detail stripped)
//   GET  /v1/practice/problems/:slug/submissions     the caller's, newest first (50)
//   GET  /v1/practice/submissions/:id                one of the caller's, with its source
//   GET  /v1/practice/problems/:slug/editorial       the editorial and the reference design (signed in)
//   GET  /v1/practice/problems/:slug/solutions       shared designs (signed in and solved)
//   POST /v1/practice/submissions/:id/share {note}   share one's own Accepted design
//   POST /v1/practice/submissions/:id/review         the interviewer's review of one's own submission, or the report's
//                                                    (tech-katta-context/22-EVALUATOR-V3.md §12, §17.1)
//   GET  /v1/practice/me/credits                     the caller's interviewer reviews left this month and today
// The server judges the source itself and never takes a verdict, cost or p99 from the browser.
import { createHash } from 'node:crypto';
import { judgeAll, stripHidden, JUDGE_VERSION } from '../../../frontend/src/tkd/judge.js';
import { canonical } from '../../../frontend/src/tkd/format.js';
import { publicProblem, summaryOf } from '../../../frontend/src/tkd/problem.js';
import { msg } from '../../../frontend/src/tkd/messages.js';
import { makeLimiter, clientIp, COOKIE, JSON_CSP } from '../auth/routes.js';
import { JudgeError } from '../auth/judge-pool.js';
import { MIN_COMPARE } from './store.js';
import { buildEvidence, redact } from '../../../frontend/src/v3/evidence.js';
import { runReview } from '../ai/jobs/review.js';

// Until payments exist every signed-in visitor is treated as paid (section 14).
export const PRACTICE_ALL_PAID = true;
export const MAX_SOURCE = 8000, RESULT_CACHE = 5000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/, ID = /^[0-9a-f]{24}$/;
const MESSAGES = {
  too_many_submissions: 'Too many submissions. Wait a minute.',
  too_many_requests: 'Too many requests. Wait a minute.',
  signed_out: 'Sign in to submit. Run works without an account.',
  not_found: "This problem doesn't exist.",
  bad_source: 'The design must be text of at most 8,000 characters.',
  bad_note: 'A note is text of at most 280 characters.',
  not_solved: 'Solve this problem to see how others did it.',
  paid: 'This problem is part of Tech Katta Plus.',
  judge_in_progress: 'Your last design is still being judged.',
  sign_in_not_configured: 'Sign-in is not available here.',
  bad_origin: 'Not allowed from this site.',
  unavailable: "Couldn't reach the judge. Your design is saved here; try again.",
  too_many_reviews: 'Too many reviews at once. Wait a minute.',
  method_not_allowed: 'Method not allowed.',
  too_large: 'The request is too large.',
  bad_json: 'The request is not valid JSON.',
};
const hash = (s) => createHash('sha256').update(s).digest('hex');
const NO_CREDITS = { month: { total: 0, used: 0, left: 0 }, day: { total: 0, used: 0, left: 0 } };
const NO_STORE = { credits: async () => NO_CREDITS };

// A small least-recently-used cache: the same design always gets the same result, so a repeat costs nothing.
export function lru(max) {
  const m = new Map();
  return { get(k) { if (!m.has(k)) return undefined; const v = m.get(k); m.delete(k); m.set(k, v); return v; }, set(k, v) { m.delete(k); m.set(k, v); if (m.size > max) m.delete(m.keys().next().value); }, get size() { return m.size; } };
}

// problems(): the loaded problems. accounts: userFor(token). store: openPractice(). judge(job) → {judged}: a worker
// pool (judge-pool.js with practice/judge-worker.js); without one, judged inline.
// evidence(job) → {judged: pack}: the same pool with task "evidence"; without one, built inline. ai: { config, client,
// store } (server.js); without it the review route answers with the report's review.
export function practiceRoutes({ problems, accounts, store, judge, evidence, ai, allowedOrigin, enabled, log = console }) {
  const limiter = makeLimiter(), cache = lru(RESULT_CACHE), judging = new Set();
  const runJudge = judge || (async ({ source, problem }) => ({ judged: judgeAll(source, problem, { all: true }) }));
  const runEvidence = evidence || (async ({ source, problem }) => ({ judged: buildEvidence(source, problem, { mode: 'submit' }) }));
  const cors = (request) => (request.headers.origin === allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : { 'Access-Control-Allow-Origin': '*' });
  const send = (request, response, status, body, extra = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': JSON_CSP, ...cors(request), ...extra });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
  };
  const fail = (request, response, status, code, extra) => send(request, response, status, { error: { code, message: MESSAGES[code] || code } }, extra);
  const tokenOf = (request) => { for (const part of String(request.headers.cookie || '').split(';')) { const [k, ...v] = part.trim().split('='); if (k === COOKIE) return v.join('='); } return null; };
  const me = async (request) => (enabled && accounts ? accounts.userFor(tokenOf(request)) : null);
  const readJson = (request, limit = 16 * 1024) => new Promise((resolve) => {
    let size = 0, over = Number(request.headers['content-length']) > limit; const chunks = [];
    request.on('data', (c) => { size += c.length; if (size > limit) over = true; if (!over) chunks.push(c); });
    request.on('end', () => { if (over) return resolve({ error: 'too_large' }); try { resolve({ body: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') }); } catch { resolve({ error: 'bad_json' }); } });
    request.on('error', () => resolve({ error: 'bad_json' }));
  });
  const find = (slug) => (SLUG.test(slug) ? problems().find((p) => p.slug === slug) || null : null);

  async function submit(request, response, problem) {
    if (!enabled) return fail(request, response, 503, 'sign_in_not_configured');
    if (request.headers.origin !== allowedOrigin) return fail(request, response, 403, 'bad_origin');
    const user = await me(request);
    if (!user) return fail(request, response, 401, 'signed_out');
    const account = String(user.id);
    if (limiter(`practice-submit:${account}`, 10, 60_000)) return fail(request, response, 429, 'too_many_submissions');
    const { body, error } = await readJson(request);
    if (error) return fail(request, response, error === 'too_large' ? 413 : 400, error);
    const source = body?.source;
    if (typeof source !== 'string' || source.length > MAX_SOURCE) return fail(request, response, 400, 'bad_source');
    if (!problem.free && !PRACTICE_ALL_PAID) return fail(request, response, 403, 'paid');
    if (judging.has(account)) return fail(request, response, 429, 'judge_in_progress');
    // one identity per design (22.10): whitespace and comments don't make a new design
    const canon = hash(canonical(source, problem)), key = hash(`${JUDGE_VERSION}:${problem.id}:${canon}`);
    let result = cache.get(key);
    if (!result) {
      judging.add(account);
      try { result = (await runJudge({ source, problem })).judged; }
      catch (e) {
        // a timeout or a crash inside the engine: a Judge Error, not counted, logged without the person (21.7)
        if (!(e instanceof JudgeError)) throw e;
        if (e.code === 'judge_busy' || e.code === 'judge_closed') return fail(request, response, 503, 'unavailable');
        result = { verdict: 'Judge Error', message: msg('judge_error'), passed: 0, total: problem.tests.length, judge_version: JUDGE_VERSION };
      } finally { judging.delete(account); }
      if (result.verdict !== 'Judge Error') cache.set(key, result);
    }
    if (result.verdict === 'Judge Error') {
      log.error('Practice judge error: problem %d, judge %d, design %s', problem.id, JUDGE_VERSION, canon.slice(0, 16));
      return send(request, response, 200, result);
    }
    const p99 = Number.isFinite(result.rank_p99_ms) ? result.rank_p99_ms : null;
    const id = await store.add({ user_id: user.id, problem_id: problem.id, source, canonical: canon, verdict: result.verdict, passed: result.passed, total: result.total, cost_inr: Number.isFinite(result.cost_inr) ? result.cost_inr : null, p99_ms: p99, judge_version: JUDGE_VERSION });
    const rank = result.verdict === 'Accepted' ? await store.rank(problem.id, user.id, result.cost_inr, p99) : null;
    return send(request, response, 200, { ...stripHidden(result, { full: PRACTICE_ALL_PAID || problem.free }), submission_id: id, rank });
  }

  // The interviewer's review of one's own submission (spec 22 §12, §17.1). The pack is built here from the stored
  // source with every test, then redacted: the interviewer and the browser see the same facts (V9).
  async function review(request, response, user, id) {
    if (limiter(`practice-review:${String(user.id)}`, 5, 60_000)) return fail(request, response, 429, 'too_many_reviews');
    const sub = await store.one(user.id, id);
    if (!sub) return fail(request, response, 404, 'not_found');
    const problem = problems().find((p) => p.id === sub.problem_id);
    if (!problem) return fail(request, response, 404, 'not_found');
    let pack;
    try { pack = redact((await runEvidence({ source: sub.source, problem })).judged); }
    catch (e) { if (e instanceof JudgeError) return fail(request, response, 503, 'unavailable'); throw e; }
    const out = ai?.store ? await runReview({ pack, problem, userId: user.id, ai, store: ai.store, log })
      : await runReview({ pack, problem, userId: user.id, ai: { config: { enabled: false, monthly: 0, daily: 0 } }, store: NO_STORE, log });
    return send(request, response, 200, { submission_id: id, verdict: sub.verdict, ...out });
  }

  return async function handle(request, response, pathname) {
    const method = request.method || 'GET';
    if (method === 'OPTIONS') {
      response.writeHead(204, { ...cors(request), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
      response.end(); return;
    }
    const parts = pathname.split('/').slice(3); // ['problems', slug, …] or ['submissions', id, …]
    const read = method === 'GET' || method === 'HEAD';
    try {
      if (parts[0] === 'problems' && parts.length === 1) {
        if (!read) return fail(request, response, 405, 'method_not_allowed', { Allow: 'GET, HEAD, OPTIONS' });
        const user = await me(request).catch(() => null);
        const [stats, status, streak] = await Promise.all([enabled && store ? store.stats().catch(() => ({})) : {}, user ? store.status(user.id).catch(() => ({})) : null, user ? store.streak(user.id).catch(() => 0) : null]);
        const list = problems().map((p) => {
          const s = stats[p.id];
          return { ...summaryOf(p), acceptance: s && s.submitted >= MIN_COMPARE ? Math.round((1000 * s.accepted) / s.submitted) / 10 : null, ...(status ? { status: status[p.id] || null } : {}) };
        });
        return send(request, response, 200, { problems: list, judge_version: JUDGE_VERSION, ...(user ? { streak } : {}) });
      }
      if (parts[0] === 'problems' && parts.length >= 2) {
        const problem = find(parts[1]);
        if (!problem) return fail(request, response, 404, 'not_found');
        const what = parts[2];
        if (parts.length === 2) {
          if (!read) return fail(request, response, 405, 'method_not_allowed', { Allow: 'GET, HEAD, OPTIONS' });
          return send(request, response, 200, publicProblem(problem), { 'Cache-Control': 'public, max-age=60' });
        }
        if (parts.length !== 3) return fail(request, response, 404, 'not_found');
        if (what === 'submit') { if (method !== 'POST') return fail(request, response, 405, 'method_not_allowed', { Allow: 'POST, OPTIONS' }); return await submit(request, response, problem); }
        if (!read) return fail(request, response, 405, 'method_not_allowed', { Allow: 'GET, HEAD, OPTIONS' });
        if (!enabled) return fail(request, response, 503, 'sign_in_not_configured');
        const user = await me(request);
        if (!user) return fail(request, response, 401, 'signed_out');
        if (what === 'submissions') {
          if (limiter(`practice-list:${String(user.id)}`, 60, 60_000)) return fail(request, response, 429, 'too_many_requests');
          return send(request, response, 200, { submissions: await store.list(user.id, problem.id) });
        }
        if (what === 'editorial') return send(request, response, 200, { editorial: problem.editorial, reference: problem.reference });
        if (what === 'solutions') {
          if (!(await store.solved(user.id, problem.id))) return fail(request, response, 403, 'not_solved');
          const by = new URL(request.url || '/', 'http://x').searchParams.get('sort') === 'speed' ? 'speed' : 'cost';
          return send(request, response, 200, { solutions: await store.solutions(problem.id, by) });
        }
        return fail(request, response, 404, 'not_found');
      }
      if (parts[0] === 'me' && parts[1] === 'credits' && parts.length === 2) {
        if (!read) return fail(request, response, 405, 'method_not_allowed', { Allow: 'GET, HEAD, OPTIONS' });
        if (!enabled) return fail(request, response, 503, 'sign_in_not_configured');
        const user = await me(request);
        if (!user) return fail(request, response, 401, 'signed_out');
        const c = ai?.config, on = !!(c?.enabled && ai?.store && (!c.allow || c.allow.has(String(user.id))));
        const credits = ai?.store ? await ai.store.credits(user.id, { monthly: c.monthly, daily: c.daily }) : NO_CREDITS;
        return send(request, response, 200, { enabled: on, ...(on && ai.client.preview ? { preview: true } : {}), ...credits });
      }
      if (parts[0] === 'submissions' && ID.test(parts[1] || '') && parts.length <= 3) {
        if (!enabled) return fail(request, response, 503, 'sign_in_not_configured');
        if (!read && request.headers.origin !== allowedOrigin) return fail(request, response, 403, 'bad_origin');
        const user = await me(request);
        if (!user) return fail(request, response, 401, 'signed_out');
        if (parts.length === 2) {
          if (!read) return fail(request, response, 405, 'method_not_allowed', { Allow: 'GET, HEAD, OPTIONS' });
          const s = await store.one(user.id, parts[1]);
          return s ? send(request, response, 200, s) : fail(request, response, 404, 'not_found');
        }
        if (parts[2] === 'review') { if (method !== 'POST') return fail(request, response, 405, 'method_not_allowed', { Allow: 'POST, OPTIONS' }); return await review(request, response, user, parts[1]); }
        if (parts[2] === 'share' && method === 'POST') {
          if (limited(request)) return fail(request, response, 429, 'too_many_requests');
          const { body, error } = await readJson(request);
          if (error) return fail(request, response, 400, error);
          const note = body?.note ?? '';
          if (typeof note !== 'string' || note.length > 280) return fail(request, response, 400, 'bad_note');
          return (await store.share(user.id, parts[1], note.trim())) ? send(request, response, 200, { ok: true }) : fail(request, response, 404, 'not_found');
        }
        return fail(request, response, 404, 'not_found');
      }
      return fail(request, response, 404, 'not_found');
    } catch (error) {
      log.error('Practice request failed:', error?.name || 'Error', error?.message || error);
      return fail(request, response, 503, 'unavailable');
    }
  };
  function limited(request) { return limiter(`practice-share:${clientIp(request)}`, 30, 60_000); }
}

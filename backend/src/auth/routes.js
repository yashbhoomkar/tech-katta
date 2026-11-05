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
//   POST   /v1/events         {visitor, device, events} → 204  — usage events for analysis (events.js)
//   POST   /v1/me/consent     {ads} → {user}               — opt in/out of Tech Katta ads on Facebook/Instagram
//   GET    /v1/me/lab         Lab data (designs, deletions, progress)
//   POST   /v1/me/lab         Lab data in → merged Lab data out (merge.js rules)
import { mergeLab } from '../../../frontend/src/lab/merge.js';
import { AuthError, SESSION_DAYS, errorKind } from './index.js';
import { cleanBatch } from './events.js';

export const COOKIE = 'tk_session';
const MAX_BODY = 2 * 1024 * 1024;

export function accountRoutes({ enabled, clientId, accounts, verify, labCatalogue, allowedOrigin, secureCookie = true, log = console }) {
  // a few requests per IP per window; Cloudflare puts the visitor's IP in CF-Connecting-IP
  const hits = new Map();
  const limited = (request, bucket, max, windowMs) => {
    const ip = String(request.headers['cf-connecting-ip'] || request.socket?.remoteAddress || '?');
    const key = `${bucket}:${ip}`, now = Date.now(), h = hits.get(key);
    if (!h || now - h.start > windowMs) { hits.set(key, { start: now, n: 1 }); if (hits.size > 10_000) hits.clear(); return false; }
    h.n += 1; return h.n > max;
  };
  const cors = (request) => (request.headers.origin === allowedOrigin
    ? { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' } : {});
  const send = (request, response, status, body, extra = {}) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...cors(request), ...extra });
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
  const readJson = (request) => new Promise((resolve, reject) => {
    // Over the limit, the rest is read and thrown away, so the client gets a clean 413.
    let size = 0, over = Number(request.headers['content-length']) > MAX_BODY; const chunks = [];
    request.on('data', (c) => { size += c.length; if (size > MAX_BODY) over = true; if (!over) chunks.push(c); });
    request.on('end', () => { if (over) return reject(new AuthError('too_large')); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new AuthError('bad_json')); } });
    request.on('error', reject);
  });
  // Lab data as stored: only real challenge ids for stars/goals, only "tour:…" flags (keys become
  // MongoDB field names, so nothing else gets through).
  const storable = (data) => {
    const ids = new Set((labCatalogue().challenges || []).map((c) => c.id));
    const pick = (o, ok) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => ok(k)));
    return { ...data, progress: { steps: pick(data.progress.steps, (k) => /^tour:[a-z-]{1,40}$/.test(k)), stars: pick(data.progress.stars, (k) => ids.has(k)), goals: pick(data.progress.goals, (k) => ids.has(k)) } };
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
        const { token, user } = await accounts.signIn(profile, { country: /^[A-Z]{2}$/.test(cc) && cc !== 'XX' && cc !== 'T1' ? cc : '', adsConsent: false });
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
      if (pathname === '/v1/auth/signout-all' && method === 'POST') {
        const ended = await accounts.signOutAll(me.id);
        return send(request, response, 200, { ok: true, ended }, { 'Set-Cookie': cookie('', 0) });
      }
      if (pathname === '/v1/me' && method === 'DELETE') {
        await accounts.deleteAccount(me.id);
        return send(request, response, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      if (pathname === '/v1/me/consent' && method === 'POST') {
        const b = await readJson(request);
        if (typeof b?.ads !== 'boolean') return send(request, response, 400, { error: 'bad_consent' });
        return send(request, response, 200, { user: await accounts.setAdsConsent(me.id, b.ads) });
      }
      if (pathname === '/v1/me/lab' && method === 'GET') return send(request, response, 200, storable(mergeLab(await accounts.getLab(me.id), {}, labCatalogue())));
      if (pathname === '/v1/me/lab' && method === 'POST') {
        if (limited(request, 'lab', 120, 60_000)) return send(request, response, 429, { error: 'too_many_requests' });
        const incoming = await readJson(request);
        const merged = await accounts.updateLab(me.id, (stored) => storable(mergeLab(stored, incoming, labCatalogue())));
        return send(request, response, 200, merged);
      }
      return send(request, response, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === 'too_large' ? 413 : error.code === 'bad_json' ? 400 : error.code === 'keys_unavailable' ? 503 : 401;
        return send(request, response, status, { error: error.code });
      }
      log.error('Account request failed:', errorKind(error), error?.message || error);
      return send(request, response, 503, { error: 'accounts_unavailable' });
    }
  };
}

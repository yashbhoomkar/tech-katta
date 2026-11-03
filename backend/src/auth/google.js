// Checks a "Sign in with Google" ID token without a client library: the token is a JWT signed by
// Google with RS256; its keys are published as a JWKS. A token is accepted only if
//   - its signature verifies with one of Google's current keys (kid in the header),
//   - it was issued by Google (iss), for this site (aud = our OAuth client ID),
//   - it hasn't expired (60 s of clock skew allowed) and wasn't issued in the future,
//   - it carries a Google account id (sub) and a verified email.
// Keys are cached for as long as Google's Cache-Control says (at most a day); an unknown kid refreshes
// them, but no more than once a minute.
import { createPublicKey, verify } from 'node:crypto';

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
export const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';

export class AuthError extends Error {
  constructor(code) { super(code); this.code = code; }
}

const part = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

export function googleVerifier({ clientId, jwksUrl = GOOGLE_JWKS, fetchImpl = fetch, now = () => Date.now() }) {
  let cache = { keys: new Map(), until: 0 }, lastRefresh = 0;
  async function keys(force) {
    if (!force && cache.until > now()) return cache.keys;
    if (force && now() - lastRefresh < 60_000) return cache.keys;
    lastRefresh = now();
    const res = await fetchImpl(jwksUrl);
    if (!res.ok) throw new AuthError('keys_unavailable');
    const body = await res.json();
    const map = new Map();
    for (const k of Array.isArray(body?.keys) ? body.keys : []) {
      if (k && k.kty === 'RSA' && typeof k.kid === 'string') { try { map.set(k.kid, createPublicKey({ key: k, format: 'jwk' })); } catch { /* skip a bad key */ } }
    }
    const age = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
    cache = { keys: map, until: now() + Math.min(86_400, age ? Number(age[1]) : 3_600) * 1000 };
    return map;
  }
  return async function verifyIdToken(token) {
    if (typeof token !== 'string' || token.length > 4096) throw new AuthError('bad_token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new AuthError('bad_token');
    let header, payload;
    try { header = part(parts[0]); payload = part(parts[1]); } catch { throw new AuthError('bad_token'); }
    if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string') throw new AuthError('bad_token');
    let key = (await keys(false)).get(header.kid);
    if (!key) key = (await keys(true)).get(header.kid);
    if (!key) throw new AuthError('unknown_key');
    const signed = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
    if (!signed) throw new AuthError('bad_signature');
    const t = now() / 1000;
    if (!payload || !ISSUERS.has(payload.iss)) throw new AuthError('bad_issuer');
    if (payload.aud !== clientId) throw new AuthError('bad_audience');
    if (!(typeof payload.exp === 'number' && payload.exp > t - 60)) throw new AuthError('expired');
    if (typeof payload.iat === 'number' && payload.iat > t + 300) throw new AuthError('bad_token');
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255) throw new AuthError('bad_token');
    if (typeof payload.email !== 'string' || payload.email_verified !== true) throw new AuthError('email_not_verified');
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    return { sub: payload.sub, email: str(payload.email, 320), name: str(payload.name, 120), picture: /^https:\/\//.test(payload.picture || '') ? str(payload.picture, 500) : '' };
  };
}

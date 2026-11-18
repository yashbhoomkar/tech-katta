// The sites allowed to call the API with the visitor's session (sign-in, account, practice): FRONTEND_ORIGIN, one
// origin or a comma-separated list (production: tech.katta.cc and the design prototype, prototype.katta.cc).
// Each must be an exact origin (scheme://host[:port], no path); matching is exact, never a pattern.
export const DEFAULT_ORIGINS = 'https://tech.katta.cc';

export function parseOrigins(value = DEFAULT_ORIGINS) {
  const list = String(value).split(',').map((s) => s.trim()).filter(Boolean);
  for (const o of list) {
    let u;
    try { u = new URL(o); } catch { throw new Error(`FRONTEND_ORIGIN: "${o}" is not a URL`); }
    if (!/^https?:$/.test(u.protocol) || u.origin !== o) throw new Error(`FRONTEND_ORIGIN: "${o}" must be an exact origin like https://tech.katta.cc`);
  }
  if (!list.length) throw new Error('FRONTEND_ORIGIN is empty');
  return list;
}

/** allowed(origin): whether a request's Origin header is one of the sites. Takes one origin or a list. */
export function originCheck(allowed) {
  const set = new Set(typeof allowed === 'string' ? [allowed] : [...(allowed || [])]);
  return (origin) => typeof origin === 'string' && set.has(origin);
}

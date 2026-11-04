// Sign-in with Google, accounts in MongoDB. Turned on only when all three settings exist
// (GitHub secrets, written to /etc/tech-katta/api.env on the VPS by the deploy):
//   GOOGLE_CLIENT_ID   OAuth client ID of the "Sign in with Google" web client (public)
//   MONGODB_URI        connection string of the Atlas database user for the API (secret)
//   SESSION_SECRET     at least 32 random characters, keys the stored session-token hashes (secret)
// Optional: ACCOUNTS_DB (default techkatta_app), GOOGLE_JWKS_URL (tests), COOKIE_SECURE=0 (local http).
// Not MONGODB_DB: an older backend on the VPS still sets that to its own database (`techkatta`).
export { AuthError, googleVerifier } from './google.js';
export { openAccounts, SESSION_DAYS, MAX_SESSION_DAYS, errorKind } from './accounts.js';

export function authConfig(env = process.env) {
  const clientId = (env.GOOGLE_CLIENT_ID || '').trim(), uri = (env.MONGODB_URI || '').trim(), secret = env.SESSION_SECRET || '';
  const missing = [!clientId && 'GOOGLE_CLIENT_ID', !uri && 'MONGODB_URI', secret.length < 32 && 'SESSION_SECRET (32+ characters)'].filter(Boolean);
  return { enabled: missing.length === 0, missing, clientId, uri, secret, dbName: env.ACCOUNTS_DB || 'techkatta_app',
    jwksUrl: env.GOOGLE_JWKS_URL || undefined, secureCookie: env.COOKIE_SECURE !== '0' };
}

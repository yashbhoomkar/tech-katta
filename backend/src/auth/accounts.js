// Accounts in MongoDB (database `techkatta_app` by default; the commit ledger lives elsewhere).
//   users    { _id, googleSub (unique), email, name, picture, createdAt, lastLoginAt }
//   sessions { tokenHash (unique), userId, createdAt, expiresAt }  — removed by a TTL index on expiry
//   lab      { userId (unique), designs: [design], deleted: [{id, at}], progress, updatedAt }
// The browser holds a random session token in an HttpOnly cookie; only an HMAC of it (keyed with
// SESSION_SECRET) is stored, so the sessions collection alone can't be used to sign in.
import { MongoClient } from 'mongodb';
import { createHmac, randomBytes } from 'node:crypto';

export const SESSION_DAYS = 30;

// What kind of failure a MongoDB error is, as a short name safe to show on /health: the driver's
// error class or server code name (e.g. AuthenticationFailed, MongoServerSelectionError), a system
// code (ENOTFOUND), and for "couldn't reach the cluster" the names of the per-server errors. Never
// the message, which can carry host names.
export function errorKind(error) {
  const name = (v) => (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(v) ? v : null);
  const parts = [name(error?.codeName) || name(error?.name) || 'Error'];
  if (typeof error?.code === 'string' && /^E[A-Z_]{2,30}$/.test(error.code)) parts.push(error.code);
  const servers = error?.reason?.servers;
  if (servers && typeof servers.values === 'function') {
    for (const sd of servers.values()) { const n = name(sd?.error?.codeName) || name(sd?.error?.name); if (n && !parts.includes(n)) parts.push(n); }
  }
  if (name(error?.cause?.code) && !parts.includes(error.cause.code)) parts.push(error.cause.code);
  return parts.slice(0, 4).join(' / ');
}

export function openAccounts({ uri, dbName = 'techkatta_app', secret, client }) {
  const mongo = client || new MongoClient(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10, appName: 'tech-katta-api' });
  const db = mongo.db(dbName);
  const users = db.collection('users'), sessions = db.collection('sessions'), lab = db.collection('lab');
  let ready = null, health = 'checking', checkedAt = 0, checking = null;
  const init = () => (ready ||= Promise.all([
    users.createIndex({ googleSub: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    lab.createIndex({ userId: 1 }, { unique: true }),
  ]).catch((error) => { ready = null; throw error; }));
  const hash = (token) => createHmac('sha256', secret).update(String(token)).digest('hex');
  const view = (u) => ({ name: u.name || '', email: u.email || '', picture: u.picture || '' });

  return {
    // Sign in (or sign up) with a verified Google profile; returns a new session token.
    async signIn(profile) {
      await init();
      const now = new Date();
      const user = await users.findOneAndUpdate(
        { googleSub: profile.sub },
        { $set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: now }, $setOnInsert: { googleSub: profile.sub, createdAt: now } },
        { upsert: true, returnDocument: 'after' });
      const token = randomBytes(32).toString('base64url');
      await sessions.insertOne({ tokenHash: hash(token), userId: user._id, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * 86_400_000) });
      return { token, user: view(user) };
    },
    // The signed-in user for a session token, or null.
    async userFor(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
      await init();
      const session = await sessions.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } });
      if (!session) return null;
      const user = await users.findOne({ _id: session.userId });
      return user ? { id: user._id, user: view(user) } : null;
    },
    async signOut(token) { if (typeof token === 'string') await sessions.deleteOne({ tokenHash: hash(token) }); },
    // Everything stored about the user goes: Lab data, sessions, the account.
    async deleteAccount(userId) {
      await lab.deleteOne({ userId });
      await sessions.deleteMany({ userId });
      await users.deleteOne({ _id: userId });
    },
    async getLab(userId) {
      const doc = await lab.findOne({ userId });
      return { designs: doc?.designs || [], deleted: doc?.deleted || [], progress: doc?.progress || {} };
    },
    async saveLab(userId, data) {
      await lab.updateOne({ userId }, { $set: { designs: data.designs, deleted: data.deleted, progress: data.progress, updatedAt: new Date() } }, { upsert: true });
    },
    async ping() { await db.command({ ping: 1 }); },
    // "ok" or the kind of the last failure (errorKind); checked at most every 30 s, in the background,
    // so /health never waits on the database.
    health() {
      const now = Date.now();
      if (!checking && now - checkedAt > 30_000) {
        checkedAt = now;
        checking = db.command({ ping: 1 }).then(() => { health = 'ok'; }, (error) => { health = errorKind(error); }).finally(() => { checking = null; });
      }
      return health;
    },
    close: () => mongo.close(),
  };
}

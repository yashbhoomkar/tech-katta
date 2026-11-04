// Accounts in MongoDB (database `techkatta_app` by default; the commit ledger lives elsewhere).
//   users    { _id, googleSub (unique), email, name, picture, createdAt, lastLoginAt }
//   sessions { tokenHash (unique), userId, createdAt, expiresAt }  — removed by a TTL index on expiry.
//            A session lasts SESSION_DAYS from its last use (renewed at most once a day), and never
//            more than MAX_SESSION_DAYS after sign-in.
//   lab      { userId (unique), designs: [design], deleted: [{id, at}], progress, updatedAt }
//   events   { name, at, visitor, userId?, device, page, props }  — usage events (events.js), TTL 13 months
// The browser holds a random session token in an HttpOnly cookie; only an HMAC of it (keyed with
// SESSION_SECRET) is stored, so the sessions collection alone can't be used to sign in.
import { MongoClient } from 'mongodb';
import { createHmac, randomBytes } from 'node:crypto';
import { RETENTION_DAYS } from './events.js';

export const SESSION_DAYS = 30, MAX_SESSION_DAYS = 90;
const DAY = 86_400_000;

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

export function openAccounts({ uri, dbName = 'techkatta_app', secret, client, now = () => Date.now() }) {
  const mongo = client || new MongoClient(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10, appName: 'tech-katta-api' });
  const db = mongo.db(dbName);
  const users = db.collection('users'), sessions = db.collection('sessions'), lab = db.collection('lab'), events = db.collection('events');
  let ready = null, health = 'checking', checkedAt = 0, checking = null;
  const init = () => (ready ||= Promise.all([
    users.createIndex({ googleSub: 1 }, { unique: true }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    lab.createIndex({ userId: 1 }, { unique: true }),
    events.createIndex({ at: 1 }, { expireAfterSeconds: RETENTION_DAYS * 86_400 }),
    events.createIndex({ name: 1, at: -1 }),
    events.createIndex({ visitor: 1, at: -1 }),
    events.createIndex({ userId: 1, at: -1 }, { sparse: true }),
  ]).catch((error) => { ready = null; throw error; }));
  const hash = (token) => createHmac('sha256', secret).update(String(token)).digest('hex');
  const clock = now;
  const view = (u) => ({ name: u.name || '', email: u.email || '', picture: u.picture || '' });

  return {
    // Sign in (or sign up) with a verified Google profile; returns a new session token.
    async signIn(profile) {
      await init();
      const now = new Date(clock());
      const user = await users.findOneAndUpdate(
        { googleSub: profile.sub },
        { $set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: now }, $setOnInsert: { googleSub: profile.sub, createdAt: now } },
        { upsert: true, returnDocument: 'after' });
      const token = randomBytes(32).toString('base64url');
      await sessions.insertOne({ tokenHash: hash(token), userId: user._id, createdAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY) });
      return { token, user: view(user) };
    },
    // The signed-in user for a session token, or null. A session used more than a day after it was
    // last renewed is extended to SESSION_DAYS from now (capped at MAX_SESSION_DAYS after sign-in);
    // `renewedUntil` then says when, so the cookie can be extended too.
    async userFor(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
      await init();
      const t = clock(), session = await sessions.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date(t) } });
      if (!session) return null;
      const user = await users.findOne({ _id: session.userId });
      if (!user) return null;
      const cap = session.createdAt.getTime() + MAX_SESSION_DAYS * DAY, until = Math.min(t + SESSION_DAYS * DAY, cap);
      let renewedUntil = null;
      if (until - session.expiresAt.getTime() > DAY) {
        await sessions.updateOne({ _id: session._id }, { $set: { expiresAt: new Date(until) } });
        renewedUntil = new Date(until);
      }
      return { id: user._id, user: view(user), renewedUntil };
    },
    async signOut(token) { if (typeof token === 'string') await sessions.deleteOne({ tokenHash: hash(token) }); },
    // Every session of the account ends (lost phone, shared computer). Returns how many there were.
    async signOutAll(userId) { return (await sessions.deleteMany({ userId })).deletedCount; },
    // Everything stored about the user goes: usage events tied to the account, Lab data, sessions, the account.
    async logEvents(docs) { if (docs.length) { await init(); await events.insertMany(docs, { ordered: false }); } },
    async deleteAccount(userId) {
      await events.deleteMany({ userId });
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

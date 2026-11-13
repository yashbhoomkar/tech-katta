// Accounts in MongoDB (database `techkatta_app` by default; the commit ledger lives elsewhere).
//   users    { _id, googleSub (unique), role? ("admin": may read analytics.katta.cc; see isAdmin), email, name, firstName, lastName, picture, country (first
//              sign-in), lastCountry, createdAt, lastLoginAt,
//              terms: { at, version },  — when the Terms and conditions + Privacy policy were accepted
//              adsConsent: { ads: bool, at, version },  — opt-in to Tech Katta ads on Facebook/Instagram
//                                                       (account menu switch only, off until turned on)
//              adsConsentLog: [{ ads, at, version }] }   — every change, newest last (at most 50)
//   sessions { tokenHash (unique), userId, createdAt, expiresAt }  — removed by a TTL index on expiry.
//            A session lasts SESSION_DAYS from its last use (renewed at most once a day), and never
//            more than MAX_SESSION_DAYS after sign-in.
//   lab      { userId (unique), rev, designs: [design], deleted: [{id, at}], progress, updatedAt }
//            rev goes up by one on every save; a save only lands on the rev it was merged from, so two
//            devices syncing at the same moment can't overwrite each other (the loser merges again).
//   events   { name, at, visitor, userId?, device, page, props }  — usage events (events.js), TTL 13 months
//   practice_submissions, practice_stats: the LeetCode-style practice pages (practice/store.js); deleted with the account
//   practice_ai, practice_credits, practice_ai_log: the interviewer (ai/store.js); an account's credits go with it
//   submissions { userId, slug, at, verdict, passed, total, score, cost, p99, hints }  — a problem's
//            Submit, judged again on the server (routes.js). Only the result: the design and the written
//            answer are not kept. Gives each problem its acceptance rate and "cheaper than N%".
// The browser holds a random session token in an HttpOnly cookie; only an HMAC of it (keyed with
// SESSION_SECRET) is stored, so the sessions collection alone can't be used to sign in.
import { MongoClient } from 'mongodb';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { RETENTION_DAYS } from './events.js';
import { adminSummary } from './admin.js';

export const SESSION_DAYS = 30, MAX_SESSION_DAYS = 90;
// The wording the user agreed to is site.json account.adsConsent; bump this when it changes.
export const CONSENT_VERSION = '2026-11-05'; // ads switch in the account menu only
// Version of the Terms and conditions + Privacy policy a sign-in accepts (site.json terms/privacy).
export const TERMS_VERSION = '2026-11-05';
const DAY = 86_400_000;
// The free Atlas cluster holds 512 MB. Usage events stop being written (accounts keep working) once
// this database passes EVENTS_MAX_MB, so analytics can never fill the cluster and break sign-in.
export const EVENTS_MAX_MB = 400;
const DUPLICATE = 11000;
// Admins (analytics.katta.cc): accounts whose Google-verified email hashes to one of these (SHA-256 of
// the lowercase address, so the address itself isn't in this public repo), plus ADMIN_EMAILS (comma
// separated, optional) and any account with role "admin".
export const ADMIN_EMAIL_SHA256 = new Set(['5c880b9112b631b5e304093d427bdc4cb736087f59d0fbf3647aa1fc74ba5bfd']);
const sha256 = (v) => createHash('sha256').update(v).digest('hex');
export function isAdmin(u, extra = (process.env.ADMIN_EMAILS || '')) {
  if (u?.role === 'admin') return true;
  const email = String(u?.email || '').trim().toLowerCase();
  if (!email) return false;
  return ADMIN_EMAIL_SHA256.has(sha256(email)) || extra.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(email);
}

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

export function openAccounts({ uri, dbName = 'techkatta_app', secret, client, now = () => Date.now(), eventsMaxMB = EVENTS_MAX_MB }) {
  // Timeouts found by chaos testing (tools/chaos): with only serverSelectionTimeoutMS, a database that
  // stops answering on an open connection (a network black hole) made requests wait ~40 s. Now a new
  // connection gets 5 s and any single wait on a socket 10 s, so requests fail within seconds instead.
  const mongo = client || new MongoClient(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 10_000, maxPoolSize: 10, appName: 'tech-katta-api' });
  const db = mongo.db(dbName);
  const users = db.collection('users'), sessions = db.collection('sessions'), lab = db.collection('lab'), events = db.collection('events'), submissions = db.collection('submissions');
  let ready = null, health = 'checking', checkedAt = 0, checking = null, storageMB = null, statsCache = null;
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
    submissions.createIndex({ slug: 1, verdict: 1, cost: 1 }),
    submissions.createIndex({ userId: 1, at: -1 }),
  ]).catch((error) => { ready = null; throw error; }));
  const hash = (token) => createHmac('sha256', secret).update(String(token)).digest('hex');
  const clock = now;
  const view = (u) => ({ name: u.name || '', email: u.email || '', picture: u.picture || '', adsConsent: !!u.adsConsent?.ads, ...(isAdmin(u) ? { admin: true } : {}) });

  return {
    // Sign in (or sign up) with a verified Google profile; returns a new session token.
    // `country` (2 letters, from Cloudflare) is optional. Accepting the Terms is checked by the route;
    // each sign-in records it. The ads opt-in is never set here (account menu only).
    async signIn(profile, { country = '', adsConsent = false } = {}) {
      await init();
      const now = new Date(clock());
      const set = { email: profile.email, name: profile.name, firstName: profile.firstName || '', lastName: profile.lastName || '', picture: profile.picture, lastLoginAt: now, terms: { at: now, version: TERMS_VERSION } };
      if (country) set.lastCountry = country;
      const consent = { ads: true, at: now, version: CONSENT_VERSION };
      if (adsConsent) set.adsConsent = consent;
      const update = { $set: set, $setOnInsert: { googleSub: profile.sub, createdAt: now, ...(country ? { country } : {}) },
        ...(adsConsent ? { $push: { adsConsentLog: { $each: [consent], $slice: -50 } } } : {}) };
      const upsert = () => users.findOneAndUpdate({ googleSub: profile.sub }, update, { upsert: true, returnDocument: 'after' });
      // two first sign-ins at the same moment: one inserts, the other hits the unique index; run it
      // again and it updates the account the first one made
      let user;
      try { user = await upsert(); } catch (error) { if (error?.code !== DUPLICATE) throw error; user = await upsert(); }
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
    // Opt in or out of Tech Katta ads on Facebook/Instagram (Meta Custom Audiences); returns the user.
    async setAdsConsent(userId, ads) {
      const consent = { ads: !!ads, at: new Date(clock()), version: CONSENT_VERSION };
      const user = await users.findOneAndUpdate({ _id: userId }, { $set: { adsConsent: consent }, $push: { adsConsentLog: { $each: [consent], $slice: -50 } } }, { returnDocument: 'after' });
      return user ? view(user) : null;
    },
    // Accounts that opted in, for the Meta audience export (scripts/meta-audience.mjs).
    async consentedUsers() { return users.find({ 'adsConsent.ads': true }, { projection: { email: 1, firstName: 1, lastName: 1, country: 1, lastCountry: 1 } }).toArray(); },
    async signOut(token) { if (typeof token === 'string') await sessions.deleteOne({ tokenHash: hash(token) }); },
    // Every session of the account ends (lost phone, shared computer). Returns how many there were.
    async signOutAll(userId) { return (await sessions.deleteMany({ userId })).deletedCount; },
    // Everything stored about the user goes: usage events tied to the account, Lab data, sessions, the account.
    // Returns false (and stores nothing) while the database is over eventsMaxMB, or while the last
    // health check found it down: events are best-effort, so they're dropped at once rather than
    // holding a request for the 5 s it takes to find no database.
    async logEvents(docs) {
      if (!docs.length) return true;
      if (health !== 'ok' && health !== 'checking') { this.health(); return false; }
      await init();
      if (storageMB !== null && storageMB > eventsMaxMB) return false;
      await events.insertMany(docs, { ordered: false });
      return true;
    },
    // The account goes before its sessions: if something fails half way, the leftover sessions point
    // at no account (signed out, removed at expiry) rather than leaving an account nobody can reach.
    async deleteAccount(userId) {
      await events.deleteMany({ userId });
      await submissions.deleteMany({ userId });
      await db.collection('practice_submissions').deleteMany({ user_id: userId });
      await db.collection('practice_credits').deleteMany({ user_id: userId });
      await lab.deleteOne({ userId });
      await users.deleteOne({ _id: userId });
      await sessions.deleteMany({ userId });
    },
    async getLab(userId) {
      const doc = await lab.findOne({ userId });
      return { designs: doc?.designs || [], deleted: doc?.deleted || [], progress: doc?.progress || {}, rev: doc ? doc.rev || 0 : null };
    },
    // Read, merge, write — and only write if nobody saved in between (rev); otherwise read and merge
    // again (up to 12 times, with a short random pause so the racers spread out). merge(stored)
    // returns the data to keep. Returns what was saved.
    async updateLab(userId, merge) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (attempt) await new Promise((r) => setTimeout(r, 5 + Math.random() * 20 * attempt));
        const stored = await this.getLab(userId), data = merge(stored);
        const fields = { designs: data.designs, deleted: data.deleted, progress: data.progress, updatedAt: new Date(clock()) };
        try {
          if (stored.rev === null) { await lab.insertOne({ userId, rev: 1, ...fields }); return data; }
          // documents saved before rev existed have none: match "no rev" as rev 0
          const r = await lab.updateOne({ userId, ...(stored.rev ? { rev: stored.rev } : { rev: { $exists: false } }) }, { $set: fields, $inc: { rev: 1 } });
          if (r.matchedCount === 1) return data;
        } catch (error) { if (error?.code !== DUPLICATE) throw error; }
      }
      throw new Error('lab_busy');
    },
    // A judged submission; returns how it compares: of the accepted designs for this problem, the share
    // that cost more (so "cheaper than N%"), and the problem's totals.
    async addSubmission(doc) {
      await init();
      await submissions.insertOne(doc);
      // copied solutions (doc.copied) are kept but not counted: the stats are about people's own designs
      const own = { slug: doc.slug, copied: { $ne: true } };
      const accepted = await submissions.countDocuments({ ...own, verdict: 'accepted' });
      const pricier = !doc.copied && doc.verdict === 'accepted' && Number.isFinite(doc.cost) ? await submissions.countDocuments({ ...own, verdict: 'accepted', cost: { $gt: doc.cost } }) : null;
      const total = await submissions.countDocuments(own);
      return { submissions: total, accepted, cheaperThan: pricier === null || accepted <= 1 ? null : Math.round(100 * pricier / (accepted - 1)) };
    },
    // Per problem: submissions, accepted ones, and people who solved it. Kept for a minute.
    async problemStats() {
      if (statsCache && clock() - statsCache.at < 60_000) return statsCache.value;
      await init();
      const rows = await submissions.aggregate([{ $match: { copied: { $ne: true } } }, { $group: { _id: '$slug', submissions: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$verdict', 'accepted'] }, 1, 0] } }, solvers: { $addToSet: { $cond: [{ $eq: ['$verdict', 'accepted'] }, '$userId', '$$REMOVE'] } } } }]).toArray();
      const value = Object.fromEntries(rows.map((r) => [r._id, { submissions: r.submissions, accepted: r.accepted, solvers: r.solvers.length }]));
      statsCache = { at: clock(), value };
      return value;
    },
    // The analytics summary for analytics.katta.cc (admin.js); the route checks the caller is an admin.
    async summary(days) { await init(); return adminSummary({ events, users, submissions }, { days, now: clock() }); },
    async ping() { await db.command({ ping: 1 }); },
    // "ok" or the kind of the last failure (errorKind); checked at most every 30 s, in the background,
    // so /health never waits on the database.
    health() {
      const now = Date.now();
      if (!checking && now - checkedAt > 30_000) {
        checkedAt = now;
        checking = db.command({ dbStats: 1, scale: 1024 * 1024 }).then((s) => { health = 'ok'; storageMB = Math.round(((s.storageSize || 0) + (s.indexSize || 0)) * 10) / 10; },
          (error) => { health = errorKind(error); }).finally(() => { checking = null; });
      }
      return health;
    },
    // MB used by this database (data + indexes), from the last health check; null until then.
    storage() { return storageMB === null ? null : { mb: storageMB, eventsPaused: storageMB > eventsMaxMB }; },
    // Create the indexes now (at startup) rather than on the first request. Never throws.
    warmUp() { return init().then(() => true, () => false); },
    close: () => mongo.close(),
    // the database, for the practice store (practice/store.js), which keeps its submissions beside the accounts
    db,
  };
}

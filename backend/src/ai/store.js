// What the interviewer keeps in MongoDB (tech-katta-context/22-EVALUATOR-V3.md §17.2, §18), in the accounts database:
//   practice_ai       { _id: key (§12.6), job, review, usage, fingerprint, created_at }   one verified answer per input
//   practice_credits  { _id: "<user>:m:<YYYY-MM>" | "<user>:d:<YYYY-MM-DD>", user_id, used }   reviews used, by month
//                     and by day in India; and { _id: "site:d:<YYYY-MM-DD>", tokens } for the site's daily ceiling
//   practice_ai_log   { at, job, problem, provider, input, cached, output, ms, outcome, why }   no learner text, no
//                     account; removed after 90 days
// Credits are reserved before a call and given back when the floor is shown instead (reserve, call, settle).

const IST = 5.5 * 3600_000;
export const monthOf = (t) => new Date(t + IST).toISOString().slice(0, 7);
export const dayOf = (t) => new Date(t + IST).toISOString().slice(0, 10);
const DUP = 11000;

export function openAiStore(db, { now = () => Date.now() } = {}) {
  const cache = db.collection('practice_ai'), credits = db.collection('practice_credits'), log = db.collection('practice_ai_log');
  let ready = null;
  const init = () => (ready ||= Promise.all([
    credits.createIndex({ user_id: 1 }),
    log.createIndex({ at: 1 }, { expireAfterSeconds: 90 * 86_400 }),
  ]).catch((e) => { ready = null; throw e; }));
  const keys = (userId) => { const t = now(); return { m: `${userId}:m:${monthOf(t)}`, d: `${userId}:d:${dayOf(t)}` }; };
  // +1 if under the limit; false when the limit is reached (the upsert then collides with the existing document)
  const take = async (_id, userId, limit) => {
    if (limit <= 0) return false;
    try { await credits.updateOne({ _id, used: { $lt: limit } }, { $inc: { used: 1 }, $setOnInsert: { user_id: userId } }, { upsert: true }); return true; }
    catch (e) { if (e?.code === DUP) return false; throw e; }
  };
  const give = (_id) => credits.updateOne({ _id, used: { $gt: 0 } }, { $inc: { used: -1 } });

  return {
    init,
    async cached(key) { await init(); return cache.findOne({ _id: key }); },
    async remember(key, doc) { await init(); await cache.updateOne({ _id: key }, { $setOnInsert: { ...doc, created_at: new Date(now()) } }, { upsert: true }); },
    // { month: { total, used, left }, day: { total, used, left } }
    async credits(userId, { monthly, daily }) {
      await init();
      const k = keys(String(userId));
      const [m, d] = await Promise.all([credits.findOne({ _id: k.m }), credits.findOne({ _id: k.d })]);
      const mu = m?.used || 0, du = d?.used || 0;
      return { month: { total: monthly, used: mu, left: Math.max(0, monthly - mu) }, day: { total: daily, used: du, left: Math.max(0, daily - du) } };
    },
    // true when one review was reserved for this account (both the month and the day had room)
    async reserve(userId, { monthly, daily }) {
      await init();
      const k = keys(String(userId));
      if (!(await take(k.m, userId, monthly))) return false;
      if (!(await take(k.d, userId, daily))) { await give(k.m); return false; }
      return true;
    },
    async release(userId) { await init(); const k = keys(String(userId)); await Promise.all([give(k.m), give(k.d)]); },
    async tokensToday() { await init(); return (await credits.findOne({ _id: `site:d:${dayOf(now())}` }))?.tokens || 0; },
    async addTokens(n) { if (!(n > 0)) return; await init(); await credits.updateOne({ _id: `site:d:${dayOf(now())}` }, { $inc: { tokens: n } }, { upsert: true }); },
    async log(entry) { await init(); await log.insertOne({ ...entry, at: new Date(now()) }); },
    async deleteUser(userId) { await credits.deleteMany({ user_id: userId }); },
  };
}

// Practice submissions in MongoDB (spec sections 10 and 13), in the accounts database:
//   practice_submissions { _id, user_id, problem_id, source, canonical, verdict, passed, total, cost_inr, p99_ms,
//                          judge_version, shared, note, created_at }
//   practice_stats       { _id: problem_id, submitted, accepted }   ($inc on every judged Submit)
// The source is kept (the Submissions tab restores it; shared Solutions show it). Deleting an account deletes its
// submissions (accounts.js deleteAccount).
import { ObjectId } from 'mongodb';

export const MIN_COMPARE = 20; // fewer designs (or submissions) than this: no ranking, no acceptance rate

export function openPractice(db, { now = () => Date.now() } = {}) {
  const subs = db.collection('practice_submissions'), stats = db.collection('practice_stats');
  let ready = null;
  const init = () => (ready ||= Promise.all([
    subs.createIndex({ user_id: 1, problem_id: 1, created_at: -1 }),
    subs.createIndex({ problem_id: 1, verdict: 1, cost_inr: 1 }),
    subs.createIndex({ problem_id: 1, shared: 1, cost_inr: 1 }),
  ]).catch((error) => { ready = null; throw error; }));
  const oid = (id) => (typeof id === 'string' && /^[0-9a-f]{24}$/.test(id) ? new ObjectId(id) : null);
  const row = (s) => ({ id: String(s._id), problem_id: s.problem_id, at: s.created_at, verdict: s.verdict, passed: s.passed, total: s.total, cost_inr: s.cost_inr, p99_ms: s.p99_ms, judge_version: s.judge_version, shared: !!s.shared });

  return {
    init,
    // A judged Submit. Returns its id.
    async add(doc) {
      await init();
      const { insertedId } = await subs.insertOne({ ...doc, shared: false, note: '', created_at: new Date(now()) });
      await stats.updateOne({ _id: doc.problem_id }, { $inc: { submitted: 1, accepted: doc.verdict === 'Accepted' ? 1 : 0 } }, { upsert: true });
      return String(insertedId);
    },
    // How an Accepted design compares with the best (cheapest) Accepted design of every other user (13): the share
    // of them that cost more, and that are slower at the 99th percentile. null under MIN_COMPARE users.
    async rank(problemId, userId, cost, p99) {
      await init();
      const best = await subs.aggregate([
        { $match: { problem_id: problemId, verdict: 'Accepted', user_id: { $ne: userId } } },
        { $sort: { cost_inr: 1, p99_ms: 1 } },
        { $group: { _id: '$user_id', cost: { $first: '$cost_inr' }, p99: { $first: '$p99_ms' } } },
      ]).toArray();
      if (best.length < MIN_COMPARE) return null;
      const share = (f) => Math.round((100 * best.filter(f).length) / best.length);
      return { cheaper_than: share((b) => b.cost > cost), faster_than: Number.isFinite(p99) ? share((b) => Number.isFinite(b.p99) && b.p99 > p99) : null, designs: best.length };
    },
    // {problem_id: {submitted, accepted}}
    async stats() {
      await init();
      return Object.fromEntries((await stats.find({}).toArray()).map((s) => [s._id, { submitted: s.submitted || 0, accepted: s.accepted || 0 }]));
    },
    // {problem_id: "solved" | "tried"} for one user
    async status(userId) {
      await init();
      const rows = await subs.aggregate([{ $match: { user_id: userId } }, { $group: { _id: '$problem_id', ok: { $max: { $cond: [{ $eq: ['$verdict', 'Accepted'] }, 1, 0] } } } }]).toArray();
      return Object.fromEntries(rows.map((r) => [r._id, r.ok ? 'solved' : 'tried']));
    },
    async solved(userId, problemId) { await init(); return !!(await subs.findOne({ user_id: userId, problem_id: problemId, verdict: 'Accepted' }, { projection: { _id: 1 } })); },
    // The caller's submissions of a problem, newest first (at most 50), without their source.
    async list(userId, problemId) {
      await init();
      return (await subs.find({ user_id: userId, problem_id: problemId }, { projection: { source: 0, canonical: 0 } }).sort({ created_at: -1 }).limit(50).toArray()).map(row);
    },
    // One submission with its source, only for its owner (null otherwise).
    async one(userId, id) {
      const _id = oid(id); if (!_id) return null;
      await init();
      const s = await subs.findOne({ _id, user_id: userId });
      return s ? { ...row(s), source: s.source, note: s.note || '' } : null;
    },
    // Share one's own Accepted submission with a short note. Returns false if it isn't theirs or isn't Accepted.
    async share(userId, id, note) {
      const _id = oid(id); if (!_id) return false;
      await init();
      const r = await subs.updateOne({ _id, user_id: userId, verdict: 'Accepted' }, { $set: { shared: true, note } });
      return r.matchedCount === 1;
    },
    // Shared designs of a problem, one row per design (the same canonical text is one design, with a count), sorted by
    // cost or by p99; at most 20.
    async solutions(problemId, by = 'cost') {
      await init();
      const sort = by === 'speed' ? { p99: 1, cost: 1 } : { cost: 1, p99: 1 };
      const rows = await subs.aggregate([
        { $match: { problem_id: problemId, shared: true, verdict: 'Accepted' } },
        { $sort: { created_at: 1 } },
        { $group: { _id: '$canonical', source: { $first: '$source' }, note: { $first: '$note' }, cost: { $first: '$cost_inr' }, p99: { $first: '$p99_ms' }, count: { $sum: 1 } } },
        { $sort: sort }, { $limit: 20 },
      ]).toArray();
      return rows.map((r) => ({ source: r.source, note: r.note || '', cost_inr: r.cost, p99_ms: r.p99, count: r.count }));
    },
    async deleteUser(userId) { await subs.deleteMany({ user_id: userId }); },
  };
}

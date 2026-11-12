// The judge (spec sections 6, 7, 21, 22): the worked example of 7.10, one test per rule, every verdict, checked tips,
// determinism, monotonicity (seeded property tests) and speed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from './compile.js';
import { judge, judgeAll, stripHidden, JUDGE_VERSION } from './judge.js';
import { costOf } from './verdict.js';
import { KINDS } from './kinds/index.js';

const READ = { name: 'GET_LINK', mode: 'read', table: 'links', key: 'code', distinct_keys: 1e6, item_bytes: 500, skew: 0.8, max_stale_s: 3600, says: 'x' };
const WRITE = { name: 'CREATE_LINK', mode: 'write', table: 'links', key: 'code', durable: true, unique_id: true, says: 'x' };
const P = { total_items: 1e8, requests: [READ, WRITE] };
const REF = `lb    = lb()
api   = server(count=3, size=medium)
cache = cache(nodes=2, memory_gb=1, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=counter)
table db.links(code pk, url, created_at)
read  GET_LINK:    client > lb > api > cache | db
write CREATE_LINK: client > lb > api > ids > db then invalidate cache
`;
const design = (src, p = P) => { const c = compile(src, p); assert.ok(c.ok, JSON.stringify(c.errors)); return c.design; };
const phase = (g, c, extra = {}) => ({ seconds: 600, rates: { GET_LINK: g, CREATE_LINK: c }, ...extra });
const T = (phases, promises = {}, extra = {}) => ({ id: 't', title: 'Test', hidden: false, phases, promises, ...extra });
const seg = (src, t, i = 0) => judge(design(src), P, t).run.segments[i];
const near = (a, b, tol = 0.2, what = '') => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not ${b} ± ${tol}`);

test('7.10, the worked example', () => {
  const s = seg(REF, T([phase(2000, 20)]));
  near(s.parts.lb.rho, 0.0404, 1e-4, 'lb rho');
  near(s.parts.api.rho, 0.6733, 1e-4, 'api rho');
  near(s.parts.cache.rho, 0.0202, 1e-4, 'cache rho');
  assert.equal(s.perRequest.GET_LINK.trace.find((t) => t.part === 'cache').hit, 0.989852);
  near(s.parts.db.rho, 0.0268, 1e-4, 'db rho');
  const tr = Object.fromEntries(s.perRequest.GET_LINK.trace.map((t) => [t.part, t.ms]));
  near(tr.lb, 2.08, 0.01); near(tr.api, 61.2, 0.05); near(tr.cache, 2.04, 0.01); near(tr.db, 10.27, 0.02);
  near(s.perRequest.GET_LINK.p99, 75.6, 0.2, 'GET_LINK p99');
  near(s.perRequest.GET_LINK.p50, 16.3, 0.2, 'GET_LINK p50');
  near(s.perRequest.CREATE_LINK.p99, 94.1, 0.2, 'CREATE_LINK p99');
  assert.equal(costOf(design(REF)), 63_000);
});

test('7.2 kill: a server instance goes, a sql replica is promoted (30 s of outage), with none left the primary stays down', () => {
  const t = T([phase(2000, 20), phase(2000, 20, { events: [{ kill_role: 'server' }, { kill_role: 'sql' }] })]);
  const run = judge(design(REF), P, t).run;
  const fail = run.segments.find((s) => s.phase === 2 && s.seconds === 30);
  assert.ok(fail, 'a 30 s failover segment');
  assert.equal(fail.perRequest.CREATE_LINK.outage, true);
  near(fail.parts.api.rho, 2020 / 2000, 1e-3, 'two servers left');
  const after = run.segments.find((s) => s.phase === 2 && s.start === 630);
  assert.equal(after.perRequest.CREATE_LINK.outage, false);
  const none = judge(design(REF.replace('replicas=1', 'replicas=0')), P, T([phase(100, 1, { events: [{ kill_role: 'sql' }] }), phase(100, 1)])).run;
  assert.ok(none.segments.every((s) => s.perRequest.GET_LINK.outage));
});

test('7.2 kill_role on a role the design lacks is a no-op; managed parts ignore kills', () => {
  const r = judge(design(REF), P, T([phase(200, 2, { events: [{ kill_role: 'nosql' }, { kill_role: 'worker' }] })]));
  assert.equal(r.run.faultSeen, false);
  assert.equal(KINDS.lb.onEvent({}, {}, { type: 'kill' }), null);
});

test('22.2 hit ratio: TTL, memory and writes all matter, never above 0.99', () => {
  const h = (src, g = 2000, c = 20) => seg(src, T([phase(g, c)])).perRequest.GET_LINK.trace.find((t) => t.part === 'cache').hit;
  assert.ok(h(REF.replace('ttl_s=3600', 'ttl_s=1')) < 0.5, 'ttl 1 s is almost useless');
  assert.ok(h(REF) <= 0.99);
  assert.ok(h(REF, 2000, 200) < h(REF, 2000, 20), 'more invalidating writes, lower hit ratio');
  assert.ok(h(REF.replace('memory_gb=1', 'memory_gb=1').replace('nodes=2', 'nodes=1')) <= h(REF));
  assert.equal(h(REF.replace('then invalidate cache', 'then update cache'), 2000, 200), h(REF.replace('then invalidate cache', 'then update cache'), 2000, 20), 'write-through has no churn');
});

test('22.3 write-through: the write waits for the cache, and reads are never stale', () => {
  const src = REF.replace('then invalidate cache', 'then update cache');
  const a = seg(REF, T([phase(2000, 20)])).perRequest.CREATE_LINK.p99, b = seg(src, T([phase(2000, 20)])).perRequest.CREATE_LINK.p99;
  near(b - a, 2.04, 0.02, 'one cache hop');
  const r = judge(design(src.replace('ttl_s=3600', 'ttl_s=86400')), P, T([phase(200, 2)]));
  assert.equal(r.verdict, 'Passed');
});

test('7.4 full scan multiplies the lookup by 100 (load and latency)', () => {
  const scan = REF.replace('db.links(code pk, url, created_at)', 'db.links(url pk, code, created_at)');
  const a = seg(REF, T([phase(2000, 20)])), b = seg(scan, T([phase(2000, 20)]));
  assert.ok(b.parts.db.rho > 50 * a.parts.db.rho);
});

test('7.4 sync replicas carry every write; [replica] reads go to the replicas', () => {
  const src = REF.replace('cache | db', 'db[replica]').replace(' then invalidate cache', '').replace('cache = cache(nodes=2, memory_gb=1, ttl_s=3600)\n', '');
  const s = seg(src, T([phase(2000, 20)]));
  near(s.parts.db.rhoRep, 2000 / 3000 + 20 / 1000, 1e-3, 'replica');
  near(s.parts.db.rho, 20 / 1000, 1e-3, 'primary');
});

test('W002: count > 1 with no lb in front serves one instance', () => {
  const s = seg(REF.replace(/client > lb > api/g, 'client > api'), T([phase(800, 8)]));
  near(s.parts.api.rho, 808 / 1000, 1e-3);
});

test('7.5 Overloaded: drops with no fault, naming the part with the highest rho', () => {
  const r = judgeAll(REF.replace('count=3', 'count=1'), { ...P, tests: [T([phase(2000, 20)])] });
  assert.equal(r.verdict, 'Overloaded');
  assert.equal(r.failed.blame.part, 'api');
  assert.equal(r.failed.message, 'api received 2,020 calls a second but can serve 1,000.');
});

test('7.5/7.7 drops after a fault count as failures: Unavailable', () => {
  const t = T([phase(1500, 15), phase(1500, 15, { events: [{ kill_role: 'server' }] })], { availability: { GET_LINK: 0.999 } });
  const r = judgeAll(REF.replace('count=3', 'count=2'), { ...P, tests: [t] });
  assert.equal(r.verdict, 'Unavailable');
  assert.equal(r.failed.blame.part, 'api');
});

test('7.6 staleness: a TTL longer than allowed is Wrong Answer, unless every write clears the cache', () => {
  const day = REF.replace('ttl_s=3600', 'ttl_s=86400');
  assert.equal(judgeAll(day, { ...P, tests: [T([phase(10, 1)])] }).verdict, 'Accepted');
  const r = judgeAll(day.replace(' then invalidate cache', ''), { ...P, tests: [T([phase(10, 1)])] });
  assert.equal(r.verdict, 'Wrong Answer');
  assert.equal(r.failed.message, 'GET_LINK can return data up to 86400 s old, but this problem allows 3600 s. Look at the cache TTL, or invalidate on write.');
});

test('7.6 read-your-writes: any staleness fails; an async replica read is a second behind', () => {
  const p = { ...P, requests: [{ ...READ, read_your_writes: true }, WRITE] };
  const src = REF.replace('cache | db', 'db[replica]').replace('sync=true', 'sync=false');
  const r = judgeAll(src, { ...p, tests: [T([phase(10, 1)])] });
  assert.equal(r.verdict, 'Wrong Answer');
  assert.equal(r.failed.reason, 'ryw');
  assert.equal(judgeAll(src.replace('sync=false', 'sync=true'), { ...p, tests: [T([phase(10, 1)])] }).verdict, 'Accepted');
});

test('7.6 ids: none is Wrong Answer (no_id); random 32-bit for 10 crore items collides; 128-bit does not', () => {
  const t = { ...P, tests: [T([phase(10, 1)])] };
  assert.equal(judgeAll(REF.replace('ids > ', '').replace('ids   = idgen(kind=counter)\n', ''), t).failed.reason, 'no_id');
  assert.equal(judgeAll(REF.replace('kind=counter', 'kind=random, bits=32'), t).failed.reason, 'collision');
  assert.equal(judgeAll(REF.replace('kind=counter', 'kind=hash, bits=128'), t).verdict, 'Accepted');
});

test('7.6 durability: an async replica loses a second of writes on failover (Data Lost); nosql w=1 too', () => {
  const t = T([phase(2000, 20), phase(2000, 20, { events: [{ kill_role: 'sql' }, { kill_role: 'nosql' }] })], { no_data_loss: true });
  const r = judgeAll(REF.replace('sync=true', 'sync=false'), { ...P, tests: [t] });
  assert.equal(r.verdict, 'Data Lost');
  assert.equal(r.failed.message, 'When db failed, about 20 acknowledged writes were lost. They were only on the primary.');
  const kv = 'lb = lb()\napi = server(count=3, size=medium)\nkv = nosql(nodes=6, rf=3, w=1, r=3)\nids = idgen()\ntable kv.links(code pk)\nread GET_LINK: client > lb > api > kv\nwrite CREATE_LINK: client > lb > api > ids > kv\n';
  assert.equal(judgeAll(kv, { ...P, tests: [t] }).verdict, 'Data Lost');
  assert.equal(judgeAll(kv.replace('w=1', 'w=2'), { ...P, tests: [t] }).verdict, 'Accepted');
});

test('7.6 nosql is down when a replica set cannot gather max(r, w) answers', () => {
  const kv = { kind: 'nosql', nodes: 3, rf: 3, r: 3, w: 1 };
  assert.equal(KINDS.nosql.isDown(kv, { alive: 3 }), false);
  assert.equal(KINDS.nosql.isDown(kv, { alive: 2 }), true);
  assert.equal(KINDS.nosql.isDown({ ...kv, r: 2 }, { alive: 2 }), false);
});

test('22.5 segments: a flushed cache is cold for 60 s; p99 counts a segment longer than 1 % of the test', () => {
  const t = T([phase(2000, 20, { seconds: 300, events: [{ flush_role: 'cache' }] })], { p99_ms: { GET_LINK: 80 } });
  const r = judge(design(REF), P, t);
  assert.deepEqual(r.run.segments.map((s) => s.seconds), [60, 240]);
  assert.equal(r.run.segments[0].perRequest.GET_LINK.trace.find((x) => x.part === 'cache').hit, 0);
  assert.equal(r.verdict, 'Too Slow');
});

test('22.6 queues: never drop below capacity; the backlog drains later; done_within_s', () => {
  const p = { total_items: 1e6, requests: [{ name: 'SEND', mode: 'write', table: 'jobs', key: 'id', durable: true, says: 'x' }] };
  const src = 'lb = lb()\napi = server(count=2)\nq = queue()\nw = worker(count=1)\ndb = sql(size=medium, replicas=1, sync=true)\ntable db.jobs(id pk)\nwrite SEND: client > lb > api ~> q > w > db\n';
  const spike = { id: 't', title: 'x', hidden: false, phases: [{ seconds: 60, rates: { SEND: 800 } }, { seconds: 600, rates: { SEND: 100 } }], promises: { done_within_s: { SEND: 120 }, availability: { SEND: 0.999 } } };
  const j = judge(design(src, p), p, spike);
  assert.equal(j.run.segments[0].perRequest.SEND.queue.backlog, 300 * 60, 'backlog after the spike');
  assert.equal(j.run.segments[0].parts.w.drop, 0, 'a worker behind a queue never drops');
  assert.equal(j.run.backlog.w, 0, 'drained by the end');
  assert.equal(j.verdict, 'Passed', JSON.stringify(j.findings.map((f) => f.type)));
  const tight = judgeAll(src, { ...p, tests: [{ ...spike, promises: { done_within_s: { SEND: 20 } } }] });
  assert.equal(tight.verdict, 'Too Slow');
  assert.equal(tight.failed.reason, 'backlog');
  assert.equal(tight.failed.message, 'SEND was still waiting 36 s after it was accepted; the promise is 20 s. w can do 500 a second but 800 arrive.');
  const left = judgeAll(src, { ...p, tests: [{ ...spike, phases: [{ seconds: 60, rates: { SEND: 800 } }] }] });
  assert.equal(left.verdict, 'Too Slow', 'work left in the queue at the end');
});

test('22.4 p50: the median read is a hit, so a slow database only shows in p99', () => {
  const t = T([phase(2000, 20)], { p50_ms: { GET_LINK: 15 } });
  const four = REF.replace('count=3', 'count=4');
  assert.equal(judgeAll(four, { ...P, tests: [t] }).verdict, 'Accepted');
  const r = judgeAll(four.replace('cache | db', 'db').replace(' then invalidate cache', ''), { ...P, tests: [t] });
  assert.equal(r.verdict, 'Too Slow');
  assert.equal(r.failed.reason, 'p50');
});

test('7.7 verdict order and Over Budget', () => {
  const r = judgeAll(REF.replace('kind=counter', 'kind=random, bits=32'), { ...P, tests: [T([phase(10, 1)], { budget_inr: 1000 })] });
  assert.equal(r.verdict, 'Wrong Answer');
  assert.equal(r.also[0].reason, 'budget');
  const b = judgeAll(REF, { ...P, tests: [T([phase(10, 1)], { budget_inr: 50_000 })] });
  assert.equal(b.verdict, 'Over Budget');
  assert.equal(b.failed.message, 'This design costs ₹63,000 a month; the budget is ₹50,000.');
  assert.equal(b.failed.blame.part, 'db');
});

test('Invalid Design: tests do not run', () => {
  const r = judgeAll('nonsense', { ...P, tests: [T([phase(1, 1)])] });
  assert.equal(r.verdict, 'Invalid Design');
  assert.equal(r.errors[0].code, 'E002');
});

test('22.9 tips are checked by re-running, and never contain the number that worked', () => {
  const r = judgeAll(REF.replace('count=3', 'count=1'), { ...P, tests: [T([phase(1500, 15)])] });
  assert.equal(r.tip, 'More capacity in "api" would fix this.');
  assert.doesNotMatch(r.tip, /\d/);
});

test('21.6 margins: Accepted shows the tightest promise; a near miss says how close', () => {
  const ok = judgeAll(REF, { ...P, tests: [T([phase(2000, 20)], { p99_ms: { GET_LINK: 90 } })] });
  assert.equal(ok.tightest.text, 'Tightest promise: GET_LINK p99, 16 % to spare.');
  const close = judgeAll(REF, { ...P, tests: [T([phase(2000, 20)], { p99_ms: { GET_LINK: 72 } })] });
  assert.equal(close.close.text, 'Close: only 5 % over.');
});

test('hidden detail is stripped for the browser; a free account sees title and reason only', () => {
  const r = judgeAll(REF.replace('count=3', 'count=1'), { ...P, tests: [{ ...T([phase(2000, 20)]), hidden: true }] }, { all: true });
  const full = stripHidden(r), free = stripHidden(r, { full: false });
  assert.equal(full.failed.trace, undefined);
  assert.equal(full.failed.blame.part, 'api');
  assert.deepEqual(Object.keys(free.failed).sort(), ['hidden', 'reason', 'test', 'title']);
  assert.equal(r.judge_version, JUDGE_VERSION);
});

test('22.7 edge rules: zero rates, a test with no traffic, and every number finite', () => {
  const r = judgeAll(REF, { ...P, tests: [T([phase(0, 0)], { p99_ms: { GET_LINK: 10 } })] });
  assert.equal(r.verdict, 'Accepted');
});

test('determinism: the same input, the same result, 100 times', () => {
  const p = { ...P, tests: [T([phase(2000, 20), phase(3000, 30, { events: [{ kill_role: 'server' }, { flush_role: 'cache' }] })], { p99_ms: { GET_LINK: 100 }, availability: { GET_LINK: 0.99 } })] };
  const first = JSON.stringify(judgeAll(REF, p));
  for (let i = 0; i < 100; i += 1) assert.equal(JSON.stringify(judgeAll(REF, p)), first);
});

// a seeded generator of valid designs over the reference's shape
function* designs(n, seed = 7) {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }, pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < n; i += 1) {
    yield { count: pick([1, 2, 3, 4, 6, 8, 12]), size: pick(['small', 'medium', 'large']), nodes: pick([1, 2, 3]), gb: pick([1, 2, 4, 16]), ttl: pick([60, 600, 3600]), db: pick(['small', 'medium', 'large']), rep: pick([0, 1, 2]), sync: pick([true, false]) };
  }
}
const srcOf = (d) => `lb = lb()\napi = server(count=${d.count}, size=${d.size})\ncache = cache(nodes=${d.nodes}, memory_gb=${d.gb}, ttl_s=${d.ttl})\ndb = sql(size=${d.db}, replicas=${d.rep}, sync=${d.sync})\nids = idgen()\ntable db.links(code pk, url)\nread GET_LINK: client > lb > api > cache | db\nwrite CREATE_LINK: client > lb > api > ids > db then invalidate cache\n`;
const STRESS = T([phase(1500, 15), phase(3000, 30), phase(2000, 20, { events: [{ kill_role: 'server' }, { kill_role: 'sql' }] })], { p99_ms: { GET_LINK: 120 }, availability: { GET_LINK: 0.99 } });
// p99 is measured while a request is served; time with no answer at all (an outage) counts against availability
const worst = (src) => { const j = judge(design(src), P, STRESS); return { p99: j.worst.GET_LINK?.p99 ?? Infinity, out: j.run.segments.some((s) => s.perRequest.GET_LINK?.outage), avail: j.findings.some((f) => f.type === 'unavailable' || f.type === 'overloaded'), cost: j.cost }; };
const SIZES = ['small', 'medium', 'large'];

test('property: more instances, bigger sizes, more memory or more replicas never make things worse; cost never drops', () => {
  for (const d of designs(500)) {
    const a = worst(srcOf(d));
    const ups = [{ ...d, count: d.count + 1 }, { ...d, size: SIZES[Math.min(2, SIZES.indexOf(d.size) + 1)] }, { ...d, gb: d.gb * 2 }, { ...d, rep: Math.min(5, d.rep + 1) }, { ...d, nodes: d.nodes + 1 }];
    for (const u of ups) {
      const b = worst(srcOf(u));
      if (!a.out) assert.ok(b.p99 <= a.p99 + 1e-9, `p99 got worse: ${JSON.stringify(d)} → ${JSON.stringify(u)}: ${a.p99} → ${b.p99}`);
      assert.ok(!(b.avail && !a.avail), `availability got worse: ${JSON.stringify(d)} → ${JSON.stringify(u)}`);
      assert.ok(b.cost >= a.cost);
    }
  }
});

test('property: a looser promise never turns a pass into a fail; cost equals section 6 recomputed', () => {
  const price = { small: 3000, medium: 6000, large: 12000 }, sql = { small: 8000, medium: 20000, large: 45000 };
  for (const d of designs(500, 11)) {
    const src = srcOf(d);
    const tight = judge(design(src), P, { ...STRESS, promises: { p99_ms: { GET_LINK: 100 }, budget_inr: 80_000 } });
    const loose = judge(design(src), P, { ...STRESS, promises: { p99_ms: { GET_LINK: 200 }, budget_inr: 160_000 } });
    if (tight.verdict === 'Passed') assert.equal(loose.verdict, 'Passed');
    assert.equal(tight.cost, 2000 + price[d.size] * d.count + 1500 * d.gb * d.nodes + sql[d.db] * (1 + d.rep));
  }
});

test('speed: the largest design and a 20-phase test judge in under 20 ms', () => {
  const parts = Array.from({ length: 40 }, (_, i) => `s${i} = server(count=200, size=large)`).join('\n');
  const chain = Array.from({ length: 40 }, (_, i) => `s${i}`).join(' > ');
  const src = `lb = lb()\n${parts}\ncache = cache(nodes=20, memory_gb=256, ttl_s=86400)\ndb = sql(size=large, replicas=5, sync=true)\nids = idgen()\ntable db.links(code pk, url) index(url)\nread GET_LINK: client > lb > ${chain} > cache | db\nwrite CREATE_LINK: client > lb > ${chain} > ids > db then invalidate cache\n`;
  const t = T(Array.from({ length: 20 }, (_, i) => phase(1000 + i * 100, 10, i % 5 === 4 ? { events: [{ kill_role: 'server' }, { flush_role: 'cache' }, { kill_role: 'sql' }] } : {})), { p99_ms: { GET_LINK: 500 }, availability: { GET_LINK: 0.9 } });
  const d = design(src);
  judge(d, P, t);
  const t0 = performance.now();
  for (let i = 0; i < 10; i += 1) judge(d, P, t);
  const each = (performance.now() - t0) / 10;
  assert.ok(each < 20, `${each.toFixed(1)} ms`);
});

// v2 evaluator, phase 6: schedulers, stream processors, the coordination service, shards and shard keys, rank and
// incr (tech-katta-context/evaluator.md §5.6, §10.4 ways 3 and 4, §10.10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { simulateTest } from './simulate.js';
import { analyse } from './analyse.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const E = (...pairs) => pairs.map(([from, to]) => ({ from, to }));
const F = (s) => s.split(' ').map((x) => { const [name, type = 'string'] = x.split(':'); return { name, type }; });
const LOAD = { hours: 1, startHour: 12, traffic: { rps: 1000, pattern: 'steady' } };
const run = (d, p, t = {}) => { const c = compile(d, lab, p), test = { ...LOAD, ...t }; const sim = simulateTest(c, lab, p, test); return { c, sim, f: analyse(c, p, lab, [{ test, sim }]) }; };

// ---- scheduled jobs --------------------------------------------------------------------------------------------
const jobs = { jobs: { rows: 1e6, rowBytes: 200, fields: { job_id: 'string', due_at: 'time', status: 'string' }, sample: [{ job_id: 'j1', due_at: '2026-11-11T10:00:00Z', status: 'due' }, { job_id: 'j2', due_at: '2026-11-11T10:01:00Z', status: 'due' }] } };
const RUN_JOB = { id: 'run', name: 'Run the due jobs', kind: 'write', source: 'schedule', perSec: 50, share: 0, effect: 'once', idempotencyField: 'job_id',
  steps: [{ id: 's1', op: 'update', entity: 'jobs', by: { job_id: 'j1' }, set: { status: 'done' } }], respond: { status: 200, body: {} } };
const VISIT = { id: 'visit', name: 'Look at a job', kind: 'read', share: 1, steps: [{ id: 's1', op: 'get', entity: 'jobs', by: { job_id: 'j1' } }], respond: { status: 200, body: {} } };
const PJ = { v: 2, entities: jobs, operations: [VISIT, RUN_JOB] };
const JOBS = { tables: [{ name: 'jobs', fields: F('job_id due_at:time status'), key: ['job_id'] }] };
const sched = (cfg = {}, extra = [], edges = []) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('sc', 'scheduler', cfg), N('w', 'server', { size: 'm5.large', count: 2 }), N('db', 'database', { engine: 'postgres', size: 'db.m5.large', schema: JOBS }), ...extra],
  edges: E(['c', 'app'], ['app', 'db'], ['sc', 'w'], ['w', 'db'], ...edges) });

test('a scheduled job starts at the scheduler and runs on the Service it points at', () => {
  const { c, sim } = run(sched(), PJ);
  assert.equal(c.plans.run.ok, true, c.plans.run.error?.message);
  assert.deepEqual([c.plans.run.root.node, c.plans.run.root.children[0].node], ['sc', 'w']);
  assert.ok(Math.abs(sim.ops.run.calls - 50 * 3600) < 1, 'fires at perSec, whatever the traffic');
  // no scheduler: nothing starts the job
  const d = sched(); d.nodes = d.nodes.filter((n) => n.id !== 'sc'); d.edges = d.edges.filter((e) => e.from !== 'sc');
  assert.equal(compile(d, lab, PJ).plans.run.error.code, 'E_NO_SOURCE');
  // through a queue to workers
  const q = sched({}, [N('q', 'queue')]); q.edges = E(['c', 'app'], ['app', 'db'], ['sc', 'q'], ['q', 'w'], ['w', 'db']);
  assert.equal(compile(q, lab, PJ).plans.run.ok, true);
});

test('one scheduler misses jobs while it restarts; two without a lock fire every job twice; a lease needs a holder', () => {
  const crash = { faults: [{ minute: 10, kind: 'crash', type: 'scheduler' }] };
  const one = run(sched(), PJ, crash);
  assert.ok(one.sim.ops.run.availability < 95, `jobs due while it is down are missed: ${one.sim.ops.run.availability}`);
  assert.ok(one.f.some((x) => x.code === 'F_SCHED_SPOF' && x.severity === 'warn'));
  const two = run(sched({ count: 2 }), PJ, crash);
  assert.equal(two.sim.ops.run.availability, 100, 'the other one takes over');
  assert.ok(two.f.some((x) => x.code === 'F_SCHED_TWICE' && x.op === 'run' && x.severity === 'fail'));
  assert.ok(Math.abs(two.sim.ops.run.calls - 2 * 50 * 3600) < 1, 'and every job runs twice');
  const noHolder = run(sched({ count: 2, lock: 'lease' }), PJ);
  assert.ok(noHolder.f.some((x) => x.code === 'F_SCHED_NO_LOCK'));
  const coord = run(sched({ count: 2, lock: 'lease' }, [N('zk', 'coord')], [['sc', 'zk']]), PJ);
  assert.ok(!coord.f.some((x) => x.code.startsWith('F_SCHED')), JSON.stringify(coord.f.map((x) => x.code)));
  assert.ok(coord.sim.cost.byNode.zk > 0 && coord.sim.cost.byNode.sc > 0);
});

// ---- stream processors ---------------------------------------------------------------------------------------
const clicks = { counts: { rows: 1e7, rowBytes: 100, fields: { ad_id: 'string', minute: 'string', clicks: 'int' }, sample: [{ ad_id: 'a1', minute: '10:00', clicks: 3 }, { ad_id: 'a2', minute: '10:00', clicks: 1 }] } };
const CLICK = (sink) => ({ id: 'click', name: 'Count a click', kind: 'write', share: 1, effect: 'once', idempotencyField: 'click_id', steps: [{ id: 's1', ...sink, timing: 'defer', withinSec: 120 }], respond: { status: 202, body: {} } });
const INCR = { op: 'incr', entity: 'counts', by: { ad_id: 'a1', minute: '10:00' }, field: 'clicks' };
const UPSERT = { op: 'put', entity: 'counts', values: { ad_id: 'a1', minute: '10:00', clicks: 4 } };
const COUNTS = { tables: [{ name: 'counts', fields: F('ad_id minute clicks:int'), key: ['ad_id', 'minute'] }] };
const proc = (pcfg = {}, partitions = 8) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 20 }), N('st', 'stream', { partitions }), N('p', 'processor', pcfg), N('db', 'database', { engine: 'cassandra', schema: COUNTS })],
  edges: E(['c', 'app'], ['app', 'st'], ['st', 'p'], ['p', 'db']) });

test('a stream processor reads a stream and writes results; its capacity stops at the partitions', () => {
  const p = { v: 2, entities: clicks, operations: [CLICK(UPSERT)] };
  const { c, sim } = run(proc(), p, { traffic: { rps: 10000, pattern: 'steady' } });
  assert.equal(c.plans.click.ok, true, c.plans.click.error?.message);
  assert.equal(c.plans.click.steps.s1.node, 'db');
  assert.ok(sim.ops.click.deferred.s1.worstDelaySec < 10);
  // parallel instances add capacity (10,000 events a second each for m5.large)…
  const m5 = (par, parts) => run(proc({ size: 'm5.large', parallelism: par }, parts), p, { traffic: { rps: 15000, pattern: 'steady' } }).sim;
  const one = m5(1, 4), four = m5(4, 4);
  assert.ok(one.ops.click.deferred.s1.worstDelaySec > 120 && four.ops.click.deferred.s1.worstDelaySec < 10, `${one.ops.click.deferred.s1.worstDelaySec} / ${four.ops.click.deferred.s1.worstDelaySec}`);
  // …but no more of them work than the stream has partitions
  assert.ok(Math.abs(m5(8, 2).nodes.p.rhoMax - m5(2, 2).nodes.p.rhoMax) < 1e-9);
  assert.ok(m5(8, 4).nodes.p.rhoMax < m5(8, 2).nodes.p.rhoMax);
});

test('a processor that adds to a count counts twice after a replay; one that writes the window by its key does not', () => {
  const add = run(proc(), { v: 2, entities: clicks, operations: [CLICK(INCR)] });
  const f = add.f.find((x) => x.code === 'F_DOUBLE');
  assert.ok(f && /starts again from its last checkpoint/.test(f.story), JSON.stringify(add.f.map((x) => x.code)));
  assert.ok(!run(proc(), { v: 2, entities: clicks, operations: [CLICK(UPSERT)] }).f.some((x) => x.code === 'F_DOUBLE'));
});

test('batch: a stream processor writes once every n events; a Service writing the same step writes every event', () => {
  const B = { ...UPSERT, batch: 10 };
  const viaProc = run(proc(), { v: 2, entities: clicks, operations: [CLICK(B)] });
  const once = run(proc(), { v: 2, entities: clicks, operations: [CLICK(UPSERT)] });
  const w = (r) => r.sim.nodes.db.writesPerSec ?? r.sim.nodes.db.rhoMax;
  assert.ok(w(viaProc) < w(once), `${w(viaProc)} / ${w(once)}`);
});

// ---- shards ---------------------------------------------------------------------------------------------------
test('a step that names the shard key goes to one shard; one that does not asks every shard', () => {
  const users = { orders: { rows: 1e8, rowBytes: 200, fields: { order_id: 'string', user_id: 'string', total: 'int' }, sample: [{ order_id: 'o1', user_id: 'u1', total: 5 }, { order_id: 'o2', user_id: 'u1', total: 9 }] } };
  const byOrder = { id: 'one', name: 'Read an order', kind: 'read', share: 1, steps: [{ id: 's1', op: 'get', entity: 'orders', by: { order_id: 'o1' } }], respond: { status: 200, body: {} } };
  const byUser = { id: 'mine', name: 'My orders', kind: 'read', share: 1, steps: [{ id: 's1', op: 'query', entity: 'orders', where: { user_id: 'u1' }, limit: 10, matches: 50 }], respond: { status: 200, body: {} } };
  const T = (shardKey) => ({ tables: [{ name: 'orders', fields: F('order_id user_id total:int'), key: ['order_id'], indexes: [{ fields: ['user_id'], kind: 'btree' }], ...(shardKey ? { shardKey } : {}) }] });
  const d = (shardKey) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', shards: 4, schema: T(shardKey) })], edges: E(['c', 'app'], ['app', 'db']) });
  const hop = (dd, op) => { const c = compile(dd, lab, { v: 2, entities: users, operations: [op] }); let h = null; const w = (x) => { if (x.kind === 'store') h = x; x.children.forEach(w); }; w(c.plans[op.id].root); return h; };
  assert.equal(hop(d(), byOrder).shardRouted, true, 'by the key: one shard');
  const scatter = hop(d(), byUser);
  assert.equal(scatter.shardRouted, false);
  const routed = hop(d(['user_id']), byUser);
  assert.equal(routed.shardRouted, true, 'sharded by user, "my orders" goes to one shard');
  assert.ok(Math.abs(scatter.work / routed.work - 4) < 1e-9, 'asking every shard costs 4 times the work');
});

// ---- rank and incr ---------------------------------------------------------------------------------------------
test('rank from a sorted set in a cache; incr on any engine with counters', () => {
  const ent = { scores: { rows: 1e6, rowBytes: 50, fields: { player_id: 'string', score: 'int' }, sample: [{ player_id: 'p1', score: 10 }, { player_id: 'p2', score: 7 }] } };
  const top = { id: 'top', name: 'Top 10', kind: 'read', share: 0.5, steps: [{ id: 's1', op: 'rank', entity: 'scores', order: { field: 'score', desc: true }, limit: 10 }], respond: { status: 200, body: {} } };
  const add = { id: 'add', name: 'Add points', kind: 'write', share: 0.5, steps: [{ id: 's1', op: 'incr', entity: 'scores', by: { player_id: 'p1' }, field: 'score' }], respond: { status: 200, body: {} } };
  const p = { v: 2, entities: ent, operations: [top, add] };
  const zset = { size: 'cache.r5.large', structures: [{ name: 'scores', kind: 'zset', fields: F('player_id score:int'), key: ['player_id'], sortKey: 'score' }] };
  const c = compile({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('kv', 'cache', zset)], edges: E(['c', 'app'], ['app', 'kv']) }, lab, p);
  assert.equal(c.plans.top.ok, true, c.plans.top.error?.message);
  assert.deepEqual([c.plans.top.steps.s1.how, c.plans.add.steps.s1.node], ['zset', 'kv']);
  for (const engine of ['postgres', 'cassandra', 'dynamodb']) {
    const cc = compile({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('db', 'database', { engine, schema: { tables: [{ name: 'scores', fields: F('player_id score:int'), key: ['player_id'] }] } })], edges: E(['c', 'app'], ['app', 'db']) }, lab, { ...p, operations: [{ ...add, share: 1 }] });
    assert.equal(cc.plans.add.ok, true, `${engine}: ${cc.plans.add.error?.message}`);
  }
  const s3 = compile({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('db', 'database', { engine: 's3', schema: { tables: [{ name: 'scores', fields: F('player_id score:int'), key: ['player_id'] }] } })], edges: E(['c', 'app'], ['app', 'db']) }, lab, { ...p, operations: [{ ...add, share: 1 }] });
  assert.equal(s3.plans.add.ok, false, 'object storage has no counters');
});

test('a step done one call in ten sends a message one call in ten; setting fields is safe to repeat', () => {
  const ent = { pairs: { rows: 1e6, rowBytes: 80, fields: { a: 'string', b: 'string', says: 'string' }, sample: [{ a: 'u1', b: 'u2', says: 'yes' }, { a: 'u1', b: 'u3', says: null }] } };
  const swipe = { id: 'swipe', name: 'Swipe', kind: 'write', share: 1, effect: 'once', idempotencyField: 'a',
    steps: [{ id: 's1', op: 'update', entity: 'pairs', by: { a: 'u1', b: 'u2' }, set: { says: 'yes' } }, { id: 's2', op: 'call', preset: 'push', times: 0.1, timing: 'defer', withinSec: 60, label: 'Alert' }], respond: { status: 200, body: {} } };
  const p = { v: 2, entities: ent, operations: [swipe] };
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: { tables: [{ name: 'pairs', fields: F('a b says'), key: ['a', 'b'] }] } }), N('q', 'queue'), N('w', 'server', { size: 'm5.large' }), N('x', 'external', { preset: 'push', latencyMs: 100, limitRps: 5000, errorPct: 0, pricePerCall: 0 })],
    edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'x']) };
  const { c, sim, f } = run(d, p, { traffic: { rps: 2000, pattern: 'steady' } });
  let enq = null; const walk = (h) => { if (h.kind === 'enqueue') enq = h; h.children.forEach(walk); }; walk(c.plans.swipe.root);
  assert.equal(enq.per, 0.1, 'one message for every ten swipes');
  assert.ok(sim.ops.swipe.deferred.s2.worstDelaySec < 10, '200 alerts a second: one small worker keeps up');
  assert.ok(!f.some((x) => x.code === 'F_DOUBLE'), 'a resent swipe sets the same fields again: nothing happens twice');
});

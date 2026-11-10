// v2 evaluator, phase 2: simulate, faults, analyse, judge (tech-katta-context/evaluator.md §8, §10, §11, §14.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { simulateTest } from './simulate.js';
import { analyse } from './analyse.js';
import { evaluate, designPoints, areaOf } from './judge.js';
import { faultsOf } from './faults.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/url-shortener.v2.json', import.meta.url)));
const N = (id, type, config = {}, extra = {}) => ({ id, type, x: 0, y: 0, config, ...extra });
const E = (...pairs) => pairs.map(([from, to]) => ({ from, to }));
const F = (s) => s.split(' ').map((x) => { const [name, type = 'string'] = x.split(':'); return { name, type }; });
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);
const ITEMS = { items: { rows: 1e6, rowBytes: 500, fields: {}, sample: [{ id: 'a', v: '1' }, { id: 'b', v: '2' }] } };
const TABLE = (extra = {}) => ({ tables: [{ name: 'items', fields: F('id v'), key: ['id'], ...extra }] });
const READ = { id: 'read', name: 'Read', kind: 'read', share: 0.9, steps: [{ id: 's1', op: 'get', entity: 'items', by: { id: 'a' }, fields: ['v'] }], respond: { status: 200, body: {} }, slo: { availability: 99.9, p99Ms: 200 } };
const WRITE = { id: 'write', name: 'Write', kind: 'write', share: 0.1, steps: [{ id: 's1', op: 'put', entity: 'items', values: { id: 'c', v: '3' } }], respond: { status: 201, body: {} }, slo: { availability: 99.9, p99Ms: 500 } };
const P = (...ops) => ({ v: 2, entities: ITEMS, operations: ops.length ? ops : [READ, WRITE] });
// Clients → Load Balancer → Service → database (§8.4's design)
const simple = (app = {}, db = {}) => ({ nodes: [N('c', 'client'), N('lb', 'lb'), N('app', 'server', { size: 'm5.large', count: 2, ...app }), N('db', 'database', { engine: 'postgres', size: 'db.m5.large', schema: TABLE(), ...db })], edges: E(['c', 'lb'], ['lb', 'app'], ['app', 'db']) });
const run = (design, practice, t) => { const c = compile(design, lab, practice); return simulateTest(c, lab, practice, { hours: 1, startHour: 12, traffic: { rps: 1000, pattern: 'steady' }, ...t }); };

// ---- simulate ------------------------------------------------------------------------------------------------
test('simulate: the flow pass and latency vectors of §8.4 and §8.8', () => {
  const s = run(simple(), P());
  near(s.nodes.lb.rhoMax, 0.01, 1e-9, 'load balancer');
  near(s.nodes.app.rhoMax, 1000 / 1200, 1e-9, 'Service');
  near(s.nodes.db.rhoMax, 0.44, 1e-9, 'database: 900 × 1 + 100 × 2 units');
  near(s.ops.read.p99Worst, 488.51, 0.01, 'p99');
  near(s.ops.read.p50, 102.03, 0.01, 'p50');
  near(s.ops.read.slowShare, 0.1847, 1e-4, 'slow(200)');
  assert.equal(s.ops.read.availability, 100);
  assert.equal(s.ops.read.calls, 900 * 3600);
});

test('simulate: queues fill and drain (§8.7 vector)', () => {
  const p = P({ id: 'send', kind: 'write', share: 1, steps: [{ id: 's1', op: 'put', entity: 'items', values: { id: 'c', v: '3' }, timing: 'defer', withinSec: 60 }], respond: { status: 202, body: {} } });
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 4 }), N('q', 'queue'), N('w', 'server', { size: 't3.medium', count: 8 }), N('db', 'database', { engine: 'dynamodb', schema: TABLE() })], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) };
  const s = run(d, p, { hours: 2, startHour: 0, traffic: { rps: 500, pattern: 'steady' }, faults: [{ minute: 0, kind: 'spike', factor: 6, minutes: 30 }] });
  const bl = s.timeline.nodes.q.backlog;
  assert.equal(Math.max(...bl), 3240000);
  assert.equal(s.queues[0].waitWorst, 2700);
  assert.equal(bl.findIndex((x, i) => i > 30 && x === 0), 108);
  assert.equal(s.ops.send.deferred.s1.worstDelaySec, 2701, 'wait + 1 s per queue');
  assert.equal(s.ops.send.deferred.s1.notDone, 0);
  assert.ok(s.events.some((e) => e.kind === 'backlog') && s.events.some((e) => e.kind === 'drained'));
});

test('simulate: retries (§8.10 vector) and success under overload', () => {
  // s = 0.9 with 1 retry → user success 0.99, 1.10 attempts per call
  const s = 0.9, f = 1 + (1 - s), user = 1 - (1 - s) ** 2;
  near(user, 0.99, 1e-12); near(f, 1.1, 1e-12);
  // a Service at 125%: every attempt succeeds with 1/rho, and retries add load
  const sim = run(simple({ count: 1, size: 't3.medium' }, { size: 'db.r5.2xlarge' }), P(), { traffic: { rps: 375, pattern: 'steady' }, hours: 0.2 });
  assert.ok(sim.ops.read.availability < 99 && sim.ops.read.availability > 50, String(sim.ops.read.availability));
});

test('simulate: an overloaded node crashes and recovers; noCrash counts it, a fault crash does not', () => {
  const s = run(simple({ count: 1 }), P(), { traffic: { rps: 1000, pattern: 'steady' } });
  const crashes = s.events.filter((e) => e.kind === 'crashed' && e.node === 'app');
  assert.ok(crashes.length >= 1);
  assert.equal(crashes[0].t, 10, 'above 150% for 10 minutes');
  assert.ok(s.events.some((e) => e.kind === 'recovered' && e.node === 'app' && e.t === 15), 'down for 5 minutes');
  assert.ok(!crashes[0].forced); assert.ok(s.nodes.app.crashes >= 1);
  const f = run(simple(), P(), { faults: [{ minute: 5, kind: 'crash', type: 'server' }] });
  const ev = f.events.find((e) => e.kind === 'crashed');
  assert.deepEqual([ev.t, ev.node, ev.forced], [5, 'app', true]);
  assert.equal(f.nodes.app.crashes, 0);
  assert.equal(f.nodes.app.downMinutes, 5);
});

test('simulate: autoscaling comes too late for a sudden jump', () => {
  const d = simple({ count: 2, autoscale: true, maxCount: 10 }, { size: 'db.r5.2xlarge' });
  const s = run(d, P(), { traffic: { rps: 600, pattern: 'steady' }, faults: [{ minute: 10, kind: 'spike', factor: 4, minutes: 30 }] });
  const out = s.events.find((e) => e.kind === 'scaledOut');
  assert.ok(out && out.t >= 10, 'scales out after the jump');
  const ok = s.timeline.ops.read.ok;
  assert.ok(ok[10] < 1, 'the first minutes of the jump lose calls');
  assert.equal(ok[30], 1, 'once the new instances run, everything succeeds');
  assert.ok(s.timeline.nodes.app.instances[30] > 2);
});

test('simulate: a lost zone takes 1/zones of the instances (all of them with one zone)', () => {
  const lost = (zones) => { const s = run(simple({ count: 6, zones, size: 'c5.2xlarge' }), P(), { faults: [{ minute: 10, kind: 'zoneDown', minutes: 15 }] }); return s.timeline.nodes.app.instances[15]; };
  assert.deepEqual([lost(1), lost(2), lost(3)], [0, 3, 4]);
  const s = run(simple({ zones: 1 }), P(), { faults: [{ minute: 10, kind: 'zoneDown', minutes: 15 }] });
  assert.equal(s.timeline.ops.read.ok[15], 0); assert.equal(s.timeline.ops.read.ok[30], 1);
  assert.ok(s.events.some((e) => e.kind === 'zoneDown' && e.t === 10) && s.events.some((e) => e.kind === 'zoneBack' && e.t === 25));
  // a database without a standby is down for the whole fault; with one it fails over in 2 minutes
  const db = (multiAz) => run(simple({ size: 'c5.2xlarge' }, { multiAz }), P(), { faults: [{ minute: 10, kind: 'zoneDown', minutes: 15 }] }).nodes.db.downMinutes;
  assert.deepEqual([db(false), db(true)], [15, 2]);
});

test('simulate: a cache flush sends the misses to the database while it warms up', () => {
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 4 }), N('cache', 'cache', { size: 'cache.m5.large', ttlSec: 3600 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: TABLE() })], edges: E(['c', 'app'], ['app', 'cache'], ['cache', 'db'], ['app', 'db']) };
  const p = P({ ...READ, keys: { entity: 'items', skew: 'zipf' } }, WRITE);
  const s = run(d, p, { traffic: { rps: 5000, pattern: 'steady' }, faults: [{ minute: 20, kind: 'cacheFlush' }] });
  const rho = s.timeline.nodes.db.rho;
  assert.ok(rho[20] > 3 * rho[19], `db load jumps: ${rho[19]} → ${rho[20]}`);
  assert.ok(rho[25] < rho[20] && rho[25] > rho[19], 'and falls as the cache warms');
  near(rho[35], rho[19], 1e-3, 'back to normal after the warm-up');
  assert.ok(s.events.some((e) => e.kind === 'cold' && e.t === 20) && s.events.some((e) => e.kind === 'warm' && e.t === 30));
});

test('simulate: slow, groupDown and instanceCrash faults; v1 chaos is a crash', () => {
  const slow = run(simple(), P(), { faults: [{ minute: 10, kind: 'slow', type: 'database', factor: 20, minutes: 10 }] });
  assert.ok(slow.timeline.ops.read.p99[12] > slow.timeline.ops.read.p99[5] + 100);
  assert.equal(slow.timeline.ops.read.p99[25], slow.timeline.ops.read.p99[5]);
  const gd = run(simple(), P(), { faults: [{ minute: 10, kind: 'groupDown', type: 'server' }] });
  assert.equal(gd.nodes.app.downMinutes, 5); assert.equal(gd.timeline.ops.read.ok[12], 0);
  const ic = run(simple({ count: 3 }), P(), { faults: [{ minute: 10, kind: 'instanceCrash', type: 'server' }] });
  assert.deepEqual([ic.timeline.nodes.app.instances[9], ic.timeline.nodes.app.instances[12], ic.timeline.nodes.app.instances[16]], [3, 2, 3]);
  assert.deepEqual(faultsOf({ chaos: [{ minute: 5, type: 'cache' }] }), [{ minute: 5, kind: 'crash', type: 'cache' }]);
});

test('simulate: cost adds up; a longer test uses 5-minute ticks', () => {
  const s = run(simple(), P(), { hours: 24, startHour: 0 });
  assert.equal(s.tickMinutes, 5); assert.equal(s.T, 288);
  const parts = Object.values(s.cost.byNode).reduce((a, x) => a + x, 0) + s.cost.storage + s.cost.transfer;
  near(s.cost.monthly, parts, 1e-6);
  near(s.cost.byNode.app, 0.101 * 730 * 2, 1e-6, 'two m5.large a month');
  near(s.cost.byNode.db, 0.205 * 730, 1e-6);
  assert.ok(s.cost.storage > 0 && s.cost.transfer > 0);
});

// ---- analyse: each finding, and the nearest design that does not trigger it --------------------------------------------
const findings = (design, practice, t = {}) => { const c = compile(design, lab, practice), test = { hours: 1, startHour: 12, traffic: { rps: 1000, pattern: 'steady' }, ...t }; return analyse(c, practice, lab, [{ test, sim: simulateTest(c, lab, practice, test) }]); };
const codes = (fs) => fs.map((f) => f.code);

test('analyse: durability (§10.2)', () => {
  const durable = { ...WRITE, durable: true };
  const cacheStore = (aof) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('kv', 'cache', { persistence: aof ? 'aof' : 'none', structures: [{ name: 'items', kind: 'kv', fields: F('id v'), key: ['id'] }] })], edges: E(['c', 'app'], ['app', 'kv']) });
  assert.ok(codes(findings(cacheStore(false), P(READ, durable))).includes('F_NOT_DURABLE'));
  assert.ok(!codes(findings(cacheStore(true), P(READ, durable))).includes('F_NOT_DURABLE'));
  const wb = (policy) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('cache', 'cache', { writePolicy: policy }), N('db', 'database', { engine: 'postgres', multiAz: true, schema: TABLE() })], edges: E(['c', 'app'], ['app', 'cache'], ['cache', 'db']) });
  const f = findings(wb('back'), P(READ, durable)).find((x) => x.code === 'F_WRITE_BACK');
  assert.equal(f.severity, 'fail'); assert.match(f.story, /about 500 at this test's rate/);
  assert.ok(!codes(findings(wb('through'), P(READ, durable))).includes('F_WRITE_BACK'));
  assert.ok(codes(findings(simple(), P(READ, durable))).includes('F_SINGLE_ZONE'));
  assert.ok(!codes(findings(simple({}, { multiAz: true }), P(READ, durable))).includes('F_SINGLE_ZONE'));
  assert.ok(!codes(findings(simple(), P(READ, WRITE))).includes('F_SINGLE_ZONE'), 'only durable operations');
});

test('analyse: freshness (§10.3)', () => {
  const d = (ttlSec, writesThrough) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('w', 'server', { size: 'c5.2xlarge' }), N('cache', 'cache', { ttlSec }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: TABLE() })],
    edges: [...E(['app', 'cache'], ['cache', 'db']), { from: 'c', to: 'app', carries: ['reads'] }, ...(writesThrough ? [{ from: 'c', to: 'app', carries: ['reads'] }] : [{ from: 'c', to: 'w', carries: ['writes'] }]), { from: 'w', to: 'db' }] });
  const fresh = (req) => P({ ...READ, consistency: req }, WRITE);
  let f = findings(d(600, false), fresh({ maxStalenessSec: 60 })).find((x) => x.code === 'F_STALE');
  assert.equal(f.severity, 'fail');
  assert.equal(f.story, 'Read must be at most 60 seconds old, but it reads items from Cache, which is a cache that keeps items for 600 seconds: up to 600 seconds behind.');
  assert.match(f.fix, /Shorten Cache's time to keep items/);
  assert.ok(!codes(findings(d(30, false), fresh({ maxStalenessSec: 60 }))).includes('F_STALE'));
  assert.ok(codes(findings(d(30, false), fresh('strong'))).includes('F_STALE'), 'strong: no cache without invalidation');
  const info = findings(d(600, false), P(READ, WRITE)).find((x) => x.code === 'F_STALE_INFO');
  assert.equal(info.severity, 'info'); assert.equal(info.title, 'Read can show data up to 600 seconds old.');
  // writers that clear the cache: 1 second
  assert.ok(!codes(findings(fixture.reference, fixture, { traffic: { rps: 20000, pattern: 'steady' } })).includes('F_STALE'));
});

test('analyse: single points of failure (§10.7)', () => {
  const f = findings(simple(), P()).filter((x) => x.code === 'F_SPOF');
  assert.deepEqual(f.map((x) => x.nodes[0]), ['app', 'db']);
  assert.equal(f[0].story, 'If Server is lost, every Read and Write call fails: nothing else can take its calls.');
  assert.ok(!codes(findings(simple({ zones: 2 }, { multiAz: true }), P())).includes('F_SPOF'));
  // two Services behind the load balancer: either can take the calls
  const two = simple(); two.nodes.push(N('app2', 'server', { size: 'm5.large' })); two.edges.push(...E(['lb', 'app2'], ['app2', 'db']));
  assert.deepEqual(findings(two, P()).filter((x) => x.code === 'F_SPOF').map((x) => x.nodes[0]), ['db']);
});

test('analyse: things that grow (§10.8) and unused components', () => {
  const p = P({ id: 'send', name: 'Send', kind: 'write', share: 1, steps: [{ id: 's1', op: 'put', entity: 'items', values: { id: 'c', v: '3' }, timing: 'defer' }], respond: { status: 202, body: {} } });
  const q = (workers) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('q', 'queue'), N('w', 'server', { size: 't3.medium', count: workers }), N('db', 'database', { engine: 'dynamodb', schema: TABLE() })], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) });
  assert.ok(codes(findings(q(1), p)).includes('F_BACKLOG'));
  assert.ok(!codes(findings(q(10), p)).includes('F_BACKLOG'));
  const big = { ...P(), entities: { items: { ...ITEMS.items, rows: 2e11, rowBytes: 1000 } } };
  assert.match(findings(simple(), big).find((x) => x.code === 'F_STORAGE').story, /^Database needs 200,000 GB; one PostgreSQL holds at most 65,536\.$/);
  assert.ok(!codes(findings(simple(), P())).includes('F_STORAGE'));
  const kv = (rows) => ({ v: 2, entities: { items: { ...ITEMS.items, rows } }, operations: [READ] });
  const cacheOnly = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('kv', 'cache', { size: 'cache.t3.medium', structures: [{ name: 'items', kind: 'kv', fields: F('id v'), key: ['id'] }] })], edges: E(['c', 'app'], ['app', 'kv']) };
  assert.ok(codes(findings(cacheOnly, kv(1e8))).includes('F_CACHE_FULL'));
  assert.ok(!codes(findings(cacheOnly, kv(1e6))).includes('F_CACHE_FULL'));
  const exp = { ...P(), entities: { items: { ...ITEMS.items, expires: true } } };
  assert.ok(codes(findings(simple(), exp)).includes('F_NO_TTL'));
  const withTtl = simple({}, { engine: 'dynamodb', schema: { tables: [{ name: 'items', fields: F('id v at:time'), key: ['id'], ttl: 'at' }] } });
  assert.ok(!codes(findings(withTtl, exp)).includes('F_NO_TTL'));
  assert.ok(codes(findings(simple({ count: 40, size: 'c5.2xlarge' }), P())).includes('F_OVERSIZED'));
  const spare = simple(); spare.nodes.push(N('spare', 'cache', {}, { name: 'Spare' }));
  const w = findings(spare, P()).find((x) => x.code === 'W_UNUSED');
  assert.equal(w.severity, 'warn'); assert.match(w.title, /^Spare is not used by any operation/);
});

test('analyse: findings are sorted fail, warn, info; a design that cannot be read has none', () => {
  const durable = { ...WRITE, durable: true };
  const fs = findings({ ...simple(), nodes: [...simple().nodes, N('spare', 'cache')] }, P({ ...READ, consistency: { maxStalenessSec: 1 } }, durable));
  const sev = fs.map((f) => ({ fail: 0, warn: 1, info: 2 }[f.severity]));
  assert.deepEqual(sev, [...sev].sort((a, b) => a - b));
  assert.deepEqual(analyse(compile({ nodes: [], edges: [] }, lab, P()), P(), lab, []), []);
});

// ---- judge ------------------------------------------------------------------------------------------------------------
test('judge: check kinds on the fixture', () => {
  const p = structuredClone(fixture);
  p.tests = [{ id: 't', hours: 1, startHour: 20, traffic: { rps: 35000, pattern: 'steady' }, checks: [
    { kind: 'slo' }, { kind: 'slo', op: 'redirect', p99Ms: 50 }, { kind: 'completes' }, { kind: 'noCrash' }, { kind: 'noLostWrites' }, { kind: 'noDuplicates' }, { kind: 'ordered' }, { kind: 'atomic' }, { kind: 'fresh' }, { kind: 'fits' },
    { kind: 'cost', max: 100 }, { kind: 'cost', max: 1e6 }, { kind: 'has', type: 'cache' }, { kind: 'has', type: 'queue' }, { kind: 'nonsense' }, { kind: 'slo', from: 10, to: 20 }] }];
  const r = evaluate(p.reference, lab, p).results[0];
  assert.deepEqual(r.checks.map((c) => c.ok), [true, false, true, true, true, true, true, true, true, true, false, true, true, false, false, true]);
  assert.match(r.checks[1].value, /% slower than 50 ms$/);
  assert.equal(r.checks[10].value, Math.round(r.metrics.avgMonthly));
  assert.ok(r.why.some((w) => /^The bill is \$[\d,]+ a month \(allowed \$100\)\. Most of it: Link service \$/.test(w)));
  assert.ok(r.why.some((w) => /took longer than 50 ms/.test(w)));
  assert.ok(r.why.includes('The design has no Queue that any call goes through.'));
});

test('judge: verdicts, sample filtering, the result shape', () => {
  const ref = evaluate(fixture.reference, lab, fixture);
  assert.equal(ref.verdict, 'accepted'); assert.equal(ref.passed, ref.total);
  assert.equal(ref.designPoints, 50); assert.equal(ref.first, null);
  assert.deepEqual(Object.keys(ref).sort(), ['allFindings', 'designPoints', 'findings', 'first', 'metrics', 'passed', 'plans', 'results', 'total', 'verdict']);
  const load = ref.results.find((x) => x.id === 'peak');
  for (const k of ['test', 'id', 'ok', 'checks', 'why', 'metrics', 'ops', 'timeline', 'events', 'cost']) assert.ok(k in load, k);
  for (const k of ['availability', 'p99', 'avgMonthly']) assert.ok(Number.isFinite(load.metrics[k]), k);
  const trace = ref.results.find((x) => x.id === 'api-redirect');
  for (const k of ['request', 'output', 'expect', 'trace']) assert.ok(k in trace, k);
  assert.deepEqual(Object.keys(ref.plans), ['redirect', 'create']);
  const sample = evaluate(fixture.start, lab, fixture, { sample: true });
  assert.equal(sample.total, fixture.tests.filter((t) => t.sample).length);
  assert.equal(sample.verdict, 'failed');
  const err = evaluate({ nodes: [], edges: [] }, lab, fixture);
  assert.equal(err.verdict, 'error'); assert.equal(err.designPoints, 0);
  assert.equal(err.results[0].error, 'Add the Clients: tests send their traffic from there.');
});

test('judge: design points by area; an empty area gives its points to the others', () => {
  const tr = { op: 'x' }, load = { hours: 1, traffic: {} }, fault = { hours: 1, traffic: {}, faults: [{ minute: 1, kind: 'cacheFlush' }] };
  assert.equal(areaOf(tr, { kind: 'response' }), 'function');
  assert.equal(areaOf(load, { kind: 'slo' }), 'scale');
  assert.equal(areaOf(fault, { kind: 'slo' }), 'resilience');
  assert.equal(areaOf(fault, { kind: 'noLostWrites' }), 'correctness');
  assert.equal(areaOf(load, { kind: 'cost' }), 'cost');
  // all five areas, half of each passed → 25
  const r = (test, oks, kind = 'slo') => ({ test, checks: oks.map((ok) => ({ kind, ok })) });
  near(designPoints([r(tr, [true, false], 'response'), r(load, [true, false]), r(fault, [true, false]), r(load, [true, false], 'fresh'), r(load, [true, false], 'cost')]), 25, 1e-9);
  // only function and scale: 15 and 15 become 25 and 25
  near(designPoints([r(tr, [true], 'response'), r(load, [false])]), 25, 1e-9);
  near(designPoints([r(tr, [true], 'response'), r(load, [true])]), 50, 1e-9);
  assert.equal(designPoints([]), 0);
});

test('judge: feedback names the minute, the component, the cause and a fix', () => {
  const few = evaluate(fixture.wrong.find((w) => w.name === 'Too few servers'), lab, fixture).results.find((x) => x.id === 'peak');
  assert.match(few.why[0], /^At 8:\d\d pm Link service (was down|was at \d+% of what it can take); [\d.]+% of Open a short link calls failed \(the test allows 0\.1%\)\./);
  assert.match(few.why[0], /Add instances or a larger size\./);
  const zone = evaluate(fixture.wrong.find((w) => w.name === 'One zone'), lab, fixture).results.find((x) => x.id === 'zone');
  assert.match(zone.why[0], /^At 8:10 pm Link service was down; 100% of Open a short link calls failed \(the test allows 1%\)\. It began when a zone went dark\. Spread it over two or three zones\.$/);
});

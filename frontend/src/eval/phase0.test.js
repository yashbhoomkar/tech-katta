// v2 evaluator, phase 0: catalogue, design cleaning, graph, latency and hit-rate maths
// (tech-katta-context/evaluator.md §5, §7.1, §7.2, §8.6, §8.8). The numbers are the spec's test vectors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evalCatalogue, settingsOf, configOf, allowedEdge, capsOf, cleanDesign2, cleanStructures } from './design.js';
import { buildGraph } from './graph.js';
import { phi, gammaQ, gammaTail, hopTime, summarise, slowShare, mix, harmonic, harmonic2 } from './latency.js';
import { hitCap, expiryMiss, cacheHit, cdnHit, itemsThatFit } from './hits.js';
import { evaluate } from './index.js';
import { judge, score } from '../judge/judge.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const near = (a, b, tol = 0.005, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);
const N = (id, type, config = {}, extra = {}) => ({ id, type, x: 0, y: 0, config, ...extra });

// ---- catalogue -------------------------------------------------------------------------------------------
test('the v2 catalogue has the 8 v1 types merged with lab.json, and the v2-only types (phases 4 and 6)', () => {
  const cat = evalCatalogue(lab);
  assert.deepEqual(Object.keys(cat), ['client', 'cdn', 'apigw', 'lb', 'server', 'database', 'cache', 'queue', 'external', 'realtime', 'stream', 'pubsub', 'scheduler', 'processor', 'coord']);
  assert.equal(cat.stream.name, 'Event stream', 'a v2-only type carries its own name');
  assert.ok(!lab.components.some((c) => c.type === 'stream'), "v1's catalogue doesn't have it");
  assert.equal(cat.server.latencyMs, 20, 'numbers from lab.json');
  assert.ok(cat.server.settings.some((s) => s.key === 'zones'), 'settings from eval.json');
  assert.equal(evalCatalogue({ ...lab, eval: undefined }).server, undefined, 'no eval.json, no v2 types');
});

test('every engine in lab.json has capabilities in eval.json, and they agree with its features where both speak', () => {
  const engines = lab.components.find((c) => c.type === 'database').engines;
  const same = { transactions: 'tx', geo: 'geo', fullText: 'text', aggregate: 'agg', ttl: 'ttl', blobs: 'blob' };
  for (const e of engines) {
    const caps = lab.eval.engines[e.id]?.caps;
    assert.ok(Array.isArray(caps), `caps for ${e.id}`);
    for (const [feature, cap] of Object.entries(same)) if ((e.features || []).includes(feature)) assert.ok(caps.includes(cap), `${e.id}: feature ${feature} but no ${cap}`);
  }
});

// ---- settings -----------------------------------------------------------------------------------------
test('configOf fills defaults, keeps valid values and replaces invalid ones', () => {
  const c = configOf(N('s', 'server', { count: 4, zones: 9, timeoutMs: 'x', size: 'c5.2xlarge', bogus: 1 }), lab);
  assert.equal(c.count, 4); assert.equal(c.zones, 3, 'clamped'); assert.equal(c.timeoutMs, 1000, 'default'); assert.equal(c.size, 'c5.2xlarge');
  assert.equal(c.bogus, undefined); assert.equal(c.autoscale, false); assert.equal(c.maxCount, 10);
  assert.equal(configOf(N('s', 'server', { count: 20, maxCount: 5 }), lab).maxCount, 20, 'the ceiling is never below the floor');
  const db = configOf(N('d', 'database', { engine: 'dynamodb', size: 'db.m5.large' }), lab);
  assert.equal(db.engine, 'dynamodb'); assert.equal(db.size, undefined, 'a per-request engine has no size');
  assert.equal(configOf(N('d', 'database', {}), lab).engine, 'postgres');
  assert.equal(configOf(N('d', 'database', {}), lab).size, 'db.m5.large');
  assert.deepEqual(configOf(N('x', 'rocket'), lab), {});
  assert.ok(settingsOf('cache', lab).some((s) => s.key === 'ttlSec'));
});

test('cache structures are cleaned like schema tables and keep a known kind', () => {
  const s = cleanStructures([{ name: 'board', kind: 'zset', key: ['game'], fields: [{ name: 'game', type: 'string' }, { name: 'score', type: 'int' }] }, { name: 'bad', kind: 'nope', fields: [{ name: 'a' }] }]);
  assert.equal(s.length, 1); assert.equal(s[0].kind, 'zset'); assert.deepEqual(s[0].key, ['game']);
  assert.ok(capsOf(N('c', 'cache', { structures: s }), lab).includes('zset'));
  assert.ok(!capsOf(N('c', 'cache', {}), lab).includes('durable'));
  assert.ok(capsOf(N('c', 'cache', { persistence: 'aof' }), lab).includes('durable'));
});

// ---- arrows -------------------------------------------------------------------------------------------
test('allowed arrows follow eval.json: types, conditions on the target, and change data capture', () => {
  const ok = (a, b) => allowedEdge(a, b, lab);
  assert.ok(ok(N('c', 'client'), N('l', 'lb')));
  assert.ok(!ok(N('c', 'client'), N('d', 'database')), 'Clients reach a database only when it is object storage');
  assert.ok(ok(N('c', 'client'), N('d', 'database', { engine: 's3' })));
  assert.ok(ok(N('s', 'server'), N('d', 'database')));
  assert.ok(!ok(N('d', 'database'), N('s', 'server')), 'a database calls nothing');
  assert.ok(ok(N('d', 'database'), N('q', 'queue')), 'PostgreSQL emits its changes');
  assert.ok(!ok(N('d', 'database', { engine: 'cassandra' }), N('q', 'queue')), 'Cassandra has no change stream here');
  assert.ok(!ok(N('q', 'queue'), N('d', 'database')), 'a queue hands messages to workers only');
  assert.ok(!ok(N('s', 'server'), N('s', 'server')), 'no arrow to itself');
});

test('cleanDesign2 keeps valid parts in order, drops the rest, and changes nothing in a clean design', () => {
  const d = { nodes: [N('c', 'client'), N('lb', 'lb'), N('s', 'server', { count: 3 }), N('s', 'server'), N('x', 'rocket'), N('db', 'database', { engine: 'mysql', size: 'db.t3.medium', role: 'kv' }), { id: 'bad' }],
    edges: [{ from: 'c', to: 'lb' }, { from: 'lb', to: 's' }, { from: 's', to: 'db', carries: ['reads'] }, { from: 's', to: 'db' }, { from: 'db', to: 's' }, { from: 'c', to: 'x' }, { from: 'lb', to: 'c' }, { from: 'c', to: 's', carries: ['nope'] }] };
  const out = cleanDesign2(d, lab, ['redirect']);
  assert.deepEqual(out.nodes.map((n) => n.id), ['c', 'lb', 's', 'db']);
  assert.deepEqual(out.nodes[3].config, { engine: 'mysql', size: 'db.t3.medium' }, 'v1 roles are dropped');
  assert.deepEqual(out.edges, [{ from: 'c', to: 'lb' }, { from: 'lb', to: 's' }, { from: 's', to: 'db', carries: ['reads'] }, { from: 'c', to: 's' }]);
  assert.deepEqual(cleanDesign2(out, lab, ['redirect']), out, 'cleaning a clean design changes nothing');
  assert.deepEqual(cleanDesign2(null, lab), { nodes: [], edges: [] });
  const proto = cleanDesign2({ nodes: [N('__proto__', 'client'), N('constructor', 'lb')], edges: [{ from: '__proto__', to: 'constructor' }] }, lab);
  assert.equal(proto.nodes.length, 2); assert.equal(proto.edges.length, 1);
});

// ---- graph ----------------------------------------------------------------------------------------------
test('the graph: stable order, loops found, change data capture is not a loop', () => {
  const d = cleanDesign2({ nodes: [N('c', 'client'), N('s', 'server'), N('q', 'queue'), N('w', 'server'), N('db', 'database')],
    edges: [{ from: 'c', to: 's' }, { from: 's', to: 'db' }, { from: 'db', to: 'q' }, { from: 'q', to: 'w' }, { from: 'w', to: 'db' }] }, lab);
  const g = buildGraph(d, lab);
  assert.deepEqual(g.errors, []);
  assert.deepEqual(g.topo, ['c', 's', 'q', 'w', 'db']);
  assert.equal(g.cdcEdges.length, 1);
  const loop = buildGraph({ nodes: [N('c', 'client'), N('a', 'server'), N('b', 'server')], edges: [{ from: 'c', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }, lab);
  assert.deepEqual(loop.errors.map((e) => e.code), ['E_LOOP']);
  assert.deepEqual(buildGraph({ nodes: [N('s', 'server')], edges: [] }).errors.map((e) => e.code), ['E_NO_CLIENTS']);
  assert.deepEqual(buildGraph({ nodes: [N('c', 'client')], edges: [] }).errors.map((e) => e.code), ['E_CLIENTS_ALONE']);
  const cdc = buildGraph({ nodes: [N('c', 'client'), N('s', 'server'), N('db', 'database', { engine: 'cassandra' }), N('q', 'queue')], edges: [{ from: 'c', to: 's' }, { from: 's', to: 'db' }, { from: 'db', to: 'q' }] }, lab);
  assert.deepEqual(cdc.errors.map((e) => e.code), ['E_CDC']);
});

// ---- latency (evaluator.md §8.8 vectors) -------------------------------------------------------------------
test('normal CDF and gamma quantiles', () => {
  near(phi(0), 0.5, 1e-4); near(phi(1.6449), 0.95, 1e-4); near(phi(-2.3263), 0.01, 1e-4);
  near(gammaQ(100, 10000, 0.99), 461.01, 0.01, 'exponential p99 (exact 460.52)');
  near(gammaQ(100, 10000, 0.5), 70.23, 0.01, 'exponential median (exact 69.31)');
  assert.equal(gammaQ(0, 0, 0.99), 0); assert.equal(gammaQ(50, 0, 0.99), 50);
  for (const k of [0.2, 1, 3, 10, 50]) { const M = 40, V = M * M / k; near(gammaTail(M, V, gammaQ(M, V, 0.99)), 0.01, 0.002, `tail at p99, k=${k}`); }
  assert.ok(gammaQ(40, 900, 0.9) < gammaQ(40, 900, 0.99) && gammaQ(40, 900, 0.99) < gammaQ(40, 900, 0.999));
});

test('a three-hop path: the spec vector', () => {
  const hops = [hopTime(2, 1000 / 100000), hopTime(20, 1000 / 1200), hopTime(5, (900 + 200) / 2500)];
  const F = hops.reduce((a, h) => a + h.fixed, 0), M = hops.reduce((a, h) => a + h.wait, 0), V = hops.reduce((a, h) => a + h.v, 0);
  near(F, 27, 1e-9); near(M, 103.95, 0.01); near(V, 10015.43, 0.05);
  const s = summarise({ F, M, V });
  near(s.mean, 130.95, 0.01); near(s.p50, 102.03, 0.01); near(s.p99, 488.51, 0.01);
  near(slowShare({ F, M, V }, 200), 0.1847, 0.0002); near(slowShare({ F, M, V }, 500), 0.0089, 0.0002);
});

test('a read through a cache that misses one time in ten: the spec vector', () => {
  const sv = hopTime(20, 0.5), c = hopTime(1, 0.2), db = hopTime(5, 0.6), p = 0.1, Edb = db.fixed + db.wait;
  const F = sv.fixed + c.fixed, M = sv.wait + c.wait + p * Edb, V = sv.v + c.v + p * db.v + p * (1 - p) * Edb * Edb;
  near(F, 21, 1e-9); near(M, 21.5, 0.01); near(V, 419.75, 0.01); near(summarise({ F, M, V }).p99, 115.49, 0.01);
});

test('waiting time: capped near saturation, ×19 past it; shards and splits', () => {
  assert.equal(hopTime(10, 0).wait, 0);
  near(hopTime(10, 0.5).wait, 10, 1e-9);
  near(hopTime(10, 0.99).wait, 190, 1e-9, 'capped at 0.95');
  near(hopTime(10, 1.4).wait, 190, 1e-9);
  near(harmonic(8), 2.7179, 1e-4); near(harmonic2(8), 1.5274, 1e-4);
  const m = mix([{ w: 1, F: 10, M: 0, V: 0 }, { w: 1, F: 30, M: 0, V: 0 }]);
  near(m.F, 10, 1e-9); near(m.M, 10, 1e-9); near(m.V, 100, 1e-9);
});

// ---- hit rates (evaluator.md §8.6 vectors) ----------------------------------------------------------------
test('look-aside cache hit rates', () => {
  const C = itemsThatFit(6e9, 500);
  assert.equal(C, 9230769);
  const R = 34650;
  const rows = [[5e9, 60, 0.7181, 0.2022, 0.5160], [5e9, 3600, 0.7181, 0.0433, 0.6749], [5e7, 300, 0.9047, 0.1556, 0.7491], [5e7, 3600, 0.9047, 0.0468, 0.8579], [5e7, 86400, 0.9047, 0.0030, 0.9017]];
  for (const [Nn, tau, cap, exp, hit] of rows) {
    near(hitCap(C, Nn, true), cap, 1e-4, `cap N=${Nn}`);
    near(expiryMiss(R, tau, Math.min(C, Nn), Nn, true, cap), exp, 1e-4, `expiry N=${Nn} tau=${tau}`);
    near(cacheHit({ C, N: Nn, zipf: true, R, tau }), hit, 1e-4, `hit N=${Nn} tau=${tau}`);
  }
  near(cacheHit({ C, N: 5e7, zipf: false, R, tau: 300 }), 0.0978, 1e-4, 'uniform popularity');
  assert.equal(cacheHit({ C: 10, N: 5, zipf: true, R: 0, tau: 60 }), 0.999, 'everything fits, no reads yet');
  near(cacheHit({ C, N: 5e7, zipf: true, R, tau: 3600, warm: 0.5 }), 0.8579 / 2, 1e-4, 'half warm');
  near(cacheHit({ C, N: 5e7, zipf: true, R, tau: 3600, W: R / 10 }), 0.8579 * 0.9, 1e-4, 'a write deletes an item');
  let last = 0; for (const tau of [10, 60, 600, 3600, 86400]) { const h = cacheHit({ C, N: 5e7, zipf: true, R, tau }); assert.ok(h >= last - 1e-12); last = h; }
  last = 0; for (const mem of [1e9, 3e9, 6e9, 13e9]) { const h = cacheHit({ C: itemsThatFit(mem, 500), N: 5e7, zipf: true, R, tau: 300 }); assert.ok(h >= last - 1e-12); last = h; }
});

test('CDN hit rates', () => {
  assert.equal(cdnHit({ K: 18, R: 175000 * 50, tau: 4, zipf: true }), 0.99, 'live video: clamped at 0.99');
  near(cdnHit({ K: 1e8, R: 500 * 50, tau: 86400, zipf: true }), 0.7997, 1e-4, 'photos');
  assert.equal(cdnHit({ K: 1e8, R: 0, tau: 60, zipf: true }), 0);
});

// ---- the dispatch -------------------------------------------------------------------------------------------
test('a v2 problem goes to the v2 evaluator; a design it cannot read is an error, never a verdict', () => {
  const problem = { v: 2, tests: [{ id: 'a', sample: true, op: 'x' }, { id: 'b', hours: 1, traffic: { rps: 1 }, checks: [] }] };
  const r = judge({ nodes: [], edges: [] }, lab, problem);
  assert.equal(r.verdict, 'error'); assert.equal(r.total, 2); assert.equal(r.results[0].error, 'Add the Clients: tests send their traffic from there.');
  assert.equal(judge({ nodes: [], edges: [] }, lab, problem, { sample: true }).total, 1);
  assert.deepEqual(evaluate(null, lab, null).results, []);
  assert.equal(score(null, { designPoints: 37.5, passed: 0, total: 9 }).parts.design, 37.5, 'v2 design points win over passed/total');
  assert.equal(score(null, { passed: 1, total: 2 }).parts.design, 25, 'v1 unchanged');
});

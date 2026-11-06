import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, monthlyCost, catalogue, advance, newRun, trafficAt, runOptions } from './engine.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
const example = { nodes: lab.example.nodes, edges: lab.example.edges };
const at = (design, rps) => ({ ...design, nodes: design.nodes.map((n) => (n.type === 'client' ? { ...n, config: { rps } } : n)) });

test('the example handles 1,000 req/s with no errors, within budget', () => {
  const r = simulate(example, lab);
  assert.equal(r.ok, true, r.problems.join());
  assert.equal(Math.round(r.total.successPct), 100);
  assert.equal(r.nodes.orders.offered, 1000);
  assert.equal(r.nodes.db.offered, 2000); // two queries per request
  assert.ok(r.total.latencyMs > 35 && r.total.latencyMs < 200, String(r.total.latencyMs));
  assert.equal(r.total.overBudget, false);
});

test('past capacity the servers drop requests and become the bottleneck', () => {
  const r = simulate(at(example, 1800), lab); // 2 × m5.large = 1,200 req/s
  assert.equal(r.nodes.orders.served, 1200);
  assert.ok(r.nodes.orders.offered > 1800, 'retries add load'); // one retry per failed request
  assert.ok(r.total.retryRps > 0);
  assert.ok(r.total.successPct > 60 && r.total.successPct < 90, String(r.total.successPct));
  assert.equal(r.total.bottleneck, 'orders');
  assert.equal(r.nodes.db.offered, 2400); // only served requests reach the database, 2 queries each
});

test('two server groups behind the gateway share the traffic', () => {
  const d = structuredClone(example);
  d.nodes.push({ id: 'orders2', type: 'server', x: 0, y: 0, config: { size: 'm5.large', count: 2 } });
  d.edges.push({ from: 'gateway', to: 'orders2' }, { from: 'orders2', to: 'db' });
  const r = simulate(at(d, 1000), lab); // healthy: 500 each, 2 × 1,000 = 2,000 queries/s on 2,500
  assert.equal(r.nodes.orders.offered, 500);
  assert.equal(r.nodes.orders2.offered, 500);
  assert.equal(r.nodes.db.offered, 2000);
});

test('API Gateway is billed per request; Multi-AZ doubles the database price', () => {
  const cat = catalogue(lab);
  assert.equal(Math.round(monthlyCost(cat.apigw, {}, 1000)), Math.round(1000 * 730 * 3600 / 1e6 * 3.5));
  assert.equal(monthlyCost(cat.database, { size: 'db.m5.large', multiAz: true }), 2 * monthlyCost(cat.database, { size: 'db.m5.large', multiAz: false }));
});

test('problems: no clients, loops, unconnected components', () => {
  assert.ok(simulate({ nodes: [{ id: 's', type: 'server', config: {} }], edges: [] }, lab).problems.some((p) => p.includes('Add Clients')));
  const loop = structuredClone(example); loop.edges.push({ from: 'db', to: 'orders' });
  assert.ok(simulate(loop, lab).problems.some((p) => p.includes('loop')));
  const lone = structuredClone(example); lone.nodes.push({ id: 'x', type: 'database', config: {} });
  const r = simulate(lone, lab);
  assert.ok(r.problems.some((p) => p.includes('no traffic')));
  assert.equal(r.ok, true);
});

test('a huge design goes over the $200,000 budget', () => {
  const d = structuredClone(example);
  d.nodes.find((n) => n.id === 'orders').config = { size: 'c5.2xlarge', count: 50 };
  const r = simulate(at(d, 9000), lab);
  assert.ok(r.total.monthlyCost > 0);
  const big = structuredClone(d); big.nodes.push(...Array.from({ length: 100 }, (_, i) => ({ id: 'd' + i, type: 'database', config: { size: 'db.r5.2xlarge', multiAz: true } })));
  big.edges.push(...Array.from({ length: 100 }, (_, i) => ({ from: 'orders', to: 'd' + i })));
  assert.equal(simulate(at(big, 9000), lab).total.overBudget, true);
});

const scaled = (servers, multiAz) => { const d = structuredClone(example); d.nodes.find((n) => n.id === 'orders').config.count = servers; d.nodes.find((n) => n.id === 'db').config.multiAz = multiAz; return d; };

test('a database pushed past 120% for 5 minutes crashes; Multi-AZ fails over in 2 minutes', () => {
  const d = at(scaled(3, true), 1600); // 3 servers serve 1,600 → 3,200 queries/s on a 2,500 qps database
  assert.ok(simulate(d, lab).nodes.db.utilisation > 1.2);
  let run = advance(d, lab, newRun(), 4.9);
  assert.equal(run.events.length, 0);
  run = advance(d, lab, run, 0.2);
  assert.deepEqual(run.events.map((e) => [e.id, e.kind]), [['db', 'failover']]);
  const during = simulate(d, lab, { down: new Set(Object.keys(run.down)) });
  assert.equal(Math.round(during.total.successPct), 0); // every request needs the database
  run = advance(d, lab, run, 2);
  assert.deepEqual(run.events.at(-1).kind, 'recovered');
});

test('without Multi-AZ the database is down for 30 minutes', () => {
  const run = advance(at(scaled(3, false), 1600), lab, newRun(), 6);
  assert.equal(run.events[0].kind, 'crashed');
  assert.ok(Math.abs(run.down.db - (5 + 30)) < 1e-6);
});

test('an overloaded server group crashes after 10 minutes and keeps crashing while overloaded', () => {
  const run = advance(at(example, 2400), lab, newRun(), 60); // 2,400 req/s on 1,200 capacity = 200%
  const kinds = run.events.filter((e) => e.id === 'orders').map((e) => e.kind);
  assert.equal(kinds[0], 'crashed');
  assert.ok(Math.abs(run.events[0].t - 10) < 1e-6);
  assert.ok(kinds.filter((k) => k === 'crashed').length >= 3, kinds.join()); // crash loop
  assert.ok(run.served / run.sent < 0.5);
});

test('a healthy design runs for days with no events and 100% availability', () => {
  const run = advance(example, lab, newRun(), 3 * 24 * 60);
  assert.equal(run.events.length, 0);
  assert.equal(Math.round(100 * run.served / run.sent), 100);
});

test('the API Gateway never crashes (it throttles)', () => {
  const run = advance(at(scaled(50, true), 50000), lab, newRun(), 60);
  assert.ok(!run.events.some((e) => e.id === 'gateway'));
});

// ---- Phase 2: load balancer, cache, queue ----
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const E = (from, to) => ({ from, to });

test('a cache in front of the database sends it only misses and writes', () => {
  // 1,000 req/s × 2 queries = 2,000 queries/s; 10% writes, 80% of reads hit → 28% reach the database
  const d = { nodes: [N('c', 'client', { rps: 1000 }), N('s', 'server', { size: 'm5.large', count: 2, queriesPerRequest: 2 }), N('k', 'cache', { size: 'cache.t3.medium', hitPct: 80, writePct: 10 }), N('db', 'database', { size: 'db.t3.medium' })],
    edges: [E('c', 's'), E('s', 'k'), E('k', 'db')] };
  const r = simulate(d, lab);
  assert.equal(r.nodes.k.offered, 2000);
  assert.ok(Math.abs(r.nodes.db.offered - 560) < 1e-6, String(r.nodes.db.offered));
  assert.equal(Math.round(r.total.successPct), 100);
  // without the cache the same db.t3.medium (800 qps) gets 2,000 queries/s and fails
  const bare = simulate({ nodes: d.nodes.filter((n) => n.id !== 'k'), edges: [E('c', 's'), E('s', 'db')] }, lab);
  assert.ok(bare.nodes.db.utilisation > 2 && bare.total.successPct < 80, String(bare.total.successPct));
  // and the cached design is faster: most queries skip the database's latency
  const slowDb = simulate({ ...d, nodes: d.nodes.map((n) => (n.id === 'k' ? { ...n, config: { ...n.config, hitPct: 0 } } : n)) }, lab);
  assert.ok(r.nodes.k.pathMs < slowDb.nodes.k.pathMs);
  assert.ok(r.total.monthlyCost > 0 && r.nodes.k.cost > 0);
});

test('a crashed cache set to fail fails its queries even when the database is fine', () => {
  const d = { nodes: [N('c', 'client', { rps: 500 }), N('s', 'server'), N('k', 'cache', { onDown: 'fail' }), N('db', 'database')], edges: [E('c', 's'), E('s', 'k'), E('k', 'db')] };
  const r = simulate(d, lab, { down: new Set(['k']) });
  assert.equal(r.nodes.db.offered, 0);
  assert.ok(r.total.successPct < 1, String(r.total.successPct));
});

test('a load balancer spreads requests evenly and is billed per hour plus load', () => {
  const d = { nodes: [N('c', 'client', { rps: 1500 }), N('lb', 'lb'), N('a', 'server', { size: 'm5.large', count: 2 }), N('b', 'server', { size: 'm5.large', count: 2 }), N('db', 'database', { size: 'db.m5.xlarge' })],
    edges: [E('c', 'lb'), E('lb', 'a'), E('lb', 'b'), E('a', 'db'), E('b', 'db')] };
  const r = simulate(d, lab);
  assert.equal(r.nodes.a.offered, 750); assert.equal(r.nodes.b.offered, 750);
  assert.equal(Math.round(r.total.successPct), 100);
  const lbc = catalogue(lab).lb;
  assert.ok(Math.abs(monthlyCost(lbc, {}, 1500) - (lbc.hourly + 1500 / lbc.rpsPerLcu * lbc.lcuHourly) * 730) < 1e-9);
  assert.ok(monthlyCost(lbc, {}, 0) > 0, 'an idle load balancer still costs its hourly price');
});

test('a queue answers users at once and protects slow workers; the backlog grows and drains', () => {
  // API servers put one message per request on the queue; one t3.medium worker handles 300/s
  const d = { nodes: [N('c', 'client', { rps: 500 }), N('api', 'server', { size: 'm5.large', count: 2 }), N('q', 'queue'), N('w', 'server', { size: 't3.medium', count: 1 }), N('db', 'database')],
    edges: [E('c', 'api'), E('api', 'q'), E('q', 'w'), E('w', 'db')] };
  const r = simulate(d, lab);
  assert.equal(Math.round(r.total.successPct), 100, 'users do not wait for the workers');
  assert.equal(r.nodes.q.delivered, 300);
  assert.equal(r.nodes.w.offered, 300); assert.equal(r.nodes.w.dropped, 0);
  assert.ok(r.total.latencyMs < 60, `latency excludes the workers: ${r.total.latencyMs}`);
  // ten minutes: 200 messages/s × 600 s = 120,000 waiting, and the worker never overloads
  let run = advance(d, lab, newRun(), 10);
  assert.ok(Math.abs(run.backlog.q - 120000) < 1, String(run.backlog.q));
  assert.equal(run.events[0].kind, 'backlog');
  assert.deepEqual(Object.keys(run.down), []);
  // traffic drops to 100/s: the worker drains 200/s more than arrives → empty after 10 minutes
  const quiet = at(d, 100);
  const busy = simulate(quiet, lab, { backlog: new Set(['q']) });
  assert.equal(busy.nodes.w.offered, 300, 'while there is a backlog the workers run flat out');
  run = advance(quiet, lab, run, 15);
  assert.equal(run.backlog.q, undefined);
  const drained = run.events.find((e) => e.kind === 'drained');
  assert.ok(drained && Math.abs(drained.t - 20) < 1e-6, JSON.stringify(run.events));
});

test('a queue with nothing reading it only builds a backlog', () => {
  const d = { nodes: [N('c', 'client', { rps: 50 }), N('s', 'server'), N('q', 'queue')], edges: [E('c', 's'), E('s', 'q')] };
  const run = advance(d, lab, newRun(), 1);
  assert.ok(Math.abs(run.backlog.q - 3000) < 1e-6, String(run.backlog.q));
});

// Phase 2: time-based traffic and autoscaling.
const client = lab.components.find((c) => c.type === 'client');
const withClients = (config) => ({ ...example, nodes: example.nodes.map((n) => (n.type === 'client' ? { ...n, config } : n)) });

test('traffic patterns: the rps setting is the peak, the pattern follows the simulated day', () => {
  assert.equal(trafficAt(client, { pattern: 'steady' }, 600), 1);
  assert.equal(trafficAt(client, {}, 600), 1, 'no pattern = steady');
  assert.equal(trafficAt(client, { pattern: 'meals' }, 20.5 * 60), 1);
  assert.equal(trafficAt(client, { pattern: 'meals' }, 4 * 60), 0.05);
  assert.ok(Math.abs(trafficAt(client, { pattern: 'meals' }, 12 * 60) - 0.6) < 1e-9, 'linear between points');
  assert.equal(trafficAt(client, { pattern: 'meals' }, (24 + 20.5) * 60), 1, 'repeats every day');
  assert.equal(trafficAt(client, { pattern: 'sale' }, 19.99 * 60), 0.2);
  assert.equal(trafficAt(client, { pattern: 'sale' }, 20 * 60), 1, 'jumps at 8 pm');
  assert.equal(trafficAt(client, { pattern: 'sale' }, 20.25 * 60), 0.2, 'and back after 15 minutes');
  const d = withClients({ rps: 1000, pattern: 'meals' });
  assert.equal(simulate(d, lab, { minute: 4 * 60 }).total.sentRps, 50);
  assert.equal(simulate(d, lab, { minute: 20.5 * 60 }).nodes.db.offered, 2000);
});

test('a flash sale crashes fixed servers but the run catches the spike in small steps', () => {
  const d = withClients({ rps: 2400, pattern: 'sale' }); // 480 req/s all day, 2,400 at 8 pm
  let run = { ...newRun(), start: 19 }; // starts at 7 pm
  run = advance(d, lab, run, 60);
  assert.equal(run.events.length, 0, 'quiet before the sale');
  run = advance(d, lab, run, 60); // 8–9 pm: 2,400 req/s on 1,200 for 15 min → crash after 10
  const crash = run.events.find((e) => e.kind === 'crashed');
  assert.ok(crash && crash.t >= 70 && crash.t <= 72, JSON.stringify(run.events));
  assert.ok(run.served / run.sent < 1);
});

test('autoscaling adds instances after the warm-up and removes them once load stays low', () => {
  const as = lab.components.find((c) => c.type === 'server').autoscaling;
  const d = structuredClone(withClients({ rps: 2000, pattern: 'meals' }));
  d.nodes.find((n) => n.id === 'orders').config = { size: 'm5.large', count: 2, maxCount: 10, autoscale: true };
  d.nodes.find((n) => n.id === 'db').config = { size: 'db.r5.2xlarge' };
  let run = { ...newRun(), start: 18 };
  assert.equal(simulate(d, lab, runOptions(run, 18 * 60)).nodes.orders.capacity, 1200, 'starts at the minimum');
  run = advance(d, lab, run, 150); // 6 pm → 8:30 pm, the dinner peak (2,000 req/s)
  const want = Math.ceil(2000 / (600 * as.targetPct / 100)); // 6 instances
  assert.equal(run.scale.orders.n, want, JSON.stringify(run.scale));
  const out = run.events.filter((e) => e.kind === 'scaledOut');
  assert.ok(out.length > 0 && out[0].t >= as.warmupMinutes, 'first instances arrive after the warm-up');
  const r = simulate(d, lab, runOptions(run, (run.start * 60) + run.t));
  assert.equal(r.nodes.orders.capacity, want * 600);
  assert.ok(Math.round(r.total.successPct) === 100 && r.nodes.orders.utilisation <= 0.61);
  assert.ok(r.total.monthlyCost > simulate(d, lab, { minute: 18 * 60 }).total.monthlyCost, 'more instances cost more');
  run = advance(d, lab, run, 8 * 60); // into the night: 4 am is 100 req/s
  assert.equal(run.scale.orders.n, 2, 'back to the minimum');
  assert.ok(run.events.some((e) => e.kind === 'scaledIn'));
  const fixed = structuredClone(d); fixed.nodes.find((n) => n.id === 'orders').config.autoscale = false;
  assert.deepEqual(Object.keys(advance(fixed, lab, { ...newRun(), start: 18 }, 150).scale), [], 'no scaling when it is off');
});

test('autoscaling never goes past the maximum and keeps its state per design node', () => {
  const d = structuredClone(withClients({ rps: 20000 }));
  d.nodes.find((n) => n.id === 'orders').config = { size: 'm5.large', count: 2, maxCount: 5, autoscale: true };
  const run = advance(d, lab, newRun(), 30);
  assert.equal(run.scale.orders.n, 5);
  const odd = structuredClone(d); odd.nodes.find((n) => n.id === 'orders').id = '__proto__'; odd.edges = odd.edges.map((e) => ({ from: e.from === 'orders' ? '__proto__' : e.from, to: e.to === 'orders' ? '__proto__' : e.to }));
  const r2 = advance(odd, lab, newRun(), 30);
  assert.ok(Object.hasOwn(r2.scale, '__proto__') && r2.scale['__proto__'].n === 5);
});

// Cache behaviour: warm-up after a restart, what happens while it is down, write policies.
const cached = ({ rps = 1000, cache = {}, db = { size: 'db.t3.medium' }, server = { size: 'm5.xlarge', count: 1, queriesPerRequest: 2 } } = {}) => ({
  nodes: [{ id: 'c', type: 'client', x: 0, y: 0, config: { rps } }, { id: 's', type: 'server', x: 0, y: 0, config: server },
    { id: 'k', type: 'cache', x: 0, y: 0, config: { hitPct: 80, writePct: 10, ...cache } }, { id: 'db', type: 'database', x: 0, y: 0, config: db }],
  edges: [{ from: 'c', to: 's' }, { from: 's', to: 'k' }, { from: 'k', to: 'db' }],
});

test('a cold cache sends the database every query, then warms up', () => {
  const d = cached({ db: { size: 'db.r5.2xlarge' } }); // 2,000 queries/s; warm: 10% writes + 90% × 20% misses = 28% → 560/s
  assert.equal(Math.round(simulate(d, lab).nodes.db.offered), 560);
  assert.equal(Math.round(simulate(d, lab, { warm: { k: 0 } }).nodes.db.offered), 2000, 'empty: every query');
  assert.equal(Math.round(simulate(d, lab, { warm: { k: 0.5 } }).nodes.db.offered), 1280, 'half warm: 40% hits');
});

test('a cache restart can take the database down with it', () => {
  const d = cached(); // db.t3.medium: 800 queries/s, single AZ
  const warmup = lab.components.find((c) => c.type === 'cache').warmupMinutes;
  const cold = advance(d, lab, { ...newRun(), cold: Object.assign(Object.create(null), { k: 0 }) }, 20);
  const crash = cold.events.find((e) => e.id === 'db' && e.kind === 'crashed');
  assert.ok(crash && Math.abs(crash.t - 5) < 1.01, JSON.stringify(cold.events)); // 250% → 160% at 5 min, still over 120%
  assert.ok(cold.events.some((e) => e.id === 'k' && e.kind === 'warm' && Math.abs(e.t - warmup) < 1e-6));
  assert.equal(advance(d, lab, newRun(), 20).events.length, 0, 'a warm cache keeps it at 70%');
});

test('while the cache is down, queries go to the database or fail, as set', () => {
  const d = cached({ db: { size: 'db.m5.large' } });
  const through = simulate(d, lab, { down: new Set(['k']) });
  assert.equal(Math.round(through.nodes.db.offered), 2000);
  assert.equal(Math.round(through.total.successPct), 100, 'the database answers everything');
  const failing = simulate(cached({ db: { size: 'db.m5.large' }, cache: { onDown: 'fail' } }), lab, { down: new Set(['k']) });
  assert.equal(failing.nodes.db.offered, 0);
  assert.equal(Math.round(failing.total.successPct), 0);
});

test('write-back answers writes at once and flushes them as the database has room', () => {
  const half = { writePct: 50 }; // 2,000 queries: 1,000 writes, 200 read misses; db.t3.medium takes 800
  const wt = simulate(cached({ cache: half }), lab);
  assert.ok(Math.abs(wt.nodes.db.offered / wt.nodes.k.served - 0.6) < 1e-9, 'write-through: misses + every write (60%)');
  assert.ok(wt.nodes.db.utilisation > 1 && wt.total.successPct < 100, 'which overloads the database');
  const wb = simulate(cached({ cache: { ...half, writePolicy: 'back' } }), lab);
  assert.equal(Math.round(wb.nodes.db.offered), 800, 'write-back: misses + what fits');
  assert.equal(Math.round(wb.nodes.k.delivered), 600);
  assert.equal(Math.round(wb.total.successPct), 100);
  assert.ok(wb.total.latencyMs < wt.total.latencyMs, 'writes do not wait for the database');
  const run = advance(cached({ cache: { ...half, writePolicy: 'back' } }), lab, newRun(), 10);
  assert.equal(Math.round(run.backlog.k), 400 * 600, 'unflushed writes pile up at 400/s');
  assert.equal(run.events[0].kind, 'dirty');
});

test('a write-back cache that crashes loses the writes it had not flushed', () => {
  const flush = lab.components.find((c) => c.type === 'cache').flushSeconds;
  // 16,000 req/s × 2 queries = 32,000 on 20,000 ops (160%): the cache crashes after 5 minutes
  const d = cached({ rps: 16000, server: { size: 'c5.2xlarge', count: 8, queriesPerRequest: 2 }, db: { size: 'db.r5.2xlarge' }, cache: { writePct: 50, writePolicy: 'back' } });
  const run = advance(d, lab, newRun(), 6);
  const lost = run.events.find((e) => e.kind === 'writesLost');
  assert.ok(lost, JSON.stringify(run.events));
  assert.equal(lost.n, 10000 * flush, 'served 20,000 queries/s, half of them writes, flushed every few seconds');
  assert.equal(run.lost, 10000 * flush);
  const safe = advance({ ...d, nodes: d.nodes.map((n) => (n.id === 'k' ? { ...n, config: { ...n.config, writePolicy: 'through' } } : n)) }, lab, newRun(), 6);
  assert.equal(safe.lost, 0, 'write-through loses nothing');
});

test('a CDN answers its share at the edge; live content passes the origin\'s failures to everyone', () => {
  const d = { nodes: [{ id: 'v', type: 'client', x: 0, y: 0, config: { rps: 1000000 } }, { id: 'c', type: 'cdn', x: 0, y: 0, config: { hitPct: 99 } }, { id: 's', type: 'server', x: 0, y: 0, config: { size: 'm5.large', count: 20 } }],
    edges: [{ from: 'v', to: 'c' }, { from: 'c', to: 's' }] };
  const r = simulate(d, lab);
  assert.equal(Math.round(r.nodes.s.offered), 10000, '1% of 10 lakh reaches the servers');
  assert.equal(Math.round(r.total.successPct), 100);
  const cdn = lab.components.find((c) => c.type === 'cdn');
  assert.ok(Math.abs(r.nodes.c.cost - 1000000 * 2628000 / 1e4 * cdn.pricePer10k) < 1e-3, 'billed per 10,000 requests');
  const small = structuredClone(d); small.nodes[2].config.count = 5; // 3,000 of 10,000: 70% of misses fail
  const cached = simulate(small, lab), live = simulate({ ...small, nodes: small.nodes.map((n) => (n.id === 'c' ? { ...n, config: { hitPct: 99, live: true } } : n)) }, lab);
  assert.ok(cached.total.successPct > 99.9, `static content mostly survives: ${cached.total.successPct}`);
  assert.ok(live.total.successPct < 60, `live content doesn't: ${live.total.successPct}`);
});

test('parts that only pass requests on fail what they have nowhere to send', () => {
  const one = (type, config = {}) => simulate({ nodes: [{ id: 'c', type: 'client', x: 0, y: 0, config: { rps: 100 } }, { id: 'x', type, x: 0, y: 0, config }], edges: [{ from: 'c', to: 'x' }] }, lab).total.successPct;
  assert.equal(one('lb'), 0);
  assert.equal(one('apigw'), 0);
  assert.ok(Math.abs(one('cdn', { hitPct: 90 }) - 99) < 1e-6, 'only the misses fail (one retry)');
  assert.equal(one('cdn', { hitPct: 90, live: true }), 0, 'a live stream needs its origin');
  assert.ok(one('server') > 99.9, 'a server can still answer on its own outside challenges');
});

test("a load balancer skips a crashed server group while another is up (health checks)",()=>{
  const d={nodes:[{id:"c",type:"client",config:{rps:1000}},{id:"lb",type:"lb",config:{}},{id:"a",type:"server",config:{size:"m5.large",count:4}},{id:"b",type:"server",config:{size:"m5.large",count:4}},{id:"db",type:"database",config:{size:"db.r5.2xlarge"}}],edges:[{from:"c",to:"lb"},{from:"lb",to:"a"},{from:"lb",to:"b"},{from:"a",to:"db"},{from:"b",to:"db"}]};
  const r=simulate(d,lab,{down:new Set(["a"])});
  assert.equal(r.nodes.a.offered,0);assert.ok(r.total.successPct>99.9,`success ${r.total.successPct}`);
  const both=simulate(d,lab,{down:new Set(["a","b"])});assert.ok(both.total.successPct<1);
});

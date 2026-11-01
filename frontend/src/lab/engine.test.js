import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, monthlyCost, catalogue, advance, newRun } from './engine.js';

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

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, monthlyCost, catalogue } from './engine.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
const example = { nodes: lab.example.nodes, edges: lab.example.edges };
const at = (design, rps) => ({ ...design, nodes: design.nodes.map((n) => (n.type === 'client' ? { ...n, config: { rps } } : n)) });

test('the example handles 1,000 req/s with no errors, within budget', () => {
  const r = simulate(example, lab);
  assert.equal(r.ok, true, r.problems.join());
  assert.equal(Math.round(r.total.successPct), 100);
  assert.equal(r.nodes.orders.offered, 1000);
  assert.equal(r.nodes.db.offered, 1000); // one query per request
  assert.ok(r.total.latencyMs > 35 && r.total.latencyMs < 200, String(r.total.latencyMs));
  assert.equal(r.total.overBudget, false);
});

test('past capacity the servers drop requests and become the bottleneck', () => {
  const r = simulate(at(example, 1800), lab); // 2 × m5.large = 1,200 req/s
  assert.equal(r.nodes.orders.served, 1200);
  assert.equal(r.nodes.orders.dropped, 600);
  assert.equal(Math.round(r.total.successPct), 67);
  assert.equal(r.total.bottleneck, 'orders');
  assert.equal(r.nodes.db.offered, 1200); // only served requests reach the database
});

test('two server groups behind the gateway share the traffic', () => {
  const d = structuredClone(example);
  d.nodes.push({ id: 'orders2', type: 'server', x: 0, y: 0, config: { size: 'm5.large', count: 2 } });
  d.edges.push({ from: 'gateway', to: 'orders2' }, { from: 'orders2', to: 'db' });
  const r = simulate(at(d, 2000), lab);
  assert.equal(r.nodes.orders.offered, 1000);
  assert.equal(r.nodes.orders2.offered, 1000);
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

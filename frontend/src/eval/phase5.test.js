// v2 evaluator, phase 5: calls in progress, timeouts, retries of a failed call, circuit breakers, and the abusive
// client against a rate-limited API gateway (tech-katta-context/evaluator.md §8.9, §8.13).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { simulateTest } from './simulate.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const E = (...pairs) => pairs.map(([from, to]) => ({ from, to }));
const F = (s) => s.split(' ').map((x) => { const [name, type = 'string'] = x.split(':'); return { name, type }; });
const ent = {
  orders: { rows: 1e7, rowBytes: 200, fields: { order_id: 'string', total: 'int' }, sample: [{ order_id: 'o1', total: 5 }, { order_id: 'o2', total: 9 }] },
  menus: { rows: 1e5, rowBytes: 500, fields: { menu_id: 'string', name: 'string' }, sample: [{ menu_id: 'm1', name: 'Dosa' }, { menu_id: 'm2', name: 'Idli' }] },
};
// two calls on one Service: orders read a database; menus come from a cache structure of their own
const ORDER = { id: 'order', name: 'Read an order', kind: 'read', share: 0.5, steps: [{ id: 's1', op: 'get', entity: 'orders', by: { order_id: 'o1' } }], respond: { status: 200, body: {} } };
const MENU = { id: 'menu', name: 'Read a menu', kind: 'read', share: 0.5, steps: [{ id: 's1', op: 'get', entity: 'menus', by: { menu_id: 'm1' } }], respond: { status: 200, body: {} } };
const P = { v: 2, entities: ent, operations: [ORDER, MENU] };
const design = (app = {}, extra = []) => ({ nodes: [N('c', 'client'), N('lb', 'lb'), N('app', 'server', { size: 'c5.2xlarge', count: 6, ...app }),
  N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: { tables: [{ name: 'orders', fields: F('order_id total:int'), key: ['order_id'] }] } }),
  N('kv', 'cache', { size: 'cache.r5.large', structures: [{ name: 'menus', kind: 'kv', fields: F('menu_id name'), key: ['menu_id'] }] }), ...extra],
  edges: E(['c', 'lb'], ['lb', 'app'], ['app', 'db'], ['app', 'kv']) });
export const plansOf = (d) => compile(d, lab, P).plans;
const sim = (d, t = {}) => simulateTest(compile(d, lab, P), lab, P, { hours: 1, startHour: 12, traffic: { rps: 8000, pattern: 'steady' }, ...t });
// the database answers in 500 ms instead of 5 for 20 minutes
const SLOW = { faults: [{ minute: 10, kind: 'slow', type: 'database', factor: 100, minutes: 20 }] };

test('the cascade: a slow database with a long timeout fills the Service with waiting calls; a short timeout does not', () => {
  const calm = sim(design({ timeoutMs: 30000 }));
  assert.equal(calm.ops.menu.availability, 100);
  const long = sim(design({ timeoutMs: 30000 }), SLOW), short = sim(design({ timeoutMs: 50 }), SLOW);
  // with every call held until the slow database answers, the Service runs out of calls in progress: menus fail too
  assert.ok(long.ops.menu.availability < 95, `unrelated calls fail with a long timeout: ${long.ops.menu.availability}`);
  assert.ok(long.holdMs.app > 100);
  // a short timeout cuts the wait: the orders fail, the menus keep working
  assert.ok(short.ops.menu.availability > 99.9, `menus keep working with a short timeout: ${short.ops.menu.availability}`);
  assert.ok(short.ops.order.availability < 99, 'the slow orders fail (fast) instead');
});

test('capacity is the smaller of the work units and calls in progress over the time each is held (§8.9 vector)', () => {
  // 6 c5.2xlarge with 256 calls in progress each: 1,536 at once; half the calls held 500 ms → about 6,000 a second
  const long = sim(design({ timeoutMs: 30000 }), SLOW), calm = sim(design({ timeoutMs: 30000 }));
  const n = 6 * 256 * 1000 / long.holdMs.app;
  assert.ok(n < 8000, `while the database is slow, calls in progress decide: ${Math.round(n)} a second for 8,000 arriving`);
  assert.ok(6 * 256 * 1000 / calm.holdMs.app > 6 * 2500, 'normally the work units decide');
});

test('retries of a failed call: they rescue a flaky provider, and add load to a struggling database', () => {
  // a provider that fails a fifth of its calls (not overloaded): two retries make it 1 − 0.2³ = 99.2%
  const pay = { id: 'pay', name: 'Pay', kind: 'write', share: 1, steps: [{ id: 's1', op: 'call', preset: 'payments', label: 'Charging' }], respond: { status: 200, body: {} } };
  const p = { v: 2, entities: ent, operations: [pay] };
  const d = (k) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2, callRetries: k }), N('x', 'external', { preset: 'payments', latencyMs: 100, limitRps: 5000, errorPct: 20, pricePerCall: 0 })], edges: E(['c', 'app'], ['app', 'x']) });
  const run = (k) => simulateTest(compile(d(k), lab, p), lab, p, { hours: 1, startHour: 12, traffic: { rps: 500, pattern: 'steady' } });
  const r0 = run(0), r2 = run(2);
  assert.ok(r2.ops.pay.availability > 98.5 && r2.ops.pay.availability > r0.ops.pay.availability, `${r0.ops.pay.availability} → ${r2.ops.pay.availability}`);
  // against a slow database, retries send it more calls
  const flaky = (k) => sim(design({ callRetries: k, timeoutMs: 600 }), SLOW);
  assert.ok(flaky(2).nodes.db.rhoMax > flaky(0).nodes.db.rhoMax);
});

test('a circuit breaker stops sending to a failing call: the Service stays free for the rest', () => {
  // with a 300 ms timeout the slow orders fail, but each still holds the Service for 300 ms; a breaker stops trying
  const without = sim(design({ timeoutMs: 300 }), SLOW), withB = sim(design({ timeoutMs: 300, breaker: true }), SLOW);
  assert.ok(withB.ops.menu.availability > without.ops.menu.availability + 1, `menus with a breaker ${withB.ops.menu.availability} vs ${without.ops.menu.availability}`);
  assert.ok(withB.holdMs.app < without.holdMs.app);
});

test('the abusive client: load like any other, unless an API gateway limits each client', () => {
  const abuse = { faults: [{ minute: 10, kind: 'abuse', factor: 2, minutes: 20 }], traffic: { rps: 3000, pattern: 'steady' } };
  const gw = (rateLimit) => { const d = design({ count: 2 }); d.nodes.splice(1, 0, N('gw', 'apigw', { rateLimit })); d.edges = E(['c', 'gw'], ['gw', 'lb'], ['lb', 'app'], ['app', 'db'], ['app', 'kv']); return d; };
  const open = sim(gw('off'), abuse), limited = sim(gw('perClient'), abuse);
  assert.ok(open.ops.order.availability < 99, `three times the traffic overloads two servers: ${open.ops.order.availability}`);
  assert.equal(open.ops.order.calls, limited.ops.order.calls, 'the abusive calls are not counted as the operation’s');
  assert.ok(limited.ops.order.availability > 99.9, `refused at the gateway: ${limited.ops.order.availability}`);
  assert.ok(limited.nodes.app.rhoMax < 0.9);
});

test('the two calls use different stores', () => {
  const pl = plansOf(design());
  assert.deepEqual([pl.order.steps.s1.node, pl.menu.steps.s1.node], ['db', 'kv']);
});

test('the feedback says when a Service ran out of calls in progress', async () => {
  const { evaluate } = await import('./judge.js');
  const p = { ...P, tests: [{ id: 'slow-db', name: 'The database slows down', desc: 'x', hours: 1, startHour: 12, traffic: { rps: 8000, pattern: 'steady' }, faults: SLOW.faults, checks: [{ kind: 'slo', op: 'menu', availability: 99, p99Ms: 1000 }] }] };
  const r = evaluate(design({ timeoutMs: 30000 }), lab, p, {});
  assert.equal(r.results[0].ok, false);
  assert.match(r.results[0].why.join(' '), /Its calls were waiting on what they call: each held it about [\d,]+ ms, and an instance has room for 256 at a time\. Give its calls a shorter timeout \(now 30,000 ms\)/);
  assert.equal(evaluate(design({ timeoutMs: 50 }), lab, p, {}).results[0].ok, true);
});

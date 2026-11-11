// v2 evaluator, phase 4: other companies (external services, call steps), doing something twice, two stores, order
// (tech-katta-context/evaluator.md §5.6 external, §7.5 call, §8.13 externalDown, §10.4–10.6).
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
const ORDERS = (extra = {}) => ({ tables: [{ name: 'orders', fields: F('id request_id amount:int'), key: ['id'], ...extra }] });
const ent = { orders: { rows: 1e6, rowBytes: 300, fields: { id: 'string', request_id: 'string', amount: 'int' }, sample: [{ id: 'o1', request_id: 'r1', amount: 5 }, { id: 'o2', request_id: 'r2', amount: 7 }] } };
const PAY = (steps, extra = {}) => ({ v: 2, entities: ent, operations: [{ id: 'pay', name: 'Pay', kind: 'write', share: 1, steps, respond: { status: 200, body: {} }, slo: { availability: 99.9, p99Ms: 2000 }, ...extra }] });
const put = (extra = {}) => ({ id: 's1', op: 'put', entity: 'orders', values: { id: 'o9', request_id: 'r9', amount: 3 }, ...extra });
const charge = (extra = {}) => ({ id: 'c1', op: 'call', preset: 'payments', label: 'Charging the card', ...extra });
const base = (db = {}, ext = {}) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('db', 'database', { engine: 'postgres', multiAz: true, schema: ORDERS(), ...db }), N('psp', 'external', { preset: 'payments', ...ext })], edges: E(['c', 'app'], ['app', 'db'], ['app', 'psp']) });
const findings = (d, p, t = {}) => { const c = compile(d, lab, p), test = { hours: 1, startHour: 12, traffic: { rps: 100, pattern: 'steady' }, ...t }; return analyse(c, p, lab, [{ test, sim: simulateTest(c, lab, p, test) }]); };
const codes = (fs) => fs.map((f) => `${f.code}:${f.severity}`);

test('a call needs an arrow to an external service of its kind; a call that can wait may go behind a queue', () => {
  let r = compile(base(), lab, PAY([put(), charge()]));
  assert.equal(r.plans.pay.ok, true, r.plans.pay.error?.message);
  assert.equal(r.plans.pay.steps.c1.node, 'psp');
  assert.deepEqual(r.plans.pay.root.children[0].children.map((h) => h.kind), ['store', 'call']);
  r = compile(base({}, { preset: 'sms' }), lab, PAY([put(), charge()]));
  assert.equal(r.plans.pay.error.code, 'E_NO_EXTERNAL');
  assert.equal(r.plans.pay.error.message, 'Charging the card needs an arrow from a Service to the payments service.');
  const queued = { nodes: [N('c', 'client'), N('app', 'server'), N('q', 'queue'), N('w', 'server'), N('db', 'database', { engine: 'postgres', schema: ORDERS() }), N('psp', 'external', { preset: 'payments' })], edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'psp']) };
  assert.equal(compile(queued, lab, PAY([put(), charge()])).plans.pay.error.code, 'E_SYNC_BEHIND_QUEUE');
  r = compile(queued, lab, PAY([put(), charge({ timing: 'defer' })]));
  assert.equal(r.plans.pay.ok, true); assert.equal(r.plans.pay.steps.c1.sync, false);
});

test('an external service: its limit, its error rate, its latency, its price, and externalDown', () => {
  const p = PAY([put(), charge()]);
  const run = (ext, t) => { const c = compile(base({}, ext), lab, p); return simulateTest(c, lab, p, { hours: 1, startHour: 12, traffic: { rps: 100, pattern: 'steady' }, ...t }); };
  let s = run({ errorPct: 2, latencyMs: 300, pricePerCall: 0.01 });
  assert.ok(Math.abs(s.ops.pay.availability - 100 * (1 - 0.02 ** 2)) < 0.01, `2% errors, one retry: ${s.ops.pay.availability}`);
  assert.ok(s.ops.pay.p50 > 300, 'the call takes its 300 ms');
  assert.ok(Math.abs(s.cost.byNode.psp - 0.01 * 100 * 2628000) / (0.01 * 100 * 2628000) < 0.03, 'price per call (retries included)');
  s = run({ limitRps: 50, errorPct: 0 });
  assert.ok(s.ops.pay.availability < 80, `over its limit, calls are refused: ${s.ops.pay.availability}`);
  assert.equal(s.nodes.psp.crashes, 0, 'it never crashes');
  s = run({ errorPct: 0 }, { faults: [{ minute: 10, kind: 'externalDown', preset: 'payments', minutes: 10 }] });
  assert.equal(s.timeline.ops.pay.ok[12], 0); assert.equal(s.timeline.ops.pay.ok[25], 1);
});

test('doing something twice (F_DOUBLE): client retries, redelivery, external calls; and the safe versions', () => {
  const once = { effect: 'once', idempotencyField: 'request_id' };
  // a retried write with nothing to refuse the second one
  let f = findings(base(), PAY([put()], once)).find((x) => x.code === 'F_DOUBLE');
  assert.equal(f.severity, 'fail'); assert.match(f.story, /^The answer to Pay is lost on the way back and the app retries after 10 seconds\. Database accepts the same write again/);
  assert.match(f.fix, /a unique index on request_id/);
  // a unique index on the request's id (or the key, or the step's own unique) makes the retry harmless
  assert.ok(!codes(findings(base({ schema: ORDERS({ indexes: [{ fields: ['request_id'], kind: 'unique' }] }) }), PAY([put()], once))).some((c) => c.startsWith('F_DOUBLE')));
  assert.ok(!codes(findings(base(), PAY([put({ unique: ['id'] })], once))).some((c) => c.startsWith('F_DOUBLE')));
  // the third party called again
  f = findings(base({ schema: ORDERS({ indexes: [{ fields: ['request_id'], kind: 'unique' }] }) }), PAY([charge(), put()], once)).find((x) => x.code === 'F_DOUBLE');
  assert.match(f.story, /the other company is called again/);
  assert.ok(!codes(findings(base(), PAY([put({ unique: ['request_id'] }), charge()], once))).some((c) => c.startsWith('F_DOUBLE')), 'recorded first, then called');
  assert.ok(!codes(findings(base(), PAY([put({ unique: ['id'] }), charge({ idempotent: true })], once))).some((c) => c.startsWith('F_DOUBLE')));
  // redelivery from a queue: adding to a row twice fails for a standard queue, warns for FIFO; a put of the row by its
  // whole key (the message carries its id) writes the same row again: safe
  const ADD = { id: 's1', op: 'update', entity: 'orders', by: { id: 'o9' }, add: { amount: 3 }, timing: 'defer' };
  const q = (kind) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('q', 'queue', { kind }), N('w', 'server', { size: 'c5.2xlarge' }), N('db', 'database', { engine: 'postgres', multiAz: true, schema: ORDERS() })], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) });
  assert.ok(!codes(findings(q('standard'), PAY([put({ timing: 'defer' })], once))).some((c) => c.startsWith('F_DOUBLE')));
  f = findings(q('standard'), PAY([ADD], once)).find((x) => x.code === 'F_DOUBLE');
  assert.equal(f.severity, 'fail'); assert.match(f.story, /^Queue delivers each message at least once/);
  assert.equal(findings(q('fifo'), PAY([ADD], once)).find((x) => x.code === 'F_DOUBLE').severity, 'warn');
  // without effect: "once" nothing is checked
  assert.ok(!codes(findings(base(), PAY([put()]))).some((c) => c.startsWith('F_DOUBLE')));
});

test('two stores without a transaction, a call before saving, and order through a queue', () => {
  const two = base(); two.nodes.push(N('es', 'database', { engine: 'opensearch', schema: { tables: [{ name: 'orders', fields: F('id amount:int'), key: ['id'] }] } })); two.edges.push({ from: 'app', to: 'es' });
  const read = { id: 'find', name: 'Find', kind: 'read', share: 0, steps: [{ id: 'r', op: 'query', entity: 'orders', where: { amount: 3 }, fields: ['id'] }], respond: { status: 200, body: {} } };
  const p = { ...PAY([put()]), operations: [...PAY([put()]).operations, read] };
  assert.equal(findings(two, p).find((x) => x.code === 'F_DUAL_WRITE').severity, 'warn');
  p.operations[0].durable = true;
  const f = findings(two, p).find((x) => x.code === 'F_DUAL_WRITE');
  assert.equal(f.severity, 'fail'); assert.equal(f.story, 'Server writes orders to Database, then to Database. If it crashes between the two, Database never hears about it, and nothing repairs it.');
  assert.ok(!codes(findings(base(), PAY([put()], { durable: true }))).some((c) => c.startsWith('F_DUAL_WRITE')));
  assert.ok(codes(findings(base(), PAY([charge(), put()]))).includes('F_CALL_THEN_WRITE:warn'));
  assert.ok(!codes(findings(base(), PAY([put(), charge()]))).includes('F_CALL_THEN_WRITE:warn'));
  const q = (kind) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('q', 'queue', { kind }), N('w', 'server', { size: 'c5.2xlarge' }), N('db', 'database', { engine: 'postgres', multiAz: true, schema: ORDERS() })], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) });
  const ordered = PAY([put({ timing: 'defer' })], { ordered: { by: 'id' } });
  assert.match(findings(q('standard'), ordered).find((x) => x.code === 'F_ORDER').story, /^Queue hands messages to whichever worker is free\. Two messages for the same id/);
  assert.ok(!codes(findings(q('fifo'), ordered)).some((c) => c.startsWith('F_ORDER')));
  assert.ok(!codes(findings(q('standard'), PAY([put({ timing: 'defer', cond: { amount: { gte: 0 } } })], { ordered: { by: 'id' } }))).some((c) => c.startsWith('F_ORDER')), 'a condition on a sequence keeps order');
});

test('webhooks start at the other company and follow the test traffic; a conditional transaction is repeat-safe', () => {
  const paid = { id: 'paid', name: 'Payment confirmed', kind: 'write', source: 'external', share: 0.5, effect: 'once', steps: [{ id: 't', op: 'tx', steps: [
    { id: 'a', op: 'update', entity: 'orders', by: { id: 'o1' }, set: { amount: 9 }, cond: { amount: { eq: 5 } } }] }], respond: { status: 200, body: {} } };
  const p = { v: 2, entities: ent, operations: [{ ...PAY([put()]).operations[0] }, paid] };
  const d = base(); d.edges.push({ from: 'psp', to: 'app' });
  const c = compile(d, lab, p);
  assert.equal(c.plans.paid.ok, true, c.plans.paid.error?.message);
  assert.equal(c.plans.paid.root.node, 'psp');
  const s = simulateTest(c, lab, p, { hours: 1, startHour: 12, traffic: { rps: 100, pattern: 'steady' } });
  assert.equal(s.ops.paid.calls, 50 * 3600, 'its share of the test traffic');
  assert.ok(!findings(d, p).some((x) => x.code === 'F_DOUBLE' && x.op === 'paid'), 'only if still pending: a repeat changes nothing');
  assert.equal(compile(base(), lab, p).plans.paid.error.message, 'Payment confirmed starts at External service, but never reaches a Service: draw an arrow from External service to the load balancer or Service that takes it.');
  const none = base(); none.nodes = none.nodes.filter((n) => n.id !== 'psp'); none.edges = none.edges.filter((e) => e.to !== 'psp');
  assert.equal(compile(none, lab, { ...p, operations: [paid] }).plans.paid.error.message, 'Payment confirmed comes from another company: connect its service (it is on the canvas already) to your design.');
});

test('a transaction writes each part to its own table (no false dual write); calls behind a queue are timed; an outage ages the wait', () => {
  const LEDGER = { tables: [...ORDERS().tables, { name: 'ledger', fields: F('id order_id amount:int'), key: ['id'] }] };
  const tx = { id: 't', op: 'tx', steps: [put(), { id: 'l', op: 'put', entity: 'ledger', values: { id: 'l1', order_id: 'o9', amount: 3 } }] };
  const p = { v: 2, entities: { ...ent, ledger: { rows: 1e6, rowBytes: 100, fields: { id: 'string', order_id: 'string', amount: 'int' }, sample: [{ id: 'l0', order_id: 'o1', amount: 5 }, { id: 'l2', order_id: 'o2', amount: 7 }] } },
    operations: [{ id: 'pay', name: 'Pay', kind: 'write', share: 1, durable: true, steps: [tx], respond: { status: 200, body: {} } }] };
  const d = base({ schema: LEDGER });
  assert.ok(!findings(d, p).some((x) => x.code === 'F_DUAL_WRITE'));
  assert.equal(compile(d, lab, p).plans.pay.steps.t.copies, undefined);
  // a charge made after answering, through a queue: its delay is measured, and an outage makes it grow tick by tick
  const q = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge' }), N('q', 'queue'), N('w', 'server', { size: 'c5.2xlarge', count: 2 }), N('db', 'database', { engine: 'postgres', multiAz: true, schema: ORDERS() }), N('psp', 'external', { preset: 'payments', errorPct: 0.5 })],
    edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'psp']) };
  const pp = PAY([put(), charge({ timing: 'defer', withinSec: 120 })]);
  const c = compile(q, lab, pp);
  let s = simulateTest(c, lab, pp, { hours: 1, startHour: 12, traffic: { rps: 100, pattern: 'steady' } });
  assert.ok(s.ops.pay.deferred.c1.worstDelaySec < 10, `normally the charge is made within seconds (${s.ops.pay.deferred.c1.worstDelaySec})`);
  assert.equal(s.ops.pay.deferred.c1.notDone, 0, 'a few retried calls in flight are not left undone');
  s = simulateTest(c, lab, pp, { hours: 1, startHour: 12, traffic: { rps: 100, pattern: 'steady' }, faults: [{ minute: 10, kind: 'externalDown', preset: 'payments', minutes: 10 }] });
  const worst = s.ops.pay.deferred.c1.worstDelaySec;
  assert.ok(worst >= 600 && worst < 1000, `a 10-minute outage: the oldest charge waits about 10 minutes (${worst})`);
});

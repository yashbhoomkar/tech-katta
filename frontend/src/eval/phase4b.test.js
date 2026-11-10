// v2 evaluator, phase 4b: event streams, pub/sub, the real-time gateway and publishing to people who are connected
// (tech-katta-context/evaluator.md §5.6, §8.7, §9.3, §10.2, §10.6).
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
const MSGS = { tables: [{ name: 'messages', fields: F('id chat_id body at:time'), key: ['chat_id'], sortKey: 'at' }] };
const ent = { messages: { rows: 1e8, rowBytes: 200, fields: { id: 'string', chat_id: 'string', body: 'string', at: 'time' }, sample: [{ id: 'm1', chat_id: 'c1', body: 'hi', at: '2026-11-10T10:00:00Z' }, { id: 'm2', chat_id: 'c1', body: 'yo', at: '2026-11-10T10:01:00Z' }] } };
const CONNECT = { id: 'connect', name: 'Open the app', kind: 'connect', share: 0.2, sessionSec: 600, steps: [{ id: 'c', op: 'compute', cpuMs: 1, label: 'Hello' }], respond: { status: 101, body: {} } };
const SEND = (extra = {}, stepExtra = {}) => ({ id: 'send', name: 'Send a message', kind: 'write', share: 0.8,
  steps: [{ id: 's1', op: 'put', entity: 'messages', values: { id: 'm9', chat_id: 'c1', body: 'hey', at: '2026-11-10T10:02:00Z' } }, { id: 'p', op: 'publish', audience: { avg: 2 }, label: 'Delivering it', ...stepExtra }],
  respond: { status: 201, body: {} }, ...extra });
const P = (...ops) => ({ v: 2, entities: ent, operations: ops.length ? ops : [CONNECT, SEND()] });
// Clients → LB → app (sends) and → gateway (connections); app → DB and → channel → gateway
const chat = (via = 'pubsub', rt = {}) => ({ nodes: [N('c', 'client'), N('lb', 'lb'), N('app', 'server', { size: 'c5.2xlarge', count: 4 }), N('db', 'database', { engine: 'cassandra', schema: MSGS }), N('ch', via, via === 'stream' ? { partitions: 12, keyField: ['chat_id'] } : {}), N('rt', 'realtime', { size: 'm5.large', count: 4, ...rt })],
  edges: E(['c', 'lb'], ['lb', 'app'], ['lb', 'rt'], ['app', 'db'], ['app', 'ch'], ['ch', 'rt']) });
const run = (d, p, t = {}) => { const c = compile(d, lab, p); return { c, s: simulateTest(c, lab, p, { hours: 1, startHour: 12, traffic: { rps: 1000, pattern: 'steady' }, ...t }) }; };
const findings = (d, p, t = {}) => { const c = compile(d, lab, p), test = { hours: 1, startHour: 12, traffic: { rps: 1000, pattern: 'steady' }, ...t }; return analyse(c, p, lab, [{ test, sim: simulateTest(c, lab, p, test) }]); };

test('publish: through a channel or a stream to a gateway that holds the connections', () => {
  let r = compile(chat(), lab, P());
  assert.equal(r.plans.connect.ok, true, r.plans.connect.error?.message);
  assert.equal(r.plans.connect.root.children[0].children[0].node, 'rt', 'connections go to the gateway');
  assert.equal(r.plans.send.ok, true, r.plans.send.error?.message);
  assert.deepEqual([r.plans.send.steps.p.node, r.plans.send.steps.p.viaKind, r.plans.send.steps.p.sync], ['rt', 'pubsub', false]);
  const handle = r.plans.send.root.children[0].children[0];
  const enq = handle.children.find((h) => h.kind === 'enqueue');
  assert.deepEqual([enq.node, enq.children[0].kind, enq.children[0].node, enq.children[0].per, enq.children[0].sync], ['ch', 'deliver', 'rt', 2, false]);
  assert.equal(compile(chat('stream'), lab, P()).plans.send.steps.p.viaKind, 'stream');
  // nobody connected to the gateway (no arrow from the load balancer)
  const d = chat(); d.edges = d.edges.filter((e) => !(e.from === 'lb' && e.to === 'rt'));
  r = compile(d, lab, P());
  assert.equal(r.plans.send.error.code, 'E_NO_CONNECTION');
  assert.equal(r.plans.send.error.message, "Nobody is connected to Real-time gateway: Clients need an arrow to it, through a load balancer.");
  // no channel at all
  const n = chat(); n.edges = n.edges.filter((e) => e.from !== 'app' || e.to !== 'ch');
  assert.equal(compile(n, lab, P()).plans.send.error.code, 'E_NO_PUBLISH');
});

test('the gateway: open connections and messages a second; deliveries lost when it is full', () => {
  // 1,000 calls a second: 200 connect a second, each open 600 s → 120,000 connections; 800 sends × 2 = 1,600 messages a second
  let { s } = run(chat('pubsub', { count: 6 }), P());
  assert.ok(Math.abs(s.nodes.rt.rhoMax - 120000 / (25000 * 6)) < 1e-9, `connections decide: ${s.nodes.rt.rhoMax}`);
  // 4 instances hold 100,000: over its limit, it refuses connections and crashes
  ({ s } = run(chat(), P()));
  assert.ok(s.ops.connect.availability < 99 && s.nodes.rt.crashes > 0);
  ({ s } = run(chat('pubsub', { count: 6 }), P()));
  assert.equal(s.ops.send.deferred.p.notDone, 0, 'every message delivered');
  // a gateway with too little message capacity loses deliveries (pub/sub keeps nothing)
  ({ s } = run(chat('pubsub', { count: 6 }), P(CONNECT, SEND({}, { audience: { avg: 100 } }))));
  assert.ok(s.ops.send.deferred.p.notDone > 0, 'messages over its limit are lost');
  assert.ok(s.cost.byNode.rt > 0 && s.cost.byNode.ch > 0);
});

test('a stream: every consumer group reads every event, each from its own position', () => {
  const p = P({ id: 'post', name: 'Post', kind: 'write', share: 1, steps: [
    { id: 'a', op: 'put', entity: 'messages', values: { id: 'm9', chat_id: 'c1', body: 'x', at: '2026-11-10T10:02:00Z' }, timing: 'defer' }], respond: { status: 202, body: {} } });
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('st', 'stream', { partitions: 6 }), N('w1', 'server', { size: 'c5.2xlarge' }), N('w2', 'server', { size: 't3.medium' }), N('db', 'database', { engine: 'cassandra', schema: MSGS }), N('db2', 'database', { engine: 'cassandra', schema: MSGS })],
    edges: E(['c', 'app'], ['app', 'st'], ['st', 'w1'], ['st', 'w2'], ['w1', 'db'], ['w2', 'db2']) };
  const { c, s } = run(d, p, { traffic: { rps: 500, pattern: 'steady' } });
  const handle = c.plans.post.root.children[0];
  const enq = handle.children.filter((h) => h.kind === 'enqueue');
  assert.equal(enq.length, 1, 'stored once');
  assert.deepEqual(enq[0].children.map((h) => h.node).sort(), ['w1', 'w2'], 'each consumer group reads it');
  // the slow group (t3.medium: 300 units = 150 messages a second for 500 arriving) falls behind; the fast one doesn't
  assert.ok(s.queues[0].backlogEnd > 1e5, `the slowest group shows: ${s.queues[0].backlogEnd}`);
});

test('findings: nothing stored for an offline phone, order over a stream or a channel, events expiring before they are read', () => {
  const noStore = { ...SEND({ durable: true }), steps: [SEND().steps[1]] };
  assert.ok(findings(chat(), P(CONNECT, noStore)).some((f) => f.code === 'F_NO_CATCH_UP' && f.severity === 'fail'));
  assert.ok(!findings(chat(), P(CONNECT, SEND({ durable: true }))).some((f) => f.code === 'F_NO_CATCH_UP'));
  const ordered = SEND({ ordered: { by: 'chat_id' } });
  assert.ok(findings(chat('pubsub', { count: 6 }), P(CONNECT, ordered)).some((f) => f.code === 'F_ORDER' && f.severity === 'warn'));
  assert.ok(!findings(chat('stream', { count: 6 }), P(CONNECT, ordered)).some((f) => f.code === 'F_ORDER'), 'a stream partitioned by chat_id keeps order');
  const unkeyed = chat('stream', { count: 6 }); unkeyed.nodes.find((n) => n.id === 'ch').config.keyField = ['body'];
  assert.match(findings(unkeyed, P(CONNECT, ordered)).find((f) => f.code === 'F_ORDER').story, /it is not partitioned by chat_id/);
  // events kept 1 hour, read by a worker that falls hours behind
  const p = P({ id: 'post', name: 'Post', kind: 'write', share: 1, steps: [{ id: 'a', op: 'put', entity: 'messages', values: { id: 'm9', chat_id: 'c1', body: 'x', at: '2026-11-10T10:02:00Z' }, timing: 'defer' }], respond: { status: 202, body: {} } });
  const slow = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('st', 'stream', { retentionHours: 1 }), N('w', 'server', { size: 't3.medium' }), N('db', 'database', { engine: 'cassandra', schema: MSGS })], edges: E(['c', 'app'], ['app', 'st'], ['st', 'w'], ['w', 'db']) };
  assert.ok(findings(slow, p, { hours: 6, traffic: { rps: 2000, pattern: 'steady' } }).some((f) => f.code === 'F_RETENTION'));
});

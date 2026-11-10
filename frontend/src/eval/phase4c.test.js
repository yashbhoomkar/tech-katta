// v2 evaluator, phase 4c: change data capture, files straight to object storage, poison messages and hot keys
// (tech-katta-context/evaluator.md §7.3, §7.6, §8.7, §8.11, §10.3, §10.9).
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
const POSTS = (key = ['id'], extra = {}) => ({ tables: [{ name: 'posts', fields: F('id author title body:text'), key, ...extra }] });
const ent = { posts: { rows: 1e7, rowBytes: 2000, fields: { id: 'string', author: 'string', title: 'string', body: 'text' }, sample: [{ id: 'p1', author: 'u1', title: 'Biryani', body: 'how to cook biryani' }, { id: 'p2', author: 'u2', title: 'Dosa', body: 'crisp dosa at home' }] } };
const WRITE = { id: 'write', name: 'Write a post', kind: 'write', share: 0.2, steps: [{ id: 's1', op: 'put', entity: 'posts', values: { id: 'p9', author: 'u1', title: 'Chai', body: 'masala chai' } }], respond: { status: 201, body: {} } };
const SEARCH = { id: 'search', name: 'Search posts', kind: 'read', share: 0.8, steps: [{ id: 's1', op: 'query', entity: 'posts', text: { field: 'body', q: 'biryani' }, limit: 20, matches: 50 }], respond: { status: 200, body: {} } };
const P = (...ops) => ({ v: 2, entities: ent, operations: ops.length ? ops : [WRITE, SEARCH] });
// Clients → app → Postgres (posts); Postgres's changes → stream → indexer → OpenSearch; app reads OpenSearch
const withCdc = (via = 'stream') => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.large', schema: POSTS() }),
  N('st', via, via === 'stream' ? { partitions: 6 } : {}), N('ix', 'server', { size: 'c5.2xlarge', count: 2 }), N('os', 'database', { engine: 'opensearch', size: 'db.r5.2xlarge', schema: POSTS(['id'], { indexes: [{ fields: ['body'], kind: 'text' }] }) })],
  edges: E(['c', 'app'], ['app', 'db'], ['db', 'st'], ['st', 'ix'], ['ix', 'os'], ['app', 'os']) });
const LOAD = { hours: 1, startHour: 12, traffic: { rps: 300, pattern: 'steady' } };
const sim = (d, p, t = {}) => { const c = compile(d, lab, p); return { c, s: simulateTest(c, lab, p, { ...LOAD, ...t }) }; };
const findings = (d, p, t = {}) => { const c = compile(d, lab, p), test = { ...LOAD, ...t }; return analyse(c, p, lab, [{ test, sim: simulateTest(c, lab, p, test) }]); };

test('change data capture: the changes of a database feed a search index through a stream', () => {
  const c = compile(withCdc(), lab, P());
  assert.equal(c.ok, true, JSON.stringify(c.errors));
  assert.equal(c.plans.write.ok, true);
  assert.equal(c.plans.search.ok, true, c.plans.search.error?.message);
  assert.equal(c.plans.search.steps.s1.node, 'os');
  assert.equal(c.plans.search.steps.s1.feed, 'cdc', 'the index is fed by the database changes, not by the handler');
  assert.ok(!c.plans.write.steps.s1.copies, 'the write itself touches only Postgres');
  assert.equal(c.system.length, 1);
  const { op, plan } = c.system[0];
  assert.equal(op.id, 'cdc:db:posts');
  assert.deepEqual([plan.root.node, plan.root.children[0].node, plan.root.children[0].children[0].node, plan.root.children[0].children[0].children[0].node], ['db', 'st', 'ix', 'os']);
  // without the change stream the handler writes the index itself (two stores, no transaction: §10.5)
  const d = withCdc(); d.edges = d.edges.filter((e) => e.from !== 'db');
  assert.equal(compile(d, lab, P()).plans.search.steps.s1.feed, 'dual');
  assert.ok(findings(d, P()).some((f) => f.code === 'F_DUAL_WRITE'));
  // an engine with no change stream can't have the arrow: the canvas rules drop it
  const cas = withCdc(); cas.nodes[2].config = { engine: 'cassandra', schema: POSTS() };
  const cc = compile(cas, lab, P());
  assert.ok(!cc.design.edges.some((e) => e.from === 'db') && cc.system.length === 0);
});

test('change data capture in the simulator: the changes of last minute load the stream, the indexer and the index', () => {
  const { s } = sim(withCdc(), P());
  // 60 writes a second become 60 change events a second; the indexer writes each into the index
  assert.ok(s.nodes.ix.rhoMax > 0, 'the indexer works');
  const q = s.queues.find((x) => x.node === 'st');
  assert.ok(q && q.op === 'cdc:db:posts');
  assert.ok(s.feedDelay['os|posts'] >= 1, 'the index is behind the database by the stream wait');
  assert.equal(s.ops.write.availability, 100);
  // reading it: a search may be a little behind, never wrong
  const f = findings(withCdc(), P());
  assert.ok(f.some((x) => x.code === 'F_STALE_INFO' && x.op === 'search'));
  const strict = P(WRITE, { ...SEARCH, consistency: 'strong' });
  assert.match(findings(withCdc(), strict).find((x) => x.code === 'F_STALE').story, /fed by change data capture/);
  // a slow indexer falls behind and the index with it
  const slow = withCdc(); slow.nodes[4].config = { size: 't3.medium', count: 1 };
  const r = sim(slow, P(WRITE, { ...SEARCH, share: 0 }), { traffic: { rps: 20000, pattern: 'steady' } });
  assert.ok(r.s.feedDelay['os|posts'] > 600, `behind by ${r.s.feedDelay['os|posts']}`);
});

test('files straight to object storage: the store is the handler', () => {
  const photos = { users: { rows: 1e6, rowBytes: 200, fields: { id: 'string', photo: 'blob' }, sample: [{ id: 'u1', photo: 'x' }] } };
  const up = { id: 'up', name: 'Upload a photo', kind: 'write', share: 1, steps: [{ id: 's', op: 'blob', entity: 'users', key: { id: 'u1' }, field: 'photo', mode: 'put', bytes: 2e6 }], respond: { status: 201, body: {} } };
  const p = { v: 2, entities: photos, operations: [up] };
  const T = { tables: [{ name: 'photos', fields: F('id photo:blob'), key: ['id'] }] };
  const d = { nodes: [N('c', 'client'), N('s3', 'database', { engine: 's3', schema: T })], edges: E(['c', 's3']) };
  const c = compile(d, lab, p);
  assert.equal(c.plans.up.ok, true, c.plans.up.error?.message);
  assert.equal(c.plans.up.root.children[0].node, 's3');
  const { s } = sim(d, p, { traffic: { rps: 200, pattern: 'steady' } });
  assert.equal(s.ops.up.availability, 100);
});

test('poison messages: retried for ever without a dead-letter queue, set aside with one, blocking a FIFO queue', () => {
  const post = { id: 'post', name: 'Post', kind: 'write', share: 1, steps: [{ id: 'a', op: 'put', entity: 'posts', values: { id: 'p9', author: 'u1', title: 'x', body: 'y' }, timing: 'defer', withinSec: 60 }], respond: { status: 202, body: {} } };
  const p = P(post);
  const d = (q) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('q', 'queue', q), N('w', 'server', { size: 'c5.2xlarge', count: 1 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: POSTS() })],
    edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) });
  const poison = { faults: [{ minute: 5, kind: 'poison', share: 0.05, minutes: 30 }], traffic: { rps: 300, pattern: 'steady' } };
  const none = sim(d({}), p, { traffic: poison.traffic }).s.nodes.w.rhoMax;
  const forever = sim(d({}), p, poison).s, dlq = sim(d({ dlq: true, maxReceives: 3 }), p, poison).s;
  // work per message: ×(1 + 20·5%) = 2 without; ×(1 + 5%·2) = 1.1 with a dead-letter queue
  assert.ok(Math.abs(forever.nodes.w.rhoMax / none - 2) < 0.05, `${forever.nodes.w.rhoMax / none}`);
  assert.ok(Math.abs(dlq.nodes.w.rhoMax / none - 1.1) < 0.05, `${dlq.nodes.w.rhoMax / none}`);
  // at three times the rate (the workers 72% busy), retrying for ever is more than they can take: messages wait
  const busy = { ...poison, traffic: { rps: 900, pattern: 'steady' } };
  assert.ok(sim(d({}), p, busy).s.ops.post.deferred.a.worstDelaySec > 60);
  assert.ok(sim(d({ dlq: true, maxReceives: 3 }), p, busy).s.ops.post.deferred.a.worstDelaySec < 5);
  const f = findings(d({}), p, poison);
  assert.match(f.find((x) => x.code === 'F_POISON').title, /retries bad messages for ever/);
  assert.ok(!findings(d({ dlq: true }), p, poison).some((x) => x.code === 'F_POISON'));
  // a FIFO queue stops behind them: that share stays in the backlog until the fault ends
  const fifo = sim(d({ kind: 'fifo' }), p, { ...poison, traffic: { rps: 500, pattern: 'steady' } }).s;
  assert.ok(Math.max(...fifo.timeline.nodes.q.backlog) > 0);
  assert.match(findings(d({ kind: 'fifo' }), p, { ...poison, traffic: { rps: 500, pattern: 'steady' } }).find((x) => x.code === 'F_POISON').title, /block/);
});

test('hot keys: one item lands on one shard; a cache in front absorbs it', () => {
  const read = { id: 'read', name: 'Read a post', kind: 'read', share: 1, keys: { entity: 'posts', skew: 'zipf', active: 1e6 }, steps: [{ id: 's1', op: 'get', entity: 'posts', by: { id: 'p1' } }], respond: { status: 200, body: {} } };
  const p = P(read);
  const shards = (k) => ({ nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 8 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.large', shards: k, schema: POSTS() })], edges: E(['c', 'app'], ['app', 'db']) });
  const hot = { faults: [{ minute: 10, kind: 'hotKey', op: 'read', share: 0.4, minutes: 20 }], traffic: { rps: 6000, pattern: 'steady' } };
  const calm = sim(shards(4), p, { traffic: hot.traffic }).s, h = sim(shards(4), p, hot).s;
  assert.equal(calm.ops.read.availability, 100, 'spread evenly, four shards take it');
  assert.ok(h.ops.read.availability < 99, `the hot shard drops calls: ${h.ops.read.availability}`);
  assert.ok(h.events.some((e) => e.kind === 'hotPart' && e.node === 'db'));
  const f = findings(shards(4), p, hot).find((x) => x.code === 'F_HOT');
  assert.equal(f.severity, 'fail');
  assert.match(f.story, /One post gets 40% of Read a post\. All of it lands on one shard of/);
  // a look-aside cache in front keeps the hot item: the shard behind sees only misses
  const cached = shards(4);
  cached.nodes.push(N('ca', 'cache', { size: 'cache.r5.large', ttlSec: 300 }));
  cached.edges = E(['c', 'app'], ['app', 'ca'], ['ca', 'db']);
  const hc = sim(cached, p, hot).s;
  assert.ok(!hc.hotParts.some((x) => x.node === 'db' && x.lost));
});

test('a step done 20 times makes 20 calls to the cache in front, and only the misses reach the database', () => {
  const read = { id: 'read', name: 'Read posts', kind: 'read', share: 1, keys: { entity: 'posts', skew: 'zipf', active: 1e5 }, steps: [{ id: 's1', op: 'get', entity: 'posts', by: { id: 'p1' }, times: 20 }], respond: { status: 200, body: {} } };
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 4 }), N('ca', 'cache', { size: 'cache.r5.large', ttlSec: 300 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: POSTS() })], edges: E(['c', 'app'], ['app', 'ca'], ['ca', 'db']) };
  const c = compile(d, lab, P(read)), cacheHop = c.plans.read.root.children[0].children[0];
  assert.deepEqual([cacheHop.kind, cacheHop.per, cacheHop.children[0].per], ['cache', 20, 1]);
  const { s } = sim(d, P(read), { traffic: { rps: 1000, pattern: 'steady' } });
  assert.ok(s.nodes.ca.rhoMax > 0.3, `the cache takes 20,000 gets a second: ${s.nodes.ca.rhoMax}`);
  assert.ok(s.nodes.db.rhoMax < 0.2, `the database only the misses: ${s.nodes.db.rhoMax}`);
});

test('workers back off while what they write to is overloaded, so a backlog does not knock the database over', () => {
  const post = { id: 'post', name: 'Post', kind: 'write', share: 1, steps: [{ id: 'a', op: 'put', entity: 'posts', values: { id: 'p9', author: 'u1', title: 'x', body: 'y' }, times: 50, timing: 'defer', withinSec: 900 }], respond: { status: 202, body: {} } };
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('q', 'queue'), N('w', 'server', { size: 'c5.2xlarge', count: 4 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', multiAz: true, schema: POSTS() })],
    edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) };
  // 40 posts a second × 50 writes × 3 units = 6,000 of the database's 12,000; the workers could pull far more
  const { s } = sim(d, P(post), { traffic: { rps: 40, pattern: 'steady' }, faults: [{ minute: 10, kind: 'crash', type: 'database' }] });
  assert.equal(s.nodes.db.crashes, 0, 'the drain after the failover does not crash it again');
  assert.ok(s.nodes.db.rhoMax <= 10 && s.ops.post.deferred.a.notDone === 0, 'and the backlog is cleared by the end');
});

test('a queue two calls share is one line: a slow kind of message makes the other wait too', () => {
  const put = (id, ent, ext) => ({ id, name: id, kind: 'write', share: 0.5, steps: [{ id: 'a', op: 'put', entity: 'posts', values: { id: 'p9', author: 'u1', title: 'x', body: 'y' } }, { id: 'b', op: 'call', preset: ext, timing: 'defer', withinSec: 60 }], respond: { status: 202, body: {} } });
  const p = P(put('otp', 'posts', 'sms'), put('promo', 'posts', 'push'));
  const X = (id, preset, limitRps) => N(id, 'external', { preset, latencyMs: 200, limitRps, errorPct: 0, pricePerCall: 0 });
  const d = { nodes: [N('c', 'client'), N('app', 'server', { size: 'c5.2xlarge', count: 2 }), N('db', 'database', { engine: 'postgres', size: 'db.r5.2xlarge', schema: POSTS() }), N('q', 'queue'), N('w', 'server', { size: 'c5.2xlarge', count: 4 }), X('sms', 'sms', 5000), X('push', 'push', 300)],
    edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'sms'], ['w', 'push']) };
  const { s } = sim(d, p, { traffic: { rps: 1000, pattern: 'steady' } });
  // the push provider takes 300 of the 500 promotions a second: the line grows, and OTPs are in it
  assert.ok(s.ops.otp.deferred.b.worstDelaySec > 60, `OTPs wait behind promotions: ${s.ops.otp.deferred.b.worstDelaySec}`);
  assert.ok(Math.abs(s.ops.otp.deferred.b.worstDelaySec - s.ops.promo.deferred.b.worstDelaySec) < 2);
});

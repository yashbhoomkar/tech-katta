// v2 evaluator, phase 1: access paths, compile and trace (tech-katta-context/evaluator.md §7, §9, §14.1, §15).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accessPath, fieldMatcher, holds, fitOf } from './access.js';
import { compile, carries, prefer } from './compile.js';
import { runTrace, expected } from './trace.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/url-shortener.v2.json', import.meta.url)));
const W = lab.eval.work;
const N = (id, type, config = {}, extra = {}) => ({ id, type, x: 0, y: 0, config, ...extra });
const E = (...pairs) => pairs.map(([from, to, carries]) => ({ from, to, ...(carries ? { carries } : {}) }));
const F = (spec) => spec.split(' ').map((x) => { const [name, type = 'string'] = x.split(':'); return { name, type }; });
const T = (name, fields, key, extra = {}) => ({ name, fields: F(fields), key, ...extra });
const DB = (id, engine, tables, extra = {}) => N(id, 'database', { engine, schema: { tables } }, extra);
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg || ''} expected ${b}, got ${a}`);

// ---- access paths: one case per row of §7.4 --------------------------------------------------------------
const P = (entity, rows, sample = [{}, {}]) => ({ entities: { [entity]: { rows, fields: {}, sample } }, aliases: { email: ['mail'] } });
const users = P('users', 5e7), small = P('users', 20000);
const path = (engine, table, step, practice = users) => accessPath(DB('d', engine, [table]), table, step, practice, lab);
const get = (by) => ({ id: 's', op: 'get', entity: 'users', by, fields: ['name'] });

test('access: get by the key, an index, every field searchable, a small scan', () => {
  const t = T('users', 'id name email', ['id'], { indexes: [{ fields: ['email'], kind: 'btree' }] });
  let a = path('postgres', t, get({ id: 'u1' }));
  assert.equal(a.ok, true); assert.equal(a.how, 'key'); near(a.work, W.get);
  assert.match(a.query, /SELECT name FROM users WHERE id = 'u1';/);
  a = path('postgres', t, get({ email: 'a@b' }));
  assert.equal(a.how, 'index'); near(a.work, W.indexRead);
  a = path('postgres', T('users', 'id name mail', ['id'], { indexes: [{ fields: ['mail'], kind: 'unique' }] }), get({ email: 'a@b' }));
  assert.equal(a.how, 'index', 'aliases: mail is email');
  a = path('opensearch', T('users', 'id name email', ['id']), get({ email: 'a@b' }));
  assert.equal(a.how, 'index', 'OpenSearch searches every field');
  a = path('postgres', T('users', 'id name email', ['id']), get({ email: 'a@b' }), small);
  assert.equal(a.how, 'scan'); near(a.work, 20);
  a = path('postgres', T('users', 'id name email', ['id']), get({ email: 'a@b' }), P('users', 1000));
  near(a.work, 5, 'a scan costs at least 5 units');
});

test('access: no path, in the words of each engine', () => {
  let a = path('postgres', T('users', 'id name email', ['id']), get({ email: 'a@b' }));
  assert.equal(a.ok, false);
  assert.equal(a.why, 'Looking up users by email would read all 5 crore rows: make email the primary key, or add an index on it.');
  a = path('dynamodb', T('users', 'id name email', ['id']), get({ email: 'a@b' }), small);
  assert.equal(a.ok, false, 'DynamoDB cannot scan even a small table');
  assert.match(a.why, /^DynamoDB can't find users by email: it only finds items by the partition key or an index/);
  a = path('cassandra', T('users', 'id name email', ['id']), get({ email: 'a@b' }));
  assert.match(a.why, /it only finds items by the partition key\. Make email the partition key\.$/, 'Cassandra has no secondary indexes here');
  a = path('postgres', T('users', 'id name', ['id']), get({ email: 'a@b' }));
  assert.equal(a.why, 'users has no email.');
  a = path('s3', T('users', 'id name', ['id']), { id: 's', op: 'query', entity: 'users', where: { name: 'x' } });
  assert.match(a.why, /^S3 can only get and put whole objects/);
});

test('access: queries in order, by key range, index range, sorted in memory, or not at all', () => {
  const q = (extra) => ({ id: 's', op: 'query', entity: 'users', where: { team: 't1' }, order: { field: 'at', desc: true }, limit: 10, fields: ['id'], ...extra });
  let a = path('dynamodb', T('users', 'team id at:time', ['team'], { sortKey: 'at' }), q({ matches: 500 }));
  assert.equal(a.how, 'key-range'); near(a.work, 1 + 10 / W.rowsPerUnit); assert.equal(a.rows, 10);
  a = path('postgres', T('users', 'id team at:time', ['id'], { indexes: [{ fields: ['team', 'at'], kind: 'btree' }] }), q({ matches: 500 }));
  assert.equal(a.how, 'index-range'); near(a.work, W.indexRead + 0.1);
  a = path('postgres', T('users', 'id team at:time', ['id'], { indexes: [{ fields: ['team'], kind: 'btree' }] }), q({ matches: 500 }));
  assert.equal(a.how, 'index'); assert.equal(a.sorted, true); near(a.work, W.indexRead + 500 / W.rowsPerUnit, 'sorting reads every match');
  a = path('postgres', T('users', 'id team at:time', ['id'], { indexes: [{ fields: ['team'], kind: 'btree' }] }), q({ matches: 20000 }));
  assert.equal(a.ok, false);
  assert.equal(a.why, "More than 10,000 matching rows can't be sorted in memory: make at the second field of an index or add it to the index.");
  a = path('dynamodb', T('users', 'team id at:time', ['team']), q({ matches: 20000 }));
  assert.match(a.why, /make at the sort key/);
});

test('access: near a point and by words', () => {
  const nearQ = { id: 's', op: 'query', entity: 'users', near: { field: 'loc', at: [19, 72], km: 5 }, limit: 20, matches: 40, fields: ['id'] };
  const textQ = { id: 's', op: 'query', entity: 'users', text: { field: 'bio', q: 'chai' }, limit: 20, matches: 40, fields: ['id'] };
  const t = (ix) => T('users', 'id loc:geo bio:text', ['id'], ix ? { indexes: [ix] } : {});
  let a = path('postgres', t({ fields: ['loc'], kind: 'geo' }), nearQ);
  assert.equal(a.how, 'geo'); near(a.work, W.geo + 20 / W.rowsPerUnit);
  a = path('postgres', t(), nearQ);
  assert.equal(a.why, 'Users near a point need a geo index on loc (or a search index, or a geo set in a cache).');
  assert.equal(path('opensearch', t(), nearQ).how, 'geo');
  const cache = N('c', 'cache', { structures: [{ name: 'places', kind: 'geo', fields: F('id loc:geo'), key: ['id'] }] });
  a = accessPath(cache, cache.config.structures[0], nearQ, users, lab);
  assert.equal(a.how, 'geo'); assert.match(a.query, /^GEOSEARCH places/);
  assert.equal(path('mongodb', t({ fields: ['bio'], kind: 'text' }), textQ).how, 'text');
  assert.equal(path('opensearch', t(), textQ).how, 'text');
  assert.match(path('postgres', t(), textQ).why, /needs a text index on bio/);
  assert.equal(path('postgres', T('users', 'id loc', ['id']), nearQ).why, "loc in users isn't a location field.");
});

test('access: sums need aggregation and a bounded number of rows', () => {
  const s = (matches) => ({ id: 's', op: 'sum', entity: 'users', where: { team: 't' }, field: 'score', matches });
  const t = T('users', 'id team score:int', ['id'], { indexes: [{ fields: ['team'], kind: 'btree' }] });
  const a = path('postgres', t, s(5000));
  assert.equal(a.how, 'agg'); near(a.work, 1 + 5000 / W.rowsPerUnit);
  assert.match(path('dynamodb', t, s(10)).why, /can't add up many rows in one query/);
  assert.match(path('postgres', t, s(2e6)).why, /^Adding up 20 lakh rows/);
});

test('access: writes, unique values, conditions', () => {
  const put = (unique) => ({ id: 's', op: 'put', entity: 'users', values: { id: 'u9', email: 'x@y', name: 'X' }, ...(unique ? { unique } : {}) });
  const t = T('users', 'id name email', ['id'], { indexes: [{ fields: ['name'], kind: 'btree' }] });
  let a = path('postgres', t, put(['id']));
  assert.equal(a.how, 'write'); near(a.work, W.put + W.indexWrite, 'one index to keep up to date');
  assert.match(path('postgres', t, put(['email'])).why, /^users would accept two rows with the same email: make email the key, or add a unique index on it\.$/);
  assert.equal(path('postgres', T('users', 'id name email', ['id'], { indexes: [{ fields: ['email'], kind: 'unique' }] }), put(['email'])).ok, true);
  assert.equal(path('dynamodb', t, put(['id'])).ok, true, 'conditional put on the key');
  assert.match(path('opensearch', t, put(['id'])).why, /^Only-if-absent needs a store that can check and write in one step; OpenSearch can't\./);
  assert.match(path('postgres', T('users', 'uid name', ['uid']), put()).why, /^Writing to users needs its primary key \(uid\)/);
  const upd = { id: 's', op: 'update', entity: 'users', by: { id: 'u1' }, add: { stock: -1 }, cond: { stock: { gte: 1 } } };
  const st = T('users', 'id stock:int', ['id']);
  a = path('cassandra', st, upd);
  near(a.work, W.update * W.casFactorCassandra, 'a lightweight transaction costs more');
  near(path('postgres', st, upd).work, W.update);
  assert.match(path('opensearch', st, upd).why, /can't change a row only if it is still as expected/);
  assert.match(path('s3', st, upd).why, /^S3 can’t change part of an object/);
});

test('access: files, counters and rankings', () => {
  const blob = { id: 's', op: 'blob', entity: 'users', key: { id: 'u1' }, field: 'photo', mode: 'put', bytes: 5e6 };
  const a = path('s3', T('photos', 'id photo:blob', ['id']), blob);
  assert.equal(a.how, 'blob'); near(a.work, 5 * W.blobPerMB);
  assert.equal(path('postgres', T('photos', 'id photo:blob', ['id']), blob).why, 'File bytes would go into PostgreSQL rows: keep files in object storage (S3) and their key in the database.');
  assert.equal(path('s3', T('photos', 'id photo', ['id']), blob).why, 'photos has no file field for the bytes.');
  assert.equal(path('s3', T('photos', 'id photo:blob', ['id']), { ...blob, mode: 'get', key: { photo: 'x' } }).ok, false, 'S3 finds objects by their whole key');
  const incr = { id: 's', op: 'incr', entity: 'users', by: { id: 'u1' }, field: 'views' };
  const counters = N('c', 'cache', { structures: [{ name: 'views', kind: 'counter', fields: F('id views:int'), key: ['id'] }, { name: 'top', kind: 'zset', fields: F('id score:int'), key: ['id'], sortKey: 'score' }] });
  let c = accessPath(counters, counters.config.structures[0], incr, users, lab);
  assert.equal(c.how, 'write'); near(c.work, W.incr); assert.equal(c.query, 'INCR views:u1');
  assert.equal(path('postgres', T('users', 'id views:int', ['id']), incr).ok, true);
  assert.match(path('opensearch', T('users', 'id views:int', ['id']), incr).why, /can't add to a number in place/);
  const rank = { id: 's', op: 'rank', entity: 'users', order: { field: 'score', desc: true }, limit: 10, matches: 1e6, fields: ['id'] };
  c = accessPath(counters, counters.config.structures[1], rank, users, lab);
  assert.equal(c.how, 'zset'); near(c.work, W.rank);
  assert.equal(path('postgres', T('users', 'id score:int', ['id'], { indexes: [{ fields: ['score'], kind: 'btree' }] }), rank).how, 'index-range');
  assert.equal(path('mysql', T('users', 'id score:int', ['id']), rank).why, 'Ranking users by score needs a sorted set in a cache, or an index on score.');
});

test('access: which tables hold an entity', () => {
  const match = fieldMatcher(fixture);
  assert.equal(holds({ name: 'links', fields: [] }, 'links', fixture, match), true, 'by name');
  assert.equal(holds({ name: 'link', fields: [] }, 'links', fixture, match), true, 'singular name');
  assert.equal(holds({ name: 'short', fields: F('slug url') }, 'links', fixture, match), true, 'every field a read uses (aliases)');
  assert.equal(holds({ name: 'short', fields: F('slug') }, 'links', fixture, match), false);
  assert.deepEqual(fitOf({ fields: F('code') }, fixture.operations[0].steps[0], match), { have: ['code'], miss: ['long_url'] });
});

// ---- compile -------------------------------------------------------------------------------------------------
const OPS = {
  find: { id: 'find', name: 'Find a link', kind: 'read', share: 0.9, steps: [{ id: 's1', op: 'get', entity: 'links', by: { code: 'ab12x' }, fields: ['long_url'] }], respond: { status: 200, body: { url: '$s1.long_url' } } },
  make: { id: 'make', name: 'Make a link', kind: 'write', share: 0.1, steps: [{ id: 's1', op: 'put', entity: 'links', values: { code: 'n1', long_url: 'https://n' } }], respond: { status: 201, body: { code: '$s1.code' } } },
};
const prob = (...ops) => ({ v: 2, entities: fixture.entities, aliases: fixture.aliases, operations: ops });
const LINKS = T('links', 'code long_url user_id created_at:time expires_at:time clicks:int', ['code']);
const app = (id = 'app', cfg = {}) => N(id, 'server', { size: 'm5.large', ...cfg });

test('compile: the arrows a call follows: API gateway before a load balancer, the CDN first for cacheable calls', () => {
  const design = { nodes: [N('c', 'client'), N('lb', 'lb'), N('gw', 'apigw'), N('cdn', 'cdn'), app(), DB('db', 'postgres', [LINKS])],
    edges: E(['c', 'lb'], ['c', 'gw'], ['c', 'cdn'], ['cdn', 'lb'], ['lb', 'app'], ['gw', 'app'], ['app', 'db']) };
  let r = compile(design, lab, prob(OPS.find, OPS.make));
  assert.equal(r.ok, true);
  assert.equal(r.plans.find.root.children[0].node, 'gw');
  const cacheable = { ...OPS.find, cacheable: { ttlSec: 60 } };
  r = compile(design, lab, prob(cacheable, OPS.make));
  const cdn = r.plans.find.root.children[0];
  assert.equal(cdn.node, 'cdn'); assert.deepEqual(cdn.children[0].share, { kind: 'cdnMiss' });
  assert.deepEqual(prefer({ kind: 'connect' }), ['lb', 'apigw', 'realtime']);
  assert.equal(carries({ carries: ['reads'] }, { kind: 'read' }), true);
  assert.equal(carries({ carries: ['writes'] }, { id: 'x', kind: 'read' }), false);
  assert.equal(carries({ carries: ['x'] }, { id: 'x', kind: 'read' }), true);
  assert.equal(carries({}, { id: 'x', kind: 'read' }), true);
});

test('compile: several handlers share the calls; arrows that carry only some calls are followed', () => {
  const design = { nodes: [N('c', 'client'), N('lb', 'lb'), app('a1'), app('a2'), DB('db', 'postgres', [LINKS])],
    edges: E(['c', 'lb'], ['lb', 'a1'], ['lb', 'a2'], ['a1', 'db'], ['a2', 'db']) };
  let r = compile(design, lab, prob(OPS.find, OPS.make));
  const [h1, h2] = r.plans.find.root.children[0].children;
  assert.deepEqual([h1.node, h2.node], ['a1', 'a2']);
  assert.deepEqual(h1.share, { kind: 'split', group: 'find#1:server', weight: 0.5 });
  assert.equal(h2.share.group, h1.share.group);
  design.edges = E(['c', 'lb'], ['lb', 'a1', ['reads']], ['lb', 'a2', ['writes']], ['a1', 'db'], ['a2', 'db']);
  r = compile(design, lab, prob(OPS.find, OPS.make));
  assert.equal(r.plans.find.root.children[0].children.map((h) => h.node).join(), 'a1');
  assert.equal(r.plans.make.root.children[0].children.map((h) => h.node).join(), 'a2');
});

test('compile: microservices: each call goes to the Service that can do it', () => {
  const users = { id: 'login', name: 'Sign in', kind: 'read', share: 0, steps: [{ id: 's1', op: 'get', entity: 'users', by: { email: 'a@b' }, fields: ['name'] }], respond: { status: 200, body: { name: '$s1.name' } } };
  const p = { ...prob(OPS.find, OPS.make, users), entities: { ...fixture.entities, users: { rows: 1e6, fields: {}, sample: [{ email: 'a@b', name: 'A' }, { email: 'c@d', name: 'C' }] } } };
  const design = { nodes: [N('c', 'client'), N('gw', 'apigw'), app('auth'), app('linksvc'), DB('udb', 'postgres', [T('users', 'email name', ['email'])]), DB('ldb', 'dynamodb', [LINKS])],
    edges: E(['c', 'gw'], ['gw', 'auth'], ['gw', 'linksvc'], ['auth', 'udb'], ['linksvc', 'ldb']) };
  const r = compile(design, lab, p);
  assert.equal(r.plans.find.root.children[0].children.map((h) => h.node).join(), 'linksvc');
  assert.equal(r.plans.login.root.children[0].children.map((h) => h.node).join(), 'auth');
  assert.equal(r.plans.find.steps.s1.node, 'ldb');
  assert.match(r.plans.find.steps.s1.query, /GetItem/);
});

test('compile: reads go through a look-aside cache unless the call needs fresh data', () => {
  const design = { nodes: [N('c', 'client'), app(), N('cache', 'cache', { ttlSec: 120 }), DB('db', 'postgres', [LINKS])],
    edges: E(['c', 'app'], ['app', 'cache'], ['cache', 'db'], ['app', 'db']) };
  let r = compile(design, lab, prob(OPS.find, OPS.make));
  const handle = r.plans.find.root.children[0];
  assert.equal(handle.children[0].kind, 'cache');
  assert.deepEqual(handle.children[0].children[0].share, { kind: 'miss', cache: 'cache', entity: 'links' });
  assert.deepEqual(r.plans.find.staleness, [{ store: 'db', feed: 'primary' }, { store: 'cache', feed: 'lookAside', cacheTtlSec: 1 }], 'writers invalidate: 1 s');
  assert.deepEqual(r.plans.make.root.children[0].children.map((h) => h.kind), ['store', 'invalidate']);
  r = compile(design, lab, prob({ ...OPS.find, consistency: 'strong' }, OPS.make));
  assert.equal(r.plans.find.root.children[0].children[0].kind, 'store', 'strong: straight to the database');
  // nobody invalidates (writes reach the database another way): the TTL is the staleness
  design.nodes.push(app('writer')); design.edges = E(['c', 'app', ['reads']], ['c', 'writer', ['writes']], ['app', 'cache'], ['cache', 'db'], ['writer', 'db']);
  r = compile(design, lab, prob(OPS.find, OPS.make));
  assert.deepEqual(r.plans.find.staleness.at(-1), { store: 'cache', feed: 'lookAside', cacheTtlSec: 120 });
});

test('compile: deferred steps go behind a queue and share one message', () => {
  const p = prob(OPS.find, { ...OPS.make, steps: [
    { id: 's1', op: 'put', entity: 'links', values: { code: 'n1', long_url: 'https://n' } },
    { id: 's2', op: 'update', entity: 'stats', by: { day: 'd1' }, add: { made: 1 }, timing: 'defer' },
    { id: 's3', op: 'compute', cpuMs: 50, label: 'Thumbnail', timing: 'defer' },
  ] });
  p.entities = { ...p.entities, stats: { rows: 1000, fields: {}, sample: [{ day: 'd1', made: 0 }, { day: 'd2', made: 3 }] } };
  const design = { nodes: [N('c', 'client'), app(), N('q', 'queue'), app('w'), DB('db', 'postgres', [LINKS]), DB('sdb', 'postgres', [T('stats', 'day made:int', ['day'])])],
    edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'sdb'], ['w', 'db']) };
  const r = compile(design, lab, p);
  assert.equal(r.plans.make.ok, true, r.plans.make.error?.message);
  const handle = r.plans.make.root.children[0];
  const enq = handle.children.filter((h) => h.kind === 'enqueue');
  assert.equal(enq.length, 1, 'one message for the deferred steps');
  assert.equal(enq[0].sync, true);
  const con = enq[0].children[0];
  assert.deepEqual([con.kind, con.node, con.sync], ['consume', 'w', false]);
  near(con.work, W.consume + W.handle + 50 / W.cpuMsPerUnit, 'the deferred compute runs on the worker');
  assert.equal(r.plans.make.steps.s2.sync, false);
  assert.equal(r.plans.make.steps.s1.sync, true);
});

test('compile: copies and every feed (primary, dual, async, lookAside) and E_UNFED', () => {
  const search = { id: 'search', name: 'Search links', kind: 'read', share: 0, steps: [{ id: 's1', op: 'query', entity: 'links', text: { field: 'long_url', q: 'menu' }, limit: 10, fields: ['code'] }], respond: { status: 200, body: { hits: '$s1' } } };
  const p = prob(OPS.find, OPS.make, search);
  const IDX = T('links', 'code long_url', ['code']);
  // dual: the same Service writes the database and the search index
  let design = { nodes: [N('c', 'client'), app(), DB('db', 'postgres', [LINKS]), DB('es', 'opensearch', [IDX])], edges: E(['c', 'app'], ['app', 'db'], ['app', 'es']) };
  let r = compile(design, lab, p);
  assert.equal(r.plans.search.steps.s1.node, 'es');
  assert.equal(r.plans.search.steps.s1.feed, 'dual');
  assert.deepEqual(r.plans.make.steps.s1.copies, [{ node: 'es', table: 'links', feed: 'dual' }]);
  assert.equal(r.plans.find.steps.s1.feed, 'primary');
  assert.ok(r.copies.some((c) => c.store === 'es' && c.feed === 'dual'));
  // async: through a queue and a worker
  design = { nodes: [N('c', 'client'), app(), N('q', 'queue'), app('w'), DB('db', 'postgres', [LINKS]), DB('es', 'opensearch', [IDX])],
    edges: E(['c', 'app'], ['app', 'db'], ['app', 'q'], ['q', 'w'], ['w', 'es'], ['app', 'es', ['search']]) };
  r = compile(design, lab, p);
  assert.equal(r.plans.search.steps.s1.feed, 'async');
  // nothing writes the index: E_UNFED (the write carries a field the index lacks, so only the writer can do it)
  const withOwner = { ...OPS.make, steps: [{ id: 's1', op: 'put', entity: 'links', values: { code: 'n1', long_url: 'https://n', user_id: 'u1' } }] };
  design = { nodes: [N('c', 'client'), N('gw', 'apigw'), app('writer'), app('reader'), DB('db', 'postgres', [LINKS]), DB('es', 'opensearch', [IDX])],
    edges: E(['c', 'gw'], ['gw', 'writer'], ['gw', 'reader'], ['writer', 'db'], ['reader', 'es']) };
  r = compile(design, lab, prob(OPS.find, withOwner, search));
  assert.equal(r.plans.make.root.children[0].children.map((h) => h.node).join(), 'writer');
  assert.equal(r.plans.search.ok, false);
  assert.equal(r.plans.search.error.code, 'E_UNFED');
  assert.equal(r.plans.search.error.message, 'Nothing ever writes links into Database: Search links would find it empty. Feed it from Database (a worker behind a queue, or change data capture).');
  // a read-only problem: every table was loaded beforehand
  r = compile(design, lab, prob(search));
  assert.equal(r.plans.search.ok, true); assert.equal(r.plans.search.steps.s1.feed, 'primary');
});

test('compile: graph errors stop everything; plan errors stop one operation', () => {
  const p = prob(OPS.find, OPS.make), ok = (d, code) => { const r = compile(d, lab, p); assert.equal(r.ok, false); assert.equal(r.errors[0].code, code); };
  ok({ nodes: [app()], edges: [] }, 'E_NO_CLIENTS');
  ok({ nodes: [N('c', 'client'), app()], edges: [] }, 'E_CLIENTS_ALONE');
  ok({ nodes: [N('c', 'client'), app('a'), app('b')], edges: E(['c', 'a'], ['a', 'b'], ['b', 'a']) }, 'E_LOOP');
  const plan = (d, op, code, msg, practice = p) => { const r = compile(d, lab, practice); assert.equal(r.ok, true); assert.equal(r.plans[op].ok, false, code); assert.equal(r.plans[op].error.code, code); if (msg) assert.equal(r.plans[op].error.message, msg); };
  plan({ nodes: [N('c', 'client'), N('lb', 'lb')], edges: E(['c', 'lb']) }, 'find', 'E_NO_HANDLER', 'Find a link never reaches a Service: follow the arrows from the Clients.');
  plan({ nodes: [N('c', 'client'), app()], edges: E(['c', 'app']) }, 'find', 'E_NO_DATABASE');
  plan({ nodes: [N('c', 'client'), app(), N('db', 'database', { engine: 'postgres' })], edges: E(['c', 'app'], ['app', 'db']) }, 'find', 'E_NO_SCHEMA', "No database has a schema yet: open a database's settings and add the links it needs (code and long_url).");
  plan({ nodes: [N('c', 'client'), app(), DB('db', 'postgres', [T('users', 'id', ['id'])])], edges: E(['c', 'app'], ['app', 'db']) }, 'find', 'E_NO_STORE', 'No table reachable from Server holds links (code and long_url).');
  plan({ nodes: [N('c', 'client'), app(), DB('db', 'postgres', [T('links', 'code', ['code'])])], edges: E(['c', 'app'], ['app', 'db']) }, 'make', 'E_MISSING_FIELDS', 'links has no long_url, which this call writes.');
  plan({ nodes: [N('c', 'client'), app(), DB('db', 'dynamodb', [T('links', 'code long_url', ['long_url'])])], edges: E(['c', 'app'], ['app', 'db']) }, 'find', 'E_NO_PATH');
  plan({ nodes: [N('c', 'client'), app(), N('q', 'queue'), app('w'), DB('db', 'postgres', [LINKS])], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) }, 'find', 'E_READ_BEHIND_QUEUE');
  plan({ nodes: [N('c', 'client'), app(), N('q', 'queue'), app('w'), DB('db', 'postgres', [LINKS])], edges: E(['c', 'app'], ['app', 'q'], ['q', 'w'], ['w', 'db']) }, 'make', 'E_SYNC_BEHIND_QUEUE');
  plan({ nodes: [N('c', 'client'), N('lb', 'lb')], edges: E(['c', 'lb']) }, 'find', 'E_NO_SOURCE', 'Find a link has nowhere to start: add the Clients.', { ...p, operations: [{ ...OPS.find, source: 'schedule' }] });
});

test('compile: transactions, sandboxes, steps not built yet, too many paths', () => {
  const tx = { id: 'pay', name: 'Pay', kind: 'write', share: 0, steps: [{ id: 's1', op: 'tx', steps: [
    { id: 'a', op: 'update', entity: 'links', by: { code: 'ab12x' }, add: { clicks: 1 } },
    { id: 'b', op: 'put', entity: 'stats', values: { day: 'd9', made: 1 } }] }], respond: { status: 200, body: {} } };
  const p = { ...prob(OPS.find, OPS.make, tx), entities: { ...fixture.entities, stats: { rows: 100, fields: {}, sample: [{ day: 'd1', made: 0 }, { day: 'd2', made: 1 }] } } };
  const STATS = T('stats', 'day made:int', ['day']);
  let r = compile({ nodes: [N('c', 'client'), app(), DB('db', 'postgres', [LINKS, STATS])], edges: E(['c', 'app'], ['app', 'db']) }, lab, p);
  assert.equal(r.plans.pay.ok, true);
  assert.equal(r.plans.pay.steps.s1.how, 'transaction');
  near(r.plans.pay.steps.s1.work, (W.update + W.put) * W.txFactor);
  r = compile({ nodes: [N('c', 'client'), app(), DB('db', 'postgres', [LINKS]), DB('db2', 'postgres', [STATS])], edges: E(['c', 'app'], ['app', 'db'], ['app', 'db2']) }, lab, p);
  assert.equal(r.plans.pay.error.code, 'E_TX_SPLIT');
  assert.equal(r.plans.pay.error.message, 'These writes must happen together, but they land in Database and Database; no transaction spans two stores.');
  r = compile({ nodes: [N('c', 'client'), app(), DB('db', 'cassandra', [LINKS, STATS])], edges: E(['c', 'app'], ['app', 'db']) }, lab, p);
  assert.equal(r.plans.pay.error.code, 'E_NO_TX');
  const run = { id: 'run', name: 'Run code', kind: 'write', share: 0, steps: [{ id: 's1', op: 'compute', cpuMs: 200, isolated: true, label: 'Judging code' }], respond: { status: 200, body: {} } };
  const call = { id: 'charge', name: 'Charge', kind: 'write', share: 0, steps: [{ id: 's1', op: 'call', preset: 'payments', label: 'Charging the card' }], respond: { status: 200, body: {} } };
  const d = { nodes: [N('c', 'client'), app(), DB('db', 'postgres', [LINKS])], edges: E(['c', 'app'], ['app', 'db']) };
  r = compile(d, lab, prob(OPS.find, OPS.make, run, call));
  assert.equal(r.plans.run.error.code, 'E_NO_SANDBOX');
  assert.equal(r.plans.charge.error.code, 'E_NOT_YET');
  d.nodes[1].config.sandbox = true;
  r = compile(d, lab, prob(run));
  assert.equal(r.plans.run.ok, true);
  near(r.plans.run.root.children[0].work, W.handle + 200 / W.cpuMsPerUnit);
  r = compile(fixture.reference, { ...lab, eval: { ...lab.eval, limits: { ...lab.eval.limits, hopsPerOperation: 3 } } }, fixture);
  assert.equal(r.plans.redirect.error.code, 'E_TOO_TANGLED');
});

test('compile: straight to object storage; unused components are reported with their cost', () => {
  const upload = { id: 'upload', name: 'Upload a photo', kind: 'write', share: 1, steps: [{ id: 's1', op: 'blob', entity: 'photos', key: { id: 'p1' }, field: 'bytes', mode: 'put', bytes: 2e6 }], respond: { status: 200, body: {} } };
  const p = { v: 2, entities: { photos: { rows: 1e6, fields: {}, sample: [{ id: 'p0' }, { id: 'p2' }] } }, operations: [upload] };
  let r = compile({ nodes: [N('c', 'client'), DB('s3', 's3', [T('photos', 'id bytes:blob', ['id'])])], edges: E(['c', 's3']) }, lab, p);
  assert.equal(r.plans.upload.ok, true, r.plans.upload.error?.message);
  const hop = r.plans.upload.root.children[0];
  assert.deepEqual([hop.node, hop.kind, hop.write], ['s3', 'store', true]);
  near(hop.work, 2 * W.blobPerMB);
  const design = structuredClone(fixture.reference);
  design.nodes.push(N('spare', 'cache', { size: 'cache.m5.large' }, { name: 'Spare cache' }));
  r = compile(design, lab, fixture);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0].message, /^Spare cache is not used by any operation: connect it or remove it\. It still costs \$\d[\d,]* a month\.$/);
});

test('compile: the same input gives the same plans; hop ids are stable', () => {
  const a = compile(fixture.reference, lab, fixture), b = compile(structuredClone(fixture.reference), lab, structuredClone(fixture));
  const strip = (r) => JSON.stringify({ plans: r.plans, copies: r.copies, warnings: r.warnings });
  assert.equal(strip(a), strip(b));
  assert.deepEqual(a.plans.redirect.root.children[0].children[0].children.map((h) => h.id), ['redirect#3']);
  assert.equal(a.plans.redirect.root.id, 'redirect#0');
});

// ---- trace: the fixture's acceptance list (§15 phase 1) --------------------------------------------------------
const traceTests = fixture.tests.filter((t) => t.op);
const runAll = (design) => { const c = compile(design, lab, fixture); return Object.fromEntries(traceTests.map((t) => [t.id, runTrace(c, fixture, t, lab)])); };

test('trace: the reference design passes every trace test', () => {
  const r = runAll(fixture.reference);
  for (const t of traceTests) assert.equal(r[t.id].ok, true, `${t.id}: ${r[t.id].why.join(' ')}`);
  assert.deepEqual(r['api-redirect'].output, { status: 302, body: { location: 'https://zotato.in/menu/123' } });
  assert.deepEqual(r['api-redirect'].request, { method: 'GET', path: '/ab12x' });
  assert.deepEqual(expected(fixture, fixture.operations[1]), { status: 201, body: { code: 'zx81q' } });
  const trace = r['api-redirect'].trace;
  assert.deepEqual(trace.map((e) => [e.at, !!e.back]), [['clients', false], ['lb', false], ['app', false], ['cache', false], ['db', false], ['cache', true], ['app', true], ['lb', true], ['clients', true]]);
  assert.equal(trace[4].title, 'Links DB: finds the links row by its key');
  assert.equal(trace[4].json, "SELECT long_url FROM links WHERE code = 'ab12x';");
  assert.deepEqual(trace.at(-1).json, { location: 'https://zotato.in/menu/123' });
  assert.ok(trace.every((e, i) => e.n === i));
});

test('trace: each wrong design fails its test with the right message', () => {
  const why = (name, test) => runAll(fixture.wrong.find((w) => w.name === name))[test];
  let r = why('No database', 'api-redirect');
  assert.equal(r.ok, false); assert.equal(r.code, 'E_NO_DATABASE');
  assert.equal(r.why[0], 'Link service reaches no database: draw an arrow from it to the store that keeps links.');
  r = why('Code is not the key', 'api-redirect');
  assert.equal(r.why[0], 'Looking up links by code would read all 500 crore rows: make code the primary key, or add an index on it.');
  assert.equal(r.output.status, 504);
  r = why('Reads behind a queue', 'api-redirect');
  assert.equal(r.code, 'E_READ_BEHIND_QUEUE');
  assert.equal(r.why[0], "Links can only be reached through Queue; a queue can't answer a read: the caller would wait for a worker.");
  r = why('The table has no long address', 'api-redirect');
  assert.equal(r.ok, false);
  assert.deepEqual(r.output, { status: 302, body: { location: null } });
  assert.equal(r.why[0], 'The response differs from the expected one (location): links has no long_url.');
  for (const w of fixture.wrong.filter((x) => traceTests.some((t) => t.id === x.fails))) assert.equal(runAll(w)[w.fails].ok, false, `${w.name} must fail ${w.fails}`);
});

test('trace: deferred steps are applied after answering and shown after the response', () => {
  const p = structuredClone(fixture);
  p.entities.stats = { rows: 1000, fields: {}, sample: [{ day: 'd1', made: 0 }, { day: 'd2', made: 3 }] };
  p.operations[1].steps.push({ id: 's2', op: 'update', entity: 'stats', by: { day: 'd1' }, add: { made: 1 }, timing: 'defer' });
  const design = structuredClone(fixture.reference);
  design.nodes.push(N('q', 'queue'), app('w'), DB('sdb', 'postgres', [T('stats', 'day made:int', ['day'])]));
  design.edges.push(...E(['app', 'q'], ['q', 'w'], ['w', 'sdb']));
  const c = compile(design, lab, p);
  const r = runTrace(c, p, p.tests[1], lab);
  assert.equal(r.ok, true, r.why.join(' '));
  const reply = r.trace.findIndex((e) => e.back && e.at === 'clients');
  assert.ok(r.trace.slice(reply + 1).some((e) => e.at === 'w' && e.after), 'the worker shows after the response');
  assert.ok(r.trace.slice(0, reply).every((e) => !e.after));
});

test('trace: an unknown operation or an unplannable design fails without throwing', () => {
  const c = compile(fixture.reference, lab, fixture);
  assert.match(runTrace(c, fixture, { id: 'x', op: 'nope' }, lab).error, /names no operation/);
  const broken = compile({ nodes: [], edges: [] }, lab, fixture);
  const r = runTrace(broken, fixture, traceTests[0], lab);
  assert.equal(r.ok, false); assert.equal(r.why[0], 'Add the Clients: tests send their traffic from there.');
  assert.doesNotThrow(() => compile(null, lab, null));
  assert.doesNotThrow(() => compile({ nodes: 'x', edges: 7 }, lab, { operations: 'y' }));
});

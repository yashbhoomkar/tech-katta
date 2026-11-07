import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runRequest, expected, fieldMatcher } from './requests.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
// A small problem: short links, restaurants near a point, photos, money.
const problem = {
  data: {
    fields: ['code', 'long_url', 'clicks'],
    aliases: { long_url: ['url', 'target'] },
    entities: {
      links: { rows: 5e8, sample: [{ code: 'ab12x', long_url: 'https://zotato.in/menu/1', clicks: 4 }, { code: 'zz9', long_url: 'https://x.in', clicks: 0 }] },
      places: { rows: 3e5, sample: [{ id: 'r1', name: 'Dosa Corner', loc: [19.07, 72.88], open: true }, { id: 'r2', name: 'Far Away', loc: [19.5, 73.2], open: true }, { id: 'r3', name: 'Closed Cafe', loc: [19.071, 72.881], open: false }] },
      messages: { rows: 1e10, sample: [{ chat: 'c1', at: 1, text: 'hi' }, { chat: 'c1', at: 2, text: 'hello' }, { chat: 'c2', at: 3, text: 'yo' }] },
      photos: { rows: 1e9, sample: [] },
      accounts: { rows: 1e6, sample: [{ acct: 'a', bal: 100 }, { acct: 'b', bal: 0 }] },
    },
  },
};
const redirect = { id: 'go', request: { method: 'GET', path: '/ab12x' }, steps: [{ id: 's1', op: 'get', entity: 'links', by: { code: 'ab12x' }, fields: ['long_url'] }], respond: { status: 302, body: { location: '$s1.long_url' } } };
const design = (db, extra = {}) => ({ nodes: [{ id: 'c', type: 'client', config: {} }, { id: 'lb', type: 'lb', config: {} }, { id: 's', type: 'server', config: {} }, ...(extra.cache ? [{ id: 'k', type: 'cache', config: {} }] : []), ...(extra.queue ? [{ id: 'q', type: 'queue', config: {} }, { id: 'w', type: 'server', config: {} }] : []), { id: 'db', type: 'database', config: db }, ...(extra.more || [])],
  edges: [{ from: 'c', to: 'lb' }, { from: 'lb', to: 's' }, ...(extra.cache ? [{ from: 's', to: 'k' }, { from: 'k', to: 'db' }] : extra.queue ? [{ from: 's', to: 'q' }, { from: 'q', to: 'w' }, { from: 'w', to: 'db' }] : [{ from: 's', to: 'db' }]), ...(extra.edges || [])] });
const links = (t) => ({ schema: { tables: [t] } });

test('expected: the steps run on the sample data', () => {
  assert.deepEqual(expected(problem, redirect), { status: 302, body: { location: 'https://zotato.in/menu/1' } });
});

test('fieldMatcher: case, underscores, camelCase and listed aliases match', () => {
  const m = fieldMatcher(problem.data);
  assert.ok(m('long_url', 'longUrl') && m('long_url', 'LONG-URL') && m('long_url', 'target') && !m('long_url', 'code'));
});

test('a key lookup works and is written in the engine\'s language; the trace goes there and back', () => {
  const t = { name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'longUrl', type: 'string' }], key: ['code'] };
  const r = runRequest(design(links(t), { cache: true }), lab, problem, redirect);
  assert.equal(r.ok, true, r.why.join(' '));
  assert.deepEqual(r.output, { status: 302, body: { location: 'https://zotato.in/menu/1' } });
  assert.deepEqual(r.trace.map((h) => h.at), ['c', 'lb', 's', 'k', 'db', 'k', 's', 'lb', 'c']);
  assert.match(r.trace.find((h) => h.at === 'db').json, /SELECT longUrl FROM links WHERE code = 'ab12x'/);
  assert.match(r.trace.find((h) => h.at === 'k').title, /miss/);
  const d = runRequest(design({ engine: 'dynamodb', ...links(t) }), lab, problem, redirect);
  assert.equal(d.ok, true); assert.match(d.trace.find((h) => h.at === 'db').json, /GetItem/);
  const m = runRequest(design({ engine: 'mongodb', ...links(t) }), lab, problem, redirect);
  assert.match(m.trace.find((h) => h.at === 'db').json, /db\.links\.findOne\(\{"code":"ab12x"\}\)/);
});

test('looking up 5 crore rows by a field with no key or index fails; an index fixes it', () => {
  const t = { name: 'links', fields: [{ name: 'id', type: 'int' }, { name: 'code', type: 'string' }, { name: 'url', type: 'string' }], key: ['id'] };
  const r = runRequest(design(links(t)), lab, problem, redirect);
  assert.equal(r.ok, false); assert.equal(r.output.status, 504); assert.match(r.why[0], /read all 50 crore rows/);
  assert.equal(runRequest(design(links({ ...t, indexes: [{ kind: 'btree', fields: ['code'] }] })), lab, problem, redirect).ok, true);
  // DynamoDB can't scan: it says why
  assert.match(runRequest(design({ engine: 'dynamodb', ...links(t) }), lab, problem, redirect).why[0], /DynamoDB can't search links by code/);
});

test('no schema, no table with the fields, a read behind a queue: each says why', () => {
  assert.match(runRequest(design({}), lab, problem, redirect).why[0], /No database has a schema yet/);
  assert.match(runRequest(design(links({ name: 'users', fields: [{ name: 'email', type: 'string' }], key: ['email'] })), lab, problem, redirect).why[0], /No table on a reachable database holds code, long_url/);
  const t = { name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'long_url', type: 'string' }], key: ['code'] };
  assert.match(runRequest(design(links(t), { queue: true }), lab, problem, redirect).why[0], /only reachable through a queue/);
  assert.match(runRequest({ nodes: [{ id: 'c', type: 'client' }, { id: 'db', type: 'database', config: links(t) }], edges: [{ from: 'c', to: 'db' }] }, lab, problem, redirect).why[0], /never reaches a server/);
});

test('a table missing a response field answers with it empty, and the test fails on that field', () => {
  const t = { name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'clicks', type: 'int' }], key: ['code'] };
  const r = runRequest(design(links(t)), lab, problem, redirect);
  assert.equal(r.ok, false); assert.deepEqual(r.output.body, { location: null }); assert.match(r.why[0], /location/);
});

test('rows by a partition key in sort-key order; without the sort key, many rows can\'t be sorted in memory', () => {
  const hist = { id: 'h', request: { method: 'GET', path: '/chats/c1' }, steps: [{ id: 's1', op: 'query', entity: 'messages', where: { chat: 'c1' }, order: { field: 'at', desc: true }, limit: 1, fields: ['text'], matches: 50000 }], respond: { status: 200, body: { messages: '$s1' } } };
  const t = { name: 'messages', fields: [{ name: 'chat', type: 'string' }, { name: 'at', type: 'time' }, { name: 'text', type: 'text' }], key: ['chat'], sortKey: 'at' };
  const r = runRequest(design({ engine: 'cassandra', ...links(t) }), lab, problem, hist);
  assert.equal(r.ok, true, r.why.join(' ')); assert.deepEqual(r.output.body, { messages: [{ text: 'hello' }] });
  const nosort = { ...t }; delete nosort.sortKey;
  assert.match(runRequest(design({ engine: 'cassandra', ...links(nosort) }), lab, problem, hist).why[0], /sorted in memory/);
});

test('near a point needs a geo index on a big table; OpenSearch can do it on a location field', () => {
  const near = { id: 'n', request: { method: 'GET', path: '/near' }, steps: [{ id: 's1', op: 'query', entity: 'places', where: { open: true }, near: { field: 'loc', at: [19.07, 72.88], km: 5 }, fields: ['name'] }], respond: { status: 200, body: { places: '$s1' } } };
  const t = { name: 'places', fields: [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }, { name: 'loc', type: 'geo' }, { name: 'open', type: 'bool' }], key: ['id'] };
  assert.deepEqual(expected(problem, near).body, { places: [{ name: 'Dosa Corner', distance_km: 0 }] });
  assert.match(runRequest(design(links(t)), lab, problem, near).why[0], /no geo index on loc/);
  const ok = runRequest(design(links({ ...t, indexes: [{ kind: 'geo', fields: ['loc'] }] })), lab, problem, near);
  assert.equal(ok.ok, true, ok.why.join(' ')); assert.match(ok.trace.find((h) => h.at === 'db').json, /ST_DWithin/);
  assert.equal(runRequest(design({ engine: 'opensearch', ...links(t) }), lab, problem, near).ok, true);
});

test('file bytes belong in object storage; a transaction needs one store that has them', () => {
  const up = { id: 'u', request: { method: 'PUT', path: '/photos/p1' }, steps: [{ id: 's1', op: 'blob', mode: 'put', entity: 'photos', key: { photo_id: 'p1' }, field: 'bytes' }], respond: { status: 201, body: { ok: true } } };
  const t = { name: 'photos', fields: [{ name: 'photo_id', type: 'string' }, { name: 'bytes', type: 'blob' }], key: ['photo_id'] };
  assert.match(runRequest(design(links(t)), lab, problem, up).why[0], /keep files in object storage/);
  const s3 = runRequest(design({ engine: 's3', ...links(t) }), lab, problem, up);
  assert.equal(s3.ok, true, s3.why.join(' ')); assert.match(s3.trace.find((h) => h.at === 'db').json, /PUT s3:\/\/photos\/p1/);
  const pay = { id: 'p', request: { method: 'POST', path: '/pay' }, steps: [{ id: 's1', op: 'tx', steps: [{ id: 'a', op: 'update', entity: 'accounts', by: { acct: 'a' }, add: { bal: -50 }, cond: { bal: { gte: 50 } } }, { id: 'b', op: 'update', entity: 'accounts', by: { acct: 'b' }, add: { bal: 50 } }] }], respond: { status: 200, body: { ok: '$s1.ok' } } };
  const acc = { name: 'accounts', fields: [{ name: 'acct', type: 'string' }, { name: 'bal', type: 'int' }], key: ['acct'] };
  assert.equal(runRequest(design(links(acc)), lab, problem, pay).ok, true);
  assert.match(runRequest(design({ engine: 'cassandra', ...links(acc) }), lab, problem, pay).why[0], /can['’]t do a transaction|can['’]t take stock/);
});

test('a write behind a queue is fine when the call accepts 202, and not when it needs the result now', () => {
  const click = { id: 'k', async: true, request: { method: 'POST', path: '/click' }, steps: [{ id: 's1', op: 'update', entity: 'links', by: { code: 'zz9' }, add: { clicks: 1 } }], respond: { status: 200, body: { counted: true } } };
  const t = { name: 'links', fields: [{ name: 'code', type: 'string' }, { name: 'clicks', type: 'int' }], key: ['code'] };
  const r = runRequest(design(links(t), { queue: true }), lab, problem, click);
  assert.equal(r.ok, true, r.why.join(' ')); assert.equal(r.output.status, 202);
  assert.deepEqual(r.trace.map((h) => h.at), ['c', 'lb', 's', 'q', 'w', 'db', 's', 'lb', 'c']);
  assert.match(runRequest(design(links(t), { queue: true }), lab, problem, { ...click, async: false }).why[0], /must answer with the result now/);
});

test('a conditional update: Cassandra does it with IF (a lightweight transaction); S3 and OpenSearch can\'t', () => {
  const p = { data: { entities: { seats: { rows: 1e7, sample: [{ show: 's1', seat: 'A1', status: 'free' }] } } } };
  const hold = { id: 'h', async: true, request: { method: 'POST', path: '/holds' }, steps: [{ id: 's1', op: 'update', entity: 'seats', by: { show: 's1', seat: 'A1' }, set: { status: 'held' }, cond: { status: { eq: 'free' } } }], respond: { status: 202, body: { held: true } } };
  const t = { name: 'seats', fields: [{ name: 'show', type: 'string' }, { name: 'seat', type: 'string' }, { name: 'status', type: 'string' }], key: ['show', 'seat'] };
  const c = runRequest(design({ engine: 'cassandra', ...links(t) }), lab, p, hold);
  assert.equal(c.ok, true, c.why.join(' ')); assert.match(c.trace.find((x) => x.at === 'db').json, /UPDATE seats SET status = 'held' WHERE show = 's1' AND seat = 'A1' IF status = 'free';/);
  assert.equal(runRequest(design(links(t)), lab, p, hold).ok, true);
  assert.match(runRequest(design({ engine: 'opensearch', ...links(t) }), lab, p, hold).why[0], /can't change a row only if it is still as expected/);
  // the seat is taken: the update doesn't apply, and the call says so
  const taken = { data: { entities: { seats: { rows: 1e7, sample: [{ show: 's1', seat: 'A1', status: 'held' }] } } } };
  const r = runRequest(design(links(t)), lab, taken, hold);
  assert.equal(r.ok, false); assert.equal(r.output.status, 409);
});

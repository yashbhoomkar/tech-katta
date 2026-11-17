// TKD parser and compiler (spec sections 3–5, 20.2): one test per error and warning code, section 3.3 compiles to the
// object of section 5, the formatter is idempotent, and the parser survives random text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, parseLenient } from './parse.js';
import { compile } from './compile.js';
import { format, canonical } from './format.js';
import { MESSAGES } from './messages.js';
import { staticFindings } from './checks.js';
import { explain } from './verdict.js';

const P = { total_items: 1e8, requests: [
  { name: 'GET_LINK', mode: 'read', table: 'links', key: 'code', distinct_keys: 1e6, item_bytes: 500, skew: 0.8, max_stale_s: 3600, cdn_ok: false, says: 'x' },
  { name: 'CREATE_LINK', mode: 'write', table: 'links', key: 'code', durable: true, unique_id: true, says: 'x' }] };
const REF = `# Design a URL shortener
lb    = lb()
api   = server(count=4, size=medium)
cache = cache(nodes=2, memory_gb=1, ttl_s=3600)
db    = sql(size=medium, replicas=1, sync=true)
ids   = idgen(kind=counter)

table db.links(code pk, url, created_at)

read  GET_LINK:    client > lb > api > cache | db
write CREATE_LINK: client > lb > api > ids > db then invalidate cache
`;
const PARTS = 'lb = lb()\napi = server(count=2)\ndb = sql(replicas=1)\ncache = cache()\nids = idgen()\nq = queue()\nw = worker()\ncdn = cdn()\ntable db.links(code pk, url)\n';
const GOOD_W = 'write CREATE_LINK: client > lb > api > ids > db\n';
const GOOD_R = 'read GET_LINK: client > lb > api > cache | db\n';
const codes = (src, p = P) => { const r = compile(src, p); return r.ok ? [] : r.errors.map((e) => e.code); };
const warns = (src) => { const r = compile(src, P); assert.ok(r.ok, JSON.stringify(r.errors)); return r.warnings.map((w) => w.code); };

test('section 3.3 compiles to the design of section 5', () => {
  const r = compile(REF, P);
  assert.ok(r.ok);
  assert.deepEqual(r.design.parts.api, { kind: 'server', count: 4, size: 'medium', line: 3 });
  assert.deepEqual(r.design.parts.ids, { kind: 'idgen', id_kind: 'counter', bits: 64, line: 6 });
  assert.deepEqual(r.design.tables['db.links'], { part: 'db', name: 'links', pk: 'code', columns: ['code', 'url', 'created_at'], indexes: [], line: 8 });
  assert.deepEqual(r.design.routes.GET_LINK, { mode: 'read', line: 10, hops: [{ op: '>', part: 'lb', replica: false }, { op: '>', part: 'api', replica: false }, { op: '>', part: 'cache', replica: false }, { op: '|', part: 'db', replica: false }], invalidate: null, update: null, store: 'db', scan: false });
  assert.equal(r.design.routes.CREATE_LINK.invalidate, 'cache');
  assert.deepEqual(r.warnings, []);
});

const CASES = {
  E001: ['x = lb()\n'.repeat(201)],
  E002: ['lb = lb()\nthis is not tkd\n'],
  E003: ['lb = lb()\nlb = lb()\n'],
  E004: ['Lb = lb()\n'],
  E005: ['client = lb()\n'],
  E010: ['x = router()\n'],
  E011: ['api = server(cores=4)\n'],
  E012: ['api = server(count=0)\n', 'api = server(size=huge)\n', 'db = sql(sync=maybe)\n', 'kv = nosql(nodes=3, rf=3, w=4)\n', 'kv = nosql(nodes=3, rf=4)\n'],
  E020: [`${PARTS}read GET_LINK: client > lb > nope > db\n${GOOD_W}`],
  E021: [`${PARTS}${GOOD_R}${GOOD_W}read OPEN: client > lb > api > db\n`],
  E022: [`${PARTS}${GOOD_R}`],
  E023: [`${PARTS}write GET_LINK: client > lb > api > db\n${GOOD_W}`],
  E024: [`${PARTS}${GOOD_R}${GOOD_R}${GOOD_W}`],
  E025: [`${PARTS}read GET_LINK: lb > api > db\n${GOOD_W}`, `${PARTS}read GET_LINK: client | cache > db\n${GOOD_W}`],
  E026: [`${PARTS}read GET_LINK: client > lb > api | db\n${GOOD_W}`],
  E027: [`${PARTS}${GOOD_R}write CREATE_LINK: client > lb > api ~> w > db\n`],
  E028: [`${PARTS}${GOOD_R}write CREATE_LINK: client > lb > api ~> q > db\n`],
  E029: [`${PARTS}read GET_LINK: client > lb > api\n${GOOD_W}`],
  E030: [`${PARTS}${GOOD_R}write CREATE_LINK: client > lb > api\n`],
  E031: [`${PARTS}read GET_LINK: client > lb > api > lb > db\n${GOOD_W}`],
  E032: [`${PARTS}read GET_LINK: client > lb > api > ids > db\n${GOOD_W}`, `${PARTS}${GOOD_R}write CREATE_LINK: client > lb > ids > api > db\n`],
  E033: [`${PARTS}read GET_LINK: client > lb > api > cache[replica] | db\n${GOOD_W}`, `${PARTS.replace('sql(replicas=1)', 'sql()')}read GET_LINK: client > lb > api > db[replica]\n${GOOD_W}`],
  E034: [`${PARTS}read GET_LINK: client > lb > api > db then invalidate cache\n${GOOD_W}`, `${PARTS}${GOOD_R}write CREATE_LINK: client > lb > api > ids > db then update cdn\n`],
  E035: [`${PARTS}read GET_LINK: client > cdn | lb > api > db\n${GOOD_W}`],
  E040: ['api = server()\ntable api.links(code pk)\n'],
  E041: ['db = sql()\ntable db.links(code, url)\n', 'db = sql()\ntable db.links(code pk, url pk)\n'],
  E042: ['db = sql()\ntable db.links(code pk, url) index(owner)\n'],
  E043: [`${PARTS.replace('table db.links(code pk, url)\n', 'table db.users(id pk)\n')}${GOOD_R}${GOOD_W}`],
};
for (const [code, sources] of Object.entries(CASES)) {
  test(`${code}: ${MESSAGES[code].slice(0, 60)}`, () => {
    for (const src of sources) {
      const got = codes(src);
      assert.ok(got.includes(code), `${JSON.stringify(src.slice(-80))} gave ${got.join(', ') || 'no error'}`);
    }
  });
}

test('errors carry line, column and the exact message, at most 20, sorted by line', () => {
  const r = compile('lb = lb()\napi = server(count=0)\n', P);
  const e = r.errors.find((x) => x.code === 'E012');
  assert.deepEqual(e, { code: 'E012', line: 2, col: 20, message: 'count must be a whole number from 1 to 200. You wrote 0.' });
  const many = compile(Array.from({ length: 40 }, (_, i) => `x${i} = nothing()`).join('\n'), P);
  assert.equal(many.errors.length, 20);
  assert.deepEqual(many.errors.map((x) => x.line), [...many.errors.map((x) => x.line)].sort((a, b) => a - b));
});

test('W001, W002, W003', () => {
  assert.ok(warns(`${REF}spare = server()\n`).includes('W001'));
  const noLb = REF.replace(/client > lb > api/g, 'client > api');
  assert.ok(warns(noLb).includes('W002'));
  const w002 = compile(noLb, P).warnings.find((w) => w.code === 'W002');
  assert.equal(w002.message, 'Calls reach only one of your 4 "api" servers: there is no lb in front.');
  const single = compile(REF.replace('count=4', 'count=1').replace('replicas=1', 'replicas=0'), P).warnings.filter((w) => w.code === 'W003').map((w) => w.message);
  assert.deepEqual(single, ['"api" has no spare. If it fails, GET_LINK and CREATE_LINK stop.', '"db" has no spare. If it fails, GET_LINK and CREATE_LINK stop.']);
});

test('W004, W005, W007: design checks load cannot show, as notes that never fail; a counter too narrow fails (judge 3)', () => {
  assert.deepEqual(warns(REF).filter((c) => c >= 'W004'), []);                           // the reference is clean
  // W004: a store or cache reached from the client with no server in between (a read or a write)
  const exposed = REF.replace('client > lb > api > cache | db', 'client > cache | db');
  assert.ok(warns(exposed).includes('W004'));
  const w004 = compile(exposed, P).warnings.find((w) => w.code === 'W004');
  assert.deepEqual([w004.line, w004.part], [10, 'cache']);
  assert.match(w004.message, /^GET_LINK reaches "cache" straight from the client, with no server in between/);
  assert.ok(warns(REF.replace('client > lb > api > ids > db', 'client > db')).includes('W004'));
  assert.ok(!warns(REF.replace('client > lb > api', 'client > api')).includes('W004')); // a server first is fine
  // W005: a write's id is made after the queue
  const queued = `${REF.replace('write CREATE_LINK: client > lb > api > ids > db then invalidate cache', 'write CREATE_LINK: client > lb > api ~> q > w > ids > db')}q = queue()\nw = worker(count=2)\n`;
  assert.ok(warns(queued).includes('W005'));
  assert.equal(compile(queued, P).warnings.find((w) => w.code === 'W005').message, 'CREATE_LINK makes its id after the queue: the reply cannot give it back, and a job delivered twice gets a second id.');
  const before = `${REF.replace('write CREATE_LINK: client > lb > api > ids > db then invalidate cache', 'write CREATE_LINK: client > lb > api > ids ~> q > w > db')}q = queue()\nw = worker(count=2)\n`;
  assert.ok(!warns(before).includes('W005'));                                            // the id made before the queue is fine
  // a counter with fewer values than the problem's items: a failing collision finding, not a note
  const narrow = staticFindings(compile(REF.replace('idgen(kind=counter)', 'idgen(kind=counter, bits=16)'), P).design, P);
  assert.deepEqual(narrow.map((f) => [f.type, f.part, f.numbers.kind]), [['collision', 'ids', 'counter']]);
  assert.equal(explain(narrow[0]), 'With 10 crore items, a 16-bit counter runs out of ids and starts repeating them. Use more bits.');
  assert.deepEqual(staticFindings(compile(REF.replace('idgen(kind=counter)', 'idgen(kind=counter, bits=32)'), P).design, P), []); // 2^32 > 10 crore
  assert.ok(!warns(REF.replace('idgen(kind=counter)', 'idgen(kind=counter, bits=16)')).includes('W006'));
  // W007: a CDN keeping answers for far less than the problem allows
  const PC = { ...P, requests: [{ ...P.requests[0], cdn_ok: true, max_stale_s: 86400 }, P.requests[1]] };
  const cdnDesign = (ttl) => `cdn = cdn(ttl_s=${ttl})\n${REF.replace('client > lb > api > cache | db', 'client > cdn | lb > api > cache | db')}`;
  const w7 = (ttl) => compile(cdnDesign(ttl), PC).warnings.filter((w) => w.code === 'W007');
  assert.equal(w7(1).length, 1);
  assert.equal(w7(1)[0].message, '"cdn" keeps an answer for 1 s, but GET_LINK may be up to 86400 s old: it goes back to the origin far more often than needed.');
  assert.equal(w7(3600).length, 0);
  for (const code of ['W004', 'W005', 'W007', 'exhausted']) assert.ok(MESSAGES[code], code);
});

test('a template with unfinished routes gives only E029/E030; comments and blank lines are free', () => {
  const r = compile('lb  = lb()\napi = server(count=1, size=small)\n\n# add your parts\nread  GET_LINK:    client > lb > api > \nwrite CREATE_LINK: client > lb > api > \n', P);
  assert.deepEqual(r.errors.map((e) => e.code), ['E029', 'E030']);
});

test('a lookup by a column that is not the key or indexed is a full scan', () => {
  const src = REF.replace('table db.links(code pk, url, created_at)', 'table db.links(url pk, code, created_at)');
  assert.equal(compile(src, P).design.routes.GET_LINK.scan, true);
  assert.equal(compile(src.replace('created_at)', 'created_at) index(code)'), P).design.routes.GET_LINK.scan, false);
});

test('write-through: then update names a cache', () => {
  const r = compile(REF.replace('then invalidate cache', 'then update cache'), P);
  assert.equal(r.design.routes.CREATE_LINK.update, 'cache');
});

test('format: every setting written, = and : lined up, routes in request order, idempotent', () => {
  const messy = 'write CREATE_LINK:client>lb>api>ids>db then invalidate cache # new\n' + REF.split('\n').filter((l) => !l.startsWith('write')).join('\n');
  const f = format(parseLenient(messy), P);
  assert.equal(format(parseLenient(f), P), f);
  assert.match(f, /^read  GET_LINK:    client > lb > api > cache \| db$/m);
  assert.match(f, /^write CREATE_LINK: client > lb > api > ids > db then invalidate cache$/m);
  assert.match(f, /^ids   = idgen\(kind=counter, bits=64\)$/m);
  assert.ok(f.indexOf('read  GET_LINK') < f.indexOf('write CREATE_LINK'));
  assert.equal(canonical(REF, P), canonical(`# another comment\n${REF.replace(/ {2,}/g, ' ')}`, P));
});

test('lenient parse keeps unreadable lines in place', () => {
  const src = 'lb = lb()\nthis line is broken\napi = server()\n';
  const p = parseLenient(src);
  assert.deepEqual(p.statements.map((s) => s.type), ['part', 'raw', 'part']);
  assert.equal(p.statements[1].error.code, 'E002');
  const f = format(p, P);
  assert.equal(f, 'lb  = lb()\nthis line is broken\napi = server(count=1, size=small)\n');
  assert.equal(format(parseLenient(f), P), f);
});

test('the parser never throws and stays fast on random text (seeded fuzz, 10,000 strings)', () => {
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const alphabet = 'abcxyz_ABC0123456789 =(),.:>|~[]#\n\tpkreadwriteclienttableindexthen';
  let worst = 0;
  for (let i = 0; i < 10_000; i += 1) {
    const s = Array.from({ length: Math.floor(rnd() * 300) }, () => alphabet[Math.floor(rnd() * alphabet.length)]).join('');
    const t = performance.now();
    parse(s); parseLenient(s); compile(s, P);
    worst = Math.max(worst, performance.now() - t);
  }
  assert.ok(worst < 50, `slowest string took ${worst.toFixed(1)} ms`);
});

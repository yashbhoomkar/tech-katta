import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseText, parseJSON, exportDesign } from './importer.js';
import { simulate } from './engine.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));

test('the placeholder example imports cleanly and runs', () => {
  const r = parseText(lab.import.placeholder, lab);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  const by = Object.fromEntries(r.design.nodes.map((n) => [n.id, n]));
  assert.deepEqual(Object.keys(by).sort(), ['cache', 'client', 'database', 'lb', 'queue', 'server:orders', 'server:workers']);
  assert.deepEqual(by.client.config, { rps: 3000, pattern: 'meals' });
  assert.deepEqual(by['server:orders'].config, { count: 4, autoscale: true, maxCount: 12 });
  assert.deepEqual(by.cache.config, { hitPct: 85 });
  assert.deepEqual(by.database.config, { size: 'db.m5.large', multiAz: true });
  assert.equal(r.design.edges.length, 7, 'shared names join the two lines');
  assert.ok(simulate(r.design, lab).ok);
  const x = (id) => by[id].x;
  assert.ok(x('client') < x('lb') && x('lb') < x('server:orders') && x('server:orders') < x('cache') && x('cache') < x('database'), 'laid out left to right');
});

test('aliases, sizes and options are read; unknown words are reported, not guessed', () => {
  const r = parseText('users 500 -> nginx -> api ×3 c5.2xlarge 4 queries -> redis 90% hits 20% writes write-back fail -> postgres xl', lab);
  const t = Object.fromEntries(r.design.nodes.map((n) => [n.type, n.config]));
  assert.deepEqual(t.client, { rps: 500 });
  assert.deepEqual(t.server, { count: 3, size: 'c5.2xlarge', queriesPerRequest: 4 });
  assert.deepEqual(t.cache, { hitPct: 90, writePct: 20, writePolicy: 'back', onDown: 'fail' });
  assert.deepEqual(r.warnings.map((w) => w.message), ['Ignored "xl" on Database.']);
  assert.ok(parseText('Clients 1000 -> API Gateway -> Server', lab).design.nodes.some((n) => n.type === 'apigw'), 'longest alias wins over "api"');
});

test('mistakes are reported by line, and values are kept inside the catalogue ranges', () => {
  const r = parseText('# my system\nClients 999999999 -> Server x500\nServer -> Spaceship\nDatabase -> Server\nServer -> Clients', lab);
  assert.deepEqual(r.errors.map((e) => e.line), [3, 4, 5]);
  assert.match(r.errors[0].message, /Spaceship/);
  const t = Object.fromEntries(r.design.nodes.map((n) => [n.type, n.config]));
  assert.equal(t.client.rps, 10000000);
  assert.equal(t.server.count, 50);
  assert.equal(parseText('', lab).errors.length, 1);
});

test('JSON: an exported design comes back as it was; bad files are refused', () => {
  const d = { name: 'Mine', nodes: lab.example.nodes, edges: lab.example.edges };
  const back = parseJSON(exportDesign(d), lab);
  assert.deepEqual(back.errors, []);
  assert.deepEqual(back.design.nodes.map((n) => [n.id, n.x, n.y]), d.nodes.map((n) => [n.id, n.x, n.y]));
  assert.equal(back.design.edges.length, d.edges.length);
  assert.equal(parseJSON('{nope', lab).errors.length, 1);
  assert.equal(parseJSON('{"nodes":[{"id":"a","type":"rocket"}],"edges":[]}', lab).errors.length, 1);
  const noXY = parseJSON('{"nodes":[{"id":"c","type":"client"},{"id":"s","type":"server"}],"edges":[{"from":"c","to":"s"}]}', lab);
  assert.ok(noXY.design.nodes[1].x > noXY.design.nodes[0].x, 'laid out when positions are missing');
});

test('limits and names: size caps, labels kept apart, file names kept (QA M5, L4, L6)', () => {
  assert.match(parseText('x'.repeat(20001), lab).errors[0].message, /more than 20,000 characters/);
  const many = Array.from({ length: 210 }, (_, i) => `Clients -> Server:s${i}`).join('\n');
  const r = parseText(many, lab);
  assert.ok(r.errors.some((e) => /at most 200 components/.test(e.message)));
  assert.ok(r.design.nodes.length <= 200);
  const two = parseText('Clients -> Server:a.b -> Database\nClients -> Server:a-b -> Database', lab);
  assert.equal(two.design.nodes.filter((n) => n.type === 'server').length, 2, 'a.b and a-b are two servers');
  const named = parseJSON('{"name":"P","nodes":[{"id":"c","type":"client"},{"id":"s","type":"server"}],"edges":[{"from":"c","to":"s"}]}', lab);
  assert.equal(named.design.name, 'P');
  assert.match(parseJSON(' '.repeat(1e6 + 1), lab).errors[0].message, /over 1 MB/);
  assert.match(parseJSON(JSON.stringify({ nodes: Array.from({ length: 300 }, (_, i) => ({ id: 'n' + i, type: 'server' })), edges: [] }), lab).errors[0].message, /at most 200/);
});

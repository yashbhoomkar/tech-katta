// Quick drills and decision guides (content/drills.json, content/guides.json): what is served, that every link goes somewhere, and that a bad file stops a release.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/content/store.js';
import { drillErrors, guideErrors, anchorOf } from '../src/content/validate-learn.js';

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const content = await loadContent(repo);

async function start() {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise((r) => probe.close(r));
  const server = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) }, stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i += 1) { try { if ((await fetch(`${base}/health`)).status === 200) return { server, base }; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 50)); }
  throw new Error('no server');
}
let running;
test.before(async () => { running = await start(); });
test.after(() => running?.server.kill());

test('there are about 30 drills, each a short question and answer linked to an article section and a problem', () => {
  assert.ok(content.drills.drills.length >= 28 && content.drills.drills.length <= 40);
  assert.deepEqual(drillErrors(content.drills, content.articles), []);
  for (const d of content.drills.drills) { assert.ok(d.q.endsWith('?'), d.id); assert.ok(d.a.length < 600, d.id); }
});

test('there are five decision guides, each with a table, a worked example, articles and a problem', () => {
  assert.equal(content.guides.guides.length, 5);
  assert.deepEqual(guideErrors(content.guides, content.articles), []);
  assert.deepEqual(content.guides.guides.map((g) => g.slug).sort(), ['cache-aside-vs-write-through', 'queue-vs-stream', 'redis-vs-kafka', 'sql-vs-nosql', 'websockets-vs-polling-vs-sse']);
});

test('a drill pointing at an h3 anchors to the h2 it sits under', () => {
  const a = content.articles.find((x) => x.slug === 'caching');
  assert.equal(anchorOf(a, 'When caching goes wrong'), 'when-caching-goes-wrong');
  assert.equal(anchorOf(a, 'Stampedes (thundering herd)'), 'when-caching-goes-wrong');
  assert.equal(anchorOf(a, 'No such heading'), null);
});

test('bad files are named: a missing article, a heading that is not there, a problem that is not one, a ragged table', () => {
  const drills = { drills: [{ id: 'x', q: 'Why?', a: 'Because.', article: 'concepts/nope', section: 'A', problem: 'url-shortener' }, { id: 'y', q: 'Why?', a: 'Because.', article: 'concepts/caching', section: 'No such heading', problem: 'caching' }] };
  const errs = drillErrors(drills, content.articles).join('\n');
  assert.match(errs, /concepts\/nope does not exist/); assert.match(errs, /no heading "No such heading"/); assert.match(errs, /problem caching is not a problem/);
  const g = structuredClone(content.guides); g.guides[0].table.rows[0].pop();
  assert.match(guideErrors(g, content.articles).join('\n'), /table needs/);
});

test('GET /v1/drills and /v1/guides are public; a guide is served whole, an unknown one is 404', async () => {
  const drills = await (await fetch(`${running.base}/v1/drills`)).json();
  assert.equal(drills.drills.length, content.drills.drills.length);
  assert.ok(drills.drills.every((d) => d.articleTitle && d.problemTitle && d.anchor));
  const list = await (await fetch(`${running.base}/v1/guides`)).json();
  assert.equal(list.guides.length, 5);
  const one = await (await fetch(`${running.base}/v1/guides/redis-vs-kafka`)).json();
  assert.equal(one.title, 'Redis or Kafka?'); assert.ok(one.articles[0].title && one.problemTitle);
  assert.equal((await fetch(`${running.base}/v1/guides/nothing`)).status, 404);
  assert.equal((await fetch(`${running.base}/v1/guides/..%2Fsite`)).status, 404);
});

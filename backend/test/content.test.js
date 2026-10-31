import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { site } from '../src/content/site.js';
import { example } from '../src/content/example.js';
import { allArticles } from '../src/content/index.js';

async function getFreePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  const port = await getFreePort();
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error('API process exited before becoming ready.');
    try {
      if ((await fetch(baseUrl + '/health')).status === 200) return { server, baseUrl };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  server.kill('SIGTERM');
  throw new Error('API server did not start in time.');
}

let running;
test.before(async () => { running = await startServer(); });
test.after(() => running.server.kill('SIGTERM'));
const get = (path, init) => fetch(running.baseUrl + path, init);

test('GET /v1/site returns all site copy plus the example system, publicly cacheable', async () => {
  const response = await get('/v1/site');
  assert.equal(response.status, 200);
  assert.ok((response.headers.get('content-type') || '').includes('application/json'));
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.match(response.headers.get('cache-control') || '', /^public, max-age=60/);
  assert.ok(response.headers.get('etag'));
  const body = await response.json();
  for (const key of ['brand', 'nav', 'hero', 'topics', 'notes', 'numbers', 'dashboard', 'footer', 'example']) assert.ok(body[key], key);
  assert.equal(body.example.name, 'Zotato');
  assert.equal(body.hero.title, site.hero.title);
});

test('content responses honour If-None-Match with 304', async () => {
  const first = await get('/v1/articles/api-types');
  const etag = first.headers.get('etag');
  await first.arrayBuffer();
  const second = await get('/v1/articles/api-types', { headers: { 'If-None-Match': etag } });
  assert.equal(second.status, 304);
  assert.equal(await second.text(), '');
});

test('GET /v1/articles lists summaries without bodies, optionally by section', async () => {
  const all = await (await get('/v1/articles')).json();
  assert.ok(all.articles.length >= 1);
  const summary = all.articles.find(a => a.slug === 'api-types');
  assert.ok(summary);
  for (const key of ['section', 'slug', 'no', 'tag', 'date', 'title', 'dek']) assert.ok(summary[key], key);
  assert.equal(summary.body, undefined);
  assert.equal((await (await get('/v1/articles?section=concepts')).json()).articles.length, allArticles.filter(a => a.section === 'concepts').length);
  assert.equal((await (await get('/v1/articles?section=components')).json()).articles.length, allArticles.filter(a => a.section === 'components').length);
  assert.equal((await get('/v1/articles?section=Bad!')).status, 400);
});

test('GET /v1/articles/:slug returns the full article with the example system', async () => {
  const response = await get('/v1/articles/api-types/');
  assert.equal(response.status, 200);
  const article = await response.json();
  assert.equal(article.slug, 'api-types');
  assert.ok(Array.isArray(article.body) && article.body.length > 10);
  assert.deepEqual(article.example, example);
});

test('unknown or malformed article slugs return 404', async () => {
  for (const path of ['/v1/articles/nope', '/v1/articles/..%2Fsite', '/v1/articles/UPPER', '/v1/articles/a/b']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.headers.get('cache-control'), 'no-store', path);
    assert.equal((await response.json()).error, 'not_found', path);
  }
});

test('content routes support HEAD and OPTIONS, and reject writes', async () => {
  const head = await get('/v1/site', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const options = await get('/v1/site', { method: 'OPTIONS' });
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('access-control-allow-origin'), '*');
  const post = await get('/v1/articles', { method: 'POST', body: '{}' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

// Content checks: catch a typo in a content file before it reaches the site.
const BLOCKS = new Set(['tldr', 'example', 'fig', 'h2', 'p', 'list', 'type', 'code', 'table', 'more']);
const FIGS = new Set(['patterns', 'choose', 'order', 'retry']);
function checkBlocks(blocks, where) {
  for (const [i, b] of blocks.entries()) {
    const at = `${where}[${i}]`;
    assert.ok(BLOCKS.has(b.t), `${at}: unknown block type ${b.t}`);
    if (['h2', 'p'].includes(b.t)) assert.equal(typeof b.x, 'string', at);
    if (['list', 'tldr'].includes(b.t)) assert.ok(b.items.length && b.items.every(x => typeof x === 'string'), at);
    if (b.t === 'fig') { assert.ok(FIGS.has(b.id), `${at}: unknown figure ${b.id}`); assert.equal(typeof b.cap, 'string', at); }
    if (b.t === 'type') for (const key of ['name', 'kind', 'what', 'use', 'avoid', 'ex']) assert.equal(typeof b[key], 'string', `${at}.${key}`);
    if (b.t === 'code') for (const key of ['label', 'x', 'say']) assert.equal(typeof b[key], 'string', `${at}.${key}`);
    if (b.t === 'table') assert.ok(b.rows.every(r => r.length === b.head.length), `${at}: row width`);
    if (b.t === 'more') { assert.equal(typeof b.label, 'string', at); checkBlocks(b.body, `${at}.body`); }
  }
}

test('every article is well formed and belongs to a dashboard section', () => {
  const sections = new Set(site.dashboard.sections.map(s => s[0]));
  const slugs = new Set();
  for (const a of allArticles) {
    assert.ok(!slugs.has(a.slug), `duplicate slug ${a.slug}`);
    slugs.add(a.slug);
    assert.match(a.slug, /^[a-z0-9][a-z0-9-]{0,63}$/);
    assert.ok(sections.has(a.section), `${a.slug}: unknown section ${a.section}`);
    for (const key of ['no', 'tag', 'date', 'title', 'dek']) assert.equal(typeof a[key], 'string', `${a.slug}.${key}`);
    checkBlocks(a.body, a.slug);
  }
});

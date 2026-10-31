import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/content/store.js';
import { validateContent } from '../src/content/validate.js';

const repoContent = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');
const { site, examples, articles: allArticles } = await loadContent(repoContent);
const example = examples[site.example];

async function getFreePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer(env = {}) {
  const port = await getFreePort();
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), ...env },
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

// The repo's content must pass the same validation the deploy runs.
test('repo content is valid', () => {
  assert.deepEqual(validateContent({ site, examples, articles: allArticles }), []);
});

test('validation reports typos: unknown figure, bad table, unknown section', () => {
  const article = structuredClone(allArticles[0]);
  article.section = 'nowhere';
  article.body.push({ t: 'fig', id: 'nope', cap: 'x' }, { t: 'table', head: ['a', 'b'], rows: [['only one']] });
  const problems = validateContent({ site, examples, articles: [article] });
  assert.ok(problems.some((p) => p.includes('unknown section nowhere')));
  assert.ok(problems.some((p) => p.includes('unknown figure nope')));
  assert.ok(problems.some((p) => p.includes('every row needs 2 cells')));
});

async function copyContent() {
  const dir = await mkdtemp(path.join(tmpdir(), 'tk-content-'));
  await cp(repoContent, dir, { recursive: true });
  return dir;
}
const editJson = async (file, change) => { const value = JSON.parse(await readFile(file, 'utf8')); change(value); await writeFile(file, JSON.stringify(value)); };

test('CONTENT_DIR serves content from another directory, and SIGHUP reloads it (keeping the last good copy on errors)', async (t) => {
  const dir = await copyContent();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await editJson(path.join(dir, 'site.json'), (s) => { s.hero.title = 'From the VPS'; });
  const other = await startServer({ CONTENT_DIR: dir });
  t.after(() => other.server.kill('SIGTERM'));
  const title = async () => (await (await fetch(other.baseUrl + '/v1/site')).json()).hero.title;
  assert.equal(await title(), 'From the VPS');

  await editJson(path.join(dir, 'site.json'), (s) => { s.hero.title = 'Reloaded'; });
  other.server.kill('SIGHUP');
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(await title(), 'Reloaded');

  await writeFile(path.join(dir, 'site.json'), '{ not json');
  other.server.kill('SIGHUP');
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(await title(), 'Reloaded');
  const health = await (await fetch(other.baseUrl + '/health')).json();
  assert.equal(health.content.articles, allArticles.length);
});

test('the API refuses to start on invalid content', async (t) => {
  const dir = await copyContent();
  t.after(() => rm(dir, { recursive: true, force: true }));
  await editJson(path.join(dir, 'articles', 'concepts', 'api-types.json'), (a) => { a.body.push({ t: 'fig', id: 'missing', cap: 'x' }); });
  const port = await getFreePort();
  const child = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port), CONTENT_DIR: dir }, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  const [code] = await once(child, 'exit');
  assert.notEqual(code, 0);
  assert.match(stderr, /unknown figure missing/);
});

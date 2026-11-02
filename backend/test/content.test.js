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
const { site, examples, articles: allArticles, lab } = await loadContent(repoContent);
const example = examples[site.example];
const I = Object.fromEntries(lab.components.map((c, i) => [c.type, i]));

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
  assert.deepEqual(validateContent({ site, examples, articles: allArticles, lab }), []);
});

test('GET /v1/lab returns the Lab catalogue', async () => {
  const response = await get('/v1/lab');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const body = await response.json();
  assert.equal(body.budget, 200000);
  assert.deepEqual(body.components.map((c) => c.type), ['client', 'apigw', 'lb', 'server', 'queue', 'cache', 'database']);
  assert.ok(body.example.nodes.length >= 4);
});

test('lab validation reports a bad catalogue', () => {
  const bad = structuredClone(lab);
  bad.components[I.server].defaultSize = 'x9.huge';
  bad.example.edges.push({ from: 'clients', to: 'nowhere' });
  const problems = validateContent({ site, examples, articles: allArticles, lab: bad });
  assert.ok(problems.some((p) => p.includes('defaultSize x9.huge')));
  assert.ok(problems.some((p) => p.includes('missing node')));
});

test('lab validation checks the shape and units of every setting', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  assert.ok(check((l) => { l.components[I.server].sizes = null; }).some((p) => p.includes(`components[${I.server}]: sizes`)));
  assert.ok(check((l) => { l.components[I.client].rps = null; }).some((p) => p.includes(`components[${I.client}]: rps`)));
  assert.ok(check((l) => { delete l.components[I.server].sizes[0].rps; l.components[I.server].sizes[0].qps = 500; }).some((p) => p.includes(`components[${I.server}]: sizes`)));
  assert.ok(check((l) => { delete l.components[I.database].sizes[0].qps; l.components[I.database].sizes[0].rps = 500; }).some((p) => p.includes(`components[${I.database}]: sizes`)));
  assert.ok(check((l) => { l.components[I.server].sizes[1].hourly = Infinity; }).some((p) => p.includes(`components[${I.server}]: sizes`)));
  assert.ok(check((l) => { l.components[I.apigw].limitRps = -1; }).some((p) => p.includes(`components[${I.apigw}]: limitRps`)));
  assert.ok(check((l) => { delete l.components[I.server].crash; }).some((p) => p.includes(`components[${I.server}]: crash`)));
  assert.ok(check((l) => { delete l.components[I.database].crash.failoverMinutes; }).some((p) => p.includes(`components[${I.database}]: crash`)));
  assert.ok(check((l) => { l.components[I.server].queriesPerRequest.default = 0; }).some((p) => p.includes(`components[${I.server}]: queriesPerRequest`)));
  assert.ok(check((l) => { l.retries = 9; }).some((p) => p.includes('retries')));
});

test('lab validation checks the phase 2 components, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  assert.ok(check((l) => { l.components[I.cache].hitPct.max = 150; }).some((p) => p.includes(`components[${I.cache}]: hitPct`)));
  assert.ok(check((l) => { delete l.components[I.cache].sizes[0].ops; }).some((p) => p.includes(`components[${I.cache}]: sizes`)));
  assert.ok(check((l) => { l.components[I.lb].rpsPerLcu = 0; }).some((p) => p.includes(`components[${I.lb}]: rpsPerLcu`)));
  assert.ok(check((l) => { delete l.components[I.queue].pricePerMillion; }).some((p) => p.includes(`components[${I.queue}]: pricePerMillion`)));
  assert.deepEqual(check((l) => { l.components = l.components.filter((c) => ['client', 'apigw', 'server', 'database'].includes(c.type)); }), []);
  assert.ok(check((l) => { l.components = l.components.filter((c) => c.type !== 'server'); }).some((p) => p.includes('missing component server')));
  assert.ok(check((l) => { l.example.nodes.push({ id: 'c2', type: 'cache', x: 0, y: 200, config: { hitPct: 120 } }); }).some((p) => p.includes('hitPct must be from 0 to 99')));
});

test('lab validation checks traffic patterns and autoscaling, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const C = `components[${I.client}]`, S = `components[${I.server}]`;
  assert.deepEqual(check((l) => { delete l.components[I.client].patterns; delete l.components[I.server].autoscaling; }), []);
  assert.ok(check((l) => { l.components[I.client].patterns[1].points[0][0] = 1; }).some((p) => p.includes(`${C}: patterns`)), 'must start at hour 0');
  assert.ok(check((l) => { l.components[I.client].patterns[1].points.at(-1)[0] = 23; }).some((p) => p.includes(`${C}: patterns`)), 'must end at hour 24');
  assert.ok(check((l) => { l.components[I.client].patterns[1].points.reverse(); }).some((p) => p.includes(`${C}: patterns`)), 'hours never go back');
  assert.ok(check((l) => { l.components[I.client].patterns[1].points[2][1] = 3; }).some((p) => p.includes(`${C}: patterns`)), 'multipliers at most 1');
  assert.ok(check((l) => { l.components[I.client].patterns[1].points = [[0, 0.5], [24, 0.5]]; }).some((p) => p.includes(`${C}: patterns`)), 'peak at 1');
  assert.ok(check((l) => { l.components[I.client].patterns[2].id = 'steady'; }).some((p) => p.includes(`${C}: patterns`)), 'unique ids');
  assert.ok(check((l) => { delete l.components[I.client].patterns[0].short; }).some((p) => p.includes(`${C}: patterns`)));
  assert.ok(check((l) => { delete l.components[I.client].patterns[0].desc; }).some((p) => p.includes(`${C}: patterns`)));
  assert.ok(check((l) => { delete l.components[I.server].autoscaling.minLabel; }).some((p) => p.includes(`${S}: autoscaling`)));
  assert.ok(check((l) => { l.components[I.server].autoscaling.targetPct = 0; }).some((p) => p.includes(`${S}: autoscaling`)));
  assert.ok(check((l) => { delete l.components[I.server].autoscaling.warmupMinutes; }).some((p) => p.includes(`${S}: autoscaling`)));
  assert.ok(check((l) => { l.components[I.server].autoscaling.defaultMax = 99; }).some((p) => p.includes('defaultMax is above count.max')));
  const node = (config) => (l) => { l.example.nodes.find((n) => n.type === config.type).config = config.config; };
  assert.ok(check(node({ type: 'client', config: { rps: 10, pattern: 'nope' } })).some((p) => p.includes('unknown traffic pattern nope')));
  assert.ok(check(node({ type: 'server', config: { count: 2, autoscale: 'yes' } })).some((p) => p.includes('autoscale must be true or false')));
  assert.ok(check(node({ type: 'server', config: { count: 4, maxCount: 3, autoscale: true } })).some((p) => p.includes('maxCount is below count')));
  assert.ok(check(node({ type: 'server', config: { count: 2, maxCount: 80 } })).some((p) => p.includes('maxCount must be from 1 to 50')));
  assert.deepEqual(check(node({ type: 'server', config: { size: 'm5.large', count: 2, maxCount: 8, autoscale: true } })), []);
});

test('lab validation checks the cache behaviour fields, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const K = `components[${I.cache}]`;
  assert.deepEqual(check((l) => { for (const k of ['warmupMinutes', 'flushSeconds', 'writePolicy', 'onDown']) delete l.components[I.cache][k]; }), []);
  assert.ok(check((l) => { l.components[I.cache].warmupMinutes = 0; }).some((p) => p.includes(`${K}: warmupMinutes`)));
  assert.ok(check((l) => { l.components[I.cache].flushSeconds = -1; }).some((p) => p.includes(`${K}: flushSeconds`)));
  assert.ok(check((l) => { l.components[I.cache].writePolicy.options[1].id = 'around'; }).some((p) => p.includes(`${K}: writePolicy`)), 'only ids the simulator knows');
  assert.ok(check((l) => { l.components[I.cache].writePolicy.options.pop(); }).some((p) => p.includes(`${K}: writePolicy`)));
  assert.ok(check((l) => { l.components[I.cache].onDown.default = 'retry'; }).some((p) => p.includes(`${K}: onDown`)));
  assert.ok(check((l) => { delete l.components[I.cache].onDown.options[0].desc; }).some((p) => p.includes(`${K}: onDown`)));
  assert.ok(check((l) => { l.example.nodes.push({ id: 'k2', type: 'cache', x: 0, y: 300, config: { writePolicy: 'sideways' } }); }).some((p) => p.includes('unknown writePolicy sideways')));
  assert.ok(check((l) => { l.example.nodes.push({ id: 'k2', type: 'cache', x: 0, y: 300, config: { onDown: 'panic' } }); }).some((p) => p.includes('unknown onDown panic')));
  assert.deepEqual(check((l) => { l.example.nodes.push({ id: 'k2', type: 'cache', x: 0, y: 300, config: { writePolicy: 'back', onDown: 'fail' } }); }).filter((p) => !p.includes('no traffic')), []);
});

test('site validation checks the landing challenge and fact, which are optional', () => {
  const check = (change) => { const bad = structuredClone(site); change(bad); return validateContent({ site: bad, examples, articles: allArticles, lab }); };
  assert.deepEqual(check((s) => { delete s.challenge; delete s.fact; delete s.hero.primaryHref; }), []);
  assert.ok(check((s) => { s.challenge.viewers[0][0] = 5; }).some((p) => p.includes('viewers must start at minute 0')));
  assert.ok(check((s) => { s.challenge.viewers.reverse(); }).some((p) => p.includes('viewers must start at minute 0')));
  assert.ok(check((s) => { s.challenge.viewers[3][1] = -1; }).some((p) => p.includes('never go below 0')));
  assert.ok(check((s) => { s.challenge.viewers[2] = [10, 'many']; }).some((p) => p.includes('challenge.viewers[2][1]: needs a number')));
  assert.ok(check((s) => { s.challenge.moments.push([999, 'Later']); }).some((p) => p.includes('minute 999 is outside the match')));
  assert.ok(check((s) => { s.challenge.serverGbps = 0; }).some((p) => p.includes('serverGbps must be above 0')));
  assert.ok(check((s) => { s.challenge.autoscale.target = 1.5; }).some((p) => p.includes('autoscale.target')));
  assert.ok(check((s) => { s.challenge.autoscale.bootMinutes = 0.5; }).some((p) => p.includes('autoscale.bootMinutes')));
  assert.ok(check((s) => { s.challenge.cdn.options[2].offload = 1; }).some((p) => p.includes('offload of cdn98')));
  assert.ok(check((s) => { s.challenge.cdn.default = 'edge'; }).some((p) => p.includes('cdn.default')));
  assert.ok(check((s) => { s.challenge.scaling.options[0].id = 'magic'; }).some((p) => p.includes('scaling.options[0].id')));
  assert.ok(check((s) => { s.challenge.servers.default = 5000; }).some((p) => p.includes('challenge.servers needs')));
  assert.ok(check((s) => { delete s.challenge.note; }).some((p) => p.includes('challenge.note')));
  assert.ok(check((s) => { s.fact.points = []; }).some((p) => p.includes('fact.points')));
});

test('content preflight allows If-None-Match', async () => {
  const response = await get('/v1/lab', { method: 'OPTIONS' });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers') || '', /If-None-Match/);
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

test('validation checks every site.json field the pages render', () => {
  const check = (change) => { const bad = structuredClone(site); change(bad); return validateContent({ site: bad, examples, articles: allArticles, lab }); };
  assert.deepEqual(check(() => {}), []);
  assert.ok(check((s) => { s.topics.cards = 'oops'; }).some((p) => p.includes('topics.cards: needs a non-empty list')));
  assert.ok(check((s) => { delete s.topics.cards[0].title; }).some((p) => p.includes('topics.cards[0].title')));
  assert.ok(check((s) => { s.topics.cards[1].visual = 'spiral'; }).some((p) => p.includes('topics.cards[1].visual')));
  assert.ok(check((s) => { s.notes.items[0] = ['01', 'only two']; }).some((p) => p.includes('notes.items[0]: needs a list of 4')));
  assert.ok(check((s) => { s.numbers.items[0][2] = '100'; }).some((p) => p.includes('numbers.items[0][2]: needs a number')));
  assert.ok(check((s) => { s.dashboard.sections.push(['concepts', 'Again', null]); }).some((p) => p.includes('duplicate id')));
  assert.ok(check((s) => { s.dashboard.sections[0][2] = 'nope'; }).some((p) => p.includes('unknown card nope')));
  assert.ok(check((s) => { s.footer.links.push('Pricing'); }).some((p) => p.includes('footer link Pricing')));
  assert.ok(check((s) => { delete s.hero; }).some((p) => p.includes('site.json.hero')));
  const badExample = validateContent({ site, examples: { [site.example]: { ...example, parts: [['Apps']] } }, articles: allArticles, lab });
  assert.ok(badExample.some((p) => p.includes(`examples/${site.example}.json.parts[0]`)));
});

test('validation checks the optional "more" paragraphs of a type card', () => {
  const article = structuredClone(allArticles[0]);
  const card = article.body.find((b) => b.t === 'type');
  card.more = 'not a list';
  assert.ok(validateContent({ site, examples, articles: [article] }).some((p) => p.includes('more must be a list')));
  card.more = ['fine', ''];
  assert.ok(validateContent({ site, examples, articles: [article] }).some((p) => p.includes('more must be a list')));
});

test('validation checks the Lab example design: ids, positions, settings and connection rules', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad.example); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  assert.deepEqual(check(() => {}), []);
  assert.ok(check((e) => { e.nodes.push({ ...e.nodes[0] }); }).some((p) => p.includes('is duplicated')));
  assert.ok(check((e) => { e.nodes[0].x = 'left'; }).some((p) => p.includes('numeric x and y')));
  assert.ok(check((e) => { e.nodes[0].config.rps = 10 ** 9; }).some((p) => p.includes('rps must be from')));
  assert.ok(check((e) => { e.nodes[2].config.size = 'x9.huge'; }).some((p) => p.includes('unknown size x9.huge')));
  assert.ok(check((e) => { e.nodes[3].config.multiAz = 'yes'; }).some((p) => p.includes('multiAz must be')));
  assert.ok(check((e) => { e.edges.push({ ...e.edges[0] }); }).some((p) => p.includes('is duplicated')));
  assert.ok(check((e) => { e.edges.push({ from: 'db', to: 'orders' }); }).some((p) => p.includes('out of a Database')));
  assert.ok(check((e) => { e.edges.push({ from: 'gateway', to: 'clients' }); }).some((p) => p.includes('into Clients')));
  assert.ok(check((e) => { e.edges.push({ from: 'orders', to: 'orders' }); }).some((p) => p.includes('to itself')));
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

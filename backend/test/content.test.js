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
  assert.deepEqual(body.components.map((c) => c.type), ['client', 'cdn', 'apigw', 'lb', 'server', 'queue', 'cache', 'database']);
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
  assert.deepEqual(check((l) => { l.components = l.components.filter((c) => ['client', 'apigw', 'server', 'database'].includes(c.type)); delete l.challenges; delete l.levels; }).filter((p) => p.startsWith('lab.json')), []);
  assert.ok(check((l) => { l.components = l.components.filter((c) => c.type !== 'server'); }).some((p) => p.includes('missing component server')));
  assert.ok(check((l) => { l.example.nodes.push({ id: 'c2', type: 'cache', x: 0, y: 200, config: { hitPct: 120 } }); }).some((p) => p.includes('hitPct must be from 0 to 99')));
});

test('lab validation checks traffic patterns and autoscaling, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const C = `components[${I.client}]`, S = `components[${I.server}]`;
  assert.deepEqual(check((l) => { delete l.components[I.client].patterns; delete l.components[I.server].autoscaling; delete l.challenges; delete l.levels; }).filter((p) => p.startsWith('lab.json')), []);
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
  assert.deepEqual(check((l) => { for (const k of ['warmupMinutes', 'flushSeconds', 'writePolicy', 'onDown']) delete l.components[I.cache][k]; delete l.challenges; delete l.levels; }).filter((p) => p.startsWith('lab.json')), []);
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

test('lab validation checks levels and challenges, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const C = (l, id) => l.challenges.find((c) => c.id === id);
  assert.deepEqual(check((l) => { delete l.levels; delete l.challenges; }).filter((p) => p.startsWith('lab.json')), []);
  assert.ok(check((l) => { l.levels.push({ id: 'beginner', label: 'Again' }); }).some((p) => p.includes('levels must be')));
  assert.ok(check((l) => { C(l, 'flash-sale').level = 'expert'; }).some((p) => p.includes('unknown level expert')));
  assert.ok(check((l) => { C(l, 'flash-sale').id = 'one-server'; }).some((p) => p.includes('duplicate id one-server')));
  assert.ok(check((l) => { C(l, 'flash-sale').traffic.rps = 90000000; }).some((p) => p.includes('traffic.rps')));
  assert.ok(check((l) => { C(l, 'flash-sale').traffic.pattern = 'tsunami'; }).some((p) => p.includes('traffic.pattern tsunami')));
  assert.ok(check((l) => { C(l, 'read-heavy').fixed.hitPct = 120; }).some((p) => p.includes('fixed.hitPct')));
  assert.ok(check((l) => { C(l, 'cache-restart').chaos[0].minute = 77; }).some((p) => p.includes('chaos event')));
  assert.ok(check((l) => { C(l, 'cache-restart').chaos[0].type = 'lb'; }).some((p) => p.includes('chaos event')), 'load balancers never crash');
  assert.ok(check((l) => { C(l, 'cache-restart').chaos[0].minute = 9999; }).some((p) => p.includes('chaos event')));
  assert.ok(check((l) => { C(l, 'one-server').start.edges.push({ from: 'db', to: 'api' }); }).some((p) => p.includes('out of a Database')));
  assert.ok(check((l) => { C(l, 'one-server').stars.reverse(); }).some((p) => p.includes('the first an availability goal')));
  assert.ok(check((l) => { C(l, 'one-server').stars[1].kind = 'vibes'; }).some((p) => p.includes('known kind')));
  assert.ok(check((l) => { C(l, 'one-server').stars[0].min = 101; }).some((p) => p.includes('availability min')));
  assert.ok(check((l) => { C(l, 'one-server').hours = 0; }).some((p) => p.includes('hours must be')));
  assert.ok(check((l) => { delete C(l, 'one-server').hint; }).some((p) => p.includes('needs hint')));
  assert.ok(check((l) => { C(l, 'one-server').requires = ['rocket']; }).some((p) => p.includes('requires must list')));
  assert.ok(check((l) => { C(l, 'ind-vs-pak').stars[1].from = 7; }).some((p) => p.includes("star's window")));
  assert.ok(check((l) => { C(l, 'ind-vs-pak').stars[2].to = 9999; }).some((p) => p.includes("star's window")));
  assert.ok(check((l) => { C(l, 'one-server').stars[1].from = 0; C(l, 'one-server').stars[1].to = 30; }).some((p) => p.includes("star's window")), 'windows only on availability goals');
});

test('lab validation checks import aliases and copy, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }).filter((p) => p.startsWith('lab.json')); };
  assert.deepEqual(check((l) => { delete l.import; for (const c of l.components) delete c.aliases; }), []);
  assert.ok(check((l) => { l.components[0].aliases = []; }).some((p) => p.includes('aliases must be')));
  assert.ok(check((l) => { l.components[I.cache].aliases.push('DB'); }).some((p) => p.includes('names both cache and database')));
  assert.ok(check((l) => { delete l.import.placeholder; }).some((p) => p.includes('import.placeholder')));
});

test('validation checks the CDN, the landing Lab and the IND vs PAK challenge settings', () => {
  const labCheck = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const siteCheck = (change) => { const bad = structuredClone(site); change(bad); return validateContent({ site: bad, examples, articles: allArticles, lab }); };
  const cdn = (l) => l.components.find((c) => c.type === 'cdn'), ivp = (l) => l.challenges.find((c) => c.id === 'ind-vs-pak');
  assert.ok(labCheck((l) => { cdn(l).hitPct.max = 120; }).some((p) => p.includes('hitPct is missing or malformed')));
  assert.ok(labCheck((l) => { delete cdn(l).pricePer10k; }).some((p) => p.includes('pricePer10k')));
  assert.ok(labCheck((l) => { cdn(l).live.default = 'no'; }).some((p) => p.includes('live is missing or malformed')));
  assert.ok(labCheck((l) => { ivp(l).fixed.cdnHitPct = 100; }).some((p) => p.includes('fixed.cdnHitPct')));
  assert.ok(labCheck((l) => { ivp(l).fixed.cdnLive = 'yes'; }).some((p) => p.includes('fixed.cdnLive')));
  assert.ok(labCheck((l) => { ivp(l).start.nodes.push({ id: 'c2', type: 'cdn', x: 0, y: 0, config: { live: 1 } }); }).some((p) => p.includes('live must be true or false')));
  assert.ok(labCheck((l) => { ivp(l).stars[2] = { kind: 'spend', max: 0, label: 'x' }; }).some((p) => p.includes('spend max must be above 0')));
  assert.ok(siteCheck((s) => { s.landingLab.challenge = 'world-cup'; }).some((p) => p.includes('landingLab.challenge world-cup')));
  assert.ok(siteCheck((s) => { delete s.landingLab.note; }).some((p) => p.includes('landingLab.note')));
  assert.deepEqual(siteCheck((s) => { delete s.landingLab; delete s.fact; }), []);
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

test('validation checks real-life analogies: the analogy block, type cards and Lab components', () => {
  const article = structuredClone(allArticles[0]);
  const at = (change) => { const a = structuredClone(article); change(a); return validateContent({ site, examples, articles: [a] }); };
  assert.ok(at((a) => { a.body.find((b) => b.t === 'analogy').x = ''; }).some((p) => p.includes('needs text x')));
  assert.ok(at((a) => { a.body.find((b) => b.t === 'type').like = 7; }).some((p) => p.includes('like must be text')));
  assert.deepEqual(at((a) => { a.body = a.body.filter((b) => b.t !== 'analogy'); for (const b of a.body) delete b.like; }), [], 'both optional');
  const labCheck = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  assert.ok(labCheck((l) => { l.components[0].like = ['x']; }).some((p) => p.includes('components[0]: like must be text')));
  assert.ok(labCheck((l) => { l.components.find((c) => c.type === 'server').autoscaling.like = 3; }).some((p) => p.includes('autoscaling')));
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

test('without its three settings, sign-in is off: config says so, account routes answer 503, health says auth off', async () => {
  assert.deepEqual(await (await get('/v1/auth/config')).json(), { enabled: false });
  const me = await get('/v1/me');
  assert.equal(me.status, 503);
  assert.deepEqual(await me.json(), { error: 'sign_in_not_configured' });
  assert.equal((await (await get('/health')).json()).auth, 'off');
  assert.equal((await (await get('/v1/site')).json()).brand.name, site.brand.name, 'content is unaffected');
});

test('subsections and "Try it in the Lab" blocks are checked', () => {
  const check = (changeSite, changeArticle) => {
    const s = structuredClone(site), arts = structuredClone(allArticles);
    changeSite?.(s); changeArticle?.(arts.find((a) => a.slug === 'load-balancers'));
    return validateContent({ site: s, examples, articles: arts, lab });
  };
  assert.deepEqual(check(), []);
  assert.match(check(null, (a) => { a.group = 'nope'; }).join(), /unknown group nope/);
  assert.match(check((s) => { s.dashboard.groups.nope = [['a', 'A', 'x']]; }).join(), /groups\.nope is not a section/);
  assert.match(check((s) => { s.dashboard.groups.components.push(['edge', 'Again', 'x']); }).join(), /unique lowercase ids/);
  const labBlock = (a) => a.body.find((b) => b.t === 'lab');
  assert.match(check(null, (a) => { labBlock(a).to = 'lab/no-such-challenge'; }).join(), /unknown Lab challenge no-such-challenge/);
  assert.match(check(null, (a) => { labBlock(a).to = 'https://evil.example'; }).join(), /to must be "lab"/);
  assert.deepEqual(check(null, (a) => { labBlock(a).to = 'lab'; }), []);
});

test('the figure ids the content may use are exactly the ones the frontend draws', async () => {
  const { FIGS } = await import('../src/content/validate.js');
  const { readFile } = await import('node:fs/promises');
  const src = (f) => readFile(new URL(`../../frontend/src/${f}`, import.meta.url), 'utf8');
  const dash = (await src('dashboard.jsx')).match(/const FIGS=\{(.*)\};/)[1], comp = (await src('figs/components.jsx')).match(/COMPONENT_FIGS=\{([\s\S]*?)\n\};/)[1];
  const ids = [...dash.matchAll(/(?:^|\},)"?([a-z-]+)"?:\{C:/g), ...comp.matchAll(/^"([a-z-]+)":\{C:/gm)].map((m) => m[1]);
  assert.deepEqual(ids.sort(), [...FIGS].sort());
});

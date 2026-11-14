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
  const counted = await (await get('/v1/site')).json();
  assert.deepEqual(counted.counts, { questions: allArticles.filter(a => a.section === 'interview-questions' && a.group !== 'start').length, concepts: allArticles.filter(a => a.section === 'concepts').length, components: allArticles.filter(a => a.section === 'components').length, challenges: lab.challenges.length });
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
  const first = await get('/v1/articles/how-to-answer');
  const etag = first.headers.get('etag');
  await first.arrayBuffer();
  const second = await get('/v1/articles/how-to-answer', { headers: { 'If-None-Match': etag } });
  assert.equal(second.status, 304);
  assert.equal(await second.text(), '');
});

test('GET /v1/articles lists summaries without bodies, optionally by section', async () => {
  const all = await (await get('/v1/articles')).json();
  assert.ok(all.articles.length >= 1);
  const summary = all.articles.find(a => a.slug === 'how-to-answer');
  assert.ok(summary);
  for (const key of ['section', 'slug', 'no', 'tag', 'date', 'title', 'dek']) assert.ok(summary[key], key);
  assert.equal(summary.body, undefined);
  // `lab`: the challenge an article's Lab card opens (none for a card that opens the Lab itself)
  assert.equal(all.articles.find(a => a.slug === 'url-shortener').lab, 'sms-link');
  assert.equal(all.articles.find(a => a.slug === 'how-to-answer').lab, undefined);
  // each card can show its article's first figure (25 §7)
  assert.equal(all.articles.find(a => a.slug === 'url-shortener').fig, 'shortener-flow');
  assert.ok(all.articles.filter(a => a.fig).length >= 45, 'most articles have a first figure');   // 48 of 54 after Concepts was cut to nine
  assert.equal((await (await get('/v1/articles?section=concepts')).json()).articles.length, allArticles.filter(a => a.section === 'concepts').length);
  assert.equal((await (await get('/v1/articles?section=components')).json()).articles.length, allArticles.filter(a => a.section === 'components').length);
  assert.equal((await get('/v1/articles?section=Bad!')).status, 400);
});

test('GET /v1/articles/:slug returns the full article with the example system', async () => {
  const response = await get('/v1/articles/how-to-answer/');
  assert.equal(response.status, 200);
  const article = await response.json();
  assert.equal(article.slug, 'how-to-answer');
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

// Free or paid: every article says which; a problem is never free; the lists carry it.
test('every article is free or paid, and no problem is free', async () => {
  const free = allArticles.filter((a) => a.access === 'free').map((a) => a.slug).sort();
  assert.deepEqual(free, ['how-to-answer']);
  const problem = allArticles.find((a) => a.practice);
  const check = (change) => validateContent({ site, examples, articles: allArticles.map((a) => (a === problem ? change(structuredClone(a)) : a)), lab });
  assert.ok(check((a) => ({ ...a, access: 'free' })).some((p) => p.includes('must be paid')));
  assert.ok(check((a) => { delete a.access; return a; }).some((p) => p.includes('access must be')));
});

test('GET /v1/lab returns the Lab catalogue', async () => {
  const response = await get('/v1/lab');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  const body = await response.json();
  assert.equal(body.budget, undefined, 'the v1 credit is gone');
  assert.equal(body.eval.v, 2);
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
  assert.ok(check((l) => { l.components[I.server].queriesPerRequest = { label: 'x', min: 1, max: 9, default: 2 }; }).some((p) => p.includes(`components[${I.server}]: queriesPerRequest is v1 only`)));
  assert.ok(check((l) => { l.retries = 9; }).some((p) => p.includes('retries')));
});

test('lab validation checks the phase 2 components, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  assert.ok(check((l) => { l.components[I.cache].hitPct = { label: 'x', min: 0, max: 99, default: 80 }; }).some((p) => p.includes(`components[${I.cache}]: hitPct is v1 only`)));
  assert.ok(check((l) => { delete l.components[I.cache].sizes[0].ops; }).some((p) => p.includes(`components[${I.cache}]: sizes`)));
  assert.ok(check((l) => { l.components[I.lb].rpsPerLcu = 0; }).some((p) => p.includes(`components[${I.lb}]: rpsPerLcu`)));
  assert.ok(check((l) => { delete l.components[I.queue].pricePerMillion; }).some((p) => p.includes(`components[${I.queue}]: pricePerMillion`)));
  assert.deepEqual(check((l) => { l.components = l.components.filter((c) => ['client', 'apigw', 'server', 'database'].includes(c.type)); delete l.challenges; delete l.levels; }).filter((p) => p.startsWith('lab.json')), []);
  assert.ok(check((l) => { l.components = l.components.filter((c) => c.type !== 'server'); }).some((p) => p.includes('missing component server')));
  assert.ok(check((l) => { l.example.nodes.push({ id: 'c2', type: 'cache', x: 0, y: 200, config: { hitPct: 80 } }); }).some((p) => p.includes('hitPct is v1 only')));
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

test('lab validation checks levels and challenges (judged by v2), which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const C = (l, id) => l.challenges.find((c) => c.id === id);
  assert.deepEqual(check((l) => { delete l.levels; delete l.challenges; }).filter((p) => p.startsWith('lab.json')), []);
  assert.ok(check((l) => { l.levels.push({ id: 'beginner', label: 'Again' }); }).some((p) => p.includes('levels must be')));
  assert.ok(check((l) => { C(l, 'flash-sale').level = 'expert'; }).some((p) => p.includes('unknown level expert')));
  assert.ok(check((l) => { C(l, 'flash-sale').id = 'one-server'; }).some((p) => p.includes('duplicate id one-server')));
  assert.ok(check((l) => { delete C(l, 'one-server').hint; }).some((p) => p.includes('needs hint')));
  // the scenario is checked as a v2 test: traffic, hours, faults
  assert.ok(check((l) => { C(l, 'flash-sale').traffic.pattern = 'tsunami'; }).some((p) => p.includes('traffic needs rps above 0 and a Clients pattern')));
  assert.ok(check((l) => { C(l, 'one-server').hours = 0; }).some((p) => p.includes('hours must be')));
  assert.ok(check((l) => { C(l, 'cache-restart').faults[0].minute = 9999; }).some((p) => p.includes('fault crash: minute')));
  assert.ok(check((l) => { C(l, 'cache-restart').faults[0].type = 'rocket'; }).some((p) => p.includes('type rocket is not a component type')));
  // its calls and data as a v2 problem's, and a starting design that can be read
  assert.ok(check((l) => { C(l, 'one-server').operations[0].steps[0].entity = 'nope'; }).some((p) => p.includes('entity nope is not in entities')));
  assert.ok(check((l) => { C(l, 'one-server').start.edges.push({ from: 'db', to: 'api' }); }).some((p) => p.includes('challenges[0] start')));
  // stars: 1 to 3, the first availability (or completes), known kinds; v1 settings are refused
  assert.ok(check((l) => { C(l, 'one-server').stars.reverse(); }).some((p) => p.includes('the first an availability')));
  assert.ok(check((l) => { C(l, 'one-server').stars[1].kind = 'vibes'; }).some((p) => p.includes('each star needs a kind')));
  assert.ok(check((l) => { C(l, 'one-server').stars[0].min = 101; }).some((p) => p.includes('availability must be above 0 and at most 100')));
  assert.ok(check((l) => { C(l, 'read-heavy').fixed = { hitPct: 85 }; }).some((p) => p.includes('fixed is v1 only')));
  assert.ok(check((l) => { C(l, 'one-server').requires = ['server']; }).some((p) => p.includes('requires is v1 only')));
});

test('lab validation checks aliases, which are optional', () => {
  const check = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }).filter((p) => p.startsWith('lab.json')); };
  assert.deepEqual(check((l) => { for (const c of l.components) delete c.aliases; }), []);
  assert.ok(check((l) => { l.components[0].aliases = []; }).some((p) => p.includes('aliases must be')));
  assert.ok(check((l) => { l.components[I.cache].aliases.push('DB'); }).some((p) => p.includes('names both cache and database')));
});

test('validation checks the CDN, a challenge\'s cost star, and the landing page problem', () => {
  const labCheck = (change) => { const bad = structuredClone(lab); change(bad); return validateContent({ site, examples, articles: allArticles, lab: bad }); };
  const siteCheck = (change) => { const bad = structuredClone(site); change(bad); return validateContent({ site: bad, examples, articles: allArticles, lab }); };
  const cdn = (l) => l.components.find((c) => c.type === 'cdn'), ch = (l) => l.challenges.find((c) => c.id === 'flash-sale');
  assert.ok(labCheck((l) => { delete cdn(l).pricePer10k; }).some((p) => p.includes('pricePer10k')));
  assert.ok(labCheck((l) => { cdn(l).live = { label: 'x', default: false }; }).some((p) => p.includes('live is v1 only')));
  assert.ok(labCheck((l) => { ch(l).stars[2] = { kind: 'cost', max: 0, label: 'x' }; }).some((p) => p.includes('cost needs max above 0')));
  // IND vs PAK on the landing page is a problem: an article with practice
  assert.ok(siteCheck((s) => { s.landingLab.problem = 'world-cup'; }).some((p) => p.includes('landingLab.problem world-cup')));
  assert.ok(siteCheck((s) => { s.landingLab.problem = 'how-to-answer'; }).some((p) => p.includes('landingLab.problem how-to-answer')), 'a guide is not a problem');
  assert.ok(siteCheck((s) => { delete s.landingLab.note; }).some((p) => p.includes('landingLab.note')));
  assert.ok(siteCheck((s) => { s.landingLab.challenge = 'ind-vs-pak'; delete s.landingLab.problem; }).some((p) => p.includes('landingLab.problem')));
  assert.deepEqual(siteCheck((s) => { delete s.landingLab; delete s.fact; }), []);
  // there is no Lab tab: its tour is optional
  assert.deepEqual(siteCheck((s) => { delete s.tour.lab; }), []);
  // the section and article tours and the header's sign-in dialog copy are optional too
  assert.deepEqual(siteCheck((s) => { delete s.tour.section; delete s.tour.article; delete s.account.signInDialog; }), []);
  assert.notDeepEqual(siteCheck((s) => { s.tour.article[0].target = 7; }), []);
  // a section's own tour (tour.concepts, tour['interview-questions'], …) and the Problems list tour are optional and checked
  assert.deepEqual(siteCheck((s) => { for (const k of ['concepts', 'components', 'interview-questions', 'quick-notes', 'real-systems', 'problems']) delete s.tour[k]; }), []);
  assert.notDeepEqual(siteCheck((s) => { s.tour['interview-questions'][0].title = 7; }), []);
});

test('content preflight allows If-None-Match', async () => {
  const response = await get('/v1/lab', { method: 'OPTIONS' });
  assert.equal(response.status, 204);
  assert.match(response.headers.get('access-control-allow-headers') || '', /If-None-Match/);
});

test('validation reports typos: unknown figure, bad table, unknown section', () => {
  const article = structuredClone(allArticles.find((a) => a.slug === 'how-to-answer'));
  article.section = 'nowhere';
  article.body.push({ t: 'fig', id: 'nope', cap: 'x' }, { t: 'table', head: ['a', 'b'], rows: [['only one']] });
  const problems = validateContent({ site, examples, articles: [article] });
  assert.ok(problems.some((p) => p.includes('unknown section nowhere')));
  assert.ok(problems.some((p) => p.includes('unknown figure nope')));
  assert.ok(problems.some((p) => p.includes('every row needs 2 cells')));
});

test('the "In 30 seconds" box (tldr) is no longer a block: an article with one is refused', () => {
  const article = structuredClone(allArticles.find((a) => a.slug === 'caching'));
  article.body.unshift({ t: 'tldr', items: ['a summary'] });
  assert.ok(validateContent({ site, examples, articles: [article] }).some((p) => p.includes('unknown block type tldr')));
  assert.ok(allArticles.every((a) => !a.body.some((b) => b.t === 'tldr')));
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
  assert.ok(check((s) => { s.dashboard.heads = { nowhere: { eyebrow: 'X', desc: 'Y' } }; }).some((p) => p.includes('dashboard.heads.nowhere is not a dashboard section')));
  assert.ok(check((s) => { s.dashboard.heads['real-systems'] = { eyebrow: 'X' }; }).some((p) => p.includes('dashboard.heads.real-systems.desc')));
  assert.ok(check((s) => { delete s.hero; }).some((p) => p.includes('site.json.hero')));
  const badExample = validateContent({ site, examples: { [site.example]: { ...example, parts: [['Apps']] } }, articles: allArticles, lab });
  assert.ok(badExample.some((p) => p.includes(`examples/${site.example}.json.parts[0]`)));
});

test('validation checks the optional "more" paragraphs of a type card', () => {
  const article = structuredClone(allArticles.find((a) => a.slug === 'how-to-answer')); // has type cards and an analogy
  const card = article.body.find((b) => b.t === 'type');
  card.more = 'not a list';
  assert.ok(validateContent({ site, examples, articles: [article] }).some((p) => p.includes('more must be a list')));
  card.more = ['fine', ''];
  assert.ok(validateContent({ site, examples, articles: [article] }).some((p) => p.includes('more must be a list')));
});

test('validation checks real-life analogies: the analogy block, type cards and Lab components', () => {
  const article = structuredClone(allArticles.find((a) => a.slug === 'how-to-answer')); // has type cards and an analogy
  // the other articles come too: this one's card opens a problem
  const at = (change) => { const a = structuredClone(article); change(a); return validateContent({ site, examples, articles: [a, ...allArticles.filter((x) => x.slug !== a.slug)], lab }); };
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
  await editJson(path.join(dir, 'articles', 'concepts', 'networking-essentials.json'), (a) => { a.body.push({ t: 'fig', id: 'missing', cap: 'x' }); });
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

test('subsections and "Try it on the canvas" cards are checked', () => {
  const check = (changeSite, changeArticle) => {
    const s = structuredClone(site), arts = structuredClone(allArticles);
    changeSite?.(s); changeArticle?.(arts.find((a) => a.slug === 'how-to-answer'));
    return validateContent({ site: s, examples, articles: arts, lab });
  };
  assert.deepEqual(check(), []);
  assert.match(check(null, (a) => { a.group = 'nope'; }).join(), /unknown group nope/);
  assert.match(check((s) => { s.dashboard.groups.nope = [['a', 'A', 'x']]; }).join(), /groups\.nope is not a section/);
  assert.match(check((s) => { s.dashboard.groups.components.push(['tools', 'Again', 'x']); }).join(), /unique lowercase ids/);
  const labBlock = (a) => a.body.find((b) => b.t === 'lab');
  // a card opens a problem or a challenge, both on the Problems tab (there is no Lab tab)
  assert.deepEqual(check(null, (a) => { labBlock(a).to = 'problems/challenge/one-server'; }), []);
  assert.deepEqual(check(null, (a) => { labBlock(a).to = 'problems/ind-vs-pak'; }), []);
  assert.match(check(null, (a) => { labBlock(a).to = 'problems/challenge/no-such-challenge'; }).join(), /unknown challenge no-such-challenge/);
  assert.match(check(null, (a) => { labBlock(a).to = 'problems/no-such-problem'; }).join(), /unknown problem no-such-problem/);
  assert.match(check(null, (a) => { labBlock(a).to = 'problems/system-design-interviews'; }).join(), /unknown problem system-design-interviews/, 'a guide is not a problem');
  for (const old of ['lab', 'lab/one-server', 'https://evil.example']) assert.match(check(null, (a) => { labBlock(a).to = old; }).join(), /to must be "problems\//);
});

test('each figure module belongs to a sub-tab or an article, with the same ids in the frontend and the backend', async () => {
  const { FIGS } = await import('../src/content/validate.js');
  const { readFile, readdir } = await import('node:fs/promises');
  // frontend/src/figs/<tab>/<name>.jsx exports FIGS, one "id":{C:…} per line; backend/src/content/figs/<tab>/<name>.js
  // lists the same ids. <name> is a real sub-tab (site.json dashboard.groups) or, for a long article with its own
  // figures (each Concepts topic), that article's slug. Both folders hold the same files, and both sides gather them all.
  const fe = new URL('../../frontend/src/figs/', import.meta.url), be = new URL('../src/content/figs/', import.meta.url);
  const site = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));
  const subTabs = new Set(Object.entries(site.dashboard.groups).flatMap(([tab, gs]) => gs.map(([g]) => `${tab}/${g}`)));
  const articles = new Set(allArticles.map((a) => `${a.section}/${a.slug}`));
  const modules = async (dir, ext) => (await Promise.all((await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory())
    .map(async (d) => (await readdir(new URL(`${d.name}/`, dir))).filter((f) => f.endsWith(ext)).map((f) => `${d.name}/${f.slice(0, -ext.length)}`)))).flat().sort();
  const feMods = await modules(fe, '.jsx'), beMods = await modules(be, '.js');
  assert.deepEqual(feMods, beMods, 'the frontend and backend figure folders must hold the same sub-tabs');
  const feIndex = await readFile(new URL('index.js', fe), 'utf8'), beIndex = await readFile(new URL('index.js', be), 'utf8');
  // the frontend loads every module on demand (figs/index.js), found by this pattern, and learns which module
  // draws which figure from the modules themselves (frontend/figs-manifest.js, by the same rule as below)
  assert.ok(feIndex.includes('import.meta.glob("./*/*.jsx")'), 'frontend/src/figs/index.js must load every <tab>/<sub-tab>.jsx');
  const all = [];
  for (const m of feMods) {
    assert.ok(subTabs.has(m) || articles.has(m), `${m} is neither a sub-tab in content/site.json nor an article`);
    assert.ok(beIndex.includes(`from './${m}.js'`), `backend/src/content/figs/index.js must import ${m}.js`);
    const reg = (await readFile(new URL(`${m}.jsx`, fe), 'utf8')).match(/export const FIGS=\{([\s\S]*?)\n\};/);
    assert.ok(reg, `${m}.jsx must export FIGS`);
    const ids = [...reg[1].matchAll(/^"([a-z-]+)":\{C:/gm)].map((x) => x[1]);
    const { FIGS: listed } = await import(new URL(`${m}.js`, be));
    assert.deepEqual([...listed].sort(), [...ids].sort(), `${m}: backend ids must match the frontend module`);
    all.push(...ids);
  }
  assert.equal(new Set(all).size, all.length, 'a figure id is defined in two sub-tabs');
  assert.deepEqual(all.sort(), [...FIGS].sort());
});

test('validation checks the Problems "solve" copy the problem page reads', () => {
  const bad = structuredClone(site);
  delete bad.problems.solve.answer;
  const problems = validateContent({ site: bad, examples, articles: allArticles });
  assert.ok(problems.some((p) => p.includes('problems.solve.answer')));
});

test('the account sync keeps the problem a saved design was opened for', async () => {
  const { mergeLab } = await import('../../frontend/src/lab/merge.js');
  const lab = JSON.parse(await readFile(path.join(repoContent, 'lab.json'), 'utf8'));
  const d = { id: 'q-url-shortener', name: 'Design a URL shortener', updated: 5, nodes: [], edges: [], problem: 'url-shortener' };
  const out = mergeLab({ designs: [d] }, { designs: [{ ...d, id: 'q-bad', problem: 'Not a slug!' }] }, lab);
  assert.equal(out.designs.find((x) => x.id === 'q-url-shortener').problem, 'url-shortener');
  assert.equal(out.designs.find((x) => x.id === 'q-bad').problem, undefined);
});

test('a practice in the v1 format is refused: every problem is judged by v2', async () => {
  const lab = JSON.parse(await readFile(path.join(repoContent, 'lab.json'), 'utf8'));
  const q = structuredClone(allArticles.find((a) => a.practice));
  delete q.practice.v;
  assert.ok(validateContent({ site, examples, articles: [q], lab }).some((p) => p.includes('v must be 2 (the v1 format was removed)')));
  const ch = structuredClone(lab); delete ch.challenges[0].v;
  assert.ok(validateContent({ site, examples, articles: allArticles, lab: ch }).some((p) => p.includes('challenges[0]: v must be 2')));
});

test('a problem is served without its reference and wrong designs', async () => {
  const response = await get('/v1/articles/url-shortener');
  const a = await response.json();
  assert.ok(a.practice && a.practice.tests.length > 0, 'tests are served');
  assert.equal(a.practice.reference, undefined);
  assert.equal(a.practice.wrong, undefined);
});

test('GET /v1/articles/:slug/solution serves the solution design only: never the wrong designs', async () => {
  const response = await get('/v1/articles/url-shortener/solution');
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('etag'));
  const s = await response.json();
  const src = JSON.parse((await import('node:fs')).readFileSync(new URL('../../content/articles/interview-questions/url-shortener.json', import.meta.url)));
  assert.deepEqual(s, { slug: 'url-shortener', nodes: src.practice.reference.nodes, edges: src.practice.reference.edges });
  assert.ok(!JSON.stringify(s).includes('wrong'));
  // only problems have one; bad slugs and deeper paths are 404
  for (const path of ['/v1/articles/how-to-answer/solution', '/v1/articles/nope/solution', '/v1/articles/UPPER/solution', '/v1/articles/a/b/solution', '/v1/articles/url-shortener/solution/x', '/v1/articles/solution']) {
    const r = await get(path);
    assert.equal(r.status, 404, path);
  }
});

test('a design in content may give its database an engine and a schema, which must be valid for it', async () => {
  const { validateDesign } = await import('../src/content/validate.js');
  const lab = JSON.parse((await import('node:fs')).readFileSync(new URL('../../content/lab.json', import.meta.url)));
  const d = (config) => ({ name: 'x', nodes: [{ id: 'c', type: 'client', x: 0, y: 0, config: {} }, { id: 'db', type: 'database', x: 1, y: 0, config }], edges: [{ from: 'c', to: 'db' }] });
  const ok = { engine: 'dynamodb', schema: { tables: [{ name: 'links', fields: [{ name: 'code', type: 'string' }], key: ['code'] }] } };
  assert.deepEqual(validateDesign(d(ok), lab, 'test', []).filter((p) => /schema|engine|size/.test(p)), []);
  assert.ok(validateDesign(d({ engine: 'oracle' }), lab, 'test', []).some((p) => /unknown engine/.test(p)));
  assert.ok(validateDesign(d({ engine: 'mongodb', size: 'db.m5.large' }), lab, 'test', []).some((p) => /unknown size db.m5.large for MongoDB/.test(p)));
  assert.ok(validateDesign(d({ engine: 'dynamodb', schema: { tables: [{ name: 'p', fields: [{ name: 'id', type: 'string' }, { name: 'loc', type: 'geo' }], key: ['id'], indexes: [{ kind: 'geo', fields: ['loc'] }] }] } }), lab, 'test', []).some((p) => /geohash/.test(p)));
  assert.ok(validateDesign(d({ schema: { tables: [{ name: 'bad name', fields: [] }] } }), lab, 'test', []).some((p) => /schema is malformed/.test(p)));
});

// ---- the v2 evaluator's catalogue (content/eval.json; tech-katta-context/evaluator.md §5.4) ----
test('eval.json is loaded, valid, and served inside the Lab catalogue', async () => {
  assert.equal(lab.eval?.v, 2, 'loadContent puts eval.json on lab.eval');
  const { eval: evalCat, ...labOnly } = lab;
  assert.deepEqual(validateContent({ site, examples, articles: allArticles, lab: labOnly, evalCat }), []);
  // without eval.json the v1 content is still valid; a v2 problem says it needs it
  assert.deepEqual(validateContent({ site, examples, articles: allArticles, lab: labOnly }), [
    ...labOnly.challenges.map((c, i) => `lab.json challenges[${i}]: v 2 needs content/eval.json`),
    ...allArticles.filter((a) => a.practice?.v === 2).map((a) => `articles/${a.section}/${a.slug}.json practice: v 2 needs content/eval.json`)]);
  const { server, baseUrl } = await startServer();
  try { const body = await (await fetch(baseUrl + '/v1/lab')).json(); assert.equal(body.eval.v, 2); assert.equal(body.eval.components.length, lab.eval.components.length); }
  finally { server.kill(); }
});

test('eval.json validation catches every kind of mistake', () => {
  const { eval: good, ...labOnly } = lab;
  const check = (change) => { const bad = structuredClone(good); change(bad); return validateContent({ site, examples, articles: allArticles, lab: labOnly, evalCat: bad }).filter((p) => p.startsWith('eval.json')); };
  const has = (change, text) => { const p = check(change); assert.ok(p.some((x) => x.includes(text)), `expected "${text}" in ${JSON.stringify(p)}`); };
  const C = (e, type) => e.components.find((c) => c.type === type);
  const S = (e, type, key) => C(e, type).settings.find((s) => s.key === key);
  assert.deepEqual(check(() => {}), []);
  has((e) => { e.v = 1; }, 'v must be 2');
  has((e) => { e.tickMinutes = 7; }, 'tickMinutes');
  has((e) => { e.retries = 9; }, 'retries');
  has((e) => { e.limits.nodes = 0; }, 'limits.nodes');
  has((e) => { delete e.work.get; }, 'work.get');
  has((e) => { e.work.put = -2; }, 'work.put');
  has((e) => { delete e.engines.s3; }, 'engines.s3 is missing');
  has((e) => { e.engines.oracle = { caps: ['get'], storagePerGbMonth: 1, maxStorageGb: null }; }, 'engines.oracle is not an engine');
  has((e) => { e.engines.postgres.caps.push('teleport'); }, 'engines.postgres.caps');
  has((e) => { e.engines.postgres.maxStorageGb = 0; }, 'maxStorageGb');
  has((e) => { e.components.push(structuredClone(e.components[0])); }, 'duplicate type');
  has((e) => { e.components.push({ type: 'rocket', group: 'X', to: [], settings: [] }); }, 'not a component in lab.json');
  has((e) => { C(e, 'client').to.push('rocket'); }, 'to must list known types');
  has((e) => { C(e, 'client').toIf.queue = { engine: ['s3'] }; }, 'toIf.queue is not in to');
  has((e) => { C(e, 'server').toCdc = true; }, 'toCdc is only for the database');
  has((e) => { S(e, 'server', 'zones').default = 7; }, 'min ≤ default ≤ max');
  has((e) => { S(e, 'server', 'zones').step = 2; }, 'step can only be 1');
  has((e) => { S(e, 'server', 'breaker').default = 'no'; }, 'true or false default');
  has((e) => { S(e, 'cache', 'onDown').default = 'explode'; }, 'default must be one of the options');
  has((e) => { S(e, 'cache', 'onDown').options.push({ id: 'database', label: 'Again' }); }, 'unique ids');
  has((e) => { S(e, 'server', 'zones').kind = 'slider'; }, 'kind must be one of');
  has((e) => { C(e, 'server').settings.push({ key: 'zones', label: 'Again', kind: 'bool', default: true }); }, 'same key');
  has((e) => { delete C(e, 'cache').sizeExtras['cache.m5.large']; }, 'memoryGb is needed');
  has((e) => { C(e, 'cache').sizeExtras['cache.huge'] = { memoryGb: 99 }; }, 'not a size of cache');
});

// ---- v2 problems (practice.v === 2; tech-katta-context/evaluator.md §6, §12.2) ----
test('a v2 problem is validated by its own rules, and every rule catches its mistake', async () => {
  const { validatePractice } = await import('../src/content/validate.js');
  const fixture = JSON.parse(await readFile(path.join(repoContent, '..', 'frontend', 'src', 'eval', 'fixtures', 'url-shortener.v2.json'), 'utf8'));
  const v1 = allArticles.find((a) => a.slug === 'url-shortener').practice;
  const good = { ...fixture, rubric: v1.rubric, hints: v1.hints };
  const check = (change) => { const p = structuredClone(good); change(p); const out = []; validatePractice(p, lab, 'p', out); return out; };
  assert.deepEqual(check(() => {}), [], 'the fixture with a rubric is a valid v2 problem');
  const has = (change, text) => { const out = check(change); assert.ok(out.some((x) => x.includes(text)), `expected "${text}" in ${JSON.stringify(out)}`); };
  const op = (p, id) => p.operations.find((o) => o.id === id), T = (p, id) => p.tests.find((t) => t.id === id);
  has((p) => { p.v = 3; }, 'v must be 2');
  has((p) => { delete p.brief; }, 'needs brief');
  has((p) => { p.entities = {}; }, "entities must name the problem's data");
  has((p) => { p.entities.Links = p.entities.links; }, 'name must be lowercase');
  has((p) => { p.entities.links.rows = 0; }, 'rows must be above 0');
  has((p) => { delete p.entities.links.rowBytes; }, 'rowBytes must be above 0');
  has((p) => { p.entities.links.fields.code = 'uuid'; }, 'fields must map names to types');
  has((p) => { p.entities.links.sample = [p.entities.links.sample[0]]; }, 'sample needs at least 2 rows');
  has((p) => { p.entities.links.sample[0].colour = 'red'; }, 'sample rows use fields not in fields');
  has((p) => { p.entities.links.expires = 'yes'; }, 'expires must be true or false');
  has((p) => { p.aliases = { code: 'slug' }; }, 'aliases must map fields');
  has((p) => { p.operations = []; }, 'operations must be a non-empty list');
  has((p) => { p.operations[1].id = 'redirect'; }, 'duplicate id');
  has((p) => { op(p, 'redirect').kind = 'peek'; }, 'kind is read, write or connect');
  has((p) => { op(p, 'redirect').source = 'cron'; }, 'source is clients');
  has((p) => { op(p, 'redirect').request.path = 'ab12x'; }, 'request needs a method');
  has((p) => { op(p, 'redirect').share = 0.5; }, 'must add up to 1');
  has((p) => { op(p, 'redirect').keys.skew = 'pareto'; }, 'keys needs a known entity');
  has((p) => { op(p, 'redirect').cacheable = { ttlSec: 0 }; }, 'cacheable needs ttlSec');
  has((p) => { op(p, 'redirect').slo.availability = 101; }, 'slo needs availability');
  has((p) => { op(p, 'redirect').consistency = 'eventual'; }, 'consistency is "strong"');
  has((p) => { op(p, 'create').effect = 'twice'; }, 'effect can only be "once"');
  has((p) => { op(p, 'create').durable = 'yes'; }, 'durable must be true or false');
  has((p) => { delete op(p, 'redirect').respond; }, 'respond needs a status');
  has((p) => { op(p, 'redirect').steps = []; }, 'steps must be a non-empty list');
  has((p) => { op(p, 'redirect').steps[0].op = 'fetch'; }, 'a step needs an id and an op');
  has((p) => { op(p, 'redirect').steps.push({ ...op(p, 'redirect').steps[0] }); }, 'duplicate step s1');
  has((p) => { op(p, 'redirect').steps[0].entity = 'urls'; }, 'entity urls is not in entities');
  has((p) => { delete op(p, 'redirect').steps[0].by; }, 'get needs by');
  has((p) => { op(p, 'redirect').steps[0].fields = ['colour']; }, "colour not among links's fields");
  has((p) => { op(p, 'redirect').steps[0].timing = 'later'; }, 'timing is sync or defer');
  has((p) => { op(p, 'redirect').steps[0].times = 0; }, 'times must be above 0');
  has((p) => { op(p, 'redirect').steps.push({ id: 's2', op: 'put', entity: 'links', values: { code: 'x' } }); }, 'a read operation may only read');
  has((p) => { op(p, 'create').steps = [{ id: 't', op: 'tx', steps: [{ id: 'a', op: 'get', entity: 'links', by: { code: 'x' }, fields: ['code'] }] }]; }, 'a transaction holds only put and update steps');
  has((p) => { op(p, 'create').steps.push({ id: 'c', op: 'compute' }); }, 'compute needs cpuMs and a label');
  has((p) => { p.tests[0].id = 'api-create'; }, 'duplicate id');
  has((p) => { delete p.tests[0].desc; }, 'needs desc');
  has((p) => { p.tests[0].op = 'delete'; }, 'op delete is not an operation');
  has((p) => { p.tests = p.tests.filter((t) => t.op !== 'create'); }, 'operation create has no trace test');
  has((p) => { for (const t of p.tests) if (t.op) t.sample = false; }, 'at least one trace test needs sample');
  has((p) => { for (const t of p.tests) if (!t.op) t.sample = false; }, 'at least one load test needs sample');
  has((p) => { T(p, 'peak').hours = 100; }, 'hours must be above 0 and at most 48');
  has((p) => { T(p, 'peak').startHour = 24; }, 'startHour must be from 0');
  has((p) => { T(p, 'peak').traffic.pattern = 'weekend'; }, 'traffic needs rps above 0 and a Clients pattern');
  has((p) => { T(p, 'zone').faults[0].kind = 'meteor'; }, 'unknown fault meteor');
  has((p) => { T(p, 'zone').faults.push({ minute: 5, kind: 'poison', share: 2 }); }, 'fault poison: share must be above 0 and at most 1');
  has((p) => { p.operations.find((o) => o.keys).keys.hot = 0; }, 'keys.hot (the share of calls for one item) must be above 0 and at most 1');
  has((p) => { T(p, 'zone').faults[0].minute = 90; }, 'minute must be a multiple of 1 inside the test');
  has((p) => { T(p, 'budget').checks.push({ kind: 'slo', from: 7, to: 60 }); }, 'a window needs from < to, multiples of 5');
  has((p) => { T(p, 'zone').faults.push({ minute: 5, kind: 'crash' }); }, 'fault crash needs a type');
  has((p) => { T(p, 'zone').faults.push({ minute: 5, kind: 'slow', type: 'robot' }); }, 'type robot is not a component type');
  has((p) => { T(p, 'zone').faults[0].minutes = 0; }, 'minutes must be at least 1');
  has((p) => { T(p, 'peak').chaos = [{ minute: 3, type: 'robot' }]; }, 'a chaos event needs a minute');
  has((p) => { T(p, 'peak').checks = []; }, 'checks must be a non-empty list');
  has((p) => { T(p, 'peak').checks.push({ kind: 'availability', min: 99 }); }, 'check availability is v1 only');
  has((p) => { T(p, 'peak').checks.push({ kind: 'speed' }); }, 'unknown check speed');
  has((p) => { T(p, 'peak').checks.push({ kind: 'slo', op: 'delete' }); }, 'check slo: op delete is not an operation');
  has((p) => { T(p, 'peak').checks.push({ kind: 'slo', availability: 0 }); }, 'availability must be above 0');
  has((p) => { T(p, 'peak').checks.push({ kind: 'completes', withinSec: -1 }); }, 'withinSec must be above 0');
  has((p) => { T(p, 'budget').checks.push({ kind: 'cost' }); }, 'cost needs max above 0');
  has((p) => { T(p, 'peak').checks.push({ kind: 'has' }); }, 'has needs a type');
  has((p) => { p.start.nodes.push({ id: 'x', type: 'robot', x: 0, y: 0, config: {} }); }, 'p start: cleaning it changes it');
  has((p) => { p.reference.edges.push({ from: 'db', to: 'app' }); }, 'p reference: cleaning it changes it');
  has((p) => { p.reference.nodes.find((n) => n.id === 'app').config.count = 999; }, 'cleaning it changes it');
  has((p) => { p.start.nodes = p.start.nodes.filter((n) => n.type !== 'client'); p.start.edges = []; }, 'start: needs the Clients');
  has((p) => { p.reference.nodes.find((n) => n.id === 'db').config.schema.tables[0].key = []; }, 'needs a primary key');
  has((p) => { p.wrong[0].fails = 'nope'; }, 'needs name, why and fails');
  has((p) => { p.wrong = []; }, 'needs at least one wrong design');
  has((p) => { p.locked = ['ghost']; }, 'locked must list ids of nodes in start');
  has((p) => { p.mutantsAllowed = [1]; }, 'mutantsAllowed must list mutant ids');
  has((p) => { p.mutantsAllowedWhy = { x: '' }; }, 'mutantsAllowedWhy must map');
  has((p) => { delete p.rubric; }, 'needs rubric');
  has((p) => { p.hints = []; }, 'hints need');
  // without eval.json a v2 problem can't be judged
  const out = []; validatePractice(good, (({ eval: _, ...l }) => l)(lab), 'p', out);
  assert.ok(out.some((x) => x.includes('v 2 needs content/eval.json')));
});

// The sign-in gate on the text (tech-katta-context 52): end to end against the real server, a real MongoDB and a stand-in for
// Google's keys. Signed out, an article is its header, its first 2 paragraphs and its section names; a problem is its title,
// difficulty and the first lines of its brief; the Lab catalogue is the challenges' titles and briefs; solutions and wrong
// designs are a 401. Signed in, everything as before. Nothing from deep in the text is ever in a signed-out response.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

const ORIGIN = 'http://localhost:5411', CLIENT = 'test-client.apps.googleusercontent.com';
const problem = JSON.parse(readFileSync(new URL('../../content/problems2/001-url-shortener.json', import.meta.url), 'utf8'));
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
const idToken = (sub) => { const head = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT' }), body = b64({ iss: 'https://accounts.google.com', aud: CLIENT, sub, email: `${sub}@example.com`, email_verified: true, name: `User ${sub}`, picture: 'https://example.com/a.png', iat: now(), exp: now() + 3600 }); return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey).toString('base64url')}`; };
async function freePort() { const s = createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening'); const p = s.address().port; await new Promise((r) => s.close(r)); return p; }

let mongo, jwks, api, base, client;
test.before(async () => {
  mongo = await MongoMemoryServer.create();
  jwks = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ keys: [jwk] })); });
  jwks.listen(0, '127.0.0.1'); await once(jwks, 'listening');
  const port = await freePort();
  api = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: CLIENT, MONGODB_URI: mongo.getUri(), ACCOUNTS_DB: 'tk_gate', SESSION_SECRET: 'x'.repeat(40), COOKIE_SECURE: '0', GOOGLE_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/certs` } });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  client = await MongoClient.connect(mongo.getUri());
});
test.after(async () => { api?.kill('SIGTERM'); jwks?.close(); await client?.close(); await mongo?.stop(); });

let ipN = 0;
const call = (path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) => fetch(base + path, { method, headers: { 'X-Real-IP': `10.1.${(ipN += 1) >> 8 & 255}.${ipN & 255}`, ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const signIn = async (sub) => { const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken(sub) } }); assert.equal(r.status, 200); return (r.headers.get('set-cookie') || '').split(';')[0]; };
const ARTICLES = JSON.parse(readFileSync(new URL('../../content/articles/index.json', import.meta.url), 'utf8')).articles
  .map((e) => JSON.parse(readFileSync(new URL(`../../content/articles/${e}.json`, import.meta.url), 'utf8')));
const LAB = JSON.parse(readFileSync(new URL('../../content/lab.json', import.meta.url), 'utf8'));
const wordsOf = (t) => String(t).split(/\s+/).filter(Boolean).length;
/** a sentence from deep in the text: the longest paragraph after the 6th block, cut to 70 characters from its second sentence */
const deepLine = (a) => { const p = a.body.slice(6).filter((b) => b.t === 'p' && b.x.length > 120).sort((x, y) => y.x.length - x.x.length)[0]; return p ? p.x.slice(60, 130) : null; };
const get = (path, cookie) => call(path, { origin: null, cookie });

test('signed out, an article is its header, its first 2 paragraphs (100-150 words) and its section names, nothing from deep in the text', async () => {
  const slugs = ['caching', 'sharding', 'kafka-in-practice', 'consistent-hashing', 'shopify-reservations'];
  let checked = 0;
  for (const slug of slugs) {
    const a = ARTICLES.find((x) => x.slug === slug); if (!a || a.practice) continue;
    const r = await get(`/v1/articles/${slug}`); assert.equal(r.status, 200, slug);
    assert.match(r.headers.get('vary') || '', /Cookie/);
    assert.match(r.headers.get('cache-control') || '', /private/);
    const text = await r.text(), p = JSON.parse(text);
    assert.equal(p.locked, true); assert.equal(p.title, a.title); assert.equal(p.dek, a.dek);
    assert.ok(p.body.length <= 2 && p.body.every((b) => b.t === 'p'), 'at most 2 paragraphs');
    assert.ok(p.body.reduce((n, b) => n + wordsOf(b.x), 0) <= 150, 'at most 150 words');
    assert.deepEqual(p.headings, a.body.filter((b) => b.t === 'h2').map((b) => b.x));
    for (const k of ['"example"', '"practice"', '"fig"', '"code"', '"table"']) assert.ok(!text.includes(k), `${slug} ${k}`);
    const deep = deepLine(a); if (deep) { assert.ok(!text.includes(deep), `${slug}: deep text must not be served signed out`); checked += 1; }
  }
  assert.ok(checked >= 3, 'checked a handful of articles');
});

test('signed out, a problem is its title, difficulty and the first lines of its brief; no hint, test, reference or solution', async () => {
  const problems = ARTICLES.filter((a) => a.practice).slice(0, 3); assert.equal(problems.length, 3);
  for (const a of problems) {
    const text = await (await get(`/v1/articles/${a.slug}`)).text(), p = JSON.parse(text);
    assert.equal(p.kind, 'problem'); assert.equal(p.locked, true); assert.equal(p.title, a.title); assert.deepEqual(p.body, []);
    assert.ok(p.brief && a.practice.brief.startsWith(p.brief.slice(0, 20)));
    for (const k of ['"practice"', '"hints"', '"tests"', '"reference"', '"wrong"', '"rubric"', '"operations"']) assert.ok(!text.includes(k), `${a.slug} ${k}`);
    for (const h of a.practice.hints || []) assert.ok(!text.includes(String(h).slice(0, 50)), `${a.slug}: a hint leaked`);
    const deep = deepLine(a); if (deep) assert.ok(!text.includes(deep), `${a.slug}: deep text`);
  }
});

test('signed out, the Lab catalogue is the challenges: id, title, level and the first lines of the brief', async () => {
  const text = await (await get('/v1/lab')).text(), lab = JSON.parse(text);
  assert.equal(lab.locked, true); assert.equal(lab.challenges.length, LAB.challenges.length);
  assert.deepEqual(Object.keys(lab.challenges[0]).sort(), ['brief', 'id', 'level', 'title']);
  for (const c of LAB.challenges) { assert.ok(!text.includes(String(c.hint).slice(0, 40)), `${c.id}: the hint leaked`); }
  for (const k of ['"components"', '"entities"', '"operations"', '"traffic"', '"eval"', '"smallScreen"']) assert.ok(!text.includes(k), k);
});

test('the site copy carries no article text (the worked example travels inside the full article)', async () => {
  const text = await (await get('/v1/site')).text();
  assert.ok(!('example' in JSON.parse(text)), 'no top-level example');
  for (const a of ARTICLES.slice(0, 12)) { const deep = deepLine(a); if (deep) assert.ok(!text.includes(deep), a.slug); }
});

test('a problem\'s solution and wrong designs, and the practice problem itself, need a session', async () => {
  const withRef = ARTICLES.find((a) => a.practice?.reference); assert.ok(withRef);
  for (const suffix of ['/solution', '/wrong']) assert.equal((await get(`/v1/articles/${withRef.slug}${suffix}`)).status, 401, suffix);
  assert.equal((await get('/v1/articles/not-a-real-article')).status, 404);
  assert.equal((await get('/v1/practice/problems/url-shortener/editorial')).status, 401);
  assert.equal((await get('/v1/practice/problems/url-shortener/submissions')).status, 401);
  assert.equal((await call('/v1/practice/problems/url-shortener/submit', { method: 'POST', body: { source: 'x' } })).status, 401);
  assert.equal((await call('/v1/me/submissions', { method: 'POST', body: { slug: 'x', design: {} } })).status, 401);
  assert.equal((await call('/v1/me/submissions/review', { method: 'POST', body: { slug: 'x', design: {} } })).status, 401);
  assert.equal((await get('/v1/me/lab')).status, 401);
});

test('a bad or stale cookie is the same as no cookie; a signed-in session gets everything', async () => {
  const slug = 'caching', a = ARTICLES.find((x) => x.slug === slug);
  const bad = JSON.parse(await (await get(`/v1/articles/${slug}`, 'tk_session=not-a-real-token')).text());
  assert.equal(bad.locked, true);
  const cookie = await signIn('3001');
  const full = await (await get(`/v1/articles/${slug}`, cookie)).json();
  assert.ok(!full.locked); assert.equal(full.body.length, a.body.length);
  const withRef = ARTICLES.find((x) => x.practice?.reference);
  assert.equal((await get(`/v1/articles/${withRef.slug}/solution`, cookie)).status, 200);
  const lab = await (await get('/v1/lab', cookie)).json();
  assert.ok(!lab.locked); assert.ok(Array.isArray(lab.components) && lab.challenges[0].entities);
  const problem = await (await get(`/v1/articles/${withRef.slug}`, cookie)).json();
  assert.ok(problem.practice && problem.body.length > 0);
  const practice = await (await get('/v1/practice/problems/url-shortener', cookie)).json();
  assert.ok(Array.isArray(practice.tests) && practice.hints.length > 0);
});

test('with sign-in not configured the API still serves only the public part; OPEN_CONTENT does nothing in production', async () => {
  for (const env of [{}, { OPEN_CONTENT: '1', NODE_ENV: 'production' }]) {
    const port = await freePort();
    const off = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), GOOGLE_CLIENT_ID: '', MONGODB_URI: '', SESSION_SECRET: '', ...env } });
    try {
      const url = `http://127.0.0.1:${port}`;
      for (let i = 0; i < 100; i += 1) { try { if ((await fetch(url + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
      const p = await (await fetch(`${url}/v1/articles/caching`)).json();
      assert.equal(p.locked, true, JSON.stringify(env));
      assert.equal((await fetch(`${url}/v1/articles/${ARTICLES.find((x) => x.practice?.reference).slug}/solution`)).status, 401);
    } finally { off.kill('SIGTERM'); }
  }
});

// The interviewer's routes (src/practice/routes.js, src/ai; tech-katta-context/22-EVALUATOR-V3.md §17.1), end to end:
// the real server with the mock interviewer, a real MongoDB (mongodb-memory-server) and a stand-in for Google's keys.
// A review of one's own submission; credits by month and day; a repeat is cached and free; the limits; nothing
// hidden in what the browser receives; the account delete takes the credits.
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
const wrong = (name) => problem.wrong.find((w) => w.name === name).source;
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
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: CLIENT, MONGODB_URI: mongo.getUri(), ACCOUNTS_DB: 'tk_ai', AI_PROVIDER: 'mock', AI_ENABLED: '1', AI_MOCK_DELAY_MS: '0', AI_MONTHLY_REVIEWS: '3', AI_DAILY_REVIEWS: '2', SESSION_SECRET: 'x'.repeat(40), COOKIE_SECURE: '0', GOOGLE_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/certs` } });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  client = await MongoClient.connect(mongo.getUri());
});
test.after(async () => { api?.kill('SIGTERM'); jwks?.close(); await client?.close(); await mongo?.stop(); });

let ipN = 0;
const call = (path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) => fetch(base + path, { method, headers: { 'X-Real-IP': `10.1.${(ipN += 1) >> 8 & 255}.${ipN & 255}`, ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const signIn = async (sub) => { const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken(sub) } }); assert.equal(r.status, 200); return (r.headers.get('set-cookie') || '').split(';')[0]; };
const submit = (cookie, source, extra = {}) => call('/v1/practice/problems/url-shortener/submit', { method: 'POST', cookie, body: { source, ...extra } });
const db = () => client.db('tk_ai');
const review = (cookie, id, extra = {}) => call(`/v1/practice/submissions/${id}/review`, { method: 'POST', cookie, body: {}, ...extra });

const reviewed = (r) => r.json();

test('a review needs a session, the site as origin, and one\'s own submission', async () => {
  const a = await signIn('5001'), b = await signIn('5002');
  const s = await (await submit(a, wrong('no-cache'))).json();
  assert.equal((await review(null, s.submission_id)).status, 401);
  assert.equal((await review(a, s.submission_id, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await review(b, s.submission_id)).status, 404, "not someone else's");
  assert.equal((await review(a, '0'.repeat(24))).status, 404);
  assert.equal((await call(`/v1/practice/submissions/${s.submission_id}/review`, { cookie: a })).status, 405);
});

test('the interviewer reviews a submission; the same design again is cached and free; nothing hidden leaves', async () => {
  const cookie = await signIn('5003');
  const before = await (await call('/v1/practice/me/credits', { cookie })).json();
  assert.deepEqual(before, { enabled: true, preview: true, month: { total: 3, used: 0, left: 3 }, day: { total: 2, used: 0, left: 2 } });
  const s = await (await submit(cookie, wrong('no-replica'))).json(); // fails a hidden test
  const r = await review(cookie, s.submission_id);
  assert.equal(r.status, 200);
  const text = await r.text(), body = JSON.parse(text);
  assert.deepEqual([body.source, body.preview, body.verdict, body.submission_id], ['interviewer', true, 'Unavailable', s.submission_id]);
  assert.ok(body.review.headline && body.review.items.length >= 2 && body.review.next.text);
  assert.deepEqual([body.credits.month.used, body.credits.day.left], [1, 1]);
  // the hidden test's numbers, the reference and the editorial are not in the answer
  const hidden = problem.tests.find((t) => t.id === 't04-database-fails');
  for (const n of Object.values(hidden.phases[0].rates).filter((x) => x >= 100)) assert.ok(!text.includes(String(n)) && !text.includes(n.toLocaleString('en-IN')), `rate ${n}`);
  assert.ok(!text.includes(problem.reference.slice(0, 50)));
  // the same design, submitted again: the same pack, the same answer, no credit
  const s2 = await (await submit(cookie, wrong('no-replica'))).json();
  const again = await (await review(cookie, s2.submission_id)).json();
  assert.deepEqual([again.source, again.cached, again.credits.month.used], ['interviewer', true, 1]);
  assert.deepEqual(again.review, body.review);
  const logs = await db().collection('practice_ai_log').find({}).toArray();
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes('5003'), 'no account in the log');
  assert.equal(await db().collection('practice_ai').countDocuments(), 1);
});

test('credits: two a day, three a month; beyond them the report\'s review, at no cost', async () => {
  const cookie = await signIn('5004');
  const ids = [];
  for (const name of ['no-cache', 'async-replica', 'everything-large']) ids.push((await (await submit(cookie, wrong(name))).json()).submission_id);
  const a = await reviewed(await review(cookie, ids[0])), b = await reviewed(await review(cookie, ids[1])), c = await reviewed(await review(cookie, ids[2]));
  assert.deepEqual([a.source, b.source], ['interviewer', 'interviewer']);
  assert.deepEqual([c.source, c.reason, c.credits.day.left, c.credits.month.left], ['report', 'no_credits', 0, 1]);
  assert.ok(c.review.headline.startsWith('Over Budget'), 'the report still reviews the design');
  // tomorrow: one left for the month
  const day = (await db().collection('practice_credits').find({ _id: /:d:/ }).toArray()).find((d) => d.used === 2);
  await db().collection('practice_credits').updateOne({ _id: day._id }, { $set: { used: 0 } });
  const d = await reviewed(await review(cookie, ids[2]));
  assert.deepEqual([d.source, d.credits.month.left], ['interviewer', 0]);
});

test('reviews are limited to 5 a minute per account', async () => {
  const cookie = await signIn('5005');
  const s = await (await submit(cookie, problem.reference)).json();
  const codes = [];
  for (let i = 0; i < 6; i += 1) codes.push((await review(cookie, s.submission_id)).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
});

test('an invalid design gets a review too: what to fix first', async () => {
  const cookie = await signIn('5006');
  const s = await (await submit(cookie, problem.template)).json();
  const r = await reviewed(await review(cookie, s.submission_id));
  assert.equal(r.verdict, 'Invalid Design');
  assert.ok(r.review.items.length >= 1);
});

test('deleting the account takes its credits', async () => {
  const cookie = await signIn('5007');
  const s = await (await submit(cookie, wrong('random-32-bit-ids'))).json(); // not reviewed before: not cached, so a credit is used
  await review(cookie, s.submission_id);
  const user = await db().collection('users').findOne({ googleSub: '5007' });
  assert.ok(await db().collection('practice_credits').countDocuments({ user_id: { $in: [user._id, String(user._id)] } }) > 0);
  const del = await call('/v1/me', { method: 'DELETE', cookie });
  assert.ok(del.status < 300, `delete: ${del.status}`);
  assert.equal(await db().collection('practice_credits').countDocuments({ user_id: { $in: [user._id, String(user._id)] } }), 0);
});

// ---- Interview Questions (the canvas): POST /v1/me/submissions/review -------------------------------------------
const iq = JSON.parse(readFileSync(new URL('../../content/articles/interview-questions/url-shortener.json', import.meta.url), 'utf8')).practice;
const canvasReview = (cookie, body, extra = {}) => call('/v1/me/submissions/review', { method: 'POST', cookie, body, ...extra });
const designOf = (w) => ({ nodes: w.nodes, edges: w.edges });

test('canvas: the interviewer reviews a design the server judges itself; credits are shared with Practice', async () => {
  const cookie = await signIn('5101');
  assert.equal((await canvasReview(null, { slug: 'url-shortener', design: designOf(iq.reference) })).status, 401);
  assert.equal((await canvasReview(cookie, { slug: 'no-such-problem', design: designOf(iq.reference) })).status, 404);
  assert.equal((await canvasReview(cookie, { slug: 'url-shortener', design: 'x' })).status, 400);
  const noCache = iq.wrong.find((w) => w.name === 'No cache');
  const r = await canvasReview(cookie, { slug: 'url-shortener', design: designOf(noCache) });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.deepEqual([body.source, body.preview, body.verdict, body.slug], ['interviewer', true, 'Failed', 'url-shortener']);
  assert.ok(body.review.items.length >= 2 && body.review.items[0].kind === 'problem');
  assert.equal(body.credits.month.used, 1);
  // a Practice review afterwards counts against the same month (a design no other test reviews, so not cached)
  const s = await (await submit(cookie, wrong('day-long-cache-no-invalidate'))).json();
  const p = await (await review(cookie, s.submission_id)).json();
  assert.equal(p.credits.month.used, 2);
  // the same canvas design again: cached, free
  const again = await (await canvasReview(cookie, { slug: 'url-shortener', design: designOf(noCache) })).json();
  assert.deepEqual([again.cached, again.credits.month.used], [true, 2]);
  // an accepted design gets a review too
  const ok = await (await canvasReview(cookie, { slug: 'url-shortener', design: designOf(iq.reference) })).json();
  assert.equal(ok.verdict, 'Accepted');
});

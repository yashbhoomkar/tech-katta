// Practice, LeetCode style (src/practice): end to end against the real server, a real MongoDB (mongodb-memory-server)
// and a stand-in for Google's keys. Hidden test data never leaves the server; Submit is judged here, whatever the
// browser says; the rate limit; owner-only submissions; solutions only once solved; the account delete takes them too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { practiceRoutes, lru } from '../src/practice/routes.js';
import { JudgeError } from '../src/auth/judge-pool.js';
import { JUDGE_VERSION } from '../../frontend/src/tkd/judge.js';
const COUNT = JSON.parse(readFileSync(new URL('../../content/problems2/index.json', import.meta.url), 'utf8')).problems.length;

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
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: CLIENT, MONGODB_URI: mongo.getUri(), ACCOUNTS_DB: 'tk_practice', SESSION_SECRET: 'x'.repeat(40), COOKIE_SECURE: '0', GOOGLE_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/certs` } });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  client = await MongoClient.connect(mongo.getUri());
});
test.after(async () => { api?.kill('SIGTERM'); jwks?.close(); await client?.close(); await mongo?.stop(); });

let ipN = 0;
const call = (path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) => fetch(base + path, { method, headers: { 'X-Real-IP': `10.1.${(ipN += 1) >> 8 & 255}.${ipN & 255}`, ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const signIn = async (sub) => { const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken(sub) } }); assert.equal(r.status, 200); return (r.headers.get('set-cookie') || '').split(';')[0]; };
const submit = (cookie, source, extra = {}) => call('/v1/practice/problems/url-shortener/submit', { method: 'POST', cookie, body: { source, ...extra } });
const db = () => client.db('tk_practice');

test('the list and the problem are public; hidden numbers, the reference, wrong designs and the editorial are not', async () => {
  const list = await (await call('/v1/practice/problems', { origin: null })).json();
  assert.equal(list.problems.length, COUNT);
  assert.deepEqual([list.problems[0]].map((p) => [p.id, p.slug, p.difficulty, p.acceptance, 'status' in p]), [[1, 'url-shortener', 'easy', null, false]]);
  assert.deepEqual(list.problems.map((p) => p.id), list.problems.map((_, i) => i + 1));
  const r = await call('/v1/practice/problems/url-shortener', { origin: null });
  assert.equal(r.status, 200);
  const text = await r.text(), p = JSON.parse(text);
  for (const k of ['"reference"', '"wrong"', '"editorial"', 'kill_role']) assert.ok(!text.includes(k), k);
  assert.deepEqual(p.tests.filter((t) => t.hidden).map((t) => Object.keys(t).sort()), [['hidden', 'id', 'title'], ['hidden', 'id', 'title'], ['hidden', 'id', 'title']]);
  assert.equal(p.tests.filter((t) => !t.hidden).length, 2);
  assert.equal(p.template, problem.template);
  assert.equal((await (await fetch(base + '/health')).json()).content.practice, COUNT);
  const missing = await call('/v1/practice/problems/nope');
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: { code: 'not_found', message: "This problem doesn't exist." } });
});

test('Submit needs a session, the site as origin, and a source of at most 8,000 characters', async () => {
  assert.equal((await submit(null, problem.reference)).status, 401);
  const cookie = await signIn('2001');
  assert.equal((await call('/v1/practice/problems/url-shortener/submit', { method: 'POST', cookie, origin: 'https://evil.example', body: { source: 'x' } })).status, 403);
  assert.equal((await submit(cookie, 42)).status, 400);
  assert.equal((await submit(cookie, 'x'.repeat(8001))).status, 400);
});

test('the server judges the source itself: every test, hidden detail stripped, stored with the source', async () => {
  const cookie = await signIn('2002');
  const ok = await (await submit(cookie, problem.reference, { verdict: 'Wrong Answer', cost_inr: 1 })).json();
  assert.equal(ok.verdict, 'Accepted');
  assert.equal(ok.passed, 5); assert.equal(ok.total, 5);
  assert.equal(ok.cost_inr, 69_000);
  assert.equal(ok.rank, null, 'fewer than 20 designs to compare with');
  assert.match(ok.submission_id, /^[0-9a-f]{24}$/);
  // a wrong design that fails a hidden test, with the browser claiming it passed
  const bad = await (await submit(cookie, wrong('no-replica'), { verdict: 'Accepted' })).json();
  assert.equal(bad.verdict, 'Unavailable');
  assert.equal(bad.failed.hidden, true);
  assert.equal(bad.failed.title, 'The database primary fails');
  assert.equal(bad.failed.trace, undefined, 'no trace of a hidden test');
  assert.equal(bad.failed.blame.part, 'db');
  assert.ok(bad.failed.expected && bad.failed.actual);
  const stored = await db().collection('practice_submissions').find({}).sort({ created_at: 1 }).toArray();
  assert.deepEqual(stored.map((s) => [s.verdict, s.cost_inr, s.problem_id, s.judge_version]), [['Accepted', 69_000, 1, JUDGE_VERSION], ['Unavailable', 49_000, 1, JUDGE_VERSION]]);
  assert.equal(stored[0].source, problem.reference);
  assert.deepEqual(await db().collection('practice_stats').findOne({ _id: 1 }), { _id: 1, submitted: 2, accepted: 1 });
  // the list shows this user's status
  const list = await (await call('/v1/practice/problems', { cookie })).json();
  assert.equal(list.problems[0].status, 'solved');
  assert.equal(list.streak, 1, 'an Accepted design today starts a streak');
});

test("a person's submissions: newest first without source; one with its source, only for its owner", async () => {
  const cookie = await signIn('2003'), other = await signIn('2004');
  await submit(cookie, wrong('everything-large'));
  await submit(cookie, wrong('async-replica'));
  const list = await (await call('/v1/practice/problems/url-shortener/submissions', { cookie })).json();
  assert.deepEqual(list.submissions.map((s) => s.verdict), ['Data Lost', 'Over Budget']);
  assert.ok(!('source' in list.submissions[0]));
  const id = list.submissions[0].id;
  const mine = await (await call(`/v1/practice/submissions/${id}`, { cookie })).json();
  assert.equal(mine.source, wrong('async-replica'));
  assert.equal((await call(`/v1/practice/submissions/${id}`, { cookie: other })).status, 404);
  assert.equal((await call(`/v1/practice/submissions/${id}`)).status, 401);
});

test('Submit is limited to 10 a minute per account', async () => {
  const cookie = await signIn('2005');
  const codes = [];
  for (let i = 0; i < 11; i += 1) codes.push((await submit(cookie, problem.template)).status);
  assert.deepEqual(codes, [...Array(10).fill(200), 429]);
  const r = await submit(cookie, problem.template);
  assert.deepEqual(await r.json(), { error: { code: 'too_many_submissions', message: 'Too many submissions. Wait a minute.' } });
  const invalid = await db().collection('practice_submissions').findOne({ verdict: 'Invalid Design' });
  assert.ok(invalid, 'an invalid design is a submission too');
});

test('editorial for the signed in; solutions only once solved; sharing one\'s own Accepted design; one design, one row', async () => {
  const a = await signIn('2006'), b = await signIn('2007');
  assert.equal((await call('/v1/practice/problems/url-shortener/editorial')).status, 401);
  const ed = await (await call('/v1/practice/problems/url-shortener/editorial', { cookie: a })).json();
  assert.equal(ed.reference, problem.reference);
  assert.match(ed.editorial, /## The approach/);
  const locked = await call('/v1/practice/problems/url-shortener/solutions', { cookie: a });
  assert.equal(locked.status, 403);
  assert.equal((await locked.json()).error.message, 'Solve this problem to see how others did it.');
  const sa = await (await submit(a, problem.reference)).json();
  const sb = await (await submit(b, `# my own words\n${problem.reference.replace(/ {2,}/g, ' ')}`)).json();
  const failed = await (await submit(b, wrong('no-replica'))).json();
  assert.equal((await call(`/v1/practice/submissions/${failed.submission_id}/share`, { method: 'POST', cookie: b, body: { note: 'x' } })).status, 404, 'only Accepted designs are shared');
  assert.equal((await call(`/v1/practice/submissions/${sa.submission_id}/share`, { method: 'POST', cookie: b, body: { note: 'x' } })).status, 404, "not someone else's");
  assert.equal((await call(`/v1/practice/submissions/${sa.submission_id}/share`, { method: 'POST', cookie: a, body: { note: 'x'.repeat(281) } })).status, 400);
  for (const [c, s] of [[a, sa], [b, sb]]) assert.equal((await call(`/v1/practice/submissions/${s.submission_id}/share`, { method: 'POST', cookie: c, body: { note: ' Cache in front. ' } })).status, 200);
  const sol = await (await call('/v1/practice/problems/url-shortener/solutions', { cookie: a })).json();
  assert.equal(sol.solutions.length, 1, 'the same design with other whitespace and comments is one design');
  assert.equal(sol.solutions[0].count, 2);
  assert.equal(sol.solutions[0].note, 'Cache in front.');
});

test('deleting an account deletes its practice submissions', async () => {
  const cookie = await signIn('2008');
  await submit(cookie, problem.reference);
  const user = await db().collection('users').findOne({ googleSub: '2008' });
  assert.equal(await db().collection('practice_submissions').countDocuments({ user_id: user._id }), 1);
  assert.equal((await call('/v1/me', { method: 'DELETE', cookie })).status, 200);
  assert.equal(await db().collection('practice_submissions').countDocuments({ user_id: user._id }), 0);
});

// in process, with stand-ins: what happens when the engine fails or times out
const request = (body) => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), { method: 'POST', url: '/v1/practice/problems/url-shortener/submit', headers: { origin: ORIGIN, cookie: 'tk_session=x', 'content-type': 'application/json' }, socket: {} });
const response = () => { const r = { status: 0, body: null }; r.writeHead = (s) => { r.status = s; }; r.end = (b) => { r.body = b ? JSON.parse(b) : null; r.done(); }; r.sent = new Promise((res) => { r.done = res; }); return r; };

test('a timeout inside the judge is a Judge Error: answered with 200, not stored, logged without the person', async () => {
  const added = [], logged = [];
  const handle = practiceRoutes({ problems: () => [problem], enabled: true, allowedOrigin: ORIGIN, accounts: { userFor: async () => ({ id: 'u-secret' }) }, store: { add: async (d) => { added.push(d); return 'x'; } },
    judge: async () => { throw new JudgeError('judge_timeout'); }, log: { error: (...a) => logged.push(a.join(' ')) } });
  const res = response();
  handle(request({ source: problem.reference }), res, '/v1/practice/problems/url-shortener/submit');
  await res.sent;
  assert.equal(res.status, 200);
  assert.equal(res.body.verdict, 'Judge Error');
  assert.equal(res.body.message, 'The judge had a problem with this design. It has been reported; try again later.');
  assert.equal(added.length, 0);
  assert.equal(logged.length, 1);
  assert.ok(!logged[0].includes('u-secret') && !logged[0].includes('lb()'), 'no person and no source in the log');
});

test('the result cache keeps the newest 5,000 and forgets the oldest', () => {
  const c = lru(2); c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3);
  assert.equal(c.get('b'), undefined); assert.equal(c.get('a'), 1); assert.equal(c.size, 2);
});

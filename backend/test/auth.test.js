// Sign-in with Google and accounts, end to end against a real MongoDB (mongodb-memory-server) and a
// stand-in for Google's key endpoint: tokens are signed here with a key the API is told to trust.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { googleVerifier } from '../src/auth/google.js';

const ORIGIN = 'http://localhost:5410', CLIENT = 'test-client.apps.googleusercontent.com';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = () => Math.floor(Date.now() / 1000);
function idToken(claims = {}, { key = privateKey, kid = 'k1', alg = 'RS256' } = {}) {
  const head = b64({ alg, kid, typ: 'JWT' });
  const body = b64({ iss: 'https://accounts.google.com', aud: CLIENT, sub: '1001', email: 'asha@example.com', email_verified: true, name: 'Asha', picture: 'https://example.com/a.png', iat: now(), exp: now() + 3600, ...claims });
  return `${head}.${body}.${sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
}

async function freePort() { const s = createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening'); const p = s.address().port; await new Promise((r) => s.close(r)); return p; }

let mongo, jwks, api, base, client;
test.before(async () => {
  mongo = await MongoMemoryServer.create();
  jwks = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' }); res.end(JSON.stringify({ keys: [jwk] })); });
  jwks.listen(0, '127.0.0.1'); await once(jwks, 'listening');
  const port = await freePort();
  api = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: CLIENT, MONGODB_URI: mongo.getUri(), ACCOUNTS_DB: 'tk_test', MONGODB_DB: 'old_backend_db', ADMIN_EMAILS: 'ops@example.com', SESSION_SECRET: 'x'.repeat(40), COOKIE_SECURE: '0', GOOGLE_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/certs` } });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  client = await MongoClient.connect(mongo.getUri());
});
test.after(async () => { api?.kill('SIGTERM'); jwks?.close(); await client?.close(); await mongo?.stop(); });

// each request from its own made-up IP, so the per-IP sign-in limit (30 per 10 min) isn't what a test hits
let ipN = 0;
const call = (path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) => fetch(base + path, { method, headers: { 'CF-Connecting-IP': `10.0.${(ipN += 1) >> 8 & 255}.${ipN & 255}`, ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const signIn = async (claims) => { const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken(claims) } }); return { r, cookie: (r.headers.get('set-cookie') || '').split(';')[0] }; };

test('config says sign-in is on and gives the public client ID; health says auth is on', async () => {
  assert.deepEqual(await (await call('/v1/auth/config')).json(), { enabled: true, clientId: CLIENT });
  assert.equal((await (await fetch(base + '/health')).json()).auth, 'on');
  // the database check runs in the background; the next look says whether MongoDB answered
  let h; for (let i = 0; i < 50 && (h = (await (await fetch(base + '/health')).json()).accounts) === 'checking'; i += 1) await new Promise((r) => setTimeout(r, 50));
  assert.equal(h, 'ok');
});

test('a valid Google token signs in: HttpOnly SameSite cookie, user stored, session stored as a hash', async () => {
  const { r, cookie } = await signIn();
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { user: { name: 'Asha', email: 'asha@example.com', picture: 'https://example.com/a.png', adsConsent: false } });
  const set = r.headers.get('set-cookie');
  assert.match(set, /tk_session=[\w-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000/);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
  assert.deepEqual(await (await call('/v1/me', { cookie })).json(), { user: { name: 'Asha', email: 'asha@example.com', picture: 'https://example.com/a.png', adsConsent: false } });
  const db = client.db('tk_test');
  assert.equal(await db.collection('users').countDocuments({ googleSub: '1001' }), 1);
  const s = await db.collection('sessions').findOne({});
  assert.match(s.tokenHash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(s).includes(cookie.split('=')[1]), 'the raw token is not stored');
});

test('bad tokens are refused: wrong audience, issuer, key, signature, algorithm, expired, unverified email, garbage', async () => {
  const bad = [
    idToken({ aud: 'someone-else' }), idToken({ iss: 'https://evil.example' }), idToken({ exp: now() - 3600 }), idToken({ email_verified: false }),
    idToken({}, { key: other.privateKey }), idToken({}, { kid: 'nope' }), idToken({}, { alg: 'HS256' }), 'a.b.c', 'x'.repeat(5000),
  ];
  for (const credential of bad) {
    const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential } });
    assert.equal(r.status, 401, credential.slice(0, 30));
    assert.equal(r.headers.get('set-cookie'), null);
  }
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true } })).status, 401);
});

test('requests that change things must come from the site; others get no CORS', async () => {
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken() }, origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken() }, origin: null })).status, 403);
  const r = await call('/v1/me', { origin: 'https://evil.example' });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  const pre = await fetch(base + '/v1/me/lab', { method: 'OPTIONS', headers: { Origin: ORIGIN } });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
});

test('Lab data syncs and merges: newest design wins, deletions stick, best stars kept, junk dropped', async () => {
  const { cookie } = await signIn({ sub: '2002', email: 'ravi@example.com', name: 'Ravi' });
  const D = (id, updated, name) => ({ id, name, updated, nodes: [{ id: 'c', type: 'client', x: 0, y: 0, config: {} }], edges: [] });
  let r = await call('/v1/me/lab', { method: 'POST', cookie, body: { designs: [D('a', 10, 'A1'), D('b', 10, 'B1')], progress: { stars: { 'one-server': 2, 'not-a-challenge': 3 }, goals: { 'one-server': [true, false, true] }, steps: { 'tour:lab': true, 'evil.$key': true } } } });
  assert.equal(r.status, 200);
  let m = await r.json();
  assert.deepEqual(m.progress, { steps: { 'tour:lab': true }, stars: { 'one-server': 2 }, goals: { 'one-server': [true, false, true] } });
  r = await call('/v1/me/lab', { method: 'POST', cookie, body: { designs: [D('a', 5, 'A-old')], deleted: [{ id: 'b', at: 20 }], progress: { stars: { 'one-server': 1 } } } });
  m = await r.json();
  assert.deepEqual(m.designs.map((d) => `${d.id}:${d.name}`), ['a:A1'], 'older copy of a ignored, b deleted');
  assert.equal(m.progress.stars['one-server'], 2, 'a worse result does not lower stars');
  const again = await (await call('/v1/me/lab', { cookie })).json();
  assert.deepEqual(again.designs.map((d) => d.id), ['a']);
  assert.equal((await call('/v1/me/lab', { method: 'POST', cookie, body: { designs: 'x'.repeat(3 * 1024 * 1024) } })).status, 413);
  assert.equal((await fetch(base + '/v1/me/lab', { method: 'POST', headers: { Origin: ORIGIN, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{nope' })).status, 400);
});

test('signed out: no user, 401 for Lab data; sign-out ends the session; deleting the account removes everything', async () => {
  assert.deepEqual(await (await call('/v1/me')).json(), { user: null }, 'signed out is not an error');
  assert.equal((await call('/v1/me/lab')).status, 401);
  assert.deepEqual(await (await call('/v1/me', { cookie: 'tk_session=forged-token-forged-token-forged' })).json(), { user: null });
  assert.equal((await call('/v1/me/lab', { cookie: 'tk_session=forged-token-forged-token-forged' })).status, 401);
  const a = await signIn({ sub: '3003' });
  assert.equal((await call('/v1/auth/signout', { method: 'POST', cookie: a.cookie })).status, 200);
  assert.deepEqual(await (await call('/v1/me', { cookie: a.cookie })).json(), { user: null });
  const b = await signIn({ sub: '3003' });
  await call('/v1/me/lab', { method: 'POST', cookie: b.cookie, body: { designs: [] } });
  const db = client.db('tk_test'), user = await db.collection('users').findOne({ googleSub: '3003' });
  const del = await call('/v1/me', { method: 'DELETE', cookie: b.cookie });
  assert.equal(del.status, 200);
  assert.match(del.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(await db.collection('users').countDocuments({ googleSub: '3003' }), 0);
  assert.equal(await db.collection('sessions').countDocuments({ userId: user._id }), 0);
  assert.equal(await db.collection('lab').countDocuments({ userId: user._id }), 0);
});

test('Google key handling: cached per Cache-Control, an unknown kid refreshes at most once a minute', async () => {
  let fetches = 0, t = 1_000_000_000_000;
  const fetchImpl = async () => { fetches += 1; return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=100' } }); };
  const verify = googleVerifier({ clientId: CLIENT, fetchImpl, now: () => t });
  const tok = (kid) => idToken({ iat: t / 1000, exp: t / 1000 + 3600 }, { kid });
  await verify(tok('k1')); await verify(tok('k1'));
  assert.equal(fetches, 1, 'cached');
  await assert.rejects(verify(tok('k9')), /unknown_key/);
  assert.equal(fetches, 1, 'keys fetched under a minute ago are not refetched for an unknown kid');
  t += 61_000; await assert.rejects(verify(tok('k9')), /unknown_key/); await assert.rejects(verify(tok('k9')), /unknown_key/);
  assert.equal(fetches, 2, 'one refresh for unknown keys a minute later, not one per request');
  t += 101_000; await verify(tok('k1'));
  assert.equal(fetches, 3, 'refetched after max-age');
});

test('errorKind names a MongoDB failure without its message', async () => {
  const { errorKind } = await import('../src/auth/accounts.js');
  const { MongoClient } = await import('mongodb');
  const c = new MongoClient('mongodb://user:secret-pw@127.0.0.1:1/?directConnection=true', { serverSelectionTimeoutMS: 300 });
  const e = await c.db('x').command({ ping: 1 }).catch((x) => x); await c.close();
  const k = errorKind(e);
  assert.match(k, /^MongoServerSelectionError/);
  assert.ok(!k.includes('secret') && !k.includes('127.0.0.1'), k);
  assert.equal(errorKind(Object.assign(new Error('bad auth: x'), { name: 'MongoServerError', codeName: 'AuthenticationFailed' })), 'AuthenticationFailed');
  assert.equal(errorKind({ name: 'has spaces <b>' }), 'Error');
});

test('signing in again in the same browser ends its old session', async () => {
  const a = await signIn({ sub: '4004' });
  const r = await call('/v1/auth/google', { method: 'POST', cookie: a.cookie, body: { termsAccepted: true, credential: idToken({ sub: '4004' }) } });
  assert.equal(r.status, 200);
  const fresh = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.deepEqual(await (await call('/v1/me', { cookie: a.cookie })).json(), { user: null }, 'old session gone');
  assert.equal((await (await call('/v1/me', { cookie: fresh })).json()).user.name, 'Asha');
  const user = await client.db('tk_test').collection('users').findOne({ googleSub: '4004' });
  assert.equal(await client.db('tk_test').collection('sessions').countDocuments({ userId: user._id }), 1);
  assert.equal(await client.db('old_backend_db').collection('users').countDocuments({}), 0, 'MONGODB_DB (the old backend\'s setting) is ignored');
});

test('sign out on all devices ends every session of the account, not other accounts', async () => {
  const phone = await signIn({ sub: '5005' }), laptop = await signIn({ sub: '5005' }), someoneElse = await signIn({ sub: '5006' });
  assert.equal((await call('/v1/auth/signout-all', { method: 'POST', cookie: phone.cookie, origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/v1/auth/signout-all', { method: 'POST' })).status, 401, 'signed out');
  const r = await call('/v1/auth/signout-all', { method: 'POST', cookie: phone.cookie });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).ended, 2);
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  for (const c of [phone, laptop]) assert.deepEqual(await (await call('/v1/me', { cookie: c.cookie })).json(), { user: null });
  assert.equal((await (await call('/v1/me', { cookie: someoneElse.cookie })).json()).user.name, 'Asha');
});

test('a session in use is renewed to 30 days from now, never past 90 days after sign-in', async () => {
  const DAY = 86_400_000, sessions = client.db('tk_test').collection('sessions');
  const a = await signIn({ sub: '6006' });
  const user = await client.db('tk_test').collection('users').findOne({ googleSub: '6006' });
  // fresh session: no renewal, no new cookie
  let r = await call('/v1/me', { cookie: a.cookie });
  assert.equal(r.headers.get('set-cookie'), null);
  // last renewed 20 days ago (10 left): renewed to ~30 days, cookie extended
  await sessions.updateOne({ userId: user._id }, { $set: { createdAt: new Date(Date.now() - 20 * DAY), expiresAt: new Date(Date.now() + 10 * DAY) } });
  r = await call('/v1/me', { cookie: a.cookie });
  assert.match(r.headers.get('set-cookie'), /tk_session=.+Max-Age=259\d{4}/);
  let s = await sessions.findOne({ userId: user._id });
  assert.ok(Math.abs(s.expiresAt - (Date.now() + 30 * DAY)) < 60_000);
  // signed in 85 days ago: capped at 90 days after sign-in
  await sessions.updateOne({ userId: user._id }, { $set: { createdAt: new Date(Date.now() - 85 * DAY), expiresAt: new Date(Date.now() + 2 * DAY) } });
  await call('/v1/me', { cookie: a.cookie });
  s = await sessions.findOne({ userId: user._id });
  assert.ok(Math.abs(s.expiresAt - (Date.now() + 5 * DAY)) < 60_000);
  // expired: signed out
  await sessions.updateOne({ userId: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.deepEqual(await (await call('/v1/me', { cookie: a.cookie })).json(), { user: null });
});

test('usage events: allowlisted events and fields stored, signed-in ones tied to the account, deleted with it', async () => {
  const { cleanBatch, MAX_BATCH } = await import('../src/auth/events.js');
  const events = client.db('tk_test').collection('events');
  const visitor = 'v'.repeat(20);
  const batch = { visitor, device: 'phone', events: [
    { name: 'page_view', age: 2000, page: '/dashboard/#concepts/api-types', props: { section: 'concepts', slug: 'api-types', ref: 'google.com', extra: 'dropped' } },
    { name: 'score', props: { challenge: 'ind-vs-pak', stars: 3, max: 3, passed: '111', lite: true } },
    { name: 'not_an_event', props: { x: 1 } },
    { name: 'component_add', props: { type: '<script>' } },
  ] };
  // signed out, from another site, bad visitor id
  assert.equal((await call('/v1/events', { method: 'POST', body: batch, origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/v1/events', { method: 'POST', body: { ...batch, visitor: 'short' } })).status, 204);
  assert.equal(await events.countDocuments({}), 0, 'bad visitor id stores nothing');
  assert.equal((await call('/v1/events', { method: 'POST', body: batch })).status, 204);
  const stored = await events.find({ visitor }).sort({ name: 1 }).toArray();
  assert.deepEqual(stored.map((e) => e.name), ['component_add', 'page_view', 'score'], 'unknown event dropped');
  const pv = stored.find((e) => e.name === 'page_view');
  assert.deepEqual(pv.props, { section: 'concepts', slug: 'api-types', ref: 'google.com' }, 'unknown field dropped');
  assert.equal(pv.device, 'phone'); assert.equal(pv.page, '/dashboard/#concepts/api-types'); assert.equal(pv.userId, undefined);
  assert.ok(Date.now() - pv.at.getTime() >= 1500, 'age moves the time back');
  assert.deepEqual(stored.find((e) => e.name === 'component_add').props, {}, 'unsafe text dropped');
  // signed in: tied to the account; deleting the account deletes those events
  const a = await signIn({ sub: '7007' });
  const user = await client.db('tk_test').collection('users').findOne({ googleSub: '7007' });
  await call('/v1/events', { method: 'POST', cookie: a.cookie, body: { visitor, events: [{ name: 'lab_open', props: { embedded: false, challenge: '' } }] } });
  assert.equal(await events.countDocuments({ userId: user._id, name: 'lab_open' }), 1);
  await call('/v1/me', { method: 'DELETE', cookie: a.cookie });
  assert.equal(await events.countDocuments({ userId: user._id }), 0);
  assert.equal(await events.countDocuments({ visitor }), 3, 'signed-out events stay (not tied to anyone)');
  // TTL index: 13 months
  const ttl = (await events.indexes()).find((i) => i.key.at === 1 && i.expireAfterSeconds);
  assert.equal(ttl.expireAfterSeconds, 395 * 86_400);
  // batch cap, time clamp
  assert.equal(cleanBatch({ visitor, events: Array(80).fill({ name: 'sign_in' }) }).length, MAX_BATCH);
  const [old] = cleanBatch({ visitor, events: [{ name: 'sign_in', age: 1e12 }] }, { now: 1e13 });
  assert.equal(old.at.getTime(), 1e13 - 15 * 60_000);
});

test('sign-in needs the Terms ticked (recorded on the account); the ads opt-in is only the menu switch; names and country stored', async () => {
  const users = client.db('tk_test').collection('users');
  const post = (body, extra = {}) => fetch(base + '/v1/auth/google', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
  // box not ticked: refused, nothing stored
  for (const body of [{ credential: idToken({ sub: '8008' }) }, { credential: idToken({ sub: '8008' }), termsAccepted: 'yes' }]) {
    const r = await post(body);
    assert.equal(r.status, 400); assert.equal((await r.json()).error, 'terms_required'); assert.equal(r.headers.get('set-cookie'), null);
  }
  assert.equal(await users.countDocuments({ googleSub: '8008' }), 0);
  // ticked; an old client still sending adsConsent:true does not opt in
  let r = await post({ termsAccepted: true, adsConsent: true, credential: idToken({ sub: '8008', given_name: 'Asha', family_name: 'Rao' }) }, { 'CF-IPCountry': 'IN' });
  assert.equal(r.status, 200);
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  assert.equal((await r.json()).user.adsConsent, false);
  let u = await users.findOne({ googleSub: '8008' });
  assert.deepEqual([u.firstName, u.lastName, u.country, u.lastCountry, u.adsConsent], ['Asha', 'Rao', 'IN', 'IN', undefined]);
  assert.ok(u.terms.at instanceof Date); assert.equal(u.terms.version, '2026-11-05');
  await post({ termsAccepted: true, credential: idToken({ sub: '8008' }) }, { 'CF-IPCountry': 'XX' });
  u = await users.findOne({ googleSub: '8008' });
  assert.equal(u.country, 'IN'); assert.equal(u.lastCountry, 'IN', 'bogus country ignored');
  // the menu switch
  assert.equal((await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: 'no' } })).status, 400);
  assert.equal((await call('/v1/me/consent', { method: 'POST', body: { ads: true } })).status, 401);
  assert.equal((await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: true }, origin: 'https://evil.example' })).status, 403);
  r = await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: true } });
  assert.equal((await r.json()).user.adsConsent, true);
  u = await users.findOne({ googleSub: '8008' });
  assert.equal(u.adsConsent.ads, true); assert.equal(u.adsConsent.version, '2026-11-05');
  // signing in again keeps the choice
  await post({ termsAccepted: true, credential: idToken({ sub: '8008' }) });
  assert.equal((await users.findOne({ googleSub: '8008' })).adsConsent.ads, true);
  r = await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: false } });
  assert.equal((await r.json()).user.adsConsent, false);
});

test('Meta audience export: consented accounts only, normalised and SHA-256 hashed', async () => {
  const { audienceCsv, norm } = await import('../src/auth/audience.js');
  const { createHash } = await import('node:crypto');
  const h = (v) => createHash('sha256').update(v).digest('hex');
  assert.equal(norm.email('  Asha.Rao@Example.COM '), 'asha.rao@example.com');
  assert.equal(norm.name(" D'Souza-Pai "), 'dsouzapai');
  assert.equal(norm.country('IN'), 'in'); assert.equal(norm.country('India'), '');
  const csv = audienceCsv([{ email: 'Asha@Example.com', firstName: 'Asha', lastName: 'Rao', country: 'IN' }, { email: '', firstName: 'x' }, { email: 'b@example.com', lastCountry: 'AE' }]);
  const lines = csv.trim().split('\n');
  assert.equal(lines[0], 'email,fn,ln,country');
  assert.equal(lines[1], [h('asha@example.com'), h('asha'), h('rao'), h('in')].join(','));
  assert.equal(lines[2], [h('b@example.com'), '', '', h('ae')].join(','));
  assert.equal(lines.length, 3, 'row without email skipped');
  assert.ok(!csv.includes('@'), 'no readable email');
});

test('Lab saves from many devices at the same moment all land (no lost updates); old docs without rev still save', async () => {
  const D = (id, updated, name) => ({ id, name, updated, nodes: [{ id: 'c', type: 'client', x: 0, y: 0, config: {} }], edges: [] });
  const a = await signIn({ sub: '9201' });
  const user = await client.db('tk_test').collection('users').findOne({ googleSub: '9201' });
  const lab = client.db('tk_test').collection('lab');
  // ten devices, each with its own design, saving at once (the first save also creates the doc)
  const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => call('/v1/me/lab', { method: 'POST', cookie: a.cookie, body: { designs: [D(`d${i}`, 100 + i, `Design ${i}`)] } })));
  assert.deepEqual(rs.map((r) => r.status), Array(10).fill(200));
  const doc = await lab.findOne({ userId: user._id });
  assert.deepEqual(doc.designs.map((d) => d.id).sort(), Array.from({ length: 10 }, (_, i) => `d${i}`).sort(), 'every device\'s design kept');
  assert.equal(doc.rev, 10);
  // a lab document saved before rev existed
  await lab.updateOne({ userId: user._id }, { $unset: { rev: '' } });
  assert.equal((await call('/v1/me/lab', { method: 'POST', cookie: a.cookie, body: { designs: [D('late', 500, 'Late')] } })).status, 200);
  const after = await lab.findOne({ userId: user._id });
  assert.equal(after.rev, 1); assert.equal(after.designs.length, 11);
});

test('first sign-in from two tabs at once makes one account; consent changes are logged; delete leaves no account behind', async () => {
  const users = client.db('tk_test').collection('users');
  const rs = await Promise.all([signIn({ sub: '9301' }), signIn({ sub: '9301' }), signIn({ sub: '9301' })]);
  assert.deepEqual(rs.map((x) => x.r.status), [200, 200, 200]);
  assert.equal(await users.countDocuments({ googleSub: '9301' }), 1);
  const r = await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken({ sub: '9301' }) } });
  const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
  await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: true } });
  await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: false } });
  await call('/v1/me/consent', { method: 'POST', cookie, body: { ads: true } });
  const u = await users.findOne({ googleSub: '9301' });
  assert.deepEqual(u.adsConsentLog.map((c) => c.ads), [true, false, true], 'every change kept, in order');
  assert.ok(u.adsConsentLog.every((c) => c.at instanceof Date && c.version));
  await call('/v1/me', { method: 'DELETE', cookie });
  assert.equal(await users.countDocuments({ googleSub: '9301' }), 0);
  assert.equal(await client.db('tk_test').collection('sessions').countDocuments({ userId: u._id }), 0);
});

test('health reports storage; usage events pause over the limit while accounts keep working', async () => {
  const { openAccounts } = await import('../src/auth/accounts.js');
  const acc = openAccounts({ uri: mongo.getUri(), dbName: 'tk_limit', secret: 'x'.repeat(40), eventsMaxMB: -1 });
  assert.equal(await acc.warmUp(), true);
  acc.health(); for (let i = 0; i < 50 && !acc.storage(); i += 1) await new Promise((r) => setTimeout(r, 20));
  assert.equal(typeof acc.storage().mb, 'number'); assert.equal(acc.storage().eventsPaused, true);
  const doc = { name: 'sign_in', at: new Date(), visitor: 'v'.repeat(20), device: 'phone', page: '/', props: {} };
  assert.equal(await acc.logEvents([doc]), false);
  assert.equal(await client.db('tk_limit').collection('events').countDocuments(), 0, 'nothing written while paused');
  const { token } = await acc.signIn({ sub: '9401', email: 'z@example.com', name: 'Z', picture: '' });
  assert.equal((await acc.userFor(token)).user.name, 'Z', 'sign-in still works');
  await acc.close();
  const ok = openAccounts({ uri: mongo.getUri(), dbName: 'tk_limit2', secret: 'x'.repeat(40) });
  assert.equal(await ok.logEvents([doc]), true); await ok.close();
  const h = await (await fetch(base + '/health')).json();
  assert.equal(typeof h.storage?.mb, 'number'); assert.equal(h.storage.eventsPaused, false);
});

test('sign-in is limited to 30 tries per IP per 10 minutes', async () => {
  const one = () => fetch(base + '/v1/auth/google', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.9' }, body: JSON.stringify({ termsAccepted: true, credential: 'a.b.c' }) });
  const codes = []; for (let i = 0; i < 31; i += 1) codes.push((await one()).status);
  assert.deepEqual(codes.slice(0, 30), Array(30).fill(401)); assert.equal(codes[30], 429);
});

test('admin analytics: 401 signed out, 403 for non-admins, summary and Meta CSV for admins; readable from analytics.katta.cc', async () => {
  const db = client.db('tk_test'), users = db.collection('users'), events = db.collection('events');
  const ANALYTICS = 'https://analytics.katta.cc';
  const get = (path, cookie, origin = ANALYTICS) => fetch(base + path, { headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
  assert.equal((await get('/v1/admin/summary')).status, 401);
  const plain = await signIn({ sub: '9501' });
  assert.equal((await get('/v1/admin/summary', plain.cookie)).status, 403);
  assert.equal((await get('/v1/admin/audience.csv', plain.cookie)).status, 403);
  const owner = await signIn({ sub: '9502', email: 'owner@example.com', given_name: 'Owner', family_name: 'K' });
  await users.updateOne({ googleSub: '9502' }, { $set: { role: 'admin', country: 'IN' } });
  assert.equal((await (await call('/v1/me', { cookie: owner.cookie })).json()).user.admin, true);
  // a known little story, two visitors, inside the range; one old event outside it
  await events.deleteMany({});
  const at = (minsAgo) => new Date(Date.now() - minsAgo * 60_000);
  const v1 = 'a'.repeat(20), v2 = 'b'.repeat(20);
  await events.insertMany([
    { name: 'page_view', at: at(30), visitor: v1, device: 'phone', page: '/', props: { section: 'landing', slug: '', ref: 'instagram.com' } },
    { name: 'lab_locked', at: at(29), visitor: v1, device: 'phone', page: '/', props: { lite: true } },
    { name: 'sign_in', at: at(28), visitor: v1, device: 'phone', page: '/', props: { ads: false } },
    { name: 'score', at: at(27), visitor: v1, device: 'phone', page: '/', props: { challenge: 'ind-vs-pak', stars: 2, max: 3, passed: '110', lite: true } },
    { name: 'score', at: at(26), visitor: v1, device: 'phone', page: '/', props: { challenge: 'ind-vs-pak', stars: 3, max: 3, passed: '111', lite: true } },
    { name: 'page_view', at: at(20), visitor: v2, device: 'desktop', page: '/', props: { section: 'landing', slug: '', ref: '' } },
    { name: 'lab_locked', at: at(19), visitor: v2, device: 'desktop', page: '/', props: { lite: false } },
    { name: 'article_open', at: at(10), visitor: v2, device: 'desktop', page: '/dashboard/#concepts/api-types', props: { section: 'concepts', slug: 'api-types' } },
    { name: 'article_close', at: at(5), visitor: v2, device: 'desktop', page: '/dashboard/#concepts/api-types', props: { section: 'concepts', slug: 'api-types', pct: 80, seconds: 120 } },
    { name: 'component_add', at: at(4), visitor: v2, device: 'desktop', page: '/dashboard/#lab', props: { type: 'cache' } },
    { name: 'page_view', at: at(60 * 24 * 10), visitor: 'c'.repeat(20), device: 'phone', page: '/', props: { section: 'landing', slug: '', ref: '' } },
  ]);
  const r = await get('/v1/admin/summary?days=7', owner.cookie);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), ANALYTICS);
  assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const s = await r.json();
  assert.equal(s.days, 7);
  assert.deepEqual(s.totals, { events: 10, visitors: 2, users: 0 });
  assert.deepEqual(s.devices.map((d) => `${d.device}:${d.visitors}`).sort(), ['desktop:1', 'phone:1']);
  assert.deepEqual(s.funnel.map((x) => x.visitors), [2, 2, 1, 1]);
  assert.deepEqual(s.referrers, [{ ref: 'instagram.com', views: 1, visitors: 1 }]);
  assert.deepEqual(s.articles, [{ section: 'concepts', slug: 'api-types', opens: 1, finishes: 0, pct: 80, seconds: 120 }]);
  assert.deepEqual(s.lab.components, [{ type: 'cache', n: 1 }]);
  const sc = s.lab.scores[0];
  assert.deepEqual([sc.challenge, sc.attempts, sc.visitors, sc.stars, sc.best, sc.max, sc.lite, sc.checkPass], ['ind-vs-pak', 2, 1, 2.5, 3, 3, 2, [100, 100, 50]]);
  assert.equal(s.daily.reduce((a, d) => a + d.views, 0), 2);
  assert.ok(s.accounts.total >= 2); assert.ok(s.accounts.recent.some((u) => u.email === 'owner@example.com' && u.country === 'IN'));
  assert.ok(!JSON.stringify(s).includes('googleSub') && !JSON.stringify(s).includes('tokenHash'), 'no ids or hashes');
  // range is clamped, other sites can't read it
  assert.equal((await (await get('/v1/admin/summary?days=99999', owner.cookie)).json()).days, 395);
  assert.equal((await get('/v1/admin/summary', owner.cookie, 'https://evil.example')).headers.get('access-control-allow-origin'), null);
  // the Meta file: consented accounts only, hashed
  await call('/v1/me/consent', { method: 'POST', cookie: owner.cookie, body: { ads: true } });
  const csv = await get('/v1/admin/audience.csv', owner.cookie);
  assert.equal(csv.status, 200); assert.match(csv.headers.get('content-type'), /text\/csv/); assert.match(csv.headers.get('content-disposition'), /attachment/);
  const lines = (await csv.text()).trim().split('\n');
  assert.equal(lines[0], 'email,fn,ln,country'); assert.ok(lines.length >= 2); assert.ok(!lines.join('').includes('@'));
  assert.equal((await fetch(base + '/v1/admin/summary', { method: 'POST', headers: { Origin: ORIGIN, Cookie: owner.cookie } })).status, 405);
});

test('admins: a verified email whose hash is listed, ADMIN_EMAILS, or role', async () => {
  const { isAdmin, ADMIN_EMAIL_SHA256 } = await import('../src/auth/accounts.js');
  const { createHash } = await import('node:crypto');
  const h = (v) => createHash('sha256').update(v).digest('hex');
  assert.equal(ADMIN_EMAIL_SHA256.size, 1, 'one owner hash in the code (the owner address itself is not in the repo)');
  ADMIN_EMAIL_SHA256.add(h('owner.test@example.com'));
  assert.equal(isAdmin({ email: ' Owner.Test@Example.com ' }, ''), true, 'case and spaces');
  assert.equal(isAdmin({ email: 'someone@example.com' }, ''), false);
  assert.equal(isAdmin({ email: 'ops@example.com' }, 'x@example.com, OPS@example.com'), true);
  assert.equal(isAdmin({ email: 'someone@example.com', role: 'admin' }, ''), true);
  assert.equal(isAdmin({}, ''), false);
  ADMIN_EMAIL_SHA256.delete(h('owner.test@example.com'));
  // through the API (the test server runs with ADMIN_EMAILS=ops@example.com)
  const o = await signIn({ sub: '9601', email: 'ops@example.com' });
  assert.equal((await (await call('/v1/me', { cookie: o.cookie })).json()).user.admin, true);
  assert.equal((await fetch(base + '/v1/admin/summary', { headers: { Cookie: o.cookie } })).status, 200);
  // an unverified email never signs in at all (google.js), so it can't claim an admin address
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { termsAccepted: true, credential: idToken({ sub: '9602', email: 'ops@example.com', email_verified: false }) } })).status, 401);
});

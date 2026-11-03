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
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), FRONTEND_ORIGIN: ORIGIN, GOOGLE_CLIENT_ID: CLIENT, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'tk_test', SESSION_SECRET: 'x'.repeat(40), COOKIE_SECURE: '0', GOOGLE_JWKS_URL: `http://127.0.0.1:${jwks.address().port}/certs` } });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  client = await MongoClient.connect(mongo.getUri());
});
test.after(async () => { api?.kill('SIGTERM'); jwks?.close(); await client?.close(); await mongo?.stop(); });

const call = (path, { method = 'GET', body, cookie, origin = ORIGIN } = {}) => fetch(base + path, { method, headers: { ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
const signIn = async (claims) => { const r = await call('/v1/auth/google', { method: 'POST', body: { credential: idToken(claims) } }); return { r, cookie: (r.headers.get('set-cookie') || '').split(';')[0] }; };

test('config says sign-in is on and gives the public client ID; health says auth is on', async () => {
  assert.deepEqual(await (await call('/v1/auth/config')).json(), { enabled: true, clientId: CLIENT });
  assert.equal((await (await fetch(base + '/health')).json()).auth, 'on');
});

test('a valid Google token signs in: HttpOnly SameSite cookie, user stored, session stored as a hash', async () => {
  const { r, cookie } = await signIn();
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { user: { name: 'Asha', email: 'asha@example.com', picture: 'https://example.com/a.png' } });
  const set = r.headers.get('set-cookie');
  assert.match(set, /tk_session=[\w-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000/);
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(r.headers.get('access-control-allow-credentials'), 'true');
  assert.deepEqual(await (await call('/v1/me', { cookie })).json(), { user: { name: 'Asha', email: 'asha@example.com', picture: 'https://example.com/a.png' } });
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
    const r = await call('/v1/auth/google', { method: 'POST', body: { credential } });
    assert.equal(r.status, 401, credential.slice(0, 30));
    assert.equal(r.headers.get('set-cookie'), null);
  }
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: {} })).status, 401);
});

test('requests that change things must come from the site; others get no CORS', async () => {
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { credential: idToken() }, origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('/v1/auth/google', { method: 'POST', body: { credential: idToken() }, origin: null })).status, 403);
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

// FRONTEND_ORIGIN may list several sites (tech.katta.cc and prototype.katta.cc): each gets the session's CORS
// headers and may change things; any other origin gets neither (the CSRF guard on top of the SameSite cookie).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { parseOrigins, originCheck } from '../src/origins.js';
import { accountRoutes } from '../src/auth/routes.js';
import { practiceRoutes } from '../src/practice/routes.js';

const SITES = ['https://tech.katta.cc', 'https://prototype.katta.cc'];

test('parseOrigins: one origin or a comma-separated list; anything else is refused at start-up', () => {
  assert.deepEqual(parseOrigins('https://tech.katta.cc'), ['https://tech.katta.cc']);
  assert.deepEqual(parseOrigins(' https://tech.katta.cc , https://prototype.katta.cc '), SITES);
  assert.deepEqual(parseOrigins('http://localhost:5173'), ['http://localhost:5173']);
  assert.throws(() => parseOrigins('https://tech.katta.cc/'), /exact origin/);
  assert.throws(() => parseOrigins('https://tech.katta.cc/dashboard'), /exact origin/);
  assert.throws(() => parseOrigins('*.katta.cc'), /not a URL/);
  assert.throws(() => parseOrigins('ftp://tech.katta.cc'), /exact origin/);
  assert.throws(() => parseOrigins(' , '), /empty/);
});

test('originCheck: exact matches only', () => {
  const ok = originCheck(SITES);
  assert.ok(ok('https://tech.katta.cc'));
  assert.ok(ok('https://prototype.katta.cc'));
  assert.ok(!ok('https://evil.katta.cc'));
  assert.ok(!ok('https://prototype.katta.cc.evil.com'));
  assert.ok(!ok('http://prototype.katta.cc'));
  assert.ok(!ok(undefined));
  assert.ok(originCheck('https://tech.katta.cc')('https://tech.katta.cc'), 'a single origin still works');
});

const req = (method, url, origin, body) => Object.assign(Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []), {
  method, url, headers: { origin, cookie: 'tk_session=x', 'content-type': 'application/json', 'x-real-ip': `10.1.0.${Math.floor(Math.random() * 250)}` }, socket: {},
});
const res = () => { const r = { status: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.writeHead = (s, h) => { r.status = s; Object.assign(r.headers, h); };
  r.sent = new Promise((done) => { r.end = (b) => { r.body = b ? JSON.parse(b) : null; done(); }; }); return r; };

test('account routes: both sites get credentialed CORS and may sign out; another origin may not', async () => {
  const handle = accountRoutes({ enabled: true, clientId: 'c', allowedOrigin: SITES, labCatalogue: () => ({}), accounts: { userFor: async () => null, signOut: async () => {} }, log: { error() {} } });
  for (const site of SITES) {
    const r = res(); handle(req('POST', '/v1/auth/signout', site), r, '/v1/auth/signout'); await r.sent;
    assert.notEqual(r.status, 403, `${site} may change things`);
    assert.equal(r.headers['Access-Control-Allow-Origin'], site);
    assert.equal(r.headers['Access-Control-Allow-Credentials'], 'true');
  }
  const bad = res(); handle(req('POST', '/v1/auth/signout', 'https://evil.example'), bad, '/v1/auth/signout'); await bad.sent;
  assert.equal(bad.status, 403);
  assert.deepEqual(bad.body, { error: 'bad_origin' });
  assert.equal(bad.headers['Access-Control-Allow-Origin'], undefined);
});

test('practice routes: both sites get credentialed CORS; another origin is refused a submission', async () => {
  const handle = practiceRoutes({ problems: () => [], enabled: true, allowedOrigin: SITES, accounts: { userFor: async () => null }, store: {}, log: { error() {} } });
  const ok = res(); handle(req('GET', '/v1/practice/problems', 'https://prototype.katta.cc'), ok, '/v1/practice/problems'); await ok.sent;
  assert.equal(ok.headers['Access-Control-Allow-Origin'], 'https://prototype.katta.cc');
  assert.equal(ok.headers['Access-Control-Allow-Credentials'], 'true');
  const other = res(); handle(req('GET', '/v1/practice/problems', 'https://evil.example'), other, '/v1/practice/problems'); await other.sent;
  assert.equal(other.headers['Access-Control-Allow-Credentials'], undefined);
});

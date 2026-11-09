// Settings that let the API move between hosts (HOSTING.md): their defaults keep the VPS behaviour, and
// .env.example names every setting the API reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { clientIp, ipReader, DEFAULT_IP_HEADERS } from '../src/auth/routes.js';
import { defaultSize } from '../src/auth/judge-pool.js';

const req = (headers, address = '10.0.0.1') => ({ headers, socket: { remoteAddress: address } });

test('by default the visitor address comes from X-Real-IP, then CF-Connecting-IP, then the socket (the VPS)', () => {
  assert.equal(DEFAULT_IP_HEADERS, 'x-real-ip,cf-connecting-ip');
  assert.equal(clientIp(req({ 'x-real-ip': '1.1.1.1', 'cf-connecting-ip': '2.2.2.2' })), '1.1.1.1');
  assert.equal(clientIp(req({ 'cf-connecting-ip': '2.2.2.2' })), '2.2.2.2');
  assert.equal(clientIp(req({})), '10.0.0.1');
  assert.equal(clientIp({ headers: {} }), '?');
});

test('CLIENT_IP_HEADERS picks the header another host sets, and ignores the rest', () => {
  const cloudflareOnly = ipReader('cf-connecting-ip');
  assert.equal(cloudflareOnly(req({ 'x-real-ip': '6.6.6.6', 'cf-connecting-ip': '2.2.2.2' })), '2.2.2.2');
  assert.equal(cloudflareOnly(req({ 'x-real-ip': '6.6.6.6' })), '10.0.0.1'); // a visitor's own X-Real-IP is not trusted
  assert.equal(ipReader(' Fly-Client-IP , ')(req({ 'fly-client-ip': '3.3.3.3' })), '3.3.3.3');
});

test('JUDGE_WORKERS sets how many designs are judged at once; the default is one fewer than the CPUs, at most 2', () => {
  assert.equal(defaultSize(undefined, 4), 2);
  assert.equal(defaultSize(undefined, 2), 1);
  assert.equal(defaultSize(undefined, 1), 1);
  assert.equal(defaultSize('1', 4), 1);
  assert.equal(defaultSize('3', 1), 3);
  for (const bad of ['0', '9', '1.5', 'abc', '']) assert.equal(defaultSize(bad, 4), 2, bad);
});

test('.env.example names every setting the API reads', async () => {
  const files = async (dir) => {
    const base = new URL(`${dir}/`, import.meta.url);
    return (await readdir(base, { recursive: true })).filter((f) => /\.m?js$/.test(f)).map((f) => new URL(f, base));
  };
  const used = new Set();
  for (const file of [...await files('../src'), ...await files('../scripts')]) {
    for (const m of (await readFile(file, 'utf8')).matchAll(/\b(?:process\.)?env\.([A-Z_]{3,})/g)) used.add(m[1]);
  }
  assert.ok(used.has('MONGODB_URI') && used.has('CLIENT_IP_HEADERS'), 'the scan found the settings');
  const example = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
  const listed = new Set([...example.matchAll(/^#?\s*([A-Z_]{3,})=/gm)].map((m) => m[1]));
  assert.deepEqual([...used].filter((n) => !listed.has(n)).sort(), [], 'add these to backend/.env.example');
});

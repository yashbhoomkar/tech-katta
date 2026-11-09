// The early hints in each built page's head (vite.config.js apiHints): connections to the API, and a
// preload of the content the page asks for first, which must match the app's own request (api.js getJSON).
import test from 'node:test';
import assert from 'node:assert/strict';
import { apiHints, FIRST } from '../vite.config.js';

const page = '<!doctype html><html><head><meta charset="UTF-8"/><title>Tech Katta</title><link rel="icon" href="/favicon.svg"></head><body></body></html>';
const hint = (path) => apiHints('https://tech-api.katta.cc').transformIndexHtml(page, { path });

test('the landing page preloads /v1/site, the dashboard also /v1/articles', () => {
  const landing = hint('/index.html'), dash = hint('/dashboard/index.html');
  assert.match(landing, /<link rel="preload" as="fetch" href="https:\/\/tech-api\.katta\.cc\/v1\/site" crossorigin="anonymous"\/>/);
  assert.doesNotMatch(landing, /\/v1\/articles/);
  for (const p of FIRST['/dashboard/index.html']) assert.ok(dash.includes(`href="https://tech-api.katta.cc${p}" crossorigin="anonymous"`), p);
  // one connection without cookies (content) and one with them (account calls)
  assert.ok(dash.includes('<link rel="preconnect" href="https://tech-api.katta.cc" crossorigin/>'));
  assert.ok(dash.includes('<link rel="preconnect" href="https://tech-api.katta.cc"/>'));
  assert.ok(dash.indexOf('rel="preload"') < dash.indexOf('rel="icon"'), 'in the head, early');
});

test("the owner's analytics page gets no hints (its calls carry the session cookie)", () => {
  assert.equal(hint('/analytics/index.html'), page);
});

test('the preloads match what the app fetches first', async () => {
  const fs = await import('node:fs');
  const main = fs.readFileSync(new URL('./main.jsx', import.meta.url), 'utf8'), dash = fs.readFileSync(new URL('./dashboard.jsx', import.meta.url), 'utf8');
  assert.ok(main.includes('getJSON("/v1/site")'));
  assert.ok(dash.includes('Promise.all([getJSON("/v1/site"),getJSON("/v1/articles")])'));
  const api = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8');
  assert.ok(api.includes('await fetch(API+path,{signal:ctl.signal})'), 'a plain GET without credentials or headers, which is what crossorigin="anonymous" preloads');
});

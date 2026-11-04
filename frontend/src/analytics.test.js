import test from 'node:test';
import assert from 'node:assert/strict';

// a minimal browser: storage, location, timers run by hand, fetch and sendBeacon recorded
const mem = new Map(), sent = [], listeners = {};
let pending = null;
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
globalThis.location = { pathname: '/dashboard/', hash: '#lab', hostname: 'tech.katta.cc' };
globalThis.innerWidth = 390;
Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: (url, blob) => { sent.push({ url, how: 'beacon', blob }); return true; } }, configurable: true });
globalThis.document = { visibilityState: 'visible', addEventListener: (t, f) => { (listeners[t] ||= []).push(f); }, referrer: 'https://www.google.com/search?q=x' };
globalThis.addEventListener = (t, f) => { (listeners[t] ||= []).push(f); };
globalThis.fetch = async (url, o) => { sent.push({ url, how: 'fetch', body: JSON.parse(o.body), credentials: o.credentials }); return { ok: true }; };
globalThis.setTimeout = (f) => { pending = f; return 1; };
globalThis.clearTimeout = () => { pending = null; };

const { track, visitor, referrer } = await import('./analytics.js');

test('events are batched with a stable visitor id, the device, the page and their age', async () => {
  const v = visitor();
  assert.match(v, /^[a-z0-9]{24}$/);
  assert.equal(visitor(), v, 'same id again');
  assert.equal(mem.get('tk-visitor'), v, 'kept in storage');
  track('lab_open', { embedded: false, challenge: '' });
  track('component_add', { type: 'cache' });
  assert.equal(sent.length, 0, 'waits for the timer');
  pending();
  assert.equal(sent.length, 1);
  const { url, body, credentials } = sent[0];
  assert.equal(url, 'https://tech-api.katta.cc/v1/events');
  assert.equal(credentials, 'include', 'a signed-in visitor is recognised by the API');
  assert.equal(body.visitor, v); assert.equal(body.device, 'phone');
  assert.deepEqual(body.events.map((e) => [e.name, e.page]), [['lab_open', '/dashboard/#lab'], ['component_add', '/dashboard/#lab']]);
  assert.ok(body.events.every((e) => e.age >= 0 && !('at' in e)));
});

test('the queue goes out with sendBeacon when the page is hidden', () => {
  sent.length = 0;
  track('run_start', { nodes: 4, challenge: '' });
  document.visibilityState = 'hidden';
  for (const f of listeners.visibilitychange) f();
  assert.equal(sent.length, 1); assert.equal(sent[0].how, 'beacon');
  document.visibilityState = 'visible';
});

test('referrer is another site\'s domain only', () => {
  assert.equal(referrer(), 'google.com');
  document.referrer = 'https://tech.katta.cc/'; assert.equal(referrer(), '');
});

test('Global Privacy Control or Do Not Track: nothing is sent', () => {
  sent.length = 0; pending = null;
  navigator.globalPrivacyControl = true;
  track('page_view', { section: 'home' });
  assert.equal(pending, null); assert.equal(sent.length, 0);
  navigator.globalPrivacyControl = false; navigator.doNotTrack = '1';
  track('page_view', { section: 'home' });
  assert.equal(sent.length, 0);
});

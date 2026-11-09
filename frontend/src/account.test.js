// How the account starts (account.js): whether sign-in is on and who is signed in are asked at once, as
// soon as the page starts (prefetchAccount), and startAccount uses those answers instead of asking again.
import test from 'node:test';
import assert from 'node:assert/strict';

// a minimal browser, and a fetch whose answers each test gives by hand
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.location = { pathname: '/', hash: '', hostname: 'tech.katta.cc' };
globalThis.document = { visibilityState: 'visible', addEventListener() {}, referrer: '' };
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => true;
let calls = [], offline = false;
globalThis.fetch = (url, o) => offline ? Promise.reject(new TypeError('Failed to fetch')) : new Promise((resolve, reject) => {
  calls.push({ path: new URL(url).pathname, credentials: o?.credentials, answer: (status, body) => resolve({ ok: status < 400, status, json: async () => body }), fail: () => reject(new TypeError('Failed to fetch')) });
});
const tick = () => new Promise((r) => setImmediate(r));
let n = 0;
const fresh = () => { calls = []; offline = false; n += 1; return import(`./account.js?fresh=${n}`); };  // a new copy of the module's state

test('both questions are asked at once, and startAccount waits for those answers instead of asking again', async () => {
  const a = await fresh();
  a.prefetchAccount();
  assert.deepEqual(calls.map((c) => c.path), ['/v1/auth/config', '/v1/me'], 'both asked before either answers');
  assert.ok(calls.every((c) => c.credentials === 'include'), 'with the session cookie');
  a.prefetchAccount();
  const started = a.startAccount();
  assert.equal(calls.length, 2, 'no second request');
  calls[1].answer(200, { user: null });                       // the answers may come in either order
  await tick();
  assert.equal(a.account().ready, false, 'not ready until both are known');
  calls[0].answer(200, { enabled: true, clientId: 'cid' });
  await started;
  assert.deepEqual(a.account(), { ready: true, enabled: true, user: null, clientId: 'cid', syncing: false, error: null });
});

test('signed in: the user from /v1/me', async () => {
  const a = await fresh();
  const started = a.startAccount();                           // without a prefetch, it asks itself
  assert.deepEqual(calls.map((c) => c.path), ['/v1/auth/config', '/v1/me']);
  calls[0].answer(200, { enabled: true, clientId: 'cid' });
  calls[1].answer(200, { user: { name: 'Asha' } });
  await tick(); await tick();
  assert.equal(a.account().ready, true);
  assert.deepEqual(a.account().user, { name: 'Asha' });
  offline = true; for (const c of calls.slice(2)) c.fail();  // the Lab sync that follows sign-in
  await started; await a.syncLab().catch(() => {});
});

test('sign-in turned off, or /v1/me failing, shows the page signed out as before', async () => {
  let a = await fresh();
  let started = a.startAccount();
  calls[0].answer(200, { enabled: false });
  calls[1].answer(503, { error: 'sign_in_not_configured' });
  await started;
  assert.equal(a.account().ready, true); assert.equal(a.account().enabled, false);

  a = await fresh();
  started = a.startAccount();
  calls[0].answer(200, { enabled: true, clientId: 'cid' });
  calls[1].fail();
  await started;
  assert.equal(a.account().ready, true); assert.equal(a.account().enabled, true); assert.equal(a.account().user, null);
});

test("a failed prefetch isn't kept: the next start asks again", async () => {
  const a = await fresh();
  a.prefetchAccount();
  calls[0].fail(); calls[1].fail();                          // e.g. the API was briefly unreachable
  await tick(); await tick();
  const started = a.startAccount();                           // after "Try again" loaded the page
  assert.equal(calls.length, 4, 'asked afresh');
  calls[2].answer(200, { enabled: true, clientId: 'cid' });
  calls[3].answer(200, { user: null });
  await started;
  assert.equal(a.account().enabled, true);
});

// Submissions share one judging queue (judge-pool.js): an account may have one design being judged at a time,
// so a single account can't fill the queue and keep everyone else's submissions from being recorded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { accountRoutes } from '../src/auth/routes.js';
import { loadContent } from '../src/content/store.js';

const content = await loadContent(new URL('../../content', import.meta.url).pathname);
const problem = content.articles.find((a) => a.slug === 'url-shortener');
const ORIGIN = 'https://tech.katta.cc';

// a request with a JSON body, and a response that records what was sent
const request = (body) => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]), {
  method: 'POST', url: '/v1/me/submissions', headers: { origin: ORIGIN, cookie: 'tk_session=x', 'content-type': 'application/json', 'x-real-ip': `10.0.0.${Math.floor(Math.random() * 250)}` }, socket: {},
});
const response = () => { const r = { status: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.writeHead = (s, h) => { r.status = s; Object.assign(r.headers, h); }; r.end = (b) => { r.body = b ? JSON.parse(b) : null; r.done(); }; r.sent = new Promise((res) => { r.done = res; }); return r; };

test('an account gets one design judged at a time; other accounts are not held up', async () => {
  let release; const gate = new Promise((res) => { release = res; });
  let calls = 0;
  const judgeDesign = async () => { calls += 1; if (calls === 1) await gate; return { judged: { verdict: 'accepted', passed: 9, total: 9, metrics: null }, copied: false }; };
  let user = 'u1';
  const handle = accountRoutes({
    enabled: true, clientId: 'c', allowedOrigin: ORIGIN, labCatalogue: () => content.lab, practiceFor: (slug) => (slug === problem.slug ? problem.practice : null), judgeDesign,
    accounts: { userFor: async () => ({ id: user, user: {} }), addSubmission: async () => ({ submissions: 1, accepted: 1, cheaperThan: null }) },
    log: { error() {} },
  });
  const body = { slug: problem.slug, design: problem.practice.reference, answer: {}, hints: 0 };
  const submit = async (who) => { user = who; const res = response(); handle(request(body), res, '/v1/me/submissions'); await new Promise((r) => setImmediate(r)); return res; };

  const first = await submit('u1');                       // being judged (held by the gate)
  const second = await submit('u1');                      // same account, meanwhile
  await second.sent;
  assert.equal(second.status, 429);
  assert.deepEqual(second.body, { error: 'judge_in_progress' });

  const other = await submit('u2');                       // another account is judged as usual
  await other.sent;
  assert.equal(other.status, 200);

  release(); await first.sent;
  assert.equal(first.status, 200);
  const again = await submit('u1');                       // once the first is done, u1 can submit again
  await again.sent;
  assert.equal(again.status, 200);
  assert.equal(calls, 3);
});

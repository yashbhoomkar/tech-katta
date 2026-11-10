import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { judge } from './judge/judge.js';

// lablite.jsx imports CSS, so its design builder and test filter are checked through the same shape here.
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const liteDesign = ({ cdn, servers, prewarm }) => { const ns = [N('viewers', 'client'), ...(cdn ? [N('cdn', 'cdn')] : []), N('lb', 'lb'), N('origin', 'server', { size: 'c5.2xlarge', count: prewarm ? servers : Math.min(5, servers), maxCount: servers, autoscale: !prewarm, queriesPerRequest: 1 })]; return { nodes: ns, edges: ns.slice(1).map((n, i) => ({ from: ns[i].id, to: n.id })) }; };
const landingTests = (P) => ({ ...P, tests: P.tests.filter((t) => t.sample && !t.request) });
const src = readFileSync(new URL('./lablite.jsx', import.meta.url), 'utf8');
const content = new URL('../../content/', import.meta.url);
const lab = JSON.parse(readFileSync(new URL('lab.json', content)));
const site = JSON.parse(readFileSync(new URL('site.json', content)));
// IND vs PAK on the landing page is a problem (site.json landingLab.problem), no longer a Lab challenge
const P = JSON.parse(readFileSync(new URL(`articles/interview-questions/${site.landingLab.problem}.json`, content))).practice;

test('the phone version builds the same design, and runs the same tests, as this test', () => {
  assert.ok(src.includes('count:prewarm?servers:Math.min(5,servers),maxCount:servers,autoscale:!prewarm'));
  assert.ok(src.includes('tests:P.tests.filter(t=>t.sample&&!t.request)'));
});

test('the landing page runs only the example traffic tests: a phone design has no storage for a request test', () => {
  const t = landingTests(P).tests;
  assert.ok(t.length >= 2 && t.every((x) => x.sample && !x.request));
  assert.ok(P.tests.some((x) => x.sample && x.request), 'the full problem still shows a request test');
  assert.equal(judge(P.reference, lab, landingTests(P), { sample: true }).verdict, 'accepted', 'the solution passes them');
});

test('the phone controls teach what the stars did: a CDN, enough servers, and all of them running before the toss', () => {
  const run = (o) => judge(liteDesign(o), lab, landingTests(P), { sample: true });
  const passed = (o) => run(o).results.filter((r) => r.ok).map((r) => r.id).join(',');
  assert.equal(passed({ cdn: false, servers: 50, prewarm: true }), '', 'without a CDN nothing holds');
  assert.equal(passed({ cdn: true, servers: 30, prewarm: true }), 'toss', 'enough for the toss, not for the last over');
  assert.equal(passed({ cdn: true, servers: 50, prewarm: false }), 'last-over', 'autoscaling from 5 is too slow for the toss');
  assert.equal(run({ cdn: true, servers: 40, prewarm: true }).verdict, 'accepted');
  assert.equal(run({ cdn: true, servers: 10, prewarm: true }).verdict, 'failed', "the controls' starting point fails");
});

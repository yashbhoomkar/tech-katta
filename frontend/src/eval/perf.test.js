// Speed (evaluator.md §14.5): on the largest reference design, one 4-hour load test under 60 ms and a whole Submit
// (every test) under 600 ms. The best of several runs is used, so a busy machine does not fail the build by chance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { simulateTest } from './simulate.js';
import { evaluate } from './judge.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const P = JSON.parse(readFileSync(new URL('./fixtures/url-shortener.v2.json', import.meta.url)));
const best = (f, n = 5) => { let t = Infinity; for (let i = 0; i < n; i++) { const a = performance.now(); f(); t = Math.min(t, performance.now() - a); } return t; };

test('speed: a 4-hour load test under 60 ms; a whole Submit under 600 ms', () => {
  const compiled = compile(P.reference, lab, P);
  const fourHours = { ...P.tests.find((t) => t.id === 'zone'), hours: 4 };
  const one = best(() => simulateTest(compiled, lab, P, fourHours));
  assert.ok(one < 60, `4-hour load test took ${one.toFixed(1)} ms`);
  const all = best(() => evaluate(P.reference, lab, P), 3);
  assert.ok(all < 600, `Submit took ${all.toFixed(1)} ms`);
});

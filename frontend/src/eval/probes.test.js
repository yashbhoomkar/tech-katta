import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseTest, headroom, waste, smallerSteps } from './probes.js';
import { evaluate } from './judge.js';
const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const p = JSON.parse(readFileSync(new URL('articles/interview-questions/url-shortener.json', content))).practice;
const comp = (t) => lab.components.find((c) => c.type === t);

test('the base test is the busiest load test with no faults', () => {
  const b = baseTest(p);
  assert.ok(b.traffic && !(b.faults || []).length);
  for (const t of p.tests) if (t.traffic && !(t.faults || []).length) assert.ok(t.traffic.rps <= b.traffic.rps);
});

test('headroom: the reference holds the base test, the wrong design without a cache does not', () => {
  const ref = headroom(p.reference, lab, p);
  assert.ok(ref.m >= 1, `reference ${ref.m}`);
  assert.ok(ref.capped || ref.first.length > 0, 'it says what gave first');
  const noCache = headroom(p.wrong.find((w) => w.name === 'No cache'), lab, p);
  assert.ok(noCache.m < 1, `no cache ${noCache.m}`);
  assert.ok(noCache.m < ref.m);
});

test('one step smaller: a smaller size, one fewer of a counted setting, never below the minimum', () => {
  const s = smallerSteps({ type: 'server', config: { size: 'm5.large', count: 1 } }, comp('server'));
  assert.deepEqual(s.find((x) => x.field === 'size'), { field: 'size', from: 'm5.large', to: 't3.medium' });
  assert.ok(!s.some((x) => x.field === 'count'));
  assert.deepEqual(smallerSteps({ type: 'server', config: { size: 't3.medium', count: 3 } }, comp('server')), [{ field: 'count', from: 3, to: 2 }]);
});

test('waste: only for an Accepted design; what it finds still passes, for less', () => {
  assert.equal(waste(p.wrong[0], lab, p), null);
  const w = waste(p.reference, lab, p);
  assert.ok(w.saving >= 0 && w.after <= w.before);
  let d = p.reference;
  for (const c of w.changes) d = { ...d, nodes: d.nodes.map((n) => (n.id === c.part ? { ...n, config: { ...n.config, [c.field]: c.to } } : n)) };
  assert.equal(evaluate(d, lab, p).verdict, 'accepted');
});

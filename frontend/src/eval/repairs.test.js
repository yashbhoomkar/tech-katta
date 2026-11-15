import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { repairs, biggerSteps } from './repairs.js';
import { evaluate } from './judge.js';
const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const p = JSON.parse(readFileSync(new URL('articles/interview-questions/url-shortener.json', content))).practice;
const wrong = (name) => p.wrong.find((w) => w.name === name);

test('bigger steps: next size, more instances, a second zone, safety switches on; never past the maximum', () => {
  const s = biggerSteps({ type: 'server', config: { size: 'm5.large', count: 4, zones: 1 } }, lab);
  assert.ok(s.some((x) => x.field === 'size' && x.to === 'm5.xlarge'));
  assert.ok(s.some((x) => x.field === 'count' && x.to === 5) && s.some((x) => x.field === 'count' && x.to === 8));
  assert.ok(s.some((x) => x.field === 'zones' && x.to === 2));
  assert.ok(s.some((x) => x.field === 'autoscale' && x.to === true));
  assert.ok(!biggerSteps({ type: 'server', config: { size: 'c5.2xlarge', count: 50, zones: 3, autoscale: true } }, lab).length);
});

test('a checked repair fixes the first failure and keeps what passed', () => {
  const d = wrong('Single-zone database'), r = repairs(d, lab, p);
  assert.equal(r.test.id, 'zone');
  const fix = r.repairs.find((x) => x.field === 'multiAz');
  assert.ok(fix, 'turning on the standby is found');
  const fixed = { ...d, nodes: d.nodes.map((n) => (n.id === fix.part ? { ...n, config: { ...n.config, multiAz: true } } : n)) };
  const before = evaluate(d, lab, p), after = evaluate(fixed, lab, p);
  assert.ok(after.results.find((x) => x.id === 'zone').ok);
  for (const x of before.results) if (x.ok) assert.ok(after.results.find((y) => y.id === x.id).ok, x.id);
});

test('wiring and bill failures are not repaired by size', () => {
  assert.equal(repairs(wrong('No database'), lab, p).reason, 'wiring');
  assert.equal(repairs(wrong('Biggest everything'), lab, p).reason, 'cost');
  assert.equal(repairs(p.reference, lab, p).reason, 'accepted');
});

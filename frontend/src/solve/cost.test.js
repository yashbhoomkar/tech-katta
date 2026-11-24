import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalMonth } from './cost.js';
import { evaluate } from '../eval/judge.js';

const load = (id, avgMonthly, checks = []) => ({ id, test: { id, checks }, metrics: { avgMonthly }, checks: checks.map((c) => ({ ...c, ok: true })) });

test('normalMonth: the test with a cost check is the normal month, not the dearest peak', () => {
  const j = { results: [load('peak', 181355948, [{ kind: 'slo' }]), load('budget', 261887, [{ kind: 'slo' }, { kind: 'cost', max: 271000 }])] };
  assert.deepEqual(normalMonth(j), { id: 'budget', cost: 261887, budget: 271000, ok: true });
});
test('normalMonth: with no cost check it uses the test called normal', () => {
  const j = { results: [load('peak', 900000), load('normal', 4000)] };
  assert.deepEqual(normalMonth(j), { id: 'normal', cost: 4000, budget: null, ok: true });
});
test('normalMonth: nothing to pick gives null (the header falls back to its old text)', () => {
  assert.equal(normalMonth({ results: [load('peak', 5)] }), null);
  assert.equal(normalMonth({ results: [{ id: 'api', test: { id: 'api' } }] }), null);
  assert.equal(normalMonth(null), null);
});
test('normalMonth: a failed cost check is reported', () => {
  const r = load('budget', 300000, [{ kind: 'cost', max: 271000 }]);
  r.checks[0].ok = false;
  assert.equal(normalMonth({ results: [r] }).ok, false);
});
test('normalMonth on a real judged result: ticket-booking is about $20k a month, not its noon-sale rate', () => {
  const content = new URL('../../../content/', import.meta.url);
  const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
  const a = JSON.parse(readFileSync(new URL('articles/interview-questions/ticket-booking.json', content)));
  const j = evaluate(a.practice.reference, lab, a.practice);
  const n = normalMonth(j);
  assert.equal(n.id, 'budget');
  assert.ok(n.cost < n.budget && n.cost < j.metrics.avgMonthly, `${n.cost} vs peak ${j.metrics.avgMonthly}`);
});

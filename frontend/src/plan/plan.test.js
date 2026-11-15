import test from 'node:test';
import assert from 'node:assert/strict';
import { planOf, dailyOf } from './plan.js';
const qs = ['url-shortener', 'file-sync', 'ticket-booking', 'payments', 'menu-search', 'ind-vs-pak'].map((slug) => ({ slug }));
test('the plan keeps the guide order, drops missing problems and ends with the rest', () => {
  const p = planOf(qs);
  assert.deepEqual(p[0].slugs, ['url-shortener', 'file-sync']);
  assert.deepEqual(p.at(-1).slugs, ['menu-search', 'ind-vs-pak']);
  assert.equal(p.flatMap((w) => w.slugs).length, qs.length);
});
test('the problem of the day is stable for a date and skips solved ones', () => {
  const d = new Date(Date.UTC(2026, 10, 15));
  assert.equal(dailyOf(qs, () => false, d).slug, dailyOf(qs, () => false, d).slug);
  const solved = new Set(qs.slice(0, 5).map((q) => q.slug));
  assert.equal(dailyOf(qs, (s) => solved.has(s), d).slug, 'ind-vs-pak');
  assert.ok(dailyOf(qs, () => true, d));
  assert.equal(dailyOf([], () => false, d), null);
});

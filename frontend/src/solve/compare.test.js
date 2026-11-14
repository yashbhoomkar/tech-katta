// Comparing a submission with the one before it (context 36, step 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { diffDesigns, compareSubs, testSummary } from './compare.js';

const a = { nodes: [{ id: 'c', type: 'client' }, { id: 's', type: 'server', name: 'API', config: { count: 2, size: 'm5.large' } }, { id: 'd', type: 'database', config: { schema: { tables: [] } } }], edges: [{ from: 'c', to: 's' }, { from: 's', to: 'd' }] };
const b = { nodes: [{ id: 'c', type: 'client' }, { id: 's', type: 'server', name: 'API', config: { count: 4, size: 'm5.large' } }, { id: 'd', type: 'database', config: { schema: { tables: [{ name: 'links' }] } } }, { id: 'k', type: 'cache', name: 'Hot' }], edges: [{ from: 'c', to: 's' }, { from: 's', to: 'k' }, { from: 'k', to: 'd' }] };

test('diffDesigns names added and removed parts, changed settings and arrows', () => {
  const t = diffDesigns(a, b).map((x) => x.text);
  assert.ok(t.includes('Added Hot'));
  assert.ok(t.includes('API: instances 2 → 4'));
  assert.ok(t.includes('database: schema changed'));
  assert.ok(t.includes('Arrow added: API → Hot'));
  assert.ok(t.includes('Arrow removed: API → database'));
  assert.deepEqual(diffDesigns(a, a), []);
  assert.deepEqual(diffDesigns(null, b), []);
});

test('compareSubs reports tests that turned, and the score and cost deltas', () => {
  const prev = { score: 60, cost: 20000, passed: 7, at: 1, tests: [{ id: 'peak', name: 'Peak', ok: false, c: 18000 }, { id: 'bill', name: 'Bill', ok: true, c: 16000 }] };
  const now = { score: 85, cost: 18500, passed: 9, tests: [{ id: 'peak', name: 'Peak', ok: true, c: 18500 }, { id: 'bill', name: 'Bill', ok: false, c: 27000 }] };
  const c = compareSubs(prev, now);
  assert.equal(c.score, 25); assert.equal(c.cost, -1500); assert.equal(c.passed, 2);
  assert.deepEqual(c.fixed, ['Peak']); assert.deepEqual(c.broke, ['Bill']);
  assert.equal(compareSubs({ score: 1 }, now), null);
});

test('testSummary keeps only what a submission needs', () => {
  assert.deepEqual(testSummary([{ test: { id: 't', name: 'T' }, ok: true, metrics: { availability: 99.9, p99: 80, avgMonthly: 100 }, timeline: {} }]), [{ id: 't', name: 'T', ok: true, a: 99.9, p: 80, c: 100 }]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { INCIDENTS, run } from '../scripts/sim.js';
import { FIXES, START, designFor, countsOf } from '../scripts/pages/landing-lab.js';

test('the demo starts failing and no single fix is enough, but the three together hold', () => {
  const inc = INCIDENTS[0];
  assert.equal(run(inc, designFor(new Set())).passed, false);
  for (const f of FIXES) assert.equal(run(inc, designFor(new Set([f.id]))).passed, false, `${f.id} alone`);
  assert.equal(run(inc, designFor(new Set(FIXES.map((f) => f.id)))).passed, true);
  assert.deepEqual(designFor(new Set()), START);
});

test('the counts come from the article list', () => {
  const list = [{ section: 'concepts', group: 'core' }, { section: 'components', group: 'data' }, { section: 'interview-questions', group: 'start' }, { section: 'interview-questions', group: 'easy' }, { section: 'interview-questions', group: 'hard' }];
  assert.deepEqual(countsOf(list, 8), { articles: 2, problems: 2, challenges: 8, warmups: INCIDENTS.length });
});

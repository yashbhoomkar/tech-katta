import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SKILLS, MIX, skillOf, skillRecord, nextFor } from './skills.js';
const dir = new URL('../../../content/articles/interview-questions/', import.meta.url);

test('MIX matches every problem\'s tests in the content', () => {
  const now = {};
  for (const f of readdirSync(dir)) {
    const tests = JSON.parse(readFileSync(new URL(f, dir))).practice?.tests;
    if (!tests) continue;
    const row = SKILLS.map(() => 0);
    for (const t of tests) row[SKILLS.findIndex(([id]) => id === skillOf(t))]++;
    now[f.replace('.json', '')] = row;
  }
  assert.deepEqual(MIX, now, `update MIX in plan/skills.js to:\n${JSON.stringify(now)}`);
});

test('tests are sorted by kind', () => {
  assert.equal(skillOf({ id: 'api-redirect', name: 'Open a short link' }), 'function');
  assert.equal(skillOf({ id: 'zone', name: 'A zone goes dark' }), 'resilience');
  assert.equal(skillOf({ id: 'cold', name: 'The cache restarts at the peak' }), 'resilience');
  assert.equal(skillOf({ id: 'budget', name: 'A sensible bill' }), 'cost');
  assert.equal(skillOf({ id: 'peak', name: 'The evening peak' }), 'scale');
});

test('the record counts the latest own submission per problem and names the weakest', () => {
  const t = (id, name, ok) => ({ id, name, ok });
  const r = skillRecord({
    'url-shortener': [
      { copied: true, tests: [t('zone', 'A zone goes dark', true)] },
      { tests: [t('api-redirect', 'Open', true), t('peak', 'Peak', true), t('zone', 'A zone goes dark', false), t('db-failover', 'The database fails', false), t('budget', 'A sensible bill', true)] },
    ],
    'chat-app': [{ tests: [t('api-send', 'Send', true), t('peak', 'Diwali', false), t('zone', 'A zone goes dark', false)] }],
    nope: [],
  });
  assert.equal(r.problems, 2);
  const by = Object.fromEntries(r.skills.map((s) => [s.id, s]));
  assert.deepEqual([by.resilience.passed, by.resilience.total], [0, 3]);
  assert.deepEqual([by.scale.passed, by.scale.total], [1, 2]);
  assert.equal(r.weakest, 'resilience');
  assert.equal(skillRecord({}).weakest, null);
});

test('the next problem for a skill is unsolved and leans on it', () => {
  const order = Object.keys(MIX);
  const s = nextFor('resilience', order, (x) => x === 'url-shortener');
  assert.notEqual(s, 'url-shortener');
  assert.ok(MIX[s][2] / MIX[s].reduce((a, b) => a + b, 0) >= 0.3);
  assert.equal(nextFor('resilience', order, () => true), null);
});

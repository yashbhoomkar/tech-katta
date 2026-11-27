import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PATHS, pathState, weakestArea, summary } from '../scripts/paths.js';

const index = JSON.parse(readFileSync(new URL('../../../content/articles/index.json', import.meta.url), 'utf8')).articles;
const list = index.map((id) => { const [section, slug] = id.split('/'); const a = JSON.parse(readFileSync(new URL(`../../../content/articles/${id}.json`, import.meta.url), 'utf8')); return { section, slug, group: a.group, title: a.title }; });

test('every step of every path is an article that exists, and each path ends in a problem', () => {
  for (const p of PATHS) {
    assert.ok(p.steps.length >= 6 && p.steps.length <= 8, `${p.id} has ${p.steps.length} steps`);
    for (const s of p.steps) assert.ok(index.includes(s), `${p.id}: ${s} is not an article`);
    const last = list.find((a) => `${a.section}/${a.slug}` === p.steps.at(-1));
    assert.equal(last.section, 'interview-questions');
  }
});

test('a path shows done from reading and from solving, and names the next step', () => {
  const p = PATHS[0];
  const read = { 'concepts/networking-essentials': 1, 'concepts/api-design': 2 };
  const s = pathState(p, list, read, {}, {});
  assert.equal(s.done, 2); assert.equal(s.next.a.slug, 'data-modelling');
  const all = Object.fromEntries(p.steps.slice(0, -1).map((x) => [x, 1]));
  const solved = pathState(p, list, all, { steps: { 'solved:url-shortener': true } }, {});
  assert.equal(solved.done, p.steps.length); assert.equal(solved.next, null);
});

test('a step with no article is skipped, not invented', () => {
  const s = pathState({ steps: ['concepts/caching', 'concepts/not-a-thing'] }, list, {}, {}, {});
  assert.equal(s.steps.length, 1);
});

test('weakest area counts failing tests in each problem\'s latest own submission', () => {
  const T = (name, ok) => ({ id: name, name, ok });
  const subs = {
    a: [{ at: 3, score: 10, tests: [T('Toss spike', false), T('Cache failure', false)] }, { at: 1, score: 5, tests: [T('Cache failure', false)] }],
    b: [{ at: 2, score: 10, tests: [T('Cache failure', false), T('Toss spike', true)] }],
    c: [{ at: 2, score: 10, copied: true, tests: [T('Rare', false)] }],
  };
  assert.deepEqual(weakestArea(subs), { name: 'Cache failure', count: 2, slug: 'a' });
  assert.equal(weakestArea({}), null);
  assert.equal(weakestArea({ a: [{ at: 1, score: 1, tests: [T('x', true)] }] }), null);
});

test('the summary counts solved, best scores, articles read and recommends the next step', () => {
  const prog = { steps: { 'solved:url-shortener': true } };
  const subs = { 'url-shortener': [{ at: 1, score: 88, tests: [] }], 'chat-app': [{ at: 2, score: 40, tests: [{ id: 't', name: 'Fan-out', ok: false }] }] };
  const read = { 'concepts/caching': 1, 'interview-questions/how-to-answer': 1 };
  const s = summary(list, { read, prog, subs, chosen: '' });
  assert.equal(s.solved, 1); assert.ok(s.total >= 20);
  assert.deepEqual(s.best.map((b) => [b.a.slug, b.score]), [['url-shortener', 88], ['chat-app', 40]]);
  assert.equal(s.read, 1); assert.equal(s.weakest.name, 'Fan-out');
  assert.equal(s.next.a.group, 'easy');
  const onPath = summary(list, { read, prog, subs, chosen: 'beginner' });
  assert.equal(onPath.next.a.slug, 'networking-essentials');
});

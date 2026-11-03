import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeLab, cleanLab, MAX_DESIGNS } from './merge.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
const D = (id, updated, n = 1) => ({ id, name: id, updated, nodes: Array.from({ length: n }, (_, i) => ({ id: 'c' + i, type: 'client', x: i * 10, y: 0, config: {} })), edges: [] });

test('the newest version of each design wins, from either side', () => {
  const m = mergeLab({ designs: [D('a', 10, 1), D('b', 50, 2)] }, { designs: [D('a', 20, 3), D('c', 5)] }, lab);
  const by = Object.fromEntries(m.designs.map((d) => [d.id, d.nodes.length]));
  assert.deepEqual(by, { a: 3, b: 2, c: 1 });
});

test('a deletion wins over versions saved before it, not after', () => {
  const m = mergeLab({ designs: [D('a', 10), D('b', 100)] }, { deleted: [{ id: 'a', at: 20 }, { id: 'b', at: 50 }] }, lab);
  assert.deepEqual(m.designs.map((d) => d.id), ['b'], 'b was edited after its deletion elsewhere');
  assert.deepEqual(m.deleted.map((d) => d.id).sort(), ['a', 'b']);
});

test('stars keep the best result with its goals; tour flags are joined', () => {
  const m = mergeLab({ progress: { stars: { x: 2, y: 3 }, goals: { x: [true, true, false] }, steps: { 'tour:lab': true } } },
    { progress: { stars: { x: 3, y: 1, __proto__: 3 }, goals: { x: [true, true, true] }, steps: { 'tour:dashboard': true } } }, lab);
  assert.deepEqual(m.progress.stars, { x: 3, y: 3 });
  assert.deepEqual(m.progress.goals, { x: [true, true, true] });
  assert.deepEqual(Object.keys(m.progress.steps).sort(), ['tour:dashboard', 'tour:lab']);
});

test('bad data is repaired or dropped, and there are limits', () => {
  const c = cleanLab({ designs: [null, { id: '' }, { id: 'ok', nodes: [{ id: 'n', type: 'rocket' }], edges: 'x' }], deleted: [{ id: 'z', at: 'soon' }], progress: 'nope' }, lab);
  assert.deepEqual(c.designs.map((d) => [d.id, d.nodes.length]), [['ok', 0]]);
  assert.deepEqual(c.deleted, []);
  assert.deepEqual(c.progress, { steps: {}, stars: {}, goals: {} });
  const many = cleanLab({ designs: Array.from({ length: 150 }, (_, i) => D('d' + i, i)) }, lab);
  assert.equal(many.designs.length, MAX_DESIGNS);
  assert.equal(many.designs[0].id, 'd149', 'the newest are kept');
});

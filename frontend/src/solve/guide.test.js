import test from 'node:test';
import assert from 'node:assert/strict';
import { guideOf } from './guide.js';

const rubric = { est: [{ id: 'writes' }, { id: 'reads' }], decisions: [{ id: 'cache' }] };

test('the canvas opens once requirements, numbers and API are written', () => {
  let g = guideOf({}, rubric);
  assert.equal(g.canvasOpen, false);
  assert.equal(g.next.id, 'fr');
  g = guideOf({ fr: 'Make a short link\nOpen a short link' }, rubric);
  assert.equal(g.next.id, 'est');
  assert.match(g.steps[1].need, /0 of 2/);
  g = guideOf({ fr: 'Make a short link\nOpen a short link', est: { writes: '1000', reads: ' ' } }, rubric);
  assert.equal(g.next.id, 'est');
  g = guideOf({ fr: 'Make a short link\nOpen a short link', est: { writes: '1000', reads: '1e5' }, api: [{ method: 'GET', path: '' }] }, rubric);
  assert.equal(g.next.id, 'api');
  g = guideOf({ fr: 'Make a short link\nOpen a short link', est: { writes: '1000', reads: '1e5' }, api: [{ method: 'GET', path: '/:code' }] }, rubric);
  assert.equal(g.canvasOpen, true);
  assert.equal(g.next.id, 'design', 'decisions are optional for the gate and the next step');
  assert.equal(g.steps.find((s) => s.id === 'dec').done, false);
});

test('a problem without estimates or decisions skips those steps', () => {
  const g = guideOf({ fr: 'a thing\nanother thing', api: [{ path: '/v1/x' }] }, {});
  assert.deepEqual(g.steps.map((s) => s.id), ['fr', 'api', 'design']);
  assert.equal(g.canvasOpen, true);
});

test('one-word or blank lines do not count as requirements', () => {
  assert.equal(guideOf({ fr: 'ab\n\n  \nok' }, {}).steps[0].done, false);
});

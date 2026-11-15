import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defendQuestions, KILL_CLASSES } from './defend.js';
const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const p = JSON.parse(readFileSync(new URL('articles/interview-questions/url-shortener.json', content))).practice;

test('three questions about the reference, each with its answer from a run', () => {
  const qs = defendQuestions(p.reference, lab, p);
  assert.equal(qs.length, 3);
  for (const q of qs) {
    assert.ok(q.right >= 0 && q.right < q.choices.length, q.id);
    assert.ok(q.q.endsWith('?') && q.say.length > 0, q.id);
  }
  const kill = qs.find((q) => q.id === 'kill:app');
  assert.equal(KILL_CLASSES[kill.right][0], 'blip', 'losing the Link service stops calls for a few minutes, then it recovers');
  const first = qs.find((q) => q.kind === 'first');
  assert.equal(first.choices[first.right], 'Link service');
});

test('the same design gets the same questions', () => {
  assert.deepEqual(defendQuestions(p.reference, lab, p), defendQuestions(p.reference, lab, p));
});

test('a design that cannot run gets no questions rather than an error', () => {
  assert.deepEqual(defendQuestions({ nodes: [], edges: [] }, lab, p), []);
  assert.ok(Array.isArray(defendQuestions(p.wrong[0], lab, p)));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProgress, markStep, recordStars, readProgress, setLevel } from './progress.js';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
globalThis.dispatchEvent = () => true;

test('bad saved progress is repaired, never trusted', () => {
  for (const raw of [null, 'nope', '[]', '{"steps":[1]}']) assert.deepEqual(JSON.parse(JSON.stringify(cleanProgress(raw))), { version: 1, level: null, steps: {}, stars: {} });
  const p = cleanProgress('{"level":"advanced","steps":{"a":true,"b":"yes","__proto__":true},"stars":{"x":2,"y":9,"z":1.5}}');
  assert.equal(p.level, 'advanced');
  assert.deepEqual(Object.keys(p.steps).sort(), ['__proto__', 'a']);
  assert.deepEqual({ ...p.stars }, { x: 2 });
});

test('stars keep the best result; steps and level are saved', () => {
  recordStars('flash-sale', 2); recordStars('flash-sale', 1);
  assert.equal(readProgress().stars['flash-sale'], 2);
  recordStars('flash-sale', 3);
  assert.equal(readProgress().stars['flash-sale'], 3);
  markStep('article:api-types'); setLevel('beginner');
  const p = readProgress();
  assert.equal(p.steps['article:api-types'], true);
  assert.equal(p.level, 'beginner');
});

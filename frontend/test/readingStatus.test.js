import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readMarkedRead, writeMarkedRead } from '../src/readingStatus.js';

function setWindow(t, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  });
}

test('reading status reads and writes browser storage', (t) => {
  const values = new Map();
  setWindow(t, { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } });
  assert.equal(readMarkedRead('sample'), false);
  assert.equal(writeMarkedRead('sample', true), true);
  assert.equal(readMarkedRead('sample'), true);
});

test('restricted browser storage does not crash article rendering or read toggles', (t) => {
  setWindow(t, { localStorage: {
    getItem() { throw new Error('storage denied'); },
    setItem() { throw new Error('storage denied'); },
  } });
  assert.equal(readMarkedRead('sample'), false);
  assert.equal(writeMarkedRead('sample', true), false);
});

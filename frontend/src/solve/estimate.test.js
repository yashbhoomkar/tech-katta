import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, rate, storage, fmtCount, fmtBytes } from './estimate.js';

test('amounts read lakh, crore and short words', () => {
  assert.equal(parseAmount('5 crore'), 5e7);
  assert.equal(parseAmount('2.5 lakh'), 2.5e5);
  assert.equal(parseAmount('10k'), 1e4);
  assert.equal(parseAmount('3M'), 3e6);
  assert.equal(parseAmount('1,00,000'), 1e5);
  assert.equal(parseAmount('1e6'), 1e6);
  assert.ok(Number.isNaN(parseAmount('lots')));
  assert.ok(Number.isNaN(parseAmount('')));
});

test('per day to per second, with a peak', () => {
  const r = rate(8.64e6, 'day', 3);
  assert.equal(r.perSecond, 100);
  assert.equal(r.peak, 300);
  assert.equal(rate(3600, 'hour').perSecond, 1);
});

test('storage a day and over the years', () => {
  const s = storage(1e6, 1, 'KB', 5, 3);
  assert.equal(s.perDay, 1e9);
  assert.equal(s.total, 1e9 * 365 * 5 * 3);
});

test('formatting', () => {
  assert.equal(fmtCount(3e7), '3 crore');
  assert.equal(fmtCount(2.5e5), '2.5 lakh');
  assert.equal(fmtCount(1234), '1,234');
  assert.equal(fmtCount(11.574), '11.57');
  assert.equal(fmtBytes(1.5e12), '1.5 TB');
  assert.equal(fmtBytes(512), '512 B');
});

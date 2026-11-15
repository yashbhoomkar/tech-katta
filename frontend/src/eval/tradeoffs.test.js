import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decisionsOf, tradeoffs } from './tradeoffs.js';
const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const p = JSON.parse(readFileSync(new URL('articles/interview-questions/url-shortener.json', content))).practice;

test('the settings with another side are found, in the catalogue\'s words', () => {
  const ds = decisionsOf(p.reference, lab);
  const az = ds.find((d) => d.key === 'multiAz');
  assert.equal(az.fromWords, 'on'); assert.equal(az.toWords, 'off');
  assert.ok(ds.every((d) => d.label && d.from !== d.to));
  assert.ok(!decisionsOf({ nodes: [{ id: 'c', type: 'client' }], edges: [] }, lab).length);
});

test('each side is run against every test: dropping the standby saves money and fails the failover tests', () => {
  const r = tradeoffs(p.reference, lab, p);
  assert.equal(r.yours.passed, r.yours.total);
  const az = r.cards.find((c) => c.key === 'multiAz');
  assert.ok(az.other.monthly < r.yours.monthly);
  assert.ok(az.newFails.some((f) => f.id === 'db-failover'));
  assert.ok(az.newFails.every((f) => f.why.length > 0));
});

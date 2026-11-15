// The sandbox canvas (context 36, step 7): its settings become a practice the v2 evaluator runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sandboxPractice, cleanSettings, TEMPLATES } from './practice.js';
import { judge } from '../judge/judge.js';

const root = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', root))), eval: JSON.parse(readFileSync(new URL('eval.json', root))) };

test('settings are repaired into range, faults on whole ticks', () => {
  const s = cleanSettings({ rps: -5, pattern: 'nope', readShare: 3, faults: [{ kind: 'crash', type: 'database', minute: 61.7 }, { kind: 'bogus' }, { kind: 'spike', minute: 7, factor: 99 }] });
  assert.equal(s.rps, 1); assert.equal(s.pattern, 'steady'); assert.equal(s.readShare, 1);
  assert.deepEqual(s.faults.map((f) => f.kind), ['crash', 'spike']); assert.equal(s.faults[0].minute, 59); assert.equal(s.faults[1].factor, 10);
  assert.equal(cleanSettings({ pattern: 'meals', faults: [{ kind: 'cacheFlush', minute: 63 }] }).faults[0].minute, 65);
});

test('every starting design runs; the basic one stays up at 2,000 a second', () => {
  for (const t of TEMPLATES) {
    const j = judge({ nodes: t.nodes, edges: t.edges }, lab, sandboxPractice({}), { sample: true });
    assert.ok(j.results.length >= 1, t.id);
    if (t.id === 'blank') assert.notEqual(j.verdict, 'accepted');
  }
  const basic = TEMPLATES.find((t) => t.id === 'basic');
  const j = judge({ nodes: basic.nodes, edges: basic.edges }, lab, sandboxPractice({ rps: 1000 }), { sample: true });
  const load = j.results.find((r) => r.timeline);
  assert.ok(load, 'a load test ran'); assert.ok(load.metrics.availability > 99, `availability ${load.metrics.availability}`);
});

test('a crash the visitor adds shows in the events', () => {
  const t = TEMPLATES.find((x) => x.id === 'basic');
  const j = judge({ nodes: t.nodes, edges: t.edges }, lab, sandboxPractice({ rps: 1000, faults: [{ kind: 'crash', type: 'database', node: 'db', minute: 10 }] }), { sample: true });
  const load = j.results.find((r) => r.timeline);
  assert.ok(load.events.some((e) => e.node === 'db' && (e.kind === 'crashed' || e.kind === 'failover')));
  assert.equal(load.ok, false);
});

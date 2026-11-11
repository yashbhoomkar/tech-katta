// Lab challenges judged by the v2 evaluator (evaluator.md phase 7; src/eval/challenge.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChallenge, challengePractice } from '../eval/challenge.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const lab = { ...read('../../../content/lab.json'), eval: read('../../../content/eval.json') };
// a design that earns every star, per challenge (kept out of content: lab.json is served to everyone)
const refs = read('../eval/fixtures/challenge-references.json');
const C = (id) => lab.challenges.find((c) => c.id === id);
const node = (d, id) => d.nodes.find((n) => n.id === id);

test('every challenge is judged by v2: its start fails the first star, its reference earns every star', () => {
  assert.deepEqual(Object.keys(refs).sort(), lab.challenges.map((c) => c.id).sort());
  for (const ch of lab.challenges) {
    assert.equal(ch.v, 2, ch.id);
    const start = runChallenge(ch.start, lab, ch), ref = runChallenge(refs[ch.id], lab, ch);
    assert.ok(!start.error && start.stars === 0 && !start.checks[0].ok, `${ch.id} start: ${start.error || start.stars}`);
    assert.ok(!ref.error && ref.stars === ref.max, `${ch.id} reference: ${ref.error || `${ref.stars}/${ref.max} ${ref.why[0] || ''}`}`);
  }
});

test('stars are the scenario test\'s checks; the first must be met for any to count', () => {
  const p = challengePractice(C('cache-restart'));
  assert.equal(p.tests.length, 1);
  assert.deepEqual(p.tests[0].checks.map((c) => c.kind), ['slo', 'noCrash', 'cost']);
  assert.deepEqual(p.tests[0].faults, [{ minute: 75, kind: 'crash', type: 'cache' }]);
  // the start of one-server passes the cost goal but earns nothing: it fails the first
  const r = runChallenge(C('one-server').start, lab, C('one-server'));
  assert.equal(r.checks[1].ok, true);
  assert.equal(r.stars, 0);
});

test('each challenge teaches its lesson', () => {
  // an API Gateway bills every request: the rush costs far more than the budget behind one
  const gw = structuredClone(refs['first-rush']);
  gw.nodes = gw.nodes.map((n) => (n.id === 'lb' ? { ...n, type: 'apigw', config: {} } : n));
  const r1 = runChallenge(gw, lab, C('first-rush'));
  assert.ok(r1.checks[0].ok && !r1.checks[1].ok, JSON.stringify(r1.checks));
  // without the cache, reading menus needs more than the database takes
  const noCache = structuredClone(refs['read-heavy']);
  noCache.nodes = noCache.nodes.filter((n) => n.id !== 'cache');
  noCache.edges = noCache.edges.filter((e) => e.from !== 'cache' && e.to !== 'cache').concat([{ from: 'api', to: 'db' }]);
  assert.equal(runChallenge(noCache, lab, C('read-heavy')).checks[0].ok, false);
  // the file work done in the request, not behind a queue, brings the database down at 10 am
  const inline = structuredClone(refs['monday-sync']);
  inline.nodes = inline.nodes.filter((n) => n.id !== 'q' && n.id !== 'work');
  inline.edges = inline.edges.filter((e) => !['q', 'work'].includes(e.from) && !['q', 'work'].includes(e.to));
  assert.equal(runChallenge(inline, lab, C('monday-sync')).checks[0].ok, false);
  // a write-back cache loses the orders it held when it crashes
  const back = structuredClone(refs['lost-orders']);
  node(back, 'cache').config.writePolicy = 'back';
  assert.equal(runChallenge(back, lab, C('lost-orders')).checks[1].ok, false);
  // with the small database, the misses after the cache crash bring it down
  const small = structuredClone(refs['cache-restart']);
  node(small, 'db').config.size = 'db.m5.large';
  assert.equal(runChallenge(small, lab, C('cache-restart')).checks[1].ok, false);
});

test('a design that cannot carry the calls says why instead of scoring', () => {
  const d = structuredClone(refs['one-server']);
  node(d, 'db').config.schema = { tables: [] };
  const r = runChallenge(d, lab, C('one-server'));
  assert.ok(r.error, JSON.stringify(r).slice(0, 200));
});

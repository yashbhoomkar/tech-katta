import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runChallenge, applyChallenge } from './challenges.js';

const lab = JSON.parse(readFileSync(new URL('../../../content/lab.json', import.meta.url)));
const N = (id, type, config = {}) => ({ id, type, x: 0, y: 0, config });
const chain = (...ns) => ({ nodes: ns, edges: ns.slice(1).map((n, i) => ({ from: ns[i].id, to: n.id })) });
// A design that earns every star, per challenge (worked out by hand; see the hints in lab.json).
const solutions = {
  'one-server': chain(N('c', 'client'), N('s', 'server', { size: 'm5.large', count: 4 }), N('d', 'database', { size: 'db.m5.xlarge' })),
  'first-rush': chain(N('c', 'client'), N('lb', 'lb'), N('s', 'server', { size: 'm5.large', count: 2, maxCount: 10, autoscale: true }), N('d', 'database', { size: 'db.r5.2xlarge' })),
  'flash-sale': chain(N('c', 'client'), N('lb', 'lb'), N('s', 'server', { size: 'm5.large', count: 14 }), N('k', 'cache', { size: 'cache.t3.medium' }), N('d', 'database', { size: 'db.m5.xlarge' })),
  'read-heavy': chain(N('c', 'client'), N('lb', 'lb'), N('s', 'server', { size: 'm5.xlarge', count: 5 }), N('k', 'cache', { size: 'cache.m5.large' }), N('d', 'database', { size: 'db.m5.xlarge' })),
  'cache-restart': chain(N('c', 'client'), N('lb', 'lb'), N('s', 'server', { size: 'm5.large', count: 8 }), N('k', 'cache', { size: 'cache.t3.medium' }), N('d', 'database', { size: 'db.r5.2xlarge' })),
  'lost-orders': chain(N('c', 'client'), N('lb', 'lb'), N('s', 'server', { size: 'm5.large', count: 6 }), N('k', 'cache', { size: 'cache.t3.medium', writePolicy: 'through' }), N('d', 'database', { size: 'db.r5.2xlarge' })),
};

test('every challenge starts failing and can be solved with all its stars', () => {
  assert.deepEqual(Object.keys(solutions).sort(), lab.challenges.map((c) => c.id).sort());
  for (const ch of lab.challenges) {
    const start = runChallenge(ch.start, lab, ch);
    assert.equal(start.stars, 0, `${ch.id} start should fail: ${JSON.stringify(start.checks)}`);
    const best = runChallenge(solutions[ch.id], lab, ch);
    assert.equal(best.stars, ch.stars.length, `${ch.id}: ${JSON.stringify(best.checks)}`);
  }
});

test('the challenge owns the traffic: Clients and fixed settings are overridden', () => {
  const ch = lab.challenges.find((c) => c.id === 'read-heavy');
  const d = applyChallenge(chain(N('a', 'client', { rps: 1 }), N('b', 'client', { rps: 1 }), N('s', 'server', { queriesPerRequest: 1 }), N('k', 'cache', { hitPct: 99 })), ch);
  assert.deepEqual(d.nodes.map((n) => n.config), [{ rps: 2500, pattern: 'steady' }, { rps: 2500, pattern: 'steady' }, { queriesPerRequest: 4 }, { hitPct: 85, writePct: 5 }]);
  const cheat = structuredClone(solutions['read-heavy']); cheat.nodes[2].config.queriesPerRequest = 1; cheat.nodes[3].config.hitPct = 99;
  assert.equal(runChallenge(cheat, lab, ch).stars, 3, 'lowering the load in the design changes nothing');
});

test('stars need the availability goal first, and chaos crashes do not count against you', () => {
  const ch = lab.challenges.find((c) => c.id === 'cache-restart');
  const r = runChallenge(solutions['cache-restart'], lab, ch);
  assert.ok(r.events.some((e) => e.kind === 'crashed' && e.forced && e.id === 'k'), 'the chaos crash happened');
  assert.equal(r.crashes, 0);
  const cheap = runChallenge(chain(N('c', 'client'), N('s', 'server', { count: 1 }), N('d', 'database')), lab, lab.challenges.find((c) => c.id === 'one-server'));
  assert.equal(cheap.checks[1].ok, true, 'cheap');
  assert.equal(cheap.stars, 0, 'but nothing counts without availability');
  assert.match(runChallenge({ nodes: [], edges: [] }, lab, ch).error, /Clients/);
});

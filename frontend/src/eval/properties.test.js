// Properties that must always hold (evaluator.md §14.4), over the fixture's designs and 50 designs made by applying
// 1–3 mutants with a seeded generator (never Math.random).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate } from './judge.js';
import { mutants } from './mutants.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const P = JSON.parse(readFileSync(new URL('./fixtures/url-shortener.v2.json', import.meta.url)));

// mulberry32: a tiny seeded generator
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SEEDS = Array.from({ length: 50 }, (_, i) => 1000 + i * 7919);
function generated() {
  return SEEDS.map((seed) => {
    const r = rng(seed); let d = P.reference; const ids = [];
    for (let k = 1 + Math.floor(r() * 3); k > 0; k--) { const ms = mutants(d, lab); if (!ms.length) break; const m = ms[Math.floor(r() * ms.length)]; ids.push(m.id); d = m.design; }
    return [`mutant ${ids.join(' + ')}`, d];
  });
}
const designs = [['reference', P.reference], ['start', P.start], ...P.wrong.map((w) => [`wrong: ${w.name}`, w]), ...generated()];
// the load tests only, to keep the suite fast; trace tests do not depend on numbers
const loadOnly = { ...P, tests: P.tests.filter((t) => t.traffic) };

// every number in a result, with its path
function numbers(x, path = '', out = []) {
  if (typeof x === 'number') out.push([path, x]);
  else if (Array.isArray(x) || (x && typeof x === 'object')) for (const [k, v] of Object.entries(x)) if (k !== 'test') numbers(v, `${path}.${k}`, out);
  return out;
}
const summary = (r) => ({ verdict: r.verdict, results: r.results.map((x) => ({ id: x.id, ok: x.ok, checks: (x.checks || []).map((c) => c.ok), metrics: x.metrics, ops: x.ops && Object.fromEntries(Object.entries(x.ops).map(([k, o]) => [k, [o.availability, o.p99Worst, o.slowShare]])) })) });
const close = (a, b, msg) => {
  const na = numbers(a), nb = numbers(b);
  assert.equal(na.length, nb.length, msg);
  na.forEach(([p, v], i) => assert.ok(Math.abs(v - nb[i][1]) <= 1e-6 * Math.max(1, Math.abs(v)), `${msg} ${p}: ${v} vs ${nb[i][1]}`));
  assert.deepEqual(JSON.parse(JSON.stringify(a, (k, v) => (typeof v === 'number' ? 0 : v))), JSON.parse(JSON.stringify(b, (k, v) => (typeof v === 'number' ? 0 : v))), msg);
};

test('properties: deterministic, bounded, and the bill adds up', () => {
  for (const [name, d] of designs) {
    const a = evaluate(d, lab, loadOnly), b = evaluate(structuredClone(d), lab, structuredClone(loadOnly));
    assert.deepEqual(a, b, `${name}: twice the same`);
    for (const [p, v] of numbers(a)) assert.ok(Number.isFinite(v), `${name} ${p} is ${v}`);
    for (const r of a.results) {
      if (!r.ops) continue;
      for (const o of Object.values(r.ops)) { assert.ok(o.availability >= 0 && o.availability <= 100, name); assert.ok(o.slowShare >= 0 && o.slowShare <= 1, name); }
      for (const k of ['ok']) for (const s of Object.values(r.timeline.ops)) assert.ok(s[k].every((x) => x >= 0 && x <= 1), name);
      const parts = Object.values(r.cost.byNode).reduce((x, y) => x + y, 0) + r.cost.storage + r.cost.transfer;
      assert.ok(Math.abs(r.cost.monthly - parts) <= 1e-6 * Math.max(1, parts), `${name}: cost adds up`);
    }
  }
});

test('properties: the order of nodes and arrows, their ids and their names do not matter', () => {
  for (const [name, d] of designs) {
    const base = summary(evaluate(d, lab, loadOnly));
    const r = rng(name.length * 31 + 7), shuffle = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const rename = new Map(d.nodes.map((n, i) => [n.id, `n${i}_${n.id.length}`]));
    const moved = { nodes: shuffle(d.nodes).map((n) => ({ ...n, id: rename.get(n.id), name: `Renamed ${n.type}` })), edges: shuffle(d.edges).map((e) => ({ ...e, from: rename.get(e.from), to: rename.get(e.to) })) };
    close(summary(evaluate(moved, lab, loadOnly)), base, `${name}: shuffled and renamed`);
  }
});

test('properties: more capacity and less traffic never hurt', () => {
  for (const [name, d] of designs) {
    const base = evaluate(d, lab, loadOnly);
    const availability = (r) => r.results.flatMap((x) => (x.ops ? Object.values(x.ops).map((o) => o.availability) : []));
    // one more instance of every Service (§14.4 item 3: availability of whole operations)
    const more = structuredClone(d);
    for (const n of more.nodes) if (n.type === 'server') n.config = { ...n.config, count: Math.min(50, (n.config?.count || 2) + 1) };
    const a0 = availability(base), a1 = availability(evaluate(more, lab, loadOnly));
    // only where everything downstream of the Services stayed below 100%: a faster front sends more to the back, and
    // once a node is overloaded its crash timers make outcomes non-monotone (evaluator.md §18, phase 2)
    const calm = base.results.flatMap((x) => (x.ops ? Object.values(x.ops).map(() => Object.entries(x.timeline.nodes).every(([id, n]) => d.nodes.find((y) => y.id === id)?.type === 'server' || Math.max(0, ...n.rho) < 1)) : []));
    a0.forEach((v, i) => assert.ok(!calm[i] || a1[i] >= v - 1e-6, `${name}: more instances lowered availability ${v} → ${a1[i]}`));
    // half the traffic
    const half = { ...loadOnly, tests: loadOnly.tests.map((t) => ({ ...t, traffic: { ...t.traffic, rps: t.traffic.rps / 2 } })) };
    const h = evaluate(d, lab, half);
    // p99 only where the base run was healthy: once nodes crash, the worst tick compares different failures
    const healthy = base.results.flatMap((x) => (x.ops ? Object.values(x.ops).map((o) => o.availability >= 99 && !x.events.some((e) => e.kind === 'crashed' && !e.forced)) : []));
    const p99 = (r) => r.results.flatMap((x) => (x.ops ? Object.values(x.ops).map((o) => o.p99Worst) : []));
    availability(h).forEach((v, i) => assert.ok(!calm[i] || v >= a0[i] - 1e-6, `${name}: half the traffic lowered availability ${a0[i]} → ${v}`));
    const p0 = p99(base);
    // fewer reads can lower a cache's hit rate (items expire before they are asked for again), so p99 may rise a
    // little: at most 2% + 1 ms (evaluator.md §18, phase 2)
    p99(h).forEach((v, i) => assert.ok(!healthy[i] || v <= p0[i] * 1.02 + 1 || p0[i] === 0, `${name}: half the traffic raised p99 ${p0[i]} → ${v}`));
  }
});

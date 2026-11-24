// Copy detection (B2 of the judge audit): by structure, not ids; a near copy is a copy; browser and server agree.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { copyOf, sameDesign } from './judge.js';
import { cleanDesign } from '../lab/store.js';

const content = new URL('../../../content/', import.meta.url);
const lab = { ...JSON.parse(readFileSync(new URL('lab.json', content))), eval: JSON.parse(readFileSync(new URL('eval.json', content))) };
const dir = new URL('articles/interview-questions/', content);
const problems = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir)))).filter((a) => a.practice);

const clone = (x) => structuredClone(x);
// what the canvas hands in: cleaned as the problem's own (v 2)
const canvas = (d, a) => cleanDesign({ ...d, v: 2 }, lab, 'mine');
// the same design rebuilt by hand: fresh ids, parts and arrows in another order
const rebuilt = (d) => { const ids = new Map(d.nodes.map((n, i) => [n.id, `n${(i * 7 + 3) % 97}x${i}`])); return { ...d, nodes: d.nodes.map((n) => ({ ...n, id: ids.get(n.id) })).reverse(), edges: d.edges.map((e) => ({ ...e, from: ids.get(e.from), to: ids.get(e.to) })).reverse() }; };
const bump = (d, pick, by) => { const done = new Set(); return { ...d, nodes: d.nodes.map((n) => (pick(n, done) ? { ...n, config: { ...n.config, count: (n.config.count ?? lab.eval.components.find((c) => c.type === n.type).settings.find((s) => s.key === 'count').default) + by } } : n)) }; };

test('an exact copy, a rebuilt copy, a renamed and moved copy, and +1 instance are all copies', () => {
  for (const a of problems) {
    const p = a.practice, ref = p.reference;
    assert.ok(copyOf(ref, ref, lab, p), `${a.slug} exact`);
    assert.ok(copyOf(rebuilt(ref), ref, lab, p), `${a.slug} fresh ids`);
    assert.ok(copyOf({ ...ref, nodes: ref.nodes.map((n) => ({ ...n, name: 'Mine', x: n.x + 40, y: n.y - 20 })) }, ref, lab, p), `${a.slug} renamed and moved`);
    const srv = ref.nodes.find((n) => n.type === 'server');
    assert.ok(copyOf(bump(ref, (n) => n.id === srv.id, 1), ref, lab, p), `${a.slug} +1 instance`);
    assert.ok(copyOf(bump(ref, (n) => n.type === 'server', -1), ref, lab, p), `${a.slug} -1 instance on every Service`);
    assert.ok(copyOf(rebuilt(bump(ref, (n) => n.id === srv.id, 1)), ref, lab, p), `${a.slug} rebuilt and +1`);
  }
});
test('a different design is not a copy: two steps off, another type, an arrow less, the start, every wrong design', () => {
  for (const a of problems) {
    const p = a.practice, ref = p.reference;
    const srv = ref.nodes.find((n) => n.type === 'server');
    assert.ok(!copyOf(bump(ref, (n) => n.id === srv.id, 3), ref, lab, p), `${a.slug} +3 instances`);
    const swapped = { ...ref, nodes: ref.nodes.map((n) => (n.type === 'lb' ? { ...n, type: 'cdn' } : n)) };
    assert.ok(!copyOf(swapped, ref, lab, p), `${a.slug} the load balancer is a CDN`);
    assert.ok(!copyOf({ ...ref, edges: ref.edges.slice(1) }, ref, lab, p), `${a.slug} an arrow less`);
    assert.ok(!copyOf(p.start, ref, lab, p), `${a.slug} start`);
    // a wrong design is a near copy only when it differs from the reference by capacity alone, one step each (one more
    // step makes it the reference); anything else is a different design
    for (const w of p.wrong) {
      if (!copyOf(w, ref, lab, p)) continue;
      const strip = (d) => JSON.stringify({ n: d.nodes.map((x) => [x.id, x.type, Object.fromEntries(Object.entries(x.config || {}).filter(([k]) => !['count', 'maxCount', 'nodes', 'shards', 'replicas', 'partitions', 'parallelism', 'size'].includes(k)))]).sort(), e: d.edges.map((x) => `${x.from}>${x.to}`).sort() });
      assert.equal(strip(w), strip(ref), `${a.slug} wrong design ${w.name} counts as a copy but differs by more than capacity`);
    }
  }
});
test('a size one step up or down is a near copy; two steps is not', () => {
  const a = problems.find((x) => x.practice.reference.nodes.some((n) => n.type === 'server' && n.config.size)), ref = a.practice.reference;
  const srv = ref.nodes.find((n) => n.type === 'server' && n.config.size), ids = lab.components.find((c) => c.type === 'server').sizes.map((s) => s.id), i = ids.indexOf(srv.config.size);
  const at = (j) => ({ ...ref, nodes: ref.nodes.map((n) => (n.id === srv.id ? { ...n, config: { ...n.config, size: ids[j] } } : n)) });
  if (ids[i + 1]) assert.ok(sameDesign(at(i + 1), ref, lab));
  if (ids[i + 2]) assert.ok(!sameDesign(at(i + 2), ref, lab));
});
test('the browser and the server agree: the Solution tab sends no v mark, the canvas does, and an exact copy is a copy on both', () => {
  for (const a of problems) {
    const p = a.practice;
    const sol = { nodes: p.reference.nodes, edges: p.reference.edges };       // GET /v1/articles/<slug>/solution
    const mine = canvas(p.reference, a);                                      // what Canvas.jsx hands over: v 2
    assert.equal(mine.v, 2);
    assert.equal(sol.v, undefined);
    assert.equal(copyOf(mine, sol, lab, p), true, `${a.slug}: browser`);
    // the server judges the submitted design (cleaned as v 2) against the reference with the same helper
    assert.equal(copyOf(cleanDesign({ ...mine, v: 2 }, lab, 'submitted'), p.reference, lab, p), true, `${a.slug}: server`);
  }
});
test('nothing is not a copy', () => {
  assert.equal(copyOf(null, null, lab, {}), false);
  assert.equal(sameDesign({ nodes: [], edges: [] }, { nodes: [], edges: [] }), false);
});

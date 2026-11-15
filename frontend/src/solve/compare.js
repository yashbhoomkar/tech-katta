// Compare a submission with the one before it (context 36, step 5): what changed on the canvas, and what changed in the
// results. Plain functions, so they can be tested without a browser.

// The settings worth naming when they change, in words a learner recognises; anything else is "settings changed".
const WORDS = { count: 'instances', size: 'size', zones: 'zones', nodes: 'nodes', replicas: 'read replicas', multiAz: 'standby in another zone', ttlSec: 'keeps items for (s)', engine: 'engine', shards: 'shards', autoscale: 'autoscale', maxCount: 'at most', replica: 'replica', writePolicy: 'writes', readFrom: 'reads go to', replication: 'replication', partitions: 'partitions', parallelism: 'parallelism', dlq: 'dead-letter queue', count2: 'count' };
const show = (v) => (v === true ? 'on' : v === false ? 'off' : v === undefined || v === null || v === '' ? 'default' : typeof v === 'object' ? 'changed' : String(v));

// Lines describing how design `b` differs from design `a` (both {nodes, edges}); `nameOf(node)` names a part.
export function diffDesigns(a, b, nameOf = (n) => n.name || n.type) {
  if (!a || !b) return [];
  const out = [], A = new Map((a.nodes || []).map((n) => [n.id, n])), B = new Map((b.nodes || []).map((n) => [n.id, n]));
  for (const [id, n] of B) if (!A.has(id)) out.push({ kind: 'add', text: `Added ${nameOf(n)}` });
  for (const [id, n] of A) if (!B.has(id)) out.push({ kind: 'remove', text: `Removed ${nameOf(n)}` });
  for (const [id, nb] of B) {
    const na = A.get(id); if (!na) continue;
    const ca = na.config || {}, cb = nb.config || {}, keys = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].filter((k) => JSON.stringify(ca[k]) !== JSON.stringify(cb[k]));
    if (!keys.length) continue;
    const named = keys.filter((k) => WORDS[k] && typeof (ca[k] ?? cb[k]) !== 'object').map((k) => `${WORDS[k]} ${show(ca[k])} → ${show(cb[k])}`);
    const other = keys.filter((k) => !(WORDS[k] && typeof (ca[k] ?? cb[k]) !== 'object'));
    out.push({ kind: 'change', text: `${nameOf(nb)}: ${[...named, ...(other.length ? [other.includes('schema') ? 'schema changed' : 'other settings changed'] : [])].join(', ')}` });
  }
  const key = (e) => `${e.from}>${e.to}`, ea = new Set((a.edges || []).map(key)), eb = new Set((b.edges || []).map(key));
  const label = (d, id) => { const n = (d.nodes || []).find((x) => x.id === id); return n ? nameOf(n) : id; };
  for (const e of b.edges || []) if (!ea.has(key(e))) out.push({ kind: 'add', text: `Arrow added: ${label(b, e.from)} → ${label(b, e.to)}` });
  for (const e of a.edges || []) if (!eb.has(key(e))) out.push({ kind: 'remove', text: `Arrow removed: ${label(a, e.from)} → ${label(a, e.to)}` });
  return out;
}

// What a submission keeps about its tests, small enough for localStorage.
export const testSummary = (results) => (results || []).map((r) => ({ id: r.test?.id ?? r.id, name: r.test?.name ?? r.id, ok: !!r.ok, ...(r.metrics ? { a: r.metrics.availability, p: r.metrics.p99, c: r.metrics.avgMonthly } : {}) }));

// How `now` (a submission with tests) compares with `prev`: score and cost deltas, tests that turned, and per-test changes.
export function compareSubs(prev, now) {
  if (!prev?.tests || !now?.tests) return null;
  const P = new Map(prev.tests.map((t) => [t.id, t]));
  const fixed = [], broke = [], moved = [];
  for (const t of now.tests) {
    const p = P.get(t.id); if (!p) continue;
    if (t.ok && !p.ok) fixed.push(t.name); else if (!t.ok && p.ok) broke.push(t.name);
    else if (t.c !== undefined && p.c !== undefined && Math.abs(t.c - p.c) >= 1) moved.push({ name: t.name, from: p.c, to: t.c });
  }
  return { score: now.score != null && prev.score != null ? now.score - prev.score : null, cost: now.cost != null && prev.cost != null ? now.cost - prev.cost : null, passed: now.passed - prev.passed, fixed, broke, at: prev.at };
}

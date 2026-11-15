// Checked repairs (context 36, step 22; after spec 22 §9.2): after a failure, one-step changes the simulator has tried
// and confirmed. Each makes the first failing load test pass and keeps every test that passed passing. Only settings
// on parts already on the canvas; never a new part, never removing one. Pure.
import { evaluate, isTrace } from './judge.js';

// Bigger by one step: the next size up, a quarter more or twice the instances or nodes, one more replica, twice the
// shards, a second zone, and the safety switches turned on.
const GROW = { count: [(v) => Math.max(v + 1, Math.ceil(v * 1.25)), (v) => v * 2], nodes: [(v) => v + 1, (v) => v * 2], replicas: [(v) => v + 1], shards: [(v) => v * 2], parallelism: [(v) => v * 2], partitions: [(v) => v * 2], zones: [(v) => (v < 2 ? 2 : v + 1)] };
const SWITCH_ON = ['multiAz', 'replica', 'autoscale'];

export function biggerSteps(node, lab) {
  const comp = (lab?.components || []).find((c) => c.type === node.type), ev = (lab?.eval?.components || []).find((c) => c.type === node.type);
  if (!ev) return [];
  const cfg = node.config || {}, out = [];
  if (Array.isArray(comp?.sizes) && comp.sizes.length) {
    const cur = cfg.size ?? comp.defaultSize, i = comp.sizes.findIndex((s) => s.id === cur);
    if (i >= 0 && i < comp.sizes.length - 1) out.push({ field: 'size', label: 'Size', from: cur, to: comp.sizes[i + 1].id });
  }
  for (const s of ev.settings || []) {
    const cur = cfg[s.key] ?? s.default;
    if (s.kind === 'number' && GROW[s.key] && typeof cur === 'number') {
      const seen = new Set();
      for (const g of GROW[s.key]) { const to = Math.min(s.max ?? Infinity, g(cur)); if (to > cur && !seen.has(to)) { seen.add(to); out.push({ field: s.key, label: s.label, from: cur, to }); } }
    } else if (s.kind === 'bool' && SWITCH_ON.includes(s.key) && !cur) out.push({ field: s.key, label: s.label, from: false, to: true });
  }
  return out;
}

const apply = (design, id, st) => ({ ...design, nodes: design.nodes.map((n) => (n.id === id ? { ...n, config: { ...(n.config || {}), [st.field]: st.to } } : n)) });
const nameOf = (n, lab) => n.name || (lab?.components || []).find((c) => c.type === n.type)?.name || n.type;

// -> { test: {id, name}, repairs: [{part, name, field, label, from, to, extra}], tried, runs } | { reason } when nothing
// can be checked this way (the design doesn't run, or the first failure is about wiring, not capacity).
export function repairs(design, lab, practice, { keep = 2, verify = 5 } = {}) {
  const all = evaluate(design, lab, practice);
  if (all.verdict === 'accepted') return { reason: 'accepted' };
  if (all.verdict === 'error') return { reason: 'error' };
  const first = all.results.find((r) => !r.ok);
  if (!first || isTrace(first.test)) return { reason: 'wiring', test: first && { id: first.id, name: first.test?.name } };
  if ((first.checks || []).some((c) => !c.ok && c.kind === 'cost') && (first.checks || []).filter((c) => !c.ok).every((c) => c.kind === 'cost')) return { reason: 'cost', test: { id: first.id, name: first.test?.name } };
  const passing = new Set(all.results.filter((r) => r.ok).map((r) => r.id)), base = first.metrics?.avgMonthly ?? 0;
  let runs = 1;
  const cands = [];
  for (const n of design.nodes) {
    for (const st of biggerSteps(n, lab)) {
      const d = apply(design, n.id, st), r = evaluate(d, lab, { ...practice, tests: [first.test] }); runs++;
      if (r.verdict === 'accepted') cands.push({ n, st, d, extra: (r.results[0].metrics?.avgMonthly ?? 0) - base });
    }
  }
  cands.sort((a, b) => a.extra - b.extra);
  const out = [];
  for (const c of cands.slice(0, verify)) {
    if (out.length >= keep) break;
    const r = evaluate(c.d, lab, practice); runs++;
    if (r.results.filter((x) => x.ok).some((x) => x.id === first.id) && [...passing].every((id) => r.results.find((x) => x.id === id)?.ok)) {
      out.push({ part: c.n.id, name: nameOf(c.n, lab), field: c.st.field, label: c.st.label, from: c.st.from, to: c.st.to, extra: c.extra, passedAfter: r.passed, total: r.total });
    }
  }
  return { test: { id: first.id, name: first.test?.name || first.id }, repairs: out, tried: cands.length, runs };
}

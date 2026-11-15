// Probes: questions no test asks (context 36, step 16; after spec 22 §7.3 and §7.6, on the v2 evaluator).
//   headroom: how many times the busiest fault-free load test the design holds before something gives.
//   waste: an Accepted design made one step smaller at a time (a smaller size, one unit fewer) while every test passes.
// Pure; both are run on demand from the results console. Neither changes the design on the canvas.
import { evaluate, isTrace } from './judge.js';

const GRID = [1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16], DOWN = [0.75, 0.5, 0.25, 0.1], BISECT = 6;

// The busiest visible load test with no faults (ties: the first); its checks without the bill.
export function baseTest(practice) {
  let best = null;
  for (const t of practice?.tests || []) {
    if (isTrace(t) || !t.traffic || (t.faults || []).length) continue;
    if (!best || (t.traffic.rps || 0) > (best.traffic.rps || 0)) best = t;
  }
  return best;
}

const scaled = (t, m) => ({ ...t, id: `${t.id}~x${m}`, traffic: { ...t.traffic, rps: (t.traffic.rps || 0) * m }, checks: (t.checks || []).filter((c) => c.kind !== 'cost') });

// -> { m, base: {id, name, rps}, first: the first reason it gave at the next step up, runs } or null with no base test.
export function headroom(design, lab, practice) {
  const base = baseTest(practice);
  if (!base) return null;
  let runs = 0;
  const run = (m) => { runs++; const r = evaluate(design, lab, { ...practice, tests: [scaled(base, m)] }); return { ok: r.verdict === 'accepted', why: r.results[0]?.why?.[0] || r.results[0]?.error || '' }; };
  let lo = null, hi = null, why = '';
  const first = run(1);
  if (first.ok) {
    lo = 1;
    for (const m of GRID.slice(1)) { const r = run(m); if (r.ok) lo = m; else { hi = m; why = r.why; break; } }
  } else {
    hi = 1; why = first.why; lo = 0;
    for (const m of DOWN) { const r = run(m); if (r.ok) { lo = m; break; } hi = m; why = r.why; }
  }
  if (hi !== null && lo > 0) for (let i = 0; i < BISECT; i++) { const mid = (lo + hi) / 2, r = run(mid); if (r.ok) lo = mid; else { hi = mid; why = r.why; } }
  return { m: Math.floor(lo * 10) / 10, exact: lo, capped: hi === null, base: { id: base.id, name: base.name, rps: base.traffic.rps }, first: hi === null ? '' : why, runs };
}

// Each one-step-smaller change of a part: a smaller size, or one fewer of any setting with a minimum (instances,
// replicas, nodes, shards, ...). Never removes a part.
export function smallerSteps(node, comp) {
  if (!comp) return [];
  const cfg = node.config || {}, out = [];
  if (Array.isArray(comp.sizes) && comp.sizes.length) {
    const cur = cfg.size ?? comp.defaultSize, i = comp.sizes.findIndex((s) => s.id === cur);
    if (i > 0) out.push({ field: 'size', from: cur, to: comp.sizes[i - 1].id });
  }
  for (const [k, v] of Object.entries(comp)) {
    if (!v || typeof v !== 'object' || Array.isArray(v) || typeof v.min !== 'number') continue;
    const cur = typeof cfg[k] === 'number' ? cfg[k] : typeof v.default === 'number' ? v.default : null;
    if (cur !== null && cur > v.min) out.push({ field: k, from: cur, to: cur - 1 });
  }
  return out;
}

const monthly = (r) => r.metrics?.avgMonthly ?? 0;
const withStep = (design, id, s) => ({ ...design, nodes: design.nodes.map((n) => (n.id === id ? { ...n, config: { ...(n.config || {}), [s.field]: s.to } } : n)) });

// -> { before, after, saving, changes: [{part, name, field, from, to}], runs, partial } or null unless Accepted.
export function waste(design, lab, practice, { maxRuns = 40 } = {}) {
  const comps = Object.fromEntries((lab?.components || []).map((c) => [c.type, c]));
  let cur = design, res = evaluate(cur, lab, practice), runs = 1;
  if (res.verdict !== 'accepted') return null;
  const before = monthly(res), changes = [];
  const costOf = (r) => { const load = r.results.filter((x) => x.cost?.byNode); return load.length ? load[load.length - 1].cost.byNode : {}; };
  let changed = true;
  while (changed && runs < maxRuns) {
    changed = false;
    const by = costOf(res), order = [...cur.nodes].sort((a, b) => (by[b.id] || 0) - (by[a.id] || 0));
    for (const n of order) {
      for (const s of smallerSteps(n, comps[n.type])) {
        if (runs >= maxRuns) break;
        const cand = withStep(cur, n.id, s), r = evaluate(cand, lab, practice); runs++;
        if (r.verdict === 'accepted' && monthly(r) < monthly(res) - 1e-9) {
          cur = cand; res = r; changed = true;
          const prev = changes.find((c) => c.part === n.id && c.field === s.field);
          if (prev) prev.to = s.to; else changes.push({ part: n.id, name: n.name || comps[n.type]?.name || n.type, field: s.field, label: s.field === 'size' ? 'Size' : comps[n.type]?.[s.field]?.label || s.field, from: s.from, to: s.to });
          break;
        }
      }
      if (changed || runs >= maxRuns) break;
    }
  }
  const after = monthly(res);
  return { before, after, saving: before - after, changes, runs, partial: runs >= maxRuns };
}

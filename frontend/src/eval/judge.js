// Stage 5: judge (everything → verdict, score, feedback), evaluator.md §11.
//
//   evaluate(design, lab, practice, { sample }) → Result (v1's shape from judge/judge.js, plus designPoints,
//                                                   findings and plans)
import { compile } from './compile.js';
import { runTrace } from './trace.js';
import { simulateTest } from './simulate.js';
import { analyse } from './analyse.js';
import { faultsOf } from './faults.js';
import { configOf, evalCatalogue } from './design.js';
import { WHY, checkLabel } from './words.js';
import { slowShare } from './latency.js';

export const AREAS = { function: 15, scale: 15, resilience: 10, correctness: 5, cost: 5 };
export const NOT_READY = 'This problem needs a newer version of the site. Refresh the page.';
const CORRECTNESS = new Set(['noLostWrites', 'noDuplicates', 'ordered', 'atomic', 'fresh']);
const MAX_FINDINGS = 12;

export const isTrace = (t) => typeof t?.op === 'string' && !t.traffic;
const clockOf = (min) => { const m = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60; return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
// share of one tick's calls slower than `limit` ms, from that tick's latency moments
const slowOf = (tk, i, limit) => slowShare({ F: tk.F[i], M: tk.M[i], V: tk.V[i] }, limit);
const pct = (x) => (x >= 99.95 && x < 100 ? Math.floor(x * 100) / 100 : Math.round(x * 100) / 100);

// The area a check counts for (§11.3).
export function areaOf(test, check) {
  if (isTrace(test)) return 'function';
  if (check.kind === 'cost') return 'cost';
  if (CORRECTNESS.has(check.kind)) return 'correctness';
  return faultsOf(test).length ? 'resilience' : 'scale';
}
// Design points out of 50: each area's points × its share of checks passed; empty areas give theirs to the rest.
export function designPoints(results) {
  const tally = Object.fromEntries(Object.keys(AREAS).map((a) => [a, { n: 0, ok: 0 }]));
  for (const r of results) for (const c of r.checks || []) { const a = areaOf(r.test, c); tally[a].n++; if (c.ok) tally[a].ok++; }
  const used = Object.keys(AREAS).filter((a) => tally[a].n > 0), sum = used.reduce((x, a) => x + AREAS[a], 0);
  if (!sum) return 0;
  return used.reduce((x, a) => x + (AREAS[a] * 50 / sum) * (tally[a].ok / tally[a].n), 0);
}

function loadChecks(test, sim, findings, compiled, practice, lab) {
  const ops = practice.operations || [], g = compiled.graph, cat = evalCatalogue(lab);
  const name = (id) => { const n = g.byId.get(id); return n?.name || cat[n?.type]?.name || id; };
  const D = sim.tickMinutes, hasF = (code, op) => findings.some((f) => f.code === code && f.severity === 'fail' && (!op || f.op === op));
  const opsFor = (c) => (c.op ? ops.filter((o) => o.id === c.op) : ops.filter((o) => !o.source || o.source === 'clients'));
  const windowOf = (c) => [Math.max(0, Math.floor((c.from ?? 0) / D)), Math.min(sim.T, Math.ceil((c.to ?? sim.T * D) / D))];
  return (test.checks || []).map((c) => {
    if (c.kind === 'slo') {
      const [a, b] = windowOf(c);
      let ok = true, value = null, detail = null, worst = Infinity, failing = null;
      for (const op of opsFor(c)) {
        const tk = sim.ticks[op.id], wantA = c.availability ?? op.slo?.availability, wantP = c.p99Ms ?? op.slo?.p99Ms;
        let calls = 0, good = 0, slow = 0;
        for (let i = a; i < b; i++) { calls += tk.calls[i]; good += tk.ok[i]; if (wantP !== undefined && tk.calls[i] > 0) slow += tk.calls[i] * slowOf(tk, i, wantP); }
        const avail = calls > 0 ? (100 * good) / calls : 100, slowShare = calls > 0 ? slow / calls : 0;
        const badA = wantA !== undefined && avail < wantA - 1e-9, badP = wantP !== undefined && slowShare > 0.01 + 1e-9, unplanned = !compiled.plans[op.id]?.ok;
        if (avail < worst) { worst = avail; value = `${pct(avail)}%`; detail = op.id; }
        if ((badA || badP || unplanned) && !failing) { failing = { op, avail, slowShare, badA: badA || unplanned, wantA, wantP, a, b }; value = failing.badA ? `${pct(avail)}%` : `${pct(slowShare * 100)}% slower than ${wantP} ms`; }
        ok = ok && !(badA || badP || unplanned);
      }
      return { ...c, ok, value, detail: failing ? failing.op.id : detail, failing };
    }
    if (c.kind === 'completes') {
      let ok = true, value = 0, failing = null;
      for (const op of opsFor(c)) for (const s of op.steps || []) {
        const dd = sim.ops[op.id]?.deferred?.[s.id]; if (!dd) continue;
        const within = c.withinSec ?? s.withinSec ?? 60;
        if (dd.worstDelaySec > value) value = dd.worstDelaySec;
        if (dd.worstDelaySec > within + 1e-9 || dd.notDone > 0) { ok = false; failing = failing || { op, step: s, dd, within }; }
      }
      return { ...c, ok, value: Math.round(value), failing };
    }
    if (c.kind === 'noCrash') {
      const ev = sim.events.filter((e) => (e.kind === 'crashed' || e.kind === 'failover') && !e.forced && (!c.type || g.byId.get(e.node)?.type === c.type));
      return { ...c, ok: ev.length === 0, value: ev.length, first: ev[0] || null };
    }
    if (c.kind === 'noLostWrites') {
      const bad = sim.lost > 0 || sim.events.some((e) => e.kind === 'eventsLost') || ['F_NOT_DURABLE', 'F_WRITE_BACK', 'F_NO_CATCH_UP'].some((k) => hasF(k));
      return { ...c, ok: !bad, value: Math.round(sim.lost) };
    }
    if (c.kind === 'noDuplicates') return { ...c, ok: !hasF('F_DOUBLE', c.op) && !hasF('F_SCHED_TWICE', c.op), value: null };
    if (c.kind === 'ordered') return { ...c, ok: !hasF('F_ORDER', c.op), value: null };
    if (c.kind === 'atomic') return { ...c, ok: !opsFor(c).some((o) => compiled.plans[o.id]?.error?.code === 'E_TX_SPLIT') && !hasF('F_DUAL_WRITE', c.op), value: null };
    if (c.kind === 'fresh') return { ...c, ok: !opsFor(c).some((o) => hasF('F_STALE', o.id)), value: null };
    if (c.kind === 'fits') return { ...c, ok: !['F_STORAGE', 'F_CACHE_FULL', 'F_RETENTION'].some((k) => hasF(k)), value: null };
    if (c.kind === 'cost') return { ...c, ok: sim.cost.monthly <= c.max + 1e-9, value: Math.round(sim.cost.monthly) };
    if (c.kind === 'has') {
      const used = new Set(); const walk = (h) => { used.add(h.node); h.children.forEach(walk); };
      for (const p of Object.values(compiled.plans)) (p.roots || []).forEach(walk);
      const n = compiled.design.nodes.filter((x) => x.type === c.type && used.has(x.id)).length;
      return { ...c, ok: n > 0, value: n };
    }
    return { ...c, ok: false, value: null };
  });
}

// One or two sentences for each failed check (§11.4).
function explain(test, checks, sim, findings, compiled, practice, lab) {
  const g = compiled.graph, cat = evalCatalogue(lab), D = sim.tickMinutes, start = (test.startHour || 0) * 60;
  const name = (id) => { const n = g.byId.get(id); return n?.name || cat[n?.type]?.name || id; };
  const tl = sim.timeline, k = Math.max(1, Math.round(tl.tickMinutes / D));
  const rhoAt = (id, i) => tl.nodes[id]?.rho[Math.floor(i / k)] ?? 0;
  const upAt = (id, i) => { const n = tl.nodes[id], j = Math.floor(i / k); if (!n) return 1; return n.up[j] && !(g.byId.get(id)?.type === 'server' && n.instances[j] === 0) ? 1 : 0; };
  const why = [];
  for (const c of checks) {
    if (c.ok) continue;
    if (c.kind === 'slo' && c.failing) {
      const { op, badA, a, b, wantA, wantP } = c.failing, plan = compiled.plans[op.id];
      if (!plan?.ok) { why.push(WHY.planError(op.name || op.id, plan?.error?.message || '')); continue; }
      const tk = sim.ticks[op.id]; let tw = a, worst = -1;
      for (let i = a; i < b; i++) { const v = tk.calls[i] > 0 ? (badA ? 1 - tk.ok[i] / tk.calls[i] : slowOf(tk, i, wantP)) : 0; if (v > worst + 1e-12) { worst = v; tw = i; } }
      const nodes = []; const walk = (h) => { if (!nodes.includes(h.node) && h.kind !== 'source') nodes.push(h.node); h.children.forEach((x) => { if (x.sync) walk(x); }); };
      (plan.roots || []).forEach(walk);
      let culprit = nodes.find((id) => !upAt(id, tw)) || nodes.find((id) => rhoAt(id, tw) >= 1) || null;
      if (!culprit) culprit = nodes.reduce((best, id) => (rhoAt(id, tw) > rhoAt(best, tw) + 1e-12 ? id : best), nodes[0]);
      const r = rhoAt(culprit, tw), down = !upAt(culprit, tw), type = g.byId.get(culprit)?.type, cfg = configOf(g.byId.get(culprit), lab);
      const state = down ? 'was down' : r >= 0.7 ? `was at ${Math.round(r * 100)}% of what it can take` : 'was on the path';
      const share = tk.calls[tw] > 0 ? (badA ? 1 - tk.ok[tw] / tk.calls[tw] : slowOf(tk, tw, wantP)) * 100 : 0;
      let s = badA ? WHY.sloAvail(clockOf(start + tw * D), name(culprit), state, pct(share), op.name || op.id, pct(100 - (wantA ?? 100))) : WHY.sloSlow(clockOf(start + tw * D), name(culprit), state, pct(share), op.name || op.id, wantP);
      const t0 = tw * D, trig = sim.events.filter((e) => e.t <= t0 && e.t >= t0 - 15 && (e.node === culprit || e.node === null)).at(-1);
      const fault = faultsOf(test).filter((f) => f.minute <= t0 && f.minute >= t0 - 15).at(-1);
      const words = (e) => ({ crashed: `${name(e.node)} crashed`, failover: `${name(e.node)} failed over to its standby`, cold: `${name(e.node)} came back empty`, zoneDown: 'a zone went dark', scaledOut: `${name(e.node)} started adding instances`, backlog: `${name(e.node)} began to fill`, recovered: `${name(e.node)} came back` }[e.kind]);
      if (trig && words(trig)) s += WHY.trigger(words(trig));
      else if (fault) s += WHY.trigger({ spike: `traffic jumped to ${fault.factor ?? 2} times the usual`, cacheFlush: 'the cache was emptied', zoneDown: 'a zone went dark', slow: `a ${fault.type || 'component'} slowed down`, crash: `a ${fault.type} crashed`, groupDown: `a bad deploy took down a ${fault.type}`, instanceCrash: 'an instance crashed' }[fault.kind] || 'a fault began');
      let advice;
      if (type === 'server') {
        const zoneOn = sim.events.some((e) => e.kind === 'zoneDown' && e.t <= t0) && !sim.events.some((e) => e.kind === 'zoneBack' && e.t <= t0);
        // limited by its calls in progress then, or in the minutes before it crashed
        const j = Math.floor(tw / k), from = Math.max(0, Math.floor((tw - 15 / D) / k)), lim = tl.nodes[culprit]?.callsLimit || [], hs = tl.nodes[culprit]?.held || [];
        let jj = -1; for (let x = j; x >= from; x--) if (lim[x]) { jj = x; break; }
        const byCalls = jj >= 0, held = byCalls ? hs[jj] || 0 : 0;
        advice = zoneOn && (cfg.zones || 1) <= 1 ? WHY.serverZone() : byCalls ? WHY.serverHeld(Math.round(held), cat.server?.concurrency ?? 256, cfg.timeoutMs ?? 1000) : WHY.serverOver(cat.server?.autoscaling?.warmupMinutes ?? 4);
      }
      else if (type === 'database') {
        if (down) advice = WHY.dbDown(cat.database?.crash?.failoverMinutes ?? 2, cat.database?.crash?.downMinutes ?? 30);
        else {
          const reads = []; const look = (h) => { if (h.node === culprit && h.kind === 'store') reads.push(h); h.children.forEach(look); };
          for (const p of Object.values(compiled.plans)) (p.roots || []).forEach(look);
          const rd = reads.filter((h) => !h.write).sort((x, y) => y.work - x.work)[0];
          advice = rd && reads.filter((h) => !h.write).length >= reads.filter((h) => h.write).length ? WHY.dbReads(`the ${rd.step} step`, +rd.work.toFixed(2), rd.how) : WHY.dbWrites();
        }
      } else if (type === 'cache') {
        const cold = sim.events.some((e) => e.node === culprit && e.kind === 'cold' && e.t <= t0 && e.t >= t0 - 15);
        advice = cold ? WHY.cacheCold(name(g.out.get(culprit)?.[0])) : WHY.cacheOver();
      } else if (['lb', 'apigw', 'queue', 'cdn'].includes(type) && r >= 1) advice = WHY.limit(cat[type]?.limitRps || 0);
      else advice = WHY.path(nodes.length, nodes.map(name).join(', '));
      why.push(`${s} ${advice}`);
    } else if (c.kind === 'completes' && c.failing) {
      const { step, dd, within } = c.failing;
      why.push(WHY.completes(step.label || `${step.op} ${step.entity || ''}`.trim(), Math.round(dd.worstDelaySec), within) + (dd.notDone > 0 ? WHY.notDone(dd.notDone) : ''));
    } else if (c.kind === 'cost') {
      const top = Object.entries(sim.cost.byNode).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([id, v]) => `${name(id)} $${Math.round(v).toLocaleString('en-US')}`).join(', ');
      why.push(WHY.cost(sim.cost.monthly, c.max, top));
    } else if (c.kind === 'noCrash' && c.first) why.push(WHY.crash(name(c.first.node), clockOf(start + c.first.t)));
    else if (c.kind === 'has') why.push(WHY.has(cat[c.type]?.name || c.type));
    else {
      const codes = { noLostWrites: ['F_NOT_DURABLE', 'F_WRITE_BACK', 'F_NO_CATCH_UP'], noDuplicates: ['F_DOUBLE', 'F_SCHED_TWICE'], ordered: ['F_ORDER'], atomic: ['F_DUAL_WRITE'], fresh: ['F_STALE'], fits: ['F_STORAGE', 'F_CACHE_FULL', 'F_RETENTION'] }[c.kind] || [];
      const f = findings.find((x) => codes.includes(x.code) && x.severity === 'fail' && (!c.op || x.op === c.op));
      if (f) why.push(WHY.finding(f));
      else if (c.kind === 'noLostWrites' && c.value > 0) why.push(`About ${c.value.toLocaleString('en-US')} acknowledged writes were lost when a cache went down before saving them.`);
    }
  }
  return why;
}

export function evaluate(design, lab, practice, { sample = false } = {}) {
  const tests = (practice?.tests || []).filter((t) => !sample || t.sample);
  // a catalogue without eval.json (an old API) cannot judge a v2 problem: say so, never throw
  if (!lab?.eval) {
    const results = tests.map((t) => ({ test: t, id: t.id, ok: false, error: NOT_READY, checks: [], why: [] }));
    return { verdict: 'error', passed: 0, total: results.length, results, first: results[0] || null, metrics: null, designPoints: 0, findings: [], plans: {} };
  }
  const compiled = compile(design, lab, practice);
  // each operation's hops for "How your design was read" (§12.1): the first member of each split group, in order
  const hopsOf = (p) => {
    const out = [];
    const walk = (h, depth) => {
      out.push({ node: h.node, kind: h.kind, depth, sync: h.sync, ...(h.step ? { step: h.step } : {}), ...(h.share && typeof h.share === 'object' ? { share: h.share.kind } : {}), ...(h.copy ? { copy: true } : {}) });
      const seen = new Set();
      for (const c of h.children) { const g = c.share?.kind === 'split' ? c.share.group : null; if (g) { if (seen.has(g)) continue; seen.add(g); } walk(c, depth + 1); }
    };
    if (p.root) walk(p.root, 0);
    return out;
  };
  const plansOut = Object.fromEntries(Object.entries(compiled.plans || {}).map(([id, p]) => [id, { ok: p.ok, ...(p.error ? { error: p.error } : {}), steps: p.steps, hops: p.ok ? hopsOf(p) : [] }]));
  if (!compiled.ok) {
    const msg = compiled.errors[0]?.message || 'This design could not be read.';
    const results = tests.map((t) => ({ test: t, id: t.id, ok: false, error: msg, checks: [], why: [] }));
    return { verdict: 'error', passed: 0, total: results.length, results, first: results[0] || null, metrics: null, designPoints: 0, findings: [], plans: plansOut };
  }
  const sims = [];
  const results = tests.map((t) => {
    if (isTrace(t)) return { test: t, ...runTrace(compiled, practice, t, lab) };
    const sim = simulateTest(compiled, lab, practice, t);
    sims.push({ test: t, sim });
    return { test: t, id: t.id, sim };
  });
  const findings = analyse(compiled, practice, lab, sims);
  const blocked = (practice.operations || []).filter((o) => (!o.source || o.source === 'clients') && (o.share || 0) > 0 && !compiled.plans[o.id]?.ok);
  for (const r of results) {
    if (!r.sim) continue;
    const { sim } = r;
    r.checks = loadChecks(r.test, sim, findings, compiled, practice, lab).map((c) => ({ ...c, label: c.label || checkLabel(c, practice, evalCatalogue(lab)) }));
    // a call the tests send that the design can't run at all fails every check of the test: a system that can't
    // serve a call has no bill or durability worth scoring (evaluator.md §18, phase 3)
    if (blocked.length) r.checks = r.checks.map((c) => (c.ok ? { ...c, ok: false, blocked: true } : c));
    r.ok = r.checks.every((c) => c.ok);
    r.why = r.ok ? [] : explain(r.test, r.checks, sim, findings, compiled, practice, lab);
    if (blocked.length && !r.why.length) r.why = [WHY.planError(blocked[0].name || blocked[0].id, compiled.plans[blocked[0].id]?.error?.message || '')];
    for (const c of r.checks) delete c.failing;
    const planned = Object.values(sim.ops).filter((o) => o.calls > 0);
    r.metrics = { availability: planned.length ? Math.min(...planned.map((o) => o.availability)) : 100, p99: Math.max(0, ...planned.map((o) => o.p99Worst)), avgMonthly: sim.cost.monthly };
    r.ops = sim.ops; r.timeline = sim.timeline; r.events = sim.events; r.cost = sim.cost;
    delete r.sim;
  }
  const passed = results.filter((r) => r.ok).length, first = results.find((r) => !r.ok) || null;
  const load = results.filter((r) => r.metrics);
  return {
    verdict: passed === results.length ? 'accepted' : 'failed',
    passed, total: results.length, results, first,
    metrics: load.length ? { availability: Math.min(...load.map((r) => r.metrics.availability)), p99: Math.max(...load.map((r) => r.metrics.p99)), avgMonthly: Math.max(...load.map((r) => r.metrics.avgMonthly)) } : null,
    designPoints: designPoints(results),
    findings: findings.slice(0, MAX_FINDINGS), allFindings: findings.length,
    plans: plansOut,
  };
}

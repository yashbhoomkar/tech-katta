// Solver output over all phases + the test's promises → findings and margins (spec 7.5, 7.7, 21.6, 22.4, 22.6; layer 6).
import { round } from './round.js';
import { group } from './inr.js';

const pct = (x) => `${(x * 100).toFixed(2)}%`;
const ms = (x) => `${round(x, 1).toFixed(1)} ms`;

// The foreground hop to blame for a slow request (21.5): the largest growth over its base, or, when every hop is within
// 20 % of its base, the slowest base (the route is simply long, or the store slow).
export function slowHop(trace) {
  const fg = trace.filter((t) => !t.bg && !t.skipped && Number.isFinite(t.ms));
  if (!fg.length) return null;
  const calm = fg.every((t) => t.ms <= (t.base || 0) * 1.2 + 1e-9);
  return calm ? fg.reduce((a, b) => ((b.base || 0) > (a.base || 0) ? b : a)) : fg.reduce((a, b) => (b.ms - (b.base || 0) > a.ms - (a.base || 0) ? b : a));
}

export function loadFindings(design, problem, test, run, cost) {
  const pr = test.promises || {}, findings = [], margins = [];
  const reqs = problem.requests, order = new Map(reqs.map((r, i) => [r.name, i]));
  const long = run.segments.filter((s) => s.seconds > 0.01 * run.totalSeconds);
  const worst = {};

  // Data Lost
  if (pr.no_data_loss) for (const R of reqs) {
    const l = run.lost[R.name];
    if (l && l.n > 0) findings.push({ type: 'lost', request: R.name, phase: l.phase, part: l.part, expected: 'no acknowledged write lost', actual: `about ${Math.round(l.n)} lost`, numbers: { n: Math.round(l.n) } });
  }

  // Overloaded: drops in a segment with no fault so far, naming the part with the highest rho
  let over = null;
  for (const s of run.segments) {
    if (s.faultSeen) continue;
    for (const [part, info] of Object.entries(s.parts)) {
      const r = Math.max(info.drop > 0 ? info.rho : 0, info.dropRep > 0 ? info.rhoRep : 0);
      if (r > 1 && info.calls > 0 && (!over || r > over.rho)) over = { part, rho: r, calls: info.calls, phase: s.phase, seg: s };
    }
  }
  if (over) {
    const through = reqs.find((R) => over.seg.perRequest[R.name]?.trace.some((t) => t.part === over.part)) || reqs.find((R) => design.routes[R.name]?.invalidate === over.part);
    const cap = over.calls / over.rho;
    findings.push({ type: 'overloaded', request: through?.name || null, phase: over.phase, part: over.part, rho: over.rho, expected: `at most ${group(Math.round(cap))} calls a second`, actual: `${group(Math.round(over.calls))} calls a second`, numbers: { load: Math.round(over.calls), cap: Math.round(cap), rho: over.rho }, trace: through ? over.seg.perRequest[through.name]?.trace : null });
  }

  for (const R of reqs) {
    const segs = run.segments.filter((s) => s.perRequest[R.name]);
    if (!segs.length) continue;
    // availability over the whole test
    const total = segs.reduce((t, s) => t + s.perRequest[R.name].total, 0), failed = segs.reduce((t, s) => t + s.perRequest[R.name].failed, 0);
    const avail = total > 0 ? round(1 - failed / total, 4) : 1;
    const want = pr.availability?.[R.name];
    if (Number.isFinite(want)) {
      margins.push({ promise: 'availability', request: R.name, margin: want < 1 ? (avail - want) / (1 - want) : (avail >= 1 ? 0 : -1) });
      if (avail < want) {
        const bad = segs.find((s) => s.perRequest[R.name].failed > 0) || segs[0], pr0 = bad.perRequest[R.name];
        let part = pr0.downPart, rho = null;
        if (!part) { const t = pr0.trace.filter((x) => Number.isFinite(x.rho)).reduce((a, b) => (!a || b.rho > a.rho ? b : a), null); part = t?.part; rho = t?.rho ?? null; }
        const type = run.faultSeen ? 'unavailable' : 'overloaded';
        if (type === 'unavailable' || !findings.some((f) => f.type === 'overloaded')) {
          const info = bad.parts[part] || {};
          findings.push({ type, request: R.name, phase: bad.phase, part, rho, expected: pct(want), actual: pct(avail), numbers: type === 'overloaded' ? { load: Math.round(info.calls || 0), cap: Math.round((info.calls || 0) / (info.rho || 1)), rho: info.rho } : { avail, want }, trace: pr0.trace });
        }
      }
    }
    // latency: the worst segment longer than 1 % of the test
    for (const key of ['p99', 'p50']) {
      let w = null;
      for (const s of long) { const v = s.perRequest[R.name]?.[key]; if (Number.isFinite(v) && (!w || v > w.v)) w = { v, s }; }
      if (!w) continue;
      (worst[R.name] ||= {})[key] = round(w.v, 1);
      const limit = pr[`${key}_ms`]?.[R.name];
      if (!Number.isFinite(limit)) continue;
      const actual = round(w.v, 1);
      margins.push({ promise: key, request: R.name, margin: (limit - actual) / limit });
      if (actual > limit) {
        const trace = w.s.perRequest[R.name].trace, hop = slowHop(trace);
        findings.push({ type: key, request: R.name, phase: w.s.phase, part: hop?.part, rho: hop?.rho ?? null, expected: `${key} ≤ ${limit} ms`, actual: `${key} ${ms(actual)}`, numbers: { actual, limit }, trace });
      }
    }
    // queues: how long accepted work waited (22.6)
    const within = pr.done_within_s?.[R.name];
    if (Number.isFinite(within)) {
      const qs = segs.map((s) => ({ s, q: s.perRequest[R.name].queue })).filter((x) => x.q);
      if (qs.length) {
        const stuck = qs.find((x) => x.q.stuck);
        const top = qs.reduce((a, b) => ((b.q.delay_s ?? 0) > (a.q.delay_s ?? 0) ? b : a));
        const worker = segs.find((s) => s.perRequest[R.name].worker).perRequest[R.name].worker;
        const leftover = (run.backlog[worker] || 0) > 0 && !test.may_end_with_backlog;
        const delay = stuck ? null : round(top.q.delay_s, 1);
        margins.push({ promise: 'done_within_s', request: R.name, margin: delay === null ? -1 : (within - delay) / within });
        if (stuck || delay > within || leftover) {
          const at = stuck || top, info = at.q;
          findings.push({ type: 'backlog', request: R.name, phase: at.s.phase, part: worker, rho: null, expected: `done within ${within} s`, actual: delay === null ? 'still waiting at the end' : `waited ${delay} s`,
            numbers: { delay: delay === null ? 'until the end of the test' : `${delay} s`, n: `${within} s`, cap: Math.round(info.cap), arrive: Math.round(info.arrive) }, trace: at.s.perRequest[R.name].trace });
        }
      }
    }
  }

  // Over Budget
  if (Number.isFinite(pr.budget_inr)) {
    margins.push({ promise: 'budget', request: null, margin: (pr.budget_inr - cost) / pr.budget_inr });
    if (cost > pr.budget_inr) {
      const parts = Object.keys(design.parts);
      findings.push({ type: 'budget', request: null, phase: null, part: null, expected: `≤ ₹${group(pr.budget_inr)}`, actual: `₹${group(cost)}`, numbers: { cost, budget: pr.budget_inr }, parts });
    }
  }
  findings.forEach((f) => { f.order = f.request === null ? -1 : order.get(f.request) ?? 99; });
  return { findings, margins, worst };
}

// The judge: LeetCode-style test suites for system design problems (content: article `practice`).
//
// A problem's tests are scenarios played against the visitor's own design on the Lab's simulator
// (lab/engine.js): traffic at a given hour and rate, failures injected on purpose, and checks on what
// happened. Nothing is compared with a model answer, so any design that behaves well passes.
//
//   test  = {id, name, desc, sample?, hours, startHour, traffic: {rps, pattern}, chaos?: [{minute, type}],
//            checks: [check]}
//   check = {kind: "availability", min, from?, to?}   % of user requests that succeeded (in a window)
//         | {kind: "p99", max}                       p99 latency in ms at the slowest 5 minutes
//         | {kind: "cost", max}                      average monthly cost over the run, dollars
//         | {kind: "noCrash", type?}                 nothing (of that type) crashed from overload
//         | {kind: "noLostWrites"}                   no acknowledged write lost
//         | {kind: "requires", types: [type]}        every request passes through these types
//         | {kind: "redundant", type}                no single component of that type that every request needs
//         | {kind: "multiAz"}                        every database keeps a standby (Multi-AZ)
//         | {kind: "has", type}                      the design has at least one of that type
//
// Problem-wide `fixed` settings (queries per request, cache hit and write %, CDN hit %) apply to every
// test, so a test can't be passed by turning the load down. p99 is estimated per 5-minute step: each
// component's wait is long-tailed (queueing), so p99 ≈ base + 4.6 × (mean − base), where base is the
// same path with no load and 4.6 = ln(100), the p99 of an exponential wait.
//
// judge() runs a list of tests and returns a verdict; gradeAnswer() checks the written steps
// (functional and non-functional requirements, estimates, APIs) against the problem's rubric;
// score() puts it together out of 100. All pure: the browser runs them for Run and Submit.
import { simulate, advance, newRun, runOptions, crashNow, catalogue, replicasOf } from '../lab/engine.js';
import { applyChallenge, chaosTarget, missingOnPath } from '../lab/challenges.js';

export const STEP = 5; // simulated minutes per step
const P99 = Math.log(100);
export const CHECKS = new Set(['availability', 'p99', 'cost', 'noCrash', 'noLostWrites', 'requires', 'redundant', 'multiAz', 'has']);

// "Server", or "Server 2" when the design has more than one.
export function names(design, lab) {
  const cat = catalogue(lab), seen = {}, out = {};
  for (const n of design.nodes) { const t = n.type; seen[t] = (seen[t] || 0) + 1; out[n.id] = { type: t, i: seen[t] }; }
  for (const n of design.nodes) { const x = out[n.id]; out[n.id] = (cat[x.type]?.name || x.type) + (seen[x.type] > 1 ? ' ' + x.i : ''); }
  return out;
}
const clock = (m) => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const pct = (n) => (n >= 99.99 ? n.toFixed(3) : n >= 99 ? n.toFixed(2) : n.toFixed(1)).replace(/\.?0+$/, '') + '%';

// p99 latency of a moment: compare the loaded design with the same design carrying almost nothing.
function p99At(d, lab, opts, mean) {
  const idle = { ...d, nodes: d.nodes.map((n) => (n.type === 'client' ? { ...n, config: { ...n.config, rps: 1e-6 } } : n)) };
  const base = simulate(idle, lab, opts).total.latencyMs;
  return base + P99 * Math.max(0, mean - base);
}

// Components of a type whose loss would cut some Clients off from every place their requests end up
// (a database, a queue's workers' database, …): single points of failure. One server group behind a
// load balancer is one; two groups side by side are not, wherever they sit (API servers or workers).
export function singlePoints(d, type) {
  const out = new Map(d.nodes.map((n) => [n.id, []]));
  for (const e of d.edges) if (out.has(e.from) && out.has(e.to)) out.get(e.from).push(e.to);
  const ends = new Set(d.nodes.filter((n) => n.type !== 'client' && !out.get(n.id).length).map((n) => n.id));
  const reach = (from, without) => { const seen = new Set([from]), todo = [from]; while (todo.length) { const x = todo.pop(); for (const y of out.get(x)) if (y !== without && !seen.has(y)) { seen.add(y); todo.push(y); } } return [...seen].filter((x) => ends.has(x)).length; };
  const clients = d.nodes.filter((n) => n.type === 'client').map((n) => n.id);
  return d.nodes.filter((n) => n.type === type && clients.some((c) => reach(c, null) > 0 && reach(c, n.id) === 0)).map((n) => n.id);
}

// Checks on the shape of the design (no simulation needed).
function rule(c, d) {
  const of = (t) => d.nodes.filter((n) => n.type === t);
  if (c.kind === 'requires') { const miss = missingOnPath(d, c.types); return { ok: !miss, value: miss }; }
  if (c.kind === 'redundant') { const spof = singlePoints(d, c.type); return { ok: of(c.type).length > 0 && !spof.length, value: spof[0] || null, count: of(c.type).length }; }
  if (c.kind === 'multiAz') { const dbs = of('database'); const single = dbs.filter((n) => !n.config?.multiAz).length; return { ok: dbs.length > 0 && single === 0, value: single }; }
  if (c.kind === 'has') { const n = of(c.type).length; return { ok: n > 0, value: n }; }
  return null;
}

// Plays one test. `problem` gives the fixed settings; `test` the scenario and its checks.
export function runTest(design, lab, problem, test) {
  const cat = catalogue(lab), nm = names(design, lab);
  const ch = { traffic: test.traffic, fixed: problem.fixed || {} };
  const d = applyChallenge(design, ch);
  const blocking = simulate(d, lab).problems.filter((p) => !p.includes('no traffic'));
  if (!d.nodes.some((n) => n.type === 'client')) return { id: test.id, ok: false, error: 'Add the Clients: tests send their traffic from there.', checks: [] };
  if (blocking.length) return { id: test.id, ok: false, error: blocking[0], checks: [] };
  const chaos = [...(test.chaos || [])].sort((a, b) => a.minute - b.minute);
  const start = test.startHour || 0, total = test.hours * 60;
  let run = { ...newRun(), start }, cost = 0, next = 0, worst = { p99: 0, t: 0, bottleneck: null, util: 0 }, low = { avail: 101, t: 0, bottleneck: null, util: 0 };
  const forced = [];
  const windows = test.checks.map(() => ({ sent: 0, served: 0 }));
  for (let t = 0; t < total; t += STEP) {
    for (; next < chaos.length && chaos[next].minute <= t; next++) {
      const target = chaosTarget(d, lab, run, chaos[next].type);
      if (target) { run = crashNow(d, lab, run, target); forced.push({ t, id: target }); }
    }
    const dt = Math.min(STEP, total - t), opts = runOptions(run, start * 60 + run.t, lab), r = simulate(d, lab, opts);
    cost += r.total.burnPerHour * dt / 60;
    const p = r.total.sentRps > 0 ? p99At(d, lab, opts, r.total.latencyMs) : 0;
    const b = r.total.bottleneck;
    if (p > worst.p99) worst = { p99: p, t, bottleneck: b, util: b ? r.nodes[b].utilisation : 0 };
    const before = run;
    run = advance(d, lab, run, dt);
    const sent = run.sent - before.sent, served = run.served - before.served;
    if (sent > 0 && 100 * served / sent < low.avail) low = { avail: 100 * served / sent, t, bottleneck: b, util: b ? r.nodes[b].utilisation : 0 };
    test.checks.forEach((c, i) => { if (c.kind === 'availability' && c.from !== undefined && t >= c.from && t < c.to) { windows[i].sent += sent; windows[i].served += served; } });
  }
  const left = Object.values(run.backlog || {}).reduce((a, b) => a + b, 0);
  const served = Math.max(0, run.served - left), availability = run.sent ? 100 * served / run.sent : 0;
  const avgMonthly = cost / test.hours * 730;
  const overload = run.events.filter((e) => (e.kind === 'crashed' || e.kind === 'failover') && !e.forced);
  const at = (m) => clock(start * 60 + m);
  const checks = test.checks.map((c, i) => {
    const r = rule(c, d);
    if (r) return { ...c, ...r };
    if (c.kind === 'availability') { const v = c.from !== undefined ? (windows[i].sent ? 100 * windows[i].served / windows[i].sent : 100) : availability; return { ...c, ok: v >= c.min - 1e-9, value: v }; }
    if (c.kind === 'p99') return { ...c, ok: worst.p99 <= c.max + 1e-9, value: worst.p99 };
    if (c.kind === 'cost') return { ...c, ok: avgMonthly <= c.max + 1e-9, value: avgMonthly };
    if (c.kind === 'noCrash') { const n = overload.filter((e) => !c.type || cat[d.nodes.find((x) => x.id === e.id)?.type]?.type === c.type).length; return { ...c, ok: n === 0, value: n }; }
    if (c.kind === 'noLostWrites') return { ...c, ok: !(run.lost > 0), value: run.lost || 0 };
    return { ...c, ok: false, value: null };
  });
  // Why it failed, in one or two sentences a person can act on.
  const why = [];
  for (const c of checks) {
    if (c.ok) continue;
    if (c.kind === 'availability') {
      const crash = overload[0];
      if (crash) why.push(`At ${at(crash.t)} the ${nm[crash.id]} was overloaded and ${crash.kind === 'failover' ? 'failed over to its standby' : 'crashed'}; ${pct(100 - c.value)} of requests failed (the test allows ${pct(100 - c.min)}).`);
      else if (left > 0) why.push(`Work was still waiting in a queue when the test ended (${fmt(left)} messages); it counts as failed. The workers behind it are too slow.`);
      else if (low.bottleneck && low.util > 1) why.push(`At ${at(low.t)} the ${nm[low.bottleneck]} was at ${fmt(low.util * 100)}% of its capacity and turned requests away; ${pct(c.value)} succeeded, the test needs ${pct(c.min)}.`);
      else if (forced.length) { const f = d.nodes.find((n) => n.id === forced[0].id), ro = f?.type === 'database' && replicasOf(cat.database, f.config) > 0; why.push(`The test crashed the busiest ${nm[forced[0].id]} at ${at(forced[0].t)} and ${ro ? 'only its read replicas were left: reads kept working, writes failed' : 'requests had nowhere else to go'}; ${pct(c.value)} succeeded, the test needs ${pct(c.min)}.`); }
      else why.push(`${pct(c.value)} of requests succeeded; the test needs ${pct(c.min)}.`);
    } else if (c.kind === 'p99') why.push(`p99 latency reached ${fmt(c.value)} ms at ${at(worst.t)} (limit ${fmt(c.max)} ms)${worst.bottleneck ? `: the ${nm[worst.bottleneck]} was at ${fmt(worst.util * 100)}% load, and requests queue up near capacity` : ''}.`);
    else if (c.kind === 'cost') { const r0 = simulate(d, lab, runOptions(newRun(), start * 60, lab)); const top = d.nodes.filter((n) => n.type !== 'client').sort((a, b) => r0.nodes[b.id].cost - r0.nodes[a.id].cost)[0]; why.push(`It averages $${fmt(c.value)} a month; the limit is $${fmt(c.max)}.${top ? ` The biggest cost is the ${nm[top.id]} ($${fmt(r0.nodes[top.id].cost)} a month).` : ''}`); }
    else if (c.kind === 'noCrash') { const e = overload[0]; why.push(e ? `The ${nm[e.id]} crashed from overload at ${at(e.t)}.` : 'Something crashed from overload.'); }
    else if (c.kind === 'noLostWrites') why.push(`${fmt(c.value)} acknowledged writes were lost when a write-back cache went down.`);
    else if (c.kind === 'requires') why.push(`Some requests never pass through a ${cat[c.value]?.name || c.value}.`);
    else if (c.kind === 'redundant') why.push(c.count ? `The ${nm[c.value]} is a single point of failure: if it goes down, requests have no other way through. Put a second group beside it.` : `The design has no ${cat[c.type]?.name || c.type}.`);
    else if (c.kind === 'multiAz') why.push(c.value ? 'A database has no standby in another zone (Multi-AZ is off).' : 'There is no database.');
    else if (c.kind === 'has') why.push(`The design has no ${cat[c.type]?.name || c.type}.`);
  }
  return { id: test.id, ok: checks.every((c) => c.ok), checks, why, metrics: { availability, p99: worst.p99, avgMonthly, crashes: overload.length, lost: run.lost || 0, unprocessed: left } };
}

// Runs the sample tests (Run) or all of them (Submit). Stops nothing early: every result is shown.
export function judge(design, lab, problem, { sample = false } = {}) {
  const tests = problem.tests.filter((t) => !sample || t.sample);
  const results = tests.map((t) => ({ test: t, ...runTest(design, lab, problem, t) }));
  const passed = results.filter((r) => r.ok).length, first = results.find((r) => !r.ok);
  const all = results.filter((r) => !r.error);
  return {
    verdict: results.some((r) => r.error) ? 'error' : passed === results.length ? 'accepted' : 'failed',
    passed, total: results.length, results, first: first || null,
    metrics: all.length ? { availability: Math.min(...all.map((r) => r.metrics.availability)), p99: Math.max(...all.map((r) => r.metrics.p99)), avgMonthly: Math.max(...all.map((r) => r.metrics.avgMonthly)) } : null,
  };
}

// ---- The written steps -------------------------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9/{}:._ -]+/g, ' ');
// rubric.fr: [{label, keys: [phrase]}] (any phrase present counts; phrases are lowercase)
// rubric.nfr: {availability: [min, max], p99: [min, max], consistency: "strong" | "eventual", readsPerWrite: [min, max]}
// rubric.est: [{id, label, unit, answer, tol}] (within answer ÷ tol … answer × tol)
// rubric.api: [{label, method, path}] (method may be "PUT|POST"; path is a regular expression for the visitor's path)
export function gradeAnswer(answer = {}, rubric = {}) {
  const text = norm(answer.fr);
  const fr = (rubric.fr || []).map((r) => ({ label: r.label, ok: r.keys.some((k) => text.includes(k)) }));
  const nfr = Object.entries(rubric.nfr || {}).map(([k, want]) => {
    const v = answer.nfr?.[k];
    if (Array.isArray(want)) { const n = Number(v); return { id: k, want, value: v ?? '', ok: v !== '' && v != null && Number.isFinite(n) && n >= want[0] && n <= want[1] }; }
    return { id: k, want, value: v ?? '', ok: v === want };
  });
  const est = (rubric.est || []).map((r) => {
    const n = Number(String(answer.est?.[r.id] ?? '').replace(/[, _]/g, ''));
    const ok = Number.isFinite(n) && n > 0 && n >= r.answer / (r.tol || 3) && n <= r.answer * (r.tol || 3);
    return { id: r.id, label: r.label, unit: r.unit, answer: r.answer, value: Number.isFinite(n) && n > 0 ? n : null, ok };
  });
  const rows = (answer.api || []).filter((a) => a && a.path);
  // a rubric method may list alternatives ("PUT|POST"): following someone can fairly be either
  const api = (rubric.api || []).map((r) => { const re = new RegExp(r.path, 'i'), ms = r.method.split('|'); const hit = rows.find((a) => ms.includes(a.method) && re.test(String(a.path).trim())); return { label: r.label, method: r.method, ok: !!hit, got: hit ? `${hit.method} ${hit.path}` : null }; });
  const share = (xs) => (xs.length ? xs.filter((x) => x.ok).length / xs.length : 0);
  return { fr, nfr, est, api, parts: { fr: share(fr), nfr: share(nfr), est: share(est), api: share(api) } };
}

// Out of 100: requirements 20 (functional 12, non-functional 8), estimates 15, API 15, design 50
// (share of all tests passed). Each hint opened takes 3 off, at most 15.
export const WEIGHTS = { fr: 12, nfr: 8, est: 15, api: 15, design: 50 };
export function score(graded, judged, hints = 0) {
  const p = graded?.parts || { fr: 0, nfr: 0, est: 0, api: 0 };
  const parts = { fr: p.fr * WEIGHTS.fr, nfr: p.nfr * WEIGHTS.nfr, est: p.est * WEIGHTS.est, api: p.api * WEIGHTS.api, design: judged && judged.total ? WEIGHTS.design * judged.passed / judged.total : 0 };
  const penalty = Math.min(15, 3 * hints);
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total: Math.max(0, Math.round(raw - penalty)), parts, penalty };
}

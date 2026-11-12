// The runner (spec 7.7, 7.8, 21.5–21.7, 22.9; layer 8): the only file the page and the server call.
//   judge(design, problem, test)          → one test: { verdict, findings, margins, worst }
//   judgeAll(source, problem, options)    → a Run or a Submit: the result object of 7.8
//       options: { all: true } every test (Submit), else the visible ones (Run); or { tests: [...] } (the Testcase tab)
//   stripHidden(result, { full })          → what a browser may see of a Submit (7.8, section 14)
// Pure functions: no clock, no randomness, no I/O. Same input, same output, in the browser and in Node.
import { compile } from './compile.js';
import { staticFindings } from './checks.js';
import { runTest } from './solve.js';
import { loadFindings } from './promises.js';
import { rank, VERDICT_OF, failedObject, explain, costOf } from './verdict.js';
import { SIZES } from './catalogue.js';
import { msg } from './messages.js';
import { round } from './round.js';

// Raise whenever a formula, a catalogue number, a rule or a message that depends on numbers changes (21.7).
export const JUDGE_VERSION = 1;

export function judge(design, problem, test) {
  const cost = costOf(design);
  const run = runTest(design, problem, test);
  const load = loadFindings(design, problem, test, run, cost);
  const findings = rank([...staticFindings(design, problem), ...load.findings]);
  return { verdict: findings.length ? VERDICT_OF[findings[0].type] : 'Passed', findings, margins: load.margins, worst: load.worst, cost, run };
}

// ---- tips that are checked (22.9) ------------------------------------------------------------------------------
const clone = (d) => JSON.parse(JSON.stringify(d));
function candidates(f, design, problem) {
  const out = [], P = design.parts;
  const set = (part, field, value, text) => {
    const p = P[part];
    if (!p || p[field] === value || value === undefined) return;
    out.push({ text, apply: (d) => { d.parts[part][field] = value; } });
  };
  const sizeUp = (p) => SIZES[SIZES.indexOf(p.size) + 1], sizeDown = (p) => SIZES[SIZES.indexOf(p.size) - 1];
  const more = (part) => {
    const p = P[part]; if (!p) return;
    const cap = `More capacity in "${part}" would fix this.`;
    if (p.kind === 'server' || p.kind === 'worker') { set(part, 'count', Math.min(200, p.count * 2), cap); set(part, 'size', sizeUp(p), `Bigger machines for "${part}" would fix this.`); }
    if (p.kind === 'cache') { set(part, 'nodes', Math.min(20, p.nodes * 2), cap); set(part, 'memory_gb', Math.min(256, p.memory_gb * 4), `More memory in "${part}" would fix this.`); }
    if (p.kind === 'sql') {
      set(part, 'size', sizeUp(p), `Bigger machines for "${part}" would fix this.`);
      set(part, 'replicas', Math.min(5, p.replicas + 1), `A replica of "${part}" would fix this.`);
      const r = f.request && design.routes[f.request];
      if (r && r.mode === 'read' && p.replicas >= 1) { const i = r.hops.findIndex((h) => h.part === part && !h.replica); if (i >= 0) out.push({ text: `Reading ${f.request} from replicas of "${part}" would fix this.`, apply: (d) => { d.routes[f.request].hops[i].replica = true; } }); }
    }
    if (p.kind === 'nosql') set(part, 'nodes', Math.min(50, p.nodes * 2), cap);
  };
  const smaller = (part) => {
    const p = P[part]; if (!p) return;
    const t = `A smaller "${part}" would fix this.`;
    if (p.kind === 'server' || p.kind === 'worker') { set(part, 'count', Math.max(1, Math.floor(p.count / 2)), t); set(part, 'size', sizeDown(p), t); }
    if (p.kind === 'cache') { set(part, 'memory_gb', Math.max(1, Math.floor(p.memory_gb / 4)), t); set(part, 'nodes', Math.max(1, Math.floor(p.nodes / 2)), t); }
    if (p.kind === 'sql') { set(part, 'size', sizeDown(p), t); set(part, 'replicas', Math.max(0, p.replicas - 1), t); }
    if (p.kind === 'nosql') set(part, 'nodes', Math.max(3, p.rf, Math.floor(p.nodes / 2)), t);
  };
  const part = f.part, p = P[part];
  switch (f.type) {
    case 'overloaded': case 'p99': case 'p50': case 'unavailable': case 'backlog': {
      const r = f.request && design.routes[f.request];
      if ((f.type === 'p99' || f.type === 'p50') && r?.scan && part === r.store) out.push({ text: 'An index on the lookup column would fix this.', apply: (d) => { d.routes[f.request].scan = false; } });
      more(part);
      break;
    }
    case 'lost':
      if (p?.kind === 'sql') set(part, 'sync', true, `Making "${part}" wait for its replicas would fix this.`);
      if (p?.kind === 'nosql') set(part, 'w', Math.min(p.rf, 2), `Waiting for more copies on each write to "${part}" would fix this.`);
      break;
    case 'stale': case 'ryw': {
      if (p?.kind === 'cache' || p?.kind === 'cdn') {
        set(part, 'ttl_s', Math.max(1, Math.floor(p.ttl_s / 2)), `A shorter TTL on "${part}" would fix this.`);
        const R = problem.requests.find((x) => x.name === f.request);
        const writes = problem.requests.filter((w) => w.mode === 'write' && R?.table && w.table === R.table && design.routes[w.name] && design.routes[w.name].invalidate !== part && design.routes[w.name].update !== part);
        if (writes.length) out.push({ text: `Clearing "${part}" when the data changes would fix this.`, apply: (d) => { for (const w of writes) { d.routes[w.name].invalidate = part; d.routes[w.name].update = null; } } });
      }
      if (p?.kind === 'sql') {
        set(part, 'sync', true, `Making "${part}" wait for its replicas would fix this.`);
        const r = design.routes[f.request], i = r ? r.hops.findIndex((h) => h.part === part && h.replica) : -1;
        if (i >= 0) out.push({ text: `Reading ${f.request} from the primary of "${part}" would fix this.`, apply: (d) => { d.routes[f.request].hops[i].replica = false; } });
      }
      if (p?.kind === 'nosql') set(part, 'r', Math.min(p.rf, p.rf - p.w + 1), `Asking more copies on each read from "${part}" would fix this.`);
      break;
    }
    case 'collision':
      set(part, 'bits', 128, `More bits in the ids of "${part}" would fix this.`);
      set(part, 'id_kind', 'counter', `A counter in "${part}" would fix this.`);
      break;
    case 'budget': {
      const costs = Object.entries(P).map(([n, x]) => [n, costOf({ parts: { [n]: x } })]).sort((a, b) => b[1] - a[1]);
      if (costs[0]) smaller(costs[0][0]);
      break;
    }
    default: break;
  }
  return out.slice(0, 6);
}

// The first candidate change that makes this finding disappear on this test, else null; `tried`: whether any existed.
export function checkedTip(f, design, problem, test) {
  const list = candidates(f, design, problem);
  for (const c of list) {
    const d = clone(design); c.apply(d);
    const again = judge(d, problem, test);
    if (!again.findings.some((g) => g.type === f.type && g.request === f.request)) return { tip: c.text, tried: true };
  }
  return { tip: null, tried: list.length > 0 };
}

// ---- a Run or a Submit ---------------------------------------------------------------------------------------------
function finite(x) {
  if (typeof x === 'number') return Number.isFinite(x);
  if (Array.isArray(x)) return x.every(finite);
  if (x && typeof x === 'object') return Object.values(x).every(finite);
  return true;
}
const judgeError = (total) => ({ verdict: 'Judge Error', message: msg('judge_error'), passed: 0, total, judge_version: JUDGE_VERSION });

export function testsFor(problem, options = {}) {
  if (Array.isArray(options.tests)) return options.tests;
  return (problem.tests || []).filter((t) => options.all || !t.hidden);
}

export function judgeAll(source, problem, options = {}) {
  const tests = testsFor(problem, options);
  try {
    const c = compile(String(source ?? ''), problem);
    if (!c.ok) return { verdict: 'Invalid Design', passed: 0, total: tests.length, errors: c.errors, judge_version: JUDGE_VERSION };
    const design = c.design, cost = costOf(design);
    const results = [], worstP99 = {}, worstP50 = {}, margins = [];
    let failed = null, also = [], tip = null, close = null;
    for (const test of tests) {
      const j = judge(design, problem, test);
      for (const [R, w] of Object.entries(j.worst)) {
        if (Number.isFinite(w.p99)) worstP99[R] = Math.max(worstP99[R] ?? 0, w.p99);
        if (Number.isFinite(w.p50)) worstP50[R] = Math.max(worstP50[R] ?? 0, w.p50);
      }
      results.push({ id: test.id, title: test.title, hidden: !!test.hidden, verdict: j.verdict });
      margins.push(...j.margins.map((m) => ({ ...m, test: test.id })));
      if (j.verdict !== 'Passed') {
        const f = j.findings[0];
        failed = failedObject(test, f, design);
        also = j.findings.slice(1).filter((g) => g.type !== f.type || g.request !== f.request).slice(0, 3).map((g) => ({ reason: g.type, request: g.request, message: explain(g, design) }));
        const t = checkedTip(f, design, problem, test);
        tip = t.tip || (t.tried ? msg('no_tip') : null);
        const m = j.margins.find((x) => x.promise === f.type && x.request === f.request) || (f.type === 'budget' ? j.margins.find((x) => x.promise === 'budget') : null);
        if (m && ['p99', 'p50', 'budget'].includes(f.type) && m.margin >= -0.1) close = { over: Math.max(1, Math.round(-m.margin * 100)), text: `Close: only ${Math.max(1, Math.round(-m.margin * 100))} % over.` };
        break;
      }
    }
    const passed = results.filter((r) => r.verdict === 'Passed').length;
    const verdict = failed ? results[results.length - 1].verdict : 'Accepted';
    const tightest = !failed && margins.length ? margins.reduce((a, b) => (b.margin < a.margin ? b : a)) : null;
    const first = problem.requests?.[0]?.name;
    const out = {
      verdict, passed, total: tests.length, cost_inr: Math.round(cost), worst_p99_ms: worstP99, worst_p50_ms: worstP50,
      ...(failed ? { failed, also, ...(tip ? { tip } : {}), ...(close ? { close } : {}) } : {}),
      ...(tightest ? { tightest: { promise: tightest.promise, request: tightest.request, test: tightest.test, margin: round(tightest.margin, 4), text: `Tightest promise: ${tightest.request ? `${tightest.request} ` : ''}${tightest.promise === 'budget' ? 'budget' : tightest.promise === 'done_within_s' ? 'queue wait' : tightest.promise}, ${Math.max(0, Math.round(tightest.margin * 100))} % to spare.` } } : {}),
      rank_p99_ms: first && Number.isFinite(worstP99[first]) ? worstP99[first] : null,
      tests: [...results, ...tests.slice(results.length).map((t) => ({ id: t.id, title: t.title, hidden: !!t.hidden, verdict: null }))],
      warnings: c.warnings, judge_version: JUDGE_VERSION,
    };
    if (!finite(out)) return judgeError(tests.length);
    return out;
  } catch {
    return judgeError(tests.length);
  }
}

// What a browser may see of a Submit (7.8, 14): a hidden test keeps its title, reason, expected, actual, blame and
// message (no trace, no numbers of its own); `full: false` (a free account) keeps only its title and reason.
export function stripHidden(result, { full = true } = {}) {
  if (!result?.failed?.hidden) return result;
  const f = result.failed;
  const keep = full ? { test: f.test, title: f.title, hidden: true, reason: f.reason, request: f.request, expected: f.expected, actual: f.actual, blame: f.blame, message: f.message }
    : { test: f.test, title: f.title, hidden: true, reason: f.reason };
  const { also, close, ...rest } = result;
  return { ...rest, failed: keep, ...(full ? { also: (also || []).map((a) => ({ reason: a.reason, request: a.request, message: a.message })), ...(close ? { close } : {}) } : {}) };
}

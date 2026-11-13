// The evidence pack (tech-katta-context/22-EVALUATOR-V3.md §6): everything the judge measured about one design, as a
// list of facts with stable ids, raw numbers (`n`), the same numbers as a learner reads them (`f`) and one sentence
// (`say`). The design report, the template review and the AI interviewer all read this and nothing else.
//   buildEvidence(source, problem, { tests, mode }) → the full pack (the server keeps it; it may hold hidden numbers)
//   redact(pack)                                     → what a learner and the interviewer may see (§6.4)
// Pure: no clock, no randomness, no I/O. Same input, same output, in the browser and in Node.
// Not yet here (later phases of spec 22 §21): probes (§7), decisions (§8), diffs (§9.3–9.4), rank.
import { compile } from '../tkd/compile.js';
import { judge, judgeAll, testsFor, JUDGE_VERSION } from '../tkd/judge.js';
import { KINDS } from '../tkd/kinds/index.js';
import { msg } from '../tkd/messages.js';
import { fmt, say } from './words.js';

export const EVIDENCE_VERSION = 1;
export const TONES = ['fail', 'risk', 'note', 'good'];
const RISK_RHO = 0.8, RISK_MARGIN = 0.1;

export function buildEvidence(source, problem, { tests, mode = 'submit' } = {}) {
  const list = tests || testsFor(problem, { all: mode === 'submit' });
  const result = judgeAll(source, problem, { tests: list });
  const facts = [], seen = new Set();
  const add = (fact) => {
    if (seen.has(fact.id)) throw new Error(`evidence: duplicate fact id ${fact.id}`);
    seen.add(fact.id);
    facts.push({ about: {}, n: {}, f: {}, hidden: false, ...fact });
  };
  const failed = result.failed || null;
  const pack = {
    v: 1, engine: 'tkd', judge_version: JUDGE_VERSION, evidence_version: EVIDENCE_VERSION, mode,
    problem: { slug: problem.slug, id: problem.id },
    verdict: { word: result.verdict, passed: result.passed, total: result.total, first_failed: failed ? { test: failed.test, title: failed.title, hidden: !!failed.hidden } : null },
    facts,
  };

  if (result.verdict === 'Judge Error') {
    add({ id: 'verdict', kind: 'verdict', tone: 'fail', say: 'The judge had a problem with this design.' });
    return pack;
  }
  if (result.verdict === 'Invalid Design') {
    const errors = result.errors || [];
    add({ id: 'verdict', kind: 'verdict', tone: 'fail', n: { errors: errors.length }, f: { errors: fmt.int(errors.length) }, say: say.verdict({ word: result.verdict, passed: 0, total: errors.length }) });
    for (const e of errors) if (!seen.has(`error:${e.code}:${e.line}`)) add({ id: `error:${e.code}:${e.line}`, kind: 'static', tone: 'fail', about: { line: e.line }, n: { line: e.line }, f: { line: fmt.int(e.line) }, say: `Line ${e.line}: ${e.message}` });
    return pack;
  }

  const design = compile(source, problem).design;
  const byId = new Map(list.map((t) => [t.id, t]));

  // verdict
  add({ id: 'verdict', kind: 'verdict', tone: result.verdict === 'Accepted' ? 'good' : 'fail', n: { passed: result.passed, total: result.total }, f: { passed: fmt.int(result.passed), total: fmt.int(result.total) }, say: say.verdict({ word: result.verdict, passed: result.passed, total: result.total, failed }) });

  // one fact per judged test, and the per-test judgements the path and load facts read
  const judged = [];
  for (const row of result.tests || []) {
    if (!row.verdict) continue;
    const test = byId.get(row.id), j = judge(design, problem, test);
    judged.push({ test, j });
    const ok = row.verdict === 'Passed', hidden = !!test.hidden;
    const tight = j.margins.length ? j.margins.reduce((a, b) => (b.margin < a.margin ? b : a)) : null;
    const isFailed = failed && failed.test === test.id;
    const n = ok ? { margin: tight ? tight.margin : null } : { expected: isFailed ? failed.expected : null, actual: isFailed ? failed.actual : null };
    const f = ok ? { spare: tight ? fmt.pct(Math.max(0, tight.margin)) : '—' } : { expected: n.expected || '—', actual: n.actual || '—' };
    add({ id: `test:${test.id}`, kind: 'test', tone: ok ? 'good' : 'fail', about: { test: test.id }, n, f, hidden,
      say: ok ? say.testPassed(test.title, tight ? f.spare : null) : say.testFailed(test.title, n.expected, n.actual),
      hiddenSay: say.hiddenTest(test.title, ok) });
  }

  // findings of the first failed test: the one the verdict is named after, then up to three more
  if (failed) {
    const test = byId.get(failed.test), hidden = !!failed.hidden;
    const findings = [{ reason: failed.reason, request: failed.request, part: failed.blame?.part || null, message: failed.message, rho: failed.blame?.rho ?? null, expected: failed.expected, actual: failed.actual }, ...(result.also || []).map((a) => ({ reason: a.reason, request: a.request, part: null, message: a.message }))];
    for (const x of findings.slice(0, 4)) {
      const id = `finding:${x.reason}:${x.request || 'all'}:${x.part || 'none'}`;
      if (seen.has(id)) continue;
      const n = {}, f = {};
      if (x.expected) { n.expected = x.expected; f.expected = x.expected; }
      if (x.actual) { n.actual = x.actual; f.actual = x.actual; }
      if (Number.isFinite(x.rho)) { n.rho = x.rho; f.rho = fmt.pct(x.rho); }
      add({ id, kind: 'finding', tone: 'fail', about: { test: test.id, request: x.request || undefined, part: x.part || undefined }, n, f, hidden, say: x.message || '', hiddenSay: say.hiddenFinding(test.title, x.reason, x.part) });
    }
  }

  // the base phase (spec 22 §7.2, simplified): the first phase of the first visible test judged
  const base = judged.find((x) => !x.test.hidden);
  if (base) {
    const seg = base.j.run.segments[0], title = base.test.title;
    for (const R of problem.requests) {
      const pr = seg.perRequest[R.name];
      if (!pr || pr.outage || !Number.isFinite(pr.p99)) continue;
      const hops = pr.trace.filter((t) => !t.bg);
      add({ id: `path:${R.name}`, kind: 'path', tone: 'note', about: { request: R.name, test: base.test.id },
        n: { p99: pr.p99, p50: pr.p50, hops: hops.map((t) => ({ part: t.part, ms: t.ms, rho: t.rho, ...(t.hit !== undefined ? { hit: t.hit } : {}) })) },
        f: { p99: fmt.ms(pr.p99), p50: fmt.ms(pr.p50), hops: hops.map((t) => `${t.part} ${fmt.ms(t.ms)}`).join(' → ') },
        say: say.path(R.name, hops.map((t) => t.part), fmt.ms(pr.p99), fmt.ms(pr.p50), title) });
    }
    // load: every part with calls at the base phase; its busiest moment in any visible test with no failure injected
    for (const [part, info] of Object.entries(seg.parts)) {
      if (!(info.calls > 0) || !Number.isFinite(info.rho)) continue;
      let peak = { rho: info.rho, title, test: base.test.id };
      for (const { test, j } of judged) {
        if (test.hidden) continue;
        for (const s of j.run.segments) { const r = s.parts[part]?.rho; if (!s.faultSeen && Number.isFinite(r) && r > peak.rho) peak = { rho: r, title: test.title, test: test.id }; }
      }
      add({ id: `load:${part}`, kind: 'load', tone: peak.rho >= RISK_RHO ? 'risk' : 'note', about: { part, test: peak.test },
        n: { rho: info.rho, calls: info.calls, peak_rho: peak.rho }, f: { rho: fmt.pct(info.rho), calls: fmt.rate(info.calls), peak: fmt.pct(peak.rho), peak_test: peak.title },
        say: say.load(part, fmt.pct(info.rho), fmt.pct(peak.rho), peak.title, title) });
    }
  }

  // cost: the total (with the budget of a visible test, if one states it), then each part
  const total = Object.values(design.parts).reduce((t, p) => t + KINDS[p.kind].cost(p), 0);
  const budget = list.filter((t) => !t.hidden).map((t) => t.promises?.budget_inr).find(Number.isFinite);
  const spare = Number.isFinite(budget) ? (budget - total) / budget : null;
  add({ id: 'cost:total', kind: 'cost', tone: spare !== null && spare < 0 ? 'fail' : 'note',
    n: { inr: total, ...(Number.isFinite(budget) ? { budget, margin: spare } : {}) },
    f: { inr: fmt.inr(total), ...(Number.isFinite(budget) ? { budget: fmt.inr(budget), spare: fmt.pct(Math.max(0, spare)) } : {}) },
    say: say.costTotal(fmt.inr(total), Number.isFinite(budget) ? fmt.inr(budget) : null, spare !== null && spare >= 0 ? fmt.pct(spare) : null) });
  for (const [part, p] of Object.entries(design.parts)) {
    const c = KINDS[p.kind].cost(p);
    if (!(c > 0) || !(total > 0)) continue;
    add({ id: `cost:${part}`, kind: 'cost', tone: 'note', about: { part }, n: { inr: c, share: c / total }, f: { inr: fmt.inr(c), share: fmt.pct(c / total) }, say: say.costPart(part, fmt.inr(c), fmt.pct(c / total)) });
  }

  // the tightest promise over the passed tests (only when every test passed: judgeAll gives it then)
  if (result.tightest) {
    const t = result.tightest, test = byId.get(t.test);
    add({ id: 'margin:tightest', kind: 'margin', tone: t.margin < RISK_MARGIN ? 'risk' : 'good', about: { test: t.test, request: t.request || undefined },
      n: { margin: t.margin }, f: { spare: fmt.pct(Math.max(0, t.margin)), promise: t.promise === 'budget' ? 'budget' : `${t.request} ${t.promise}` },
      hidden: !!test?.hidden, say: say.margin(t.promise, t.request, fmt.pct(Math.max(0, t.margin)), test?.title || t.test), hiddenSay: say.marginHidden(test?.title || t.test) });
  }

  // the compiler's warnings, as the judge words them
  for (const w of result.warnings || []) {
    const id = `static:${w.code}:${w.part || w.line}`;
    if (seen.has(id)) continue;
    add({ id, kind: 'static', tone: w.code === 'W001' ? 'note' : 'risk', about: { part: w.part, line: w.line }, say: w.message });
  }

  // one checked repair: the judge's own tip, which it verified by re-running the failed test (spec 21 §22.9)
  if (result.tip && result.tip !== msg('no_tip')) add({ id: 'repair:1', kind: 'repair', tone: 'note', about: { part: failed?.blame?.part || undefined }, say: result.tip });
  return pack;
}

// What may leave the server (§6.4): a fact from a hidden test keeps its id, kind, tone and a sentence with the test's
// title, the reason and the blamed part; its numbers go. The interviewer receives exactly this.
export function redact(pack) {
  return { ...pack, facts: pack.facts.map(({ hiddenSay, ...fact }) => (fact.hidden ? { ...fact, n: {}, f: {}, say: hiddenSay || fact.say } : fact)) };
}

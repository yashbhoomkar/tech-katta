// Calibration of a v2 problem (evaluator.md §14.2, §14.3): does its test suite tell good designs from bad ones?
// Pure; used by eval/calibration.test.js and tools/eval/calibrate.mjs.
import { evaluate, areaOf, isTrace } from './judge.js';
import { mutants, doubled } from './mutants.js';

const CORRECTNESS = new Set(['noLostWrites', 'noDuplicates', 'ordered', 'atomic', 'fresh']);

// → { problems: [string], reference, wrong: [...], mutants: {...}, ... }. `problems` empty means calibrated.
export function calibrate(practice, lab, { withMutants = true } = {}) {
  const problems = [], tests = practice.tests || [];
  const ref = evaluate(practice.reference, lab, practice);
  if (ref.verdict !== 'accepted') problems.push(`the reference is ${ref.verdict}: ${ref.results.filter((r) => !r.ok).map((r) => `${r.id} (${(r.why || []).join(' ') || r.error || ''})`).join('; ')}`);
  const fails = ref.findings.filter((f) => f.severity === 'fail'), warns = ref.findings.filter((f) => f.severity === 'warn');
  if (fails.length) problems.push(`the reference has fail findings: ${fails.map((f) => f.code).join(', ')}`);
  if (warns.length > 3) problems.push(`the reference has ${warns.length} warn findings (at most 3)`);

  const areas = new Set();
  const wrong = (practice.wrong || []).map((w) => {
    const r = evaluate(w, lab, practice), failed = r.results.filter((x) => !x.ok);
    const named = r.results.find((x) => x.id === w.fails);
    if (!named) problems.push(`wrong design "${w.name}" names test ${w.fails}, which does not exist`);
    else if (named.ok) problems.push(`wrong design "${w.name}" should fail ${w.fails} but passes it`);
    for (const x of failed) {
      if (isTrace(x.test)) areas.add('trace');
      else if (x.checks?.some((c) => !c.ok && CORRECTNESS.has(c.kind))) areas.add('correctness');
      if (!isTrace(x.test) && x.checks?.some((c) => !c.ok && !CORRECTNESS.has(c.kind))) areas.add(areaOf(x.test, { kind: 'slo' }) === 'resilience' ? 'fault' : 'load');
    }
    return { name: w.name, fails: w.fails, verdict: r.verdict, failed: failed.map((x) => x.id) };
  });
  const hasCorrectness = tests.some((t) => (t.checks || []).some((c) => CORRECTNESS.has(c.kind)));
  for (const [a, words] of [['trace', 'a trace test'], ['load', 'a load test without faults'], ['fault', 'a load test with a fault'], ...(hasCorrectness ? [['correctness', 'a correctness check']] : [])])
    if (!areas.has(a)) problems.push(`no wrong design fails ${words}`);

  const start = evaluate(practice.start, lab, practice), startSample = evaluate(practice.start, lab, practice, { sample: true });
  if (start.verdict === 'accepted') problems.push('the starting design is accepted');
  if (startSample.passed === startSample.total) problems.push('the starting design passes every sample test');

  let mut = null;
  if (withMutants) {
    const allowed = new Set(practice.mutantsAllowed || []), all = mutants(practice.reference, lab);
    const survived = [], killed = [];
    for (const m of all) (evaluate(m.design, lab, practice).verdict === 'accepted' ? survived : killed).push(m.id);
    const unexplained = survived.filter((id) => !allowed.has(id)), stale = [...allowed].filter((id) => !survived.includes(id));
    if (unexplained.length) problems.push(`mutants not killed: ${unexplained.join(', ')}`);
    if (stale.length) problems.push(`mutantsAllowed lists mutants that are killed (remove them): ${stale.join(', ')}`);
    if (allowed.size * 5 > all.length) problems.push(`${allowed.size} of ${all.length} mutants are allowed: more than a fifth`);
    const dbl = evaluate(doubled(practice.reference, lab), lab, practice);
    const broken = dbl.results.filter((r) => !r.ok && r.checks?.some((c) => !c.ok && c.kind !== 'cost') || (!r.ok && isTrace(r.test)));
    if (broken.length) problems.push(`the reference with every count doubled fails ${broken.map((r) => r.id).join(', ')} (more than its cost)`);
    mut = { total: all.length, killed: killed.length, survived, allowed: [...allowed], score: all.length ? (killed.length + survived.filter((id) => allowed.has(id)).length) / all.length : 1 };
  }
  return { problems, reference: { verdict: ref.verdict, designPoints: ref.designPoints, findings: ref.findings.map((f) => `${f.severity} ${f.code}`) }, wrong, start: { verdict: start.verdict, samplePassed: startSample.passed, sampleTotal: startSample.total }, mutants: mut };
}

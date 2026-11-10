// The v2 evaluator (tech-katta-context/evaluator.md). A problem uses it when its `practice.v` is 2; every other
// problem keeps the v1 judge (judge/judge.js). Built in phases (evaluator.md §15): until the stages exist,
// evaluate() answers with an error instead of a verdict.
export { evalCatalogue, settingsOf, configOf, allowedEdge, capsOf, cleanDesign2 } from './design.js';
export { buildGraph } from './graph.js';
export { accessPath, fieldMatcher, holds } from './access.js';
export { compile } from './compile.js';
export { runTrace, expected } from './trace.js';

export const NOT_READY = 'This problem needs a newer version of the site. Refresh the page.';

// → the same shape as judge/judge.js judge(): { verdict, passed, total, results, first, metrics, … }
export function evaluate(design, lab, practice, { sample = false } = {}) {
  const tests = (practice?.tests || []).filter((t) => !sample || t.sample);
  const results = tests.map((t) => ({ test: t, id: t.id, ok: false, error: NOT_READY, checks: [], why: [] }));
  return { verdict: 'error', passed: 0, total: results.length, results, first: results[0] || null, metrics: null, designPoints: 0, findings: [], plans: {} };
}

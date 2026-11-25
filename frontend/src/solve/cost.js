// What a design costs in a normal month, for the results header (and the AI reviewer's evidence pack).
// The judge's `metrics.avgMonthly` is the dearest load test's cost priced as if that test's traffic lasted a whole
// month, so a one-hour sale peak looks absurd. The month a problem actually budgets is the test with a `cost`
// check; failing that, the test with id `normal`. Pure.
//   normalMonth(judged) → { id, cost, budget: number | null, ok } | null     (null: nothing to say; keep the old text)
const hasCost = (r) => (r.test?.checks || []).some((c) => c.kind === 'cost');

export function normalMonth(judged) {
  const loads = (judged?.results || []).filter((r) => r?.metrics && Number.isFinite(r.metrics.avgMonthly));
  const r = loads.find(hasCost) || loads.find((x) => x.test?.id === 'normal');
  if (!r) return null;
  const check = (r.test?.checks || []).find((c) => c.kind === 'cost');
  const got = (r.checks || []).find((c) => c.kind === 'cost');
  return { id: r.test?.id ?? r.id, cost: r.metrics.avgMonthly, budget: check && Number.isFinite(check.max) ? check.max : null, ok: got ? got.ok !== false : true };
}

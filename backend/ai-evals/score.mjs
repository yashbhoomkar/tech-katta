// Scores one model answer against the ground truth of its design (ground-truth.json). Pure.
//
//   scoreReview(truth, raw, verified) → { correct, found_fault, lead_rank, called_good_a_problem, praised_failing,
//                                         survived, why }
//   raw       the model's JSON as it answered (before the verifier), or null if the call failed
//   verified  verifyReview's result for that answer, or null
//
// A review is correct when all of these hold:
// 1. it survives the verifier (shown to the learner as the model wrote it, at least in part);
// 2. found_fault: one of its first two items, as shown, cites a fact in truth.must_lead_with (the cause the judge
//    found, or for a passing design its tightest margin) or truth.also_accept (another fact stating that cause);
// 3. it never calls a fact the judge marked good a problem (checked on the raw answer: the verifier repairs this,
//    but a model that does it is wrong);
// 4. for a failing design, its first item is not praise.

export function scoreReview(truth, raw, verified) {
  const lead = new Set([...truth.must_lead_with, ...(truth.also_accept || [])]), good = new Set(truth.never_a_problem);
  const rawItems = Array.isArray(raw?.items) ? raw.items.filter((it) => it && typeof it === 'object') : [];
  const cites = (it) => (Array.isArray(it?.facts) ? it.facts.filter((x) => typeof x === 'string') : []);

  const called_good_a_problem = rawItems.some((it) => it.kind === 'problem' && cites(it).some((id) => good.has(id)));
  const praised_failing = truth.verdict_fails && rawItems[0]?.kind === 'strength';
  const survived = !!verified?.ok;
  const shown = survived ? verified.review.items : [];
  // the items the verifier kept as the model wrote them; a dropped item is replaced by the report's own sentence,
  // which must not count as the model finding the fault
  const own = survived ? ownItems(verified, rawItems) : [];
  const rank = own.findIndex((it) => it && cites(it).some((id) => lead.has(id)));
  const lead_rank = rank < 0 ? null : rank + 1;
  const found_fault = lead_rank !== null && lead_rank <= 2;

  const why = [];
  if (!raw) why.push('no answer');
  else if (!survived) why.push(`verifier: ${verified?.why || 'rejected'}`);
  if (survived && !found_fault) why.push(lead_rank ? `fault cited only at item ${lead_rank}` : 'fault not cited');
  if (called_good_a_problem) why.push('called a good fact a problem');
  if (praised_failing) why.push('led a failing design with praise');
  return { correct: survived && found_fault && !called_good_a_problem && !praised_failing, found_fault, lead_rank, called_good_a_problem, praised_failing, survived, shown_items: shown.length, why: why.join('; ') };
}

// The verified review's items in order, with null where the item came from the report instead of the model.
// verifyReview keeps the model's items in order and puts the replacement for a dropped item at the same place, so
// position i of the shown list is the model's item i unless item i was dropped.
function ownItems(verified, rawItems) {
  const dropped = new Set((verified.dropped || []).map((d) => d.item));
  const out = [];
  rawItems.forEach((it, i) => { out.push(dropped.has(i) ? null : it); });
  return out;
}

/** Totals over scored rows: shares are of all calls, so errors and fallbacks count against a model. */
export function summarise(rows) {
  const n = rows.length || 1, c = (f) => rows.filter(f).length, pct = (k) => Math.round((1000 * k) / n) / 10;
  return {
    correct_pct: pct(c((r) => r.score?.correct)),
    found_fault_pct: pct(c((r) => r.score?.found_fault)),
    called_good_a_problem: c((r) => r.score?.called_good_a_problem),
    praised_failing: c((r) => r.score?.praised_failing),
    // the same design, every repeat: correct every time (consistency)
    designs_always_correct_pct: (() => {
      const by = new Map();
      for (const r of rows) by.set(r.case, (by.get(r.case) ?? true) && !!r.score?.correct);
      return by.size ? Math.round((1000 * [...by.values()].filter(Boolean).length) / by.size) / 10 : 0;
    })(),
  };
}

// The bar a model must clear to be chosen (spec 22 §19.3, for the review job).
export const GATES = { correct_pct: 90, fallback_and_error_pct: 2, called_good_a_problem: 0, praised_failing: 0, ms_p95: 10_000 };

/** The gates a run's summary misses, in words; empty when it passes. */
export function gateFailures(s) {
  const out = [];
  if (s.correct_pct < GATES.correct_pct) out.push(`correct under ${GATES.correct_pct} %`);
  if (s.fallback_pct + s.error_pct > GATES.fallback_and_error_pct) out.push(`fallbacks and errors over ${GATES.fallback_and_error_pct} %`);
  if (s.called_good_a_problem > GATES.called_good_a_problem) out.push('called a good fact a problem');
  if (s.praised_failing > GATES.praised_failing) out.push('praised a failing design');
  if (s.ms_p95 > GATES.ms_p95) out.push(`p95 over ${GATES.ms_p95 / 1000} s`);
  return out;
}

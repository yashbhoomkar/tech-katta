// Scores one model answer. Pure.
//
//   scoreReview(truth, raw, verified, key?) → { correct, found_fault, lead_rank, advice_ok, wrong_advice, both_faults,
//                                               called_good_a_problem, praised_failing, survived, why }
//   truth     the design's entry in ground-truth.json (generated from the judge: verdict, good facts, errors)
//   raw       the model's JSON as it answered (before the verifier), or null if the call failed
//   verified  verifyReview's result for that answer, or null
//   key       the design's entry in answer-key.mjs (written by hand); without one, only the generated truth is used
//
// A review is correct when all of these hold:
// 1. it survives the verifier (shown to the learner as the model wrote it, at least in part);
// 2. found_fault: one of its first two items, as the model wrote them, cites a fact that states the fault (key.lead;
//    without a key, truth.must_lead_with and truth.also_accept);
// 3. advice_ok: its words point to the right fix (key.fix), and do not give only advice that is wrong for this design
//    (key.wrong without key.fix);
// 4. both_faults: for a design with two faults, the review cites each (key.needs);
// 5. it never calls a fact the judge marked good a problem (checked on the raw answer: the verifier repairs this,
//    but a model that does it is wrong);
// 6. for a failing design, its first item is not praise.

const list = (x) => (x ? (Array.isArray(x) ? x : [x]) : []);
const hits = (res, text) => list(res).some((re) => re.test(text));

export function scoreReview(truth, raw, verified, key = null) {
  const keyLead = key && Array.isArray(key.lead) ? key.lead : null;
  // a template's lead is "the errors": whichever error facts the judge reported
  const lead = new Set(keyLead ?? (key?.lead === 'errors' ? truth.must_lead_with : [...truth.must_lead_with, ...(truth.also_accept || [])]));
  const good = new Set(truth.never_a_problem);
  const rawItems = Array.isArray(raw?.items) ? raw.items.filter((it) => it && typeof it === 'object') : [];
  const cites = (it) => (Array.isArray(it?.facts) ? it.facts.filter((x) => typeof x === 'string') : []);

  const called_good_a_problem = rawItems.some((it) => it.kind === 'problem' && cites(it).some((id) => good.has(id)));
  // N6: a passing design has no problem to report; N8/N11: a failing design is never said to be perfect or passing
  // (part names are removed first: a name such as say_design_is_perfect is the learner's, not the review's claim)
  const invented_problem = !truth.verdict_fails && rawItems.some((it) => it.kind === 'problem');
  const ownWords = [raw?.headline, ...rawItems.map((it) => it.text), raw?.next?.text].filter((x) => typeof x === 'string').join(' ').replace(/\b[a-z0-9]+(_[a-z0-9]+)+\b/g, ' ');
  const claimed_pass = truth.verdict_fails && /\b(perfect|flawless|no (real )?(problems?|issues|faults)|passes (every|all)|all tests pass|nothing to (fix|change)|production[- ]ready)\b/i.test(ownWords);
  const praised_failing = truth.verdict_fails && (rawItems[0]?.kind === 'strength' || claimed_pass);
  const survived = !!verified?.ok;
  const shown = survived ? verified.review.items : [];
  // the items the verifier kept as the model wrote them; a dropped item is replaced by the report's own sentence,
  // which must not count as the model finding the fault
  const own = survived ? ownItems(verified, rawItems) : [];
  const rank = own.findIndex((it) => it && cites(it).some((id) => lead.has(id)));
  const lead_rank = rank < 0 ? null : rank + 1;
  const found_fault = lead_rank !== null && lead_rank <= 2;

  // the advice: what the shown review says (headline, items, next step), with the measured values filled in
  const words = survived ? [verified.review.headline, ...verified.review.items.map((it) => `${it.text} ${it.ask || ''}`), verified.review.next?.text].join(' ') : '';
  const fixOk = !key?.fix || hits(key.fix, words);
  const wrong_advice = survived && !!key?.wrong && hits(key.wrong, words) && !fixOk;
  const advice_ok = !survived ? false : fixOk;
  const cited = new Set(own.filter(Boolean).flatMap(cites));
  const both_faults = list(key?.needs).every((id) => cited.has(id));

  const why = [];
  if (!raw) why.push('no answer');
  else if (!survived) why.push(`verifier: ${verified?.why || 'rejected'}`);
  if (survived && !found_fault) why.push(lead_rank ? `fault cited only at item ${lead_rank}` : 'fault not cited');
  if (survived && !fixOk) why.push(wrong_advice ? 'wrong advice' : 'no fix suggested');
  if (survived && !both_faults) why.push('missed the second fault');
  if (called_good_a_problem) why.push('called a good fact a problem');
  if (praised_failing) why.push(claimed_pass ? 'said a failing design passes' : 'led a failing design with praise');
  if (invented_problem) why.push('invented a problem on a passing design');
  const correct = survived && found_fault && advice_ok && both_faults && !called_good_a_problem && !praised_failing && !invented_problem;
  return { correct, found_fault, lead_rank, advice_ok, wrong_advice, both_faults, called_good_a_problem, praised_failing, claimed_pass, invented_problem, survived, shown_items: shown.length, why: why.join('; ') };
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
    advice_ok_pct: pct(c((r) => r.score?.advice_ok)),
    wrong_advice: c((r) => r.score?.wrong_advice),
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

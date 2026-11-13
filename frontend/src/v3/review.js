// The template review (tech-katta-context/22-EVALUATOR-V3.md §12.5): the review built from a (redacted) evidence
// pack with no AI. It is the floor: shown to anyone when the interviewer is off, out of credits, slow or wrong, and
// it has the same shape as the interviewer's verified review, so the page draws both the same way.
//   templateReview(pack) → { headline, items: [{ kind, facts, text }], next: { text, repair } }
// kind: "problem" | "risk" | "strength" | "note". Pure.

export const REVIEW_KINDS = ['problem', 'risk', 'strength', 'note'];

export function templateReview(pack) {
  const facts = pack.facts || [], by = (pred) => facts.filter(pred);
  const verdict = facts.find((f) => f.id === 'verdict');
  const items = [];
  const push = (kind, f) => { if (f && items.length < 5 && !items.some((i) => i.facts[0] === f.id)) items.push({ kind, facts: [f.id], text: f.say }); };

  if (pack.verdict?.word === 'Invalid Design') {
    for (const f of by((x) => x.kind === 'static' && x.tone === 'fail').slice(0, 3)) push('problem', f);
    return { headline: verdict?.say || 'The design could not be read.', items, next: { text: 'Fix the first error and Run again: the judge reads the design only when every line is valid.', repair: null } };
  }

  // the problem the verdict is named after, then the other findings of that test
  for (const f of by((x) => x.kind === 'finding').slice(0, 2)) push('problem', f);
  // up to two risks: a part near its limit (busiest first), a thin margin, a part with no spare
  const risks = [
    ...by((x) => x.kind === 'load' && x.tone === 'risk').sort((a, b) => (b.n.peak_rho ?? 0) - (a.n.peak_rho ?? 0)),
    ...by((x) => x.kind === 'margin' && x.tone === 'risk'),
    ...by((x) => (x.kind === 'static' || x.kind === 'advice') && x.tone === 'risk'),
  ];
  for (const f of risks.slice(0, 2)) push('risk', f);
  // one strength the facts support
  push('strength', by((x) => x.kind === 'margin' && x.tone === 'good')[0] || by((x) => x.kind === 'test' && x.tone === 'good' && !x.hidden)[0] || (verdict?.tone === 'good' ? verdict : null));
  // at least two items: where the money goes
  if (items.length < 2) push('note', facts.find((x) => x.id === 'cost:total'));

  const repair = facts.find((x) => x.kind === 'repair');
  const blamed = facts.find((x) => x.kind === 'finding')?.about?.part;
  let next;
  if (repair) next = { text: repair.say, repair: repair.id };
  else if (pack.verdict?.word !== 'Accepted') next = { text: blamed ? `Look at ${blamed} first, then Submit again.` : 'Fix the first problem above, then Submit again.', repair: null };
  else if (risks.length) next = { text: 'It passes, but something is close to its limit. Give it more room before an interviewer asks what happens at twice the traffic.', repair: null };
  else next = { text: 'It passes with room to spare. Try a cheaper design that still passes: see which part costs the most.', repair: null };
  return { headline: verdict?.say || 'The judge measured your design.', items, next };
}

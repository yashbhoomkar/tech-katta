// The mock interviewer: stands in for a real model until one is chosen (tech-katta-context/29-SELF-HOSTED-LLM-ON-A-VPS.md
// §12) and in tests. It answers the review job the way a model is asked to: JSON, fact ids, slots instead of numbers.
// Deterministic: the same pack gives the same answer. It reads only the redacted pack, like a real model.
import { REASON_WORDS } from '../../../frontend/src/v3/words.js';

// the reason words without digits (a mock must obey the same no-digit rule as a model)
const why = (reason) => (reason === 'p99' ? 'the slowest requests took too long' : reason === 'p50' ? 'a typical request took too long' : REASON_WORDS[reason] || 'a promise was broken');
const has = (f, field) => typeof f?.f?.[field] === 'string' && f.f[field];

export function mockReview(pack) {
  const facts = pack.facts.filter((f) => f.say), items = [];
  const add = (item) => { if (items.length < 5) items.push(item); };
  const findings = facts.filter((f) => f.kind === 'finding');
  const verdictWord = pack.verdict.word;

  if (verdictWord === 'Invalid Design') {
    const errs = facts.filter((f) => f.kind === 'static' && f.tone === 'fail').slice(0, 2);
    for (const e of errs) add({ kind: 'problem', facts: [e.id], text: 'The judge cannot read this line yet, so nothing else in the design can be measured until it is fixed.', ask: null });
    if (items.length < 2) add({ kind: 'problem', facts: [facts[0].id], text: 'Every route has to end where its data lives before the judge can test the design.', ask: null });
    return { headline: 'Fix the lines the judge cannot read first, then the design can be tested.', items, next: { text: 'Fix the first error, Run again, and then ask me once the design is judged.', repair: null } };
  }

  const first = findings[0];
  if (first) {
    const part = first.about?.part, req = first.about?.request, reason = why(first.id.split(':')[1]);
    if (first.hidden) add({ kind: 'problem', facts: [first.id], text: `A hidden test failed because ${reason}${part ? ` at ${part}` : ''}. Think about what that part does when the test's event happens, and what your design does about it.`, ask: part ? `What happens to your users when ${part} fails at the worst moment?` : null });
    else if (part && has(first, 'rho')) add({ kind: 'problem', facts: [first.id], text: `${part} is your bottleneck: it ran at {{${first.id}.rho}} of what it can take, so ${req || 'the request'} broke its promise. Everything behind it waits.`, ask: `How would you take load off ${part}, and what would that cost you?` });
    else add({ kind: 'problem', facts: [first.id], text: `The verdict comes from this: ${reason}${req ? ` on ${req}` : ''}${part ? ` at ${part}` : ''}. Fix this before anything else.`, ask: null });
  }
  for (const f of findings.slice(1, 2)) add({ kind: 'problem', facts: [f.id], text: `${f.about?.test && f.about.test !== first?.about?.test ? 'Another test also shows' : 'The same test also shows'} that ${why(f.id.split(':')[1])}${f.about?.request ? ` on ${f.about.request}` : ''}. It may go away with the first fix; check after you change it.`, ask: null });

  const loads = facts.filter((f) => f.kind === 'load' && f.tone === 'risk').sort((a, b) => (b.n?.peak_rho ?? 0) - (a.n?.peak_rho ?? 0));
  for (const f of loads.slice(0, first ? 1 : 2)) {
    const part = f.about.part;
    if (findings.some((x) => x.about?.part === part)) continue;
    add({ kind: 'risk', facts: [f.id], text: `${part} reaches {{${f.id}.peak}} of its capacity in {{${f.id}.peak_test}}. That is little room for a traffic spike, and it is the next thing to break.`, ask: `If traffic doubled tomorrow, which part fails first, and how would you know?` });
  }
  const tight = facts.find((f) => f.id === 'margin:tightest');
  if (tight?.tone === 'risk') add({ kind: 'risk', facts: [tight.id], text: has(tight, 'spare') ? `Everything passes, but {{${tight.id}.promise}} has only {{${tight.id}.spare}} to spare. An interviewer will push on exactly this.` : 'Everything passes, but one promise has very little room left.', ask: 'What would you change first if that promise got stricter?' });
  for (const f of facts.filter((x) => x.kind === 'advice' && x.tone === 'risk').slice(0, 1)) add({ kind: 'risk', facts: [f.id], text: `The judge flags ${f.about?.part || 'part of the design'}. Fix it before an interviewer asks about it.`, ask: null });
  for (const f of facts.filter((x) => x.kind === 'static' && x.tone === 'risk').slice(0, 1)) add({ kind: 'risk', facts: [f.id], text: `${f.about?.part || 'One part'} has no spare. One failure there takes requests down with it, which is the first thing a failure question tests.`, ask: null });

  if (tight?.tone === 'good') add({ kind: 'strength', facts: [tight.id], text: has(tight, 'spare') ? `Every promise holds, and even the tightest one keeps {{${tight.id}.spare}} to spare. That is the headroom an interviewer wants to see.` : 'Every promise holds with room to spare.', ask: null });
  else {
    const ok = facts.find((f) => f.kind === 'test' && f.tone === 'good' && !f.hidden);
    if (ok) add({ kind: 'strength', facts: [ok.id], text: 'The calm case already works, so the shape of the design is sound. The work left is about the harder moments.', ask: null });
  }
  if (items.length < 2) {
    const cost = facts.find((f) => f.id === 'cost:total'), money = cost && (has(cost, 'inr') ? 'inr' : 'usd');
    if (cost && verdictWord === 'Accepted') add({ kind: 'strength', facts: ['verdict', cost.id], text: `It passes, at {{cost:total.${money}}} a month. Know which part takes most of that before you are asked.`, ask: null });
    else if (cost) add({ kind: 'problem', facts: ['verdict', cost.id], text: `Until this test passes nothing else counts. The design costs {{cost:total.${money}}} a month, so keep an eye on cost while you fix it.`, ask: 'Which part would you change first, and why that one?' });
  }

  const repair = facts.find((f) => f.kind === 'repair');
  const headline = verdictWord === 'Accepted'
    ? (loads.length || tight?.tone === 'risk' ? 'It passes, but it is running close to its limits in places.' : 'It passes everything, with room to spare.')
    : first?.about?.part ? `${verdictWord}: start with ${first.about.part}.` : `${verdictWord}: start with the first problem below.`;
  const next = repair ? { text: 'Try the change the judge checked for you, on the part it names, then Submit again.', repair: repair.id }
    : verdictWord === 'Accepted' ? { text: 'Now try to make it cheaper without losing a test: look at the part that costs the most.', repair: null }
    : { text: 'Change the part named in the first item, Run the examples, then Submit again.', repair: null };
  return { headline, items, next };
}

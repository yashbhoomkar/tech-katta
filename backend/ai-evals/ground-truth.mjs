// The ground truth of the AI evaluator (tech-katta-context/22-EVALUATOR-V3.md §19.3, "Reviews"): for every reference,
// wrong design and template of every Practice problem, what a correct review of that design must say.
//
//   node ai-evals/ground-truth.mjs          write ai-evals/ground-truth.json
//   node ai-evals/ground-truth.mjs --check  exit 1 if the file is out of date (a problem, the judge or the evidence
//                                           changed): regenerate it, read the diff, commit it
//   node ai-evals/ground-truth.mjs --sheet  write ground-truth-review.md, the truth as sentences for a person to check
//
// Where the truth comes from, per case:
// - "fault": the problem author's own words for what is wrong with the design (content/problems2, wrong[].why), and the
//   verdict the author expected (wrong[].expect). The judge's verdict must equal it, or this script stops.
// - "must_lead_with": the fact ids the review must cite in its first two items. For a failing design, the judge's
//   findings in the first failed test (the cause, naming the part at fault), else that test itself, else the
//   errors that stop the design from being judged. For a passing design, where it would break first: its tightest
//   margin, or a part already running hot (spec 22 §19.3: "the tightest margin or the lowest headroom"). Any one of
//   the ids is enough.
// - "never_a_problem": facts the judge marked good. A review that calls one of them a problem is wrong.
// - "verdict_fails": a review of a failing design must not lead with praise.
// The overrides below are where a person corrected a case after reading it (ground-truth.md says how to review).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { factsFor } from '../src/ai/prompt.js';

export const GROUND_TRUTH_VERSION = 2; // 2: also_accept (facts that state the same cause)
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

// Cases a person corrected after reading them: id → fields to replace. Each needs a reason.
const OVERRIDES = {};

const problemsDir = new URL('../../content/problems2/', import.meta.url);
export function loadProblems() {
  return readdirSync(problemsDir).filter((f) => /^\d{3}-.*\.json$/.test(f)).sort().map((f) => JSON.parse(readFileSync(new URL(f, problemsDir), 'utf8')));
}

/** The designs of a problem that become cases: its reference, every wrong design and its starting template. */
export function designsOf(p) {
  return [
    { design: 'reference', kind: 'reference', source: p.reference, expect: 'Accepted', fault: null },
    ...p.wrong.map((w) => ({ design: w.name, kind: 'wrong', source: w.source, expect: w.expect, fault: w.why })),
    { design: 'template', kind: 'template', source: p.template, expect: null, fault: 'The starting template, before the learner has changed anything.' },
  ];
}

/** The truth of one design, from its redacted evidence pack (exactly what the model is sent). */
export function truthOf(p, d) {
  const pack = redact(buildEvidence(d.source, p));
  const sent = factsFor(pack), ids = new Set(sent.map((f) => f.id));
  const word = pack.verdict.word, passes = word === 'Accepted';
  if (d.expect && d.expect !== word) throw new Error(`${p.slug}/${d.design}: the author expects ${d.expect}, the judge says ${word}`);
  const first = pack.verdict.first_failed?.test || null;
  let lead = [];
  // a passing design breaks first where it has least room: its tightest margin, or a part already running hot
  if (passes) lead = sent.filter((f) => f.id === 'margin:tightest' || (f.tone === 'risk' && ['load', 'probe', 'margin'].includes(f.kind))).map((f) => f.id);
  else {
    lead = sent.filter((f) => f.kind === 'finding' && f.about?.test === first).map((f) => f.id);
    if (!lead.length && first) lead = sent.filter((f) => f.id === `test:${first}`).map((f) => f.id);
    if (!lead.length) lead = sent.filter((f) => f.kind === 'static' && f.tone === 'fail').map((f) => f.id);
  }
  if (!lead.length) throw new Error(`${p.slug}/${d.design}: no fact to lead with`);
  const parts = [...new Set(sent.filter((f) => lead.includes(f.id)).map((f) => f.about?.part).filter(Boolean))];
  const also = alsoAccept(sent, lead);
  const truth = {
    id: `${p.slug}/${d.design}`,
    problem: p.slug,
    design: d.design,
    kind: d.kind,
    source_sha: sha(d.source),
    verdict: { word, passed: pack.verdict.passed, total: pack.verdict.total, first_failed: first },
    verdict_fails: !passes,
    fault: d.fault,
    fault_parts: parts,
    must_lead_with: lead,
    lead_says: sent.filter((f) => lead.includes(f.id)).map((f) => f.say),
    also_accept: also,
    also_says: sent.filter((f) => also.includes(f.id)).map((f) => f.say),
    never_a_problem: sent.filter((f) => f.tone === 'good').map((f) => f.id),
    problems: sent.filter((f) => f.tone === 'fail').map((f) => f.id),
    risks: sent.filter((f) => f.tone === 'risk').map((f) => f.id),
    facts_sent: ids.size,
  };
  return { ...truth, ...(OVERRIDES[truth.id] || {}) };
}

// Other facts that state the same cause as a lead finding, so a review that cites them has found the fault too
// (added after the first real run: "over budget, and the database drives most of the cost", citing the cost facts,
// was marked wrong because only the budget finding counted):
// - over budget: the total cost, and the cost of the part the finding names;
// - overloaded, slow or backed up at a part: that part's load;
// - unavailable at a part: the judge's warning that the part has no spare.
const SAME_CAUSE = {
  budget: (part) => ['cost:total', `cost:${part}`],
  overloaded: (part) => [`load:${part}`],
  p99: (part) => [`load:${part}`],
  p50: (part) => [`load:${part}`],
  backlog: (part) => [`load:${part}`],
  unavailable: (part, sent) => sent.filter((f) => f.kind === 'static' && f.about?.part === part).map((f) => f.id),
};
export function alsoAccept(sent, lead) {
  const ids = new Set(sent.map((f) => f.id)), out = new Set();
  for (const f of sent.filter((x) => lead.includes(x.id) && x.kind === 'finding')) {
    const reason = f.id.split(':')[1], part = f.about?.part;
    if (!part || !SAME_CAUSE[reason]) continue;
    for (const id of SAME_CAUSE[reason](part, sent)) if (ids.has(id) && !lead.includes(id)) out.add(id);
  }
  return [...out];
}

export function buildGroundTruth() {
  const problems = loadProblems();
  const cases = problems.flatMap((p) => designsOf(p).map((d) => truthOf(p, d)));
  return { version: GROUND_TRUTH_VERSION, note: 'Generated by ai-evals/ground-truth.mjs; see ai-evals/ground-truth.md. Do not edit by hand.', cases };
}

/** A sheet for a person to check the truth by reading: per problem, each design, the author's fault, and the facts
 *  (as sentences) a correct review must lead with. Written to ground-truth-review.md by --sheet. */
export function reviewSheet(gt) {
  const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const lines = [
    '# Ground truth, for a person to check',
    '',
    `Generated from ground-truth.json (version ${gt.version}) by \`node ai-evals/ground-truth.mjs --sheet\`. For each design: does`,
    '"A correct review leads with" name the same fault as the author? Mark any row that does not, and say what it should',
    'lead with; the fix goes in OVERRIDES in ground-truth.mjs.',
  ];
  for (const slug of [...new Set(gt.cases.map((c) => c.problem))]) {
    lines.push('', `## ${slug}`, '', '| Design | Verdict | Fault (author) | A correct review leads with (any one) | Also accepted |', '|---|---|---|---|---|');
    for (const c of gt.cases.filter((x) => x.problem === slug)) {
      lines.push(`| ${esc(c.design)} | ${esc(c.verdict.word)} | ${esc(c.fault || '(passes every test: where it would break first)')} | ${c.lead_says.map(esc).join('<br>')} | ${(c.also_says || []).map(esc).join('<br>') || '-'} |`);
    }
  }
  return `${lines.join('\n')}\n`;
}

const file = new URL('./ground-truth.json', import.meta.url);
export const readGroundTruth = () => JSON.parse(readFileSync(file, 'utf8'));

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = `${JSON.stringify(buildGroundTruth(), null, 1)}\n`;
  if (process.argv.includes('--sheet')) {
    writeFileSync(new URL('./ground-truth-review.md', import.meta.url), reviewSheet(JSON.parse(text)));
    console.log('written: ai-evals/ground-truth-review.md');
  } else if (process.argv.includes('--check')) {
    let old = '';
    try { old = readFileSync(file, 'utf8'); } catch { /* missing */ }
    if (old !== text) { console.error('ai-evals/ground-truth.json is out of date: run node ai-evals/ground-truth.mjs and read the diff'); process.exit(1); }
    console.log('ground truth up to date');
  } else {
    writeFileSync(file, text);
    const g = JSON.parse(text);
    console.log(`written: ai-evals/ground-truth.json (${g.cases.length} cases)`);
  }
}

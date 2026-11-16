// Marks a finished bake-off's saved answers again against the current ground truth, without calling any model.
// Use it after the ground truth is corrected: the answers stay the same, only the marking changes.
//
//   node ai-evals/rescore.mjs <out>      reads results/bakeoff-<out>-*.json, writes results/bakeoff-<out>-rescored.md
//
// Each saved raw answer goes through the production verifier again (it is deterministic) and is scored by score.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { verifyReview, namesOf } from '../src/ai/verify.js';
import { readGroundTruth, loadProblems, designsOf } from './ground-truth.mjs';
import { scoreReview, gateFailures, GATES } from './score.mjs';
import { summary } from './evaluate.mjs';

export function rescoreRows(rows, truthById, caseById) {
  return rows.map((r) => {
    const c = caseById.get(r.case), truth = truthById.get(r.case);
    if (!c || !truth) throw new Error(`no case ${r.case} in the ground truth`);
    const v = r.raw ? verifyReview(r.raw, c.pack, { names: namesOf(c.pack, c.problem.requests.map((q) => q.name)) }) : null;
    return { ...r, score: scoreReview(truth, r.outcome === 'error' ? null : r.raw, v) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (!out) { console.error('usage: node ai-evals/rescore.mjs <out>'); process.exit(1); }
  const dir = new URL('./results/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.startsWith(`bakeoff-${out}-`) && f.endsWith('.json'));
  if (!files.length) { console.error(`no results/bakeoff-${out}-*.json`); process.exit(1); }
  const gt = readGroundTruth(), truthById = new Map(gt.cases.map((c) => [c.id, c]));
  const caseById = new Map(loadProblems().flatMap((p) => designsOf(p).map((d) => [`${p.slug}/${d.design}`, { problem: p, pack: redact(buildEvidence(d.source, p)) }])));
  const results = files.map((f) => {
    const data = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    const rows = rescoreRows(data.rows, truthById, caseById), s = summary(rows), failed = gateFailures(s);
    return { model: data.model, before: data.summary.correct_pct, summary: s, passes: !failed.length, failed };
  });
  results.sort((a, b) => (b.passes - a.passes) || (a.passes ? (a.summary.cost_per_correct_review_usd ?? Infinity) - (b.summary.cost_per_correct_review_usd ?? Infinity) : b.summary.correct_pct - a.summary.correct_pct));
  const inr = (usd) => (usd === null || usd === undefined ? '?' : `₹${(usd * 88 * 1000).toFixed(0)}`);
  const md = [
    `# AI evaluator bake-off ${out}, marked again against ground truth v${gt.version}`,
    '',
    `Gates: correct ≥ ${GATES.correct_pct} %, fallbacks + errors ≤ ${GATES.fallback_and_error_pct} %, no good fact called a problem, no failing design praised, p95 ≤ ${GATES.ms_p95 / 1000} s.`,
    '',
    '| Rank | Model | Passes | Correct (before) | Fault found | Same answer every run | Fallback + error | p95 | Per correct review | 1,000 reviews |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...results.map((r, i) => `| ${i + 1} | ${r.model} | ${r.passes ? 'yes' : `no: ${r.failed.join('; ')}`} | ${r.summary.correct_pct} % (${r.before} %) | ${r.summary.found_fault_pct} % | ${r.summary.designs_always_correct_pct} % | ${Math.round((r.summary.fallback_pct + r.summary.error_pct) * 10) / 10} % | ${(r.summary.ms_p95 / 1000).toFixed(1)} s | $${r.summary.cost_per_correct_review_usd ?? '?'} | ${inr(r.summary.cost_per_correct_review_usd)} |`),
  ];
  writeFileSync(new URL(`bakeoff-${out}-rescored.md`, dir), `${md.join('\n')}\n`);
  console.log(md.slice(4).join('\n'));
  console.log(`\nwritten: ai-evals/results/bakeoff-${out}-rescored.md`);
}

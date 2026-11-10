#!/usr/bin/env node
// Calibrate v2 problems (tech-katta-context/evaluator.md §14.2, §14.3).
//
//   node tools/eval/calibrate.mjs                      the test fixture and every article with practice.v === 2
//   node tools/eval/calibrate.mjs path/to/article.json  one article (or a bare practice object)
//   node tools/eval/calibrate.mjs --fast …              skip mutation testing
//
// Prints how the reference, the wrong designs and the starting design fare, then every mutant of the reference
// that no test kills, so the author can add a test or a wrong design for it (or list it in mutantsAllowed with a
// reason in mutantsAllowedWhy). Exits with 1 when anything is off.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calibrate } from '../../frontend/src/eval/calibrate.js';

const root = new URL('../../', import.meta.url);
const read = (u) => JSON.parse(readFileSync(u, 'utf8'));
const lab = { ...read(new URL('content/lab.json', root)), eval: read(new URL('content/eval.json', root)) };
const args = process.argv.slice(2), fast = args.includes('--fast'), files = args.filter((a) => !a.startsWith('--'));

function targets() {
  if (files.length) return files.map((f) => { const j = read(new URL(f, `file://${process.cwd()}/`)); return [f, j.practice || j]; });
  const out = [['fixture: url-shortener.v2', read(new URL('frontend/src/eval/fixtures/url-shortener.v2.json', root))]];
  const walk = (u) => { for (const f of readdirSync(u)) { const x = new URL(f, u); if (statSync(x).isDirectory()) walk(new URL(`${f}/`, u)); else if (f.endsWith('.json')) { try { const a = read(x); if (a?.practice?.v === 2) out.push([fileURLToPath(x), a.practice]); } catch { /* not an article */ } } } };
  walk(new URL('content/articles/', root));
  return out;
}

let bad = 0;
for (const [name, practice] of targets()) {
  const t0 = performance.now(), r = calibrate(practice, lab, { withMutants: !fast });
  console.log(`\n${name}  (${Math.round(performance.now() - t0)} ms)`);
  console.log(`  reference: ${r.reference.verdict}, design ${r.reference.designPoints.toFixed(1)}/50${r.reference.findings.length ? `, findings: ${r.reference.findings.join(', ')}` : ''}`);
  for (const w of r.wrong) console.log(`  wrong "${w.name}": ${w.verdict}, fails ${w.failed.join(', ') || 'nothing'} (must fail ${w.fails})`);
  console.log(`  start: ${r.start.verdict}, sample tests passed ${r.start.samplePassed}/${r.start.sampleTotal}`);
  if (r.mutants) {
    console.log(`  mutants: ${r.mutants.total}, killed ${r.mutants.killed}, score ${(r.mutants.score * 100).toFixed(0)}%`);
    for (const id of r.mutants.survived) console.log(`    survives: ${id}${r.mutants.allowed.includes(id) ? `  (allowed: ${practice.mutantsAllowedWhy?.[id] || 'no reason given'})` : ''}`);
  }
  if (r.problems.length) { bad++; console.log('  PROBLEMS:'); for (const p of r.problems) console.log(`    - ${p}`); } else console.log('  calibrated');
}
process.exit(bad ? 1 : 0);

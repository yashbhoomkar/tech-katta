// Design-space sweep of one practice problem (tech-katta-context/21-PROBLEM-EXPERIENCE-LEETCODE-STYLE.md §22.11):
//   node backend/scripts/sweep-problem.mjs <slug> [content-dir]
// Judges a few thousand variants of the problem's reference and prints whether the problem may ship. Paste the
// summary into the pull request that adds or changes the problem. Exits 1 when a ship rule fails.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sweep } from '../../frontend/src/tkd/sweep.js';

const [slug, dirArg] = process.argv.slice(2);
if (!slug) { console.error('usage: node backend/scripts/sweep-problem.mjs <slug> [content-dir]'); process.exit(2); }
const dir = path.join(dirArg || path.join(path.dirname(fileURLToPath(import.meta.url)), '../../content'), 'problems2');
const index = JSON.parse(await readFile(path.join(dir, 'index.json'), 'utf8'));
const file = index.problems.find((f) => f.endsWith(`-${slug}`));
if (!file) { console.error(`no problem "${slug}" in ${dir}/index.json`); process.exit(2); }
const problem = JSON.parse(await readFile(path.join(dir, `${file}.json`), 'utf8'));
const t0 = performance.now();
const s = sweep(problem);
console.log(`Sweep of ${problem.id}. ${problem.title} (${slug}): ${s.designs} designs in ${Math.round(performance.now() - t0)} ms`);
console.log(`Accepted: ${s.accepted} (${(100 * s.accepted / s.designs).toFixed(1)} %)`);
if (s.cheapest) console.log(`Cheapest Accepted: ₹${s.cheapest.cost}  [${s.cheapest.label}]`);
console.log(`Reference: ₹${s.referenceCost}, rank ${s.referenceRank} of ${s.accepted} Accepted by cost`);
console.log('Verdicts:', Object.entries(s.byVerdict).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log('Rejected by one test alone:', s.alone.map((a) => `${a.test} ${a.rejects}`).join(' · '));
console.log('\nShip rules:');
for (const r of s.rules) console.log(` ${r.ok ? '✓' : '✕'} ${r.rule}: ${r.value}`);
console.log(s.ship ? '\nThe problem may ship.' : '\nThe problem may NOT ship yet: change its tests (never the judge) and sweep again.');
process.exit(s.ship ? 0 : 1);

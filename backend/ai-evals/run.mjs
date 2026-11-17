// The AI evaluator's evaluation run for one model (tech-katta-context/22-EVALUATOR-V3.md §19.3). Run by hand: with a
// real provider it costs money. To compare several models in one go, use bakeoff.mjs.
//
//   node ai-evals/run.mjs [--repeat 5] [--limit 20] [--problem url-shortener] [--out name] [--price-in 0.10 --price-out 0.50]
//
// The provider comes from the same AI_* settings as the server (backend/.env.example); with none set, the mock.
// Cases: ground-truth.json (every reference, wrong design and template of every Practice problem). Every answer goes
// through the verifier exactly as in production, then is scored against the truth of its design (score.mjs): did it
// lead with the fault the judge found, did it call a good fact a problem, did it praise a failing design.
// Results are written to ai-evals/results/<out>.json. A person still reads a sample for tone and usefulness.
import { writeFileSync, mkdirSync } from 'node:fs';
import { aiConfig, configProblems, createClient } from '../src/ai/client.js';
import { loadCases, evaluate } from './evaluate.mjs';

const args = process.argv.slice(2), opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const repeat = Number(opt('repeat', 1)), limit = Number(opt('limit', Infinity)), only = opt('problem', null);
const priceIn = Number(opt('price-in', NaN)), priceOut = Number(opt('price-out', NaN));
const config = aiConfig({ ...process.env, AI_MOCK_DELAY_MS: process.env.AI_MOCK_DELAY_MS ?? '0' });
const bad = configProblems(config);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
const client = createClient(config);
const cases = loadCases({ only, limit });
const price = Number.isFinite(priceIn) && Number.isFinite(priceOut) ? { in: priceIn, out: priceOut } : null;

console.log(`Provider: ${config.provider}${config.provider === 'mock' ? '' : ` (${config.model})`} · ${cases.length} cases × ${repeat}`);
const { rows, summary } = await evaluate({ client, config, cases, repeat, price, onRow: (r) => process.stdout.write(r.score.correct ? '.' : r.outcome === 'error' ? 'E' : r.outcome === 'fallback' ? 'F' : 'x') });
console.log('\n');
console.log(`correct ${summary.correct_pct} % · found the fault ${summary.found_fault_pct} % · always correct per design ${summary.designs_always_correct_pct} %`);
console.log(`called a good fact a problem ${summary.called_good_a_problem} · praised a failing design ${summary.praised_failing}`);
console.log(`verified ${summary.verified_pct} % · partial ${summary.partial_pct} % · fallback ${summary.fallback_pct} % · errors ${summary.error_pct} %`);
console.log(`time p50 ${summary.ms_p50} ms · p95 ${summary.ms_p95} ms · tokens in ${summary.tokens_in} (cached ${summary.tokens_cached}) out ${summary.tokens_out}`);
if (summary.cost_usd !== null) console.log(`cost $${summary.cost_usd} · per review $${summary.cost_per_review_usd} · per correct review $${summary.cost_per_correct_review_usd}`);
const wrong = rows.filter((r) => !r.score.correct);
if (wrong.length) {
  const reasons = {};
  for (const r of wrong) for (const w of r.score.why.split('; ').filter(Boolean)) reasons[w.replace(/item \d+/, 'item n')] = (reasons[w.replace(/item \d+/, 'item n')] || 0) + 1;
  console.log('not correct because:', reasons);
}
const out = opt('out', `${(config.provider === 'mock' ? 'mock' : config.model).replace(/[^a-z0-9.-]+/gi, '_')}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`);
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${out}.json`, import.meta.url), JSON.stringify({ model: config.model, summary, rows }, null, 1));
console.log(`written: ai-evals/results/${out}.json`);

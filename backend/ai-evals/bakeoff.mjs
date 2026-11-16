// The bake-off: several models over the same ground truth, through one platform (OpenRouter) and one key, ranked by
// what a correct review costs. Run by hand: it spends money from the OpenRouter balance.
//
//   node ai-evals/bakeoff.mjs --estimate                    no key, no spending: what a full run would cost
//   OPENROUTER_API_KEY=… node ai-evals/bakeoff.mjs           every model in candidates.json, 3 runs per case
//   OPENROUTER_API_KEY=… node ai-evals/bakeoff.mjs --models meta/muse-ember@low,google/gemma-4-26b-a4b-it --repeat 5
//
// Options: --models a,b (else candidates.json) · --repeat N (default 3; 5 for the final decision) · --limit N cases ·
// --problem <slug> · --out <name> · --budget <dollars> (stops before a model whose estimate would pass it; default 5).
// A model id may end in @none, @low or @medium: the reasoning effort.
//
// Why OpenRouter: one account, one prepaid balance, one key for every provider's models; an OpenAI-compatible API,
// which is what the production client (src/ai/client.js) already speaks; and each answer reports what it cost.
// Requests ask OpenRouter for providers that do not keep or train on prompts (data_collection: deny) and that support
// every parameter sent (the strict JSON schema), the same terms production should use.
//
// Output: results/bakeoff-<out>.json (every answer) and results/bakeoff-<out>.md (the table, best first).
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { aiConfig, createClient } from '../src/ai/client.js';
import { SYSTEM, problemBlock, reviewRequest } from '../src/ai/prompt.js';
import { loadCases, evaluate } from './evaluate.mjs';
import { GATES, gateFailures } from './score.mjs';

// OPENROUTER_BASE_URL only for the tests (a local stand-in)
const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

const args = process.argv.slice(2), opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const estimateOnly = args.includes('--estimate');
const repeat = Number(opt('repeat', 3)), limit = Number(opt('limit', Infinity)), only = opt('problem', null), budget = Number(opt('budget', 5));
const models = (opt('models', null)?.split(',') ?? JSON.parse(readFileSync(new URL('./candidates.json', import.meta.url), 'utf8')).models).map((s) => s.trim()).filter(Boolean);
const key = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';

const parse = (spec) => { const [id, effort] = spec.split('@'); return { spec, id, effort: effort || null }; };
const reasoning = (effort) => (effort === 'none' ? { enabled: false } : effort ? { effort } : undefined);

// OpenRouter's public model list: prices ($ per token) and whether a strict schema is supported
async function catalogue() {
  const r = await fetch(`${BASE}/models`);
  if (!r.ok) throw new Error(`OpenRouter model list answered ${r.status}`);
  return new Map((await r.json()).data.map((m) => [m.id, m]));
}

const cases = loadCases({ only, limit });
const cat = await catalogue();
const missing = models.map(parse).filter((m) => !cat.has(m.id));
if (missing.length) { console.error(`Not on OpenRouter: ${missing.map((m) => m.id).join(', ')}`); process.exit(1); }

// Tokens of one call, measured from the real prompts (about 3.5 characters a token) and spec 29 §12.1's output size
const promptChars = cases.reduce((t, c) => t + SYSTEM.length + problemBlock(c.problem).length + reviewRequest(c.pack).length, 0) / cases.length;
const perCall = { input: Math.round(promptChars / 3.5), output: 450 };
const priceOf = (id) => { const p = cat.get(id).pricing; return { in: Number(p.prompt) * 1e6, out: Number(p.completion) * 1e6, cache: Number(p.input_cache_read || p.prompt) * 1e6 }; };
// uncached input (a pessimistic estimate); reasoning tokens would add to the output
const estimate = (id) => (cases.length * repeat * (perCall.input * priceOf(id).in + perCall.output * priceOf(id).out)) / 1e6;

console.log(`${cases.length} cases × ${repeat} runs = ${cases.length * repeat} calls a model · about ${perCall.input} tokens in, ${perCall.output} out a call`);
let total = 0;
for (const m of models.map(parse)) {
  const e = estimate(m.id), p = priceOf(m.id);
  total += e;
  console.log(`  ${m.spec.padEnd(40)} $${p.in.toFixed(3)} in / $${p.out.toFixed(3)} out per million · estimate $${e.toFixed(3)}${(cat.get(m.id).supported_parameters || []).includes('structured_outputs') ? '' : ' · no strict schema: JSON mode'}`);
}
console.log(`Estimated total: $${total.toFixed(2)} (about ₹${Math.round(total * 88)}), before reasoning tokens.`);
if (estimateOnly) process.exit(0);
if (!key) { console.error('Set OPENROUTER_API_KEY (one key from openrouter.ai covers every model).'); process.exit(1); }

const stamp = opt('out', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
const results = [];
let spent = 0;
for (const m of models.map(parse)) {
  if (spent + estimate(m.id) > budget) { console.log(`\nSkipped ${m.spec}: the budget of $${budget} would be passed (use --budget).`); continue; }
  const schema = (cat.get(m.id).supported_parameters || []).includes('structured_outputs');
  const config = aiConfig({
    AI_PROVIDER: 'openai', AI_BASE_URL: BASE, AI_API_KEY: key, AI_MODEL: m.id, AI_JSON_MODE: schema ? 'schema' : 'object', AI_TIMEOUT_MS: '60000',
    AI_EXTRA_BODY: JSON.stringify({ provider: { data_collection: 'deny', require_parameters: true }, ...(reasoning(m.effort) ? { reasoning: reasoning(m.effort) } : {}) }),
  });
  process.stdout.write(`\n${m.spec}: `);
  const { rows, summary } = await evaluate({ client: createClient(config), config, cases, repeat, price: priceOf(m.id), onRow: (r) => process.stdout.write(r.score.correct ? '.' : r.outcome === 'error' ? 'E' : r.outcome === 'fallback' ? 'F' : 'x') });
  spent += summary.cost_usd ?? estimate(m.id);
  const failed = gateFailures(summary);
  results.push({ model: m.spec, summary, passes: !failed.length, failed });
  writeFileSync(new URL(`./results/bakeoff-${stamp}-${m.spec.replace(/[^a-z0-9.-]+/gi, '_')}.json`, import.meta.url), JSON.stringify({ model: m.spec, summary, rows }, null, 1));
  console.log(`\n  correct ${summary.correct_pct} % · fault found ${summary.found_fault_pct} % · fallback ${summary.fallback_pct} % · errors ${summary.error_pct} % · p95 ${summary.ms_p95} ms · $${summary.cost_per_correct_review_usd ?? '?'} per correct review${failed.length ? ` · fails: ${failed.join(', ')}` : ' · passes'}`);
}

// Best first: models that pass every gate, cheapest correct review first; then the rest, most correct first.
results.sort((a, b) => (b.passes - a.passes) || (a.passes ? (a.summary.cost_per_correct_review_usd ?? Infinity) - (b.summary.cost_per_correct_review_usd ?? Infinity) : b.summary.correct_pct - a.summary.correct_pct));
const inr = (usd) => (usd === null || usd === undefined ? '?' : `₹${(usd * 88 * 1000).toFixed(0)}`);
const md = [
  `# AI evaluator bake-off, ${stamp}`,
  '',
  `${cases.length} designs (ground-truth.json v${JSON.parse(readFileSync(new URL('./ground-truth.json', import.meta.url), 'utf8')).version}) × ${repeat} runs per model, through OpenRouter. Gates: correct ≥ ${GATES.correct_pct} %, fallbacks + errors ≤ ${GATES.fallback_and_error_pct} %, no good fact called a problem, no failing design praised, p95 ≤ ${GATES.ms_p95 / 1000} s.`,
  '',
  '| Rank | Model | Passes | Correct | Fault found | Same answer every run | Fallback + error | p95 | Per correct review | 1,000 reviews |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...results.map((r, i) => `| ${i + 1} | ${r.model} | ${r.passes ? 'yes' : `no: ${r.failed.join('; ')}`} | ${r.summary.correct_pct} % | ${r.summary.found_fault_pct} % | ${r.summary.designs_always_correct_pct} % | ${Math.round((r.summary.fallback_pct + r.summary.error_pct) * 10) / 10} % | ${(r.summary.ms_p95 / 1000).toFixed(1)} s | $${r.summary.cost_per_correct_review_usd ?? '?'} | ${inr(r.summary.cost_per_correct_review_usd)} |`),
  '',
  `Spent about $${spent.toFixed(3)}. Read a sample of each passing model's reviews (the JSON files beside this one) before choosing: the scores check that it found the fault, not how well it explains it.`,
];
writeFileSync(new URL(`./results/bakeoff-${stamp}.md`, import.meta.url), `${md.join('\n')}\n`);
console.log(`\n${md.slice(4).join('\n')}\n\nwritten: ai-evals/results/bakeoff-${stamp}.md`);

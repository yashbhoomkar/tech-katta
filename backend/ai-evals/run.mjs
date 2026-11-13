// The interviewer's evaluation run (tech-katta-context/22-EVALUATOR-V3.md §19.3; the bake-off of
// 29-SELF-HOSTED-LLM-ON-A-VPS.md §12.4). Run by hand: with a real provider it costs money.
//
//   node ai-evals/run.mjs [--repeat 5] [--limit 20] [--problem url-shortener] [--out name] [--price-in 0.10 --price-out 0.50]
//
// The provider comes from the same AI_* settings as the server (backend/.env.example); with none set, the mock.
// Cases: the reference design, every wrong design and the template of every problem (content/problems2), each as
// the redacted evidence pack a learner's Submit would give. Every answer goes through the verifier, exactly as in
// production. Reported: verified (no item dropped), partial (some dropped and replaced), fallback (the report's
// review would be shown), errors, time per call (p50, p95), tokens, and the cost per verified review when
// --price-in/--price-out ($ per million tokens) are given. Results are written to ai-evals/results/<out>.json.
// What this does not measure, and a person must: whether the review is right, useful and well said. Read a sample.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { aiConfig, configProblems, createClient } from '../src/ai/client.js';
import { SYSTEM, problemBlock, reviewRequest, reviewSchema } from '../src/ai/prompt.js';
import { verifyReview, namesOf } from '../src/ai/verify.js';

const args = process.argv.slice(2), opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const repeat = Number(opt('repeat', 1)), limit = Number(opt('limit', Infinity)), only = opt('problem', null);
const priceIn = Number(opt('price-in', NaN)), priceOut = Number(opt('price-out', NaN));
const config = aiConfig({ ...process.env, AI_MOCK_DELAY_MS: process.env.AI_MOCK_DELAY_MS ?? '0' });
const bad = configProblems(config);
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
const client = createClient(config);

const dir = new URL('../../content/problems2/', import.meta.url);
const problems = readdirSync(dir).filter((f) => /^\d{3}-.*\.json$/.test(f)).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))).filter((p) => !only || p.slug === only);
const cases = problems.flatMap((p) => [['reference', p.reference], ...p.wrong.map((w) => [w.name, w.source]), ['template', p.template]].map(([name, source]) => ({ problem: p, name, pack: redact(buildEvidence(source, p)) }))).slice(0, limit);

console.log(`Provider: ${config.provider}${config.provider === 'mock' ? '' : ` (${config.model})`} · ${cases.length} cases × ${repeat}`);
const rows = [];
for (const c of cases) for (let k = 0; k < repeat; k += 1) {
  const res = await client.call({ system: SYSTEM, problemBlock: problemBlock(c.problem), requestBlock: reviewRequest(c.pack), schema: reviewSchema(c.pack), maxOutputTokens: config.maxOutputTokens, mock: c.pack });
  const v = res.ok ? verifyReview(res.json, c.pack, { names: namesOf(c.pack, c.problem.requests.map((r) => r.name)) }) : null;
  const outcome = !res.ok ? 'error' : !v.ok ? 'fallback' : v.dropped.length ? 'partial' : 'verified';
  rows.push({ problem: c.problem.slug, design: c.name, run: k + 1, outcome, why: res.ok ? (v.ok ? v.dropped.map((d) => d.rule).join(', ') : v.why) : res.why, ms: res.ms, usage: res.usage, review: v?.review || null, raw: res.json ?? null });
  process.stdout.write(outcome === 'verified' ? '.' : outcome === 'partial' ? 'p' : outcome === 'fallback' ? 'F' : 'E');
}
console.log('\n');

const count = (o) => rows.filter((r) => r.outcome === o).length, pct = (n) => `${Math.round((1000 * n) / rows.length) / 10} %`;
const ms = rows.map((r) => r.ms).sort((a, b) => a - b), q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
const sum = (f) => rows.reduce((t, r) => t + (r.usage?.[f] || 0), 0);
const summary = {
  provider: config.provider, model: config.provider === 'mock' ? 'mock' : config.model, cases: cases.length, repeat, calls: rows.length,
  verified: count('verified'), partial: count('partial'), fallback: count('fallback'), error: count('error'),
  ms_p50: q(0.5), ms_p95: q(0.95), tokens_in: sum('input'), tokens_cached: sum('cached'), tokens_out: sum('output'),
};
if (Number.isFinite(priceIn) && Number.isFinite(priceOut)) {
  const dollars = (summary.tokens_in * priceIn + summary.tokens_out * priceOut) / 1e6, ok = summary.verified + summary.partial;
  Object.assign(summary, { cost_usd: Math.round(dollars * 1e4) / 1e4, cost_per_verified_review_usd: ok ? Math.round((dollars / ok) * 1e6) / 1e6 : null });
}
console.log(`verified ${pct(summary.verified)} · partial ${pct(summary.partial)} · fallback ${pct(summary.fallback)} · errors ${pct(summary.error)}`);
console.log(`time p50 ${summary.ms_p50} ms · p95 ${summary.ms_p95} ms · tokens in ${summary.tokens_in} (cached ${summary.tokens_cached}) out ${summary.tokens_out}`);
if (summary.cost_usd !== undefined) console.log(`cost $${summary.cost_usd} · per verified review $${summary.cost_per_verified_review_usd}`);
const reasons = {};
for (const r of rows) if (r.why) for (const w of r.why.split(', ')) reasons[w] = (reasons[w] || 0) + 1;
if (Object.keys(reasons).length) console.log('why:', reasons);

const out = opt('out', `${summary.model.replace(/[^a-z0-9.-]+/gi, '_')}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`);
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${out}.json`, import.meta.url), JSON.stringify({ summary, rows }, null, 1));
console.log(`written: ai-evals/results/${out}.json`);

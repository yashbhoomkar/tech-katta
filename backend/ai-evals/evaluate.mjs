// One model over the ground truth: every case sent as the production review job, every answer through the production
// verifier, then scored against the case's truth (score.mjs). Used by run.mjs (one model) and bakeoff.mjs (several).
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { SYSTEM, problemBlock, reviewRequest, reviewSchema } from '../src/ai/prompt.js';
import { verifyReview, namesOf } from '../src/ai/verify.js';
import { buildGroundTruth, readGroundTruth, loadProblems, designsOf } from './ground-truth.mjs';
import { scoreReview, summarise } from './score.mjs';

/** The cases: each ground-truth entry with the pack and problem it was made from. Stops if the file is stale. */
export function loadCases({ only = null, limit = Infinity } = {}) {
  const file = readGroundTruth(), fresh = buildGroundTruth();
  if (JSON.stringify(file.cases) !== JSON.stringify(fresh.cases)) throw new Error('ai-evals/ground-truth.json is out of date: run node ai-evals/ground-truth.mjs, read the diff, then run again');
  const truth = new Map(file.cases.map((c) => [c.id, c]));
  return loadProblems().filter((p) => !only || p.slug === only)
    .flatMap((p) => designsOf(p).map((d) => ({ id: `${p.slug}/${d.design}`, problem: p, pack: redact(buildEvidence(d.source, p)), truth: truth.get(`${p.slug}/${d.design}`) })))
    .slice(0, limit);
}

/** Runs the cases; price = { in, out, cache } in dollars per million tokens, used when the provider reports no cost. */
/** rpm: at most this many calls a minute (a platform's free tier limits it per model); a call refused for its rate
 *  (HTTP 429) waits a minute and is tried again, up to 3 times, so the limit never counts against the model. */
export async function evaluate({ client, config, cases, repeat = 1, price = null, concurrency = 4, rpm = 0, onRow = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const jobs = [];
  for (const c of cases) for (let k = 0; k < repeat; k += 1) jobs.push([c, k]);
  const rows = new Array(jobs.length);
  let next = 0, slot = 0;
  const gap = rpm > 0 ? Math.ceil(60_000 / rpm) : 0;
  // the next free start time, shared by the workers: calls start at least `gap` apart
  const pace = async () => { if (!gap) return; const now = Date.now(), at = Math.max(now, slot); slot = at + gap; if (at > now) await sleep(at - now); };
  async function worker() {
    while (next < jobs.length) {
      const i = next++, [c, k] = jobs[i];
      let res;
      for (let attempt = 0; ; attempt += 1) {
        await pace();
        try {
          res = await client.call({ system: SYSTEM, problemBlock: problemBlock(c.problem), requestBlock: reviewRequest(c.pack), schema: reviewSchema(c.pack), maxOutputTokens: config.maxOutputTokens, mock: c.pack });
        } catch (e) { res = { ok: false, why: String(e?.message || e), usage: null, ms: 0 }; }
        if (res.ok || res.why !== 'http 429' || attempt >= 3) break;
        await sleep(61_000);
      }
      const v = res.ok ? verifyReview(res.json, c.pack, { names: namesOf(c.pack, c.problem.requests.map((r) => r.name)) }) : null;
      const outcome = !res.ok ? 'error' : !v.ok ? 'fallback' : v.dropped.length ? 'partial' : 'verified';
      const score = scoreReview(c.truth, res.ok ? res.json : null, v);
      rows[i] = { case: c.id, problem: c.problem.slug, design: c.truth.design, run: k + 1, outcome, why: res.ok ? (v.ok ? v.dropped.map((d) => d.rule).join(', ') : v.why) : res.why, score, ms: res.ms, usage: res.usage, cost: costOf(res.usage, price), review: v?.review || null, raw: res.json ?? null };
      onRow(rows[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  return { rows, summary: summary(rows) };
}

// dollars for one call: the provider's own figure when it sends one (OpenRouter does), else tokens × price
export function costOf(usage, price) {
  if (!usage) return 0;
  if (typeof usage.cost === 'number') return usage.cost;
  if (!price) return null;
  const cached = usage.cached || 0, fresh = Math.max(0, (usage.input || 0) - cached);
  return (fresh * price.in + cached * (price.cache ?? price.in) + (usage.output || 0) * price.out) / 1e6;
}

export function summary(rows) {
  const count = (o) => rows.filter((r) => r.outcome === o).length, pct = (n) => Math.round((1000 * n) / (rows.length || 1)) / 10;
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b), q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] ?? 0;
  const sum = (f) => rows.reduce((t, r) => t + (r.usage?.[f] || 0), 0);
  const costs = rows.map((r) => r.cost), known = costs.every((x) => typeof x === 'number');
  const dollars = known ? costs.reduce((a, b) => a + b, 0) : null;
  const s = summarise(rows), correct = rows.filter((r) => r.score?.correct).length;
  return {
    calls: rows.length,
    ...s,
    verified_pct: pct(count('verified')), partial_pct: pct(count('partial')), fallback_pct: pct(count('fallback')), error_pct: pct(count('error')),
    ms_p50: q(0.5), ms_p95: q(0.95),
    tokens_in: sum('input'), tokens_cached: sum('cached'), tokens_out: sum('output'),
    cost_usd: dollars === null ? null : Math.round(dollars * 1e5) / 1e5,
    cost_per_review_usd: dollars === null ? null : Math.round((dollars / (rows.length || 1)) * 1e7) / 1e7,
    // what a correct review really costs: the failed and wrong answers are paid for too
    cost_per_correct_review_usd: dollars === null || !correct ? null : Math.round((dollars / correct) * 1e7) / 1e7,
  };
}

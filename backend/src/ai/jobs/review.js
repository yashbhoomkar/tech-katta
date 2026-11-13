// The review job (tech-katta-context/22-EVALUATOR-V3.md §12): one redacted evidence pack in, one review out, either the
// interviewer's (verified) or the template review (the floor). Never throws for an AI reason: every failure, limit,
// kill switch or missing credit answers with the floor and says why.
//   runReview({ pack, problem, userId, ai, store, log }) →
//     { source: "interviewer" | "report", review, credits, reason?, cached?, preview? }
// reason (floor only): off · not_allowed · no_credits · busy · failed
import { createHash } from 'node:crypto';
import { templateReview } from '../../../../frontend/src/v3/review.js';
import { SYSTEM, PROMPT_VERSION, problemBlock, reviewRequest, reviewSchema } from '../prompt.js';
import { verifyReview, namesOf } from '../verify.js';

const sha = (s) => createHash('sha256').update(s).digest('hex');

// §12.6: the same job, prompt, model, problem and facts always give the same stored answer
export function reviewKey(fingerprint, pBlock, rBlock) {
  return sha(`review:${PROMPT_VERSION}:${fingerprint}:${sha(pBlock)}:${sha(rBlock)}`);
}

export async function runReview({ pack, problem, userId, ai, store, log = console }) {
  const { config, client } = ai;
  const limits = { monthly: config.monthly, daily: config.daily };
  const floor = async (reason, extra = {}) => ({ source: 'report', review: templateReview(pack), credits: await store.credits(userId, limits), reason, ...extra });

  if (!config.enabled) return floor('off');
  if (config.allow && !config.allow.has(String(userId))) return floor('not_allowed');

  const pBlock = problemBlock(problem), rBlock = reviewRequest(pack);
  const key = reviewKey(client.fingerprint, pBlock, rBlock);
  const hit = await store.cached(key);
  if (hit?.review) return { source: 'interviewer', review: hit.review, credits: await store.credits(userId, limits), cached: true, ...(client.preview ? { preview: true } : {}) };

  if (config.dailyTokenCap && (await store.tokensToday()) >= config.dailyTokenCap) return floor('busy');
  if (!(await store.reserve(userId, limits))) return floor('no_credits');

  const entry = { job: 'review', problem: problem.id, provider: client.provider, fingerprint: client.fingerprint };
  let res;
  try {
    res = await client.call({ system: SYSTEM, problemBlock: pBlock, requestBlock: rBlock, schema: reviewSchema(pack), maxOutputTokens: config.maxOutputTokens, mock: pack });
  } catch (e) { res = { ok: false, why: String(e?.message || e), usage: null, ms: 0 }; }
  const usage = res.usage || {}, tokens = (usage.input || 0) + (usage.output || 0);
  const write = (outcome, why) => store.log({ ...entry, input: usage.input || 0, cached: usage.cached || 0, output: usage.output || 0, ms: res.ms || 0, outcome, ...(why ? { why } : {}) }).catch((e) => log.error?.('AI log failed:', e?.message));
  await store.addTokens(tokens).catch(() => {});

  if (!res.ok) {
    await store.release(userId);
    await write('error', res.why);
    return floor('failed');
  }
  const v = verifyReview(res.json, pack, { names: namesOf(pack, problem.requests.map((r) => r.name)) });
  if (!v.ok) {
    await store.release(userId);
    await write('fallback', v.why);
    return floor('failed');
  }
  await store.remember(key, { job: 'review', review: v.review, usage, fingerprint: client.fingerprint });
  await write(v.dropped.length ? 'verifier-partial' : 'ok', v.dropped.length ? v.dropped.map((d) => d.rule).join(', ') : undefined);
  return { source: 'interviewer', review: v.review, credits: await store.credits(userId, limits), ...(client.preview ? { preview: true } : {}) };
}

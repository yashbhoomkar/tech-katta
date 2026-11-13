// The only file that talks to a model provider (tech-katta-context/22-EVALUATOR-V3.md §12.7; provider-neutral per
// 29-SELF-HOSTED-LLM-ON-A-VPS.md §12.6). Everything comes from the environment; nothing here names a model.
//   aiConfig(env)                → the settings, with defaults
//   createClient(config, deps)   → { provider, model, preview, fingerprint, call(request) }
//   call({ system, problemBlock, requestBlock, schema, maxOutputTokens, mock }) → { ok, json?, usage, ms, why? }
// Providers:
//   mock    the mock interviewer (mock.js); no network. The default until a model is chosen.
//   openai  any OpenAI-compatible chat completions endpoint (AI_BASE_URL + /chat/completions), with a strict JSON
//           schema (AI_JSON_MODE=schema) or JSON mode (AI_JSON_MODE=object) for providers without schemas.
// One attempt, plus one retry after a short wait on a rate limit, an overload or a network error; a hard timeout per
// attempt. A stop for any reason other than a normal end (refusal, out of tokens, filter) is a failure: the caller
// shows the floor.
import { createHash } from 'node:crypto';
import { mockReview } from './mock.js';

const bool = (v, d) => (v === undefined || v === '' ? d : !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase()));
const int = (v, d, min = 0, max = Infinity) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.floor(n) : d; };

export function aiConfig(env = process.env) {
  const provider = ['mock', 'openai'].includes(env.AI_PROVIDER) ? env.AI_PROVIDER : 'mock';
  let extra = {};
  try { extra = env.AI_EXTRA_BODY ? JSON.parse(env.AI_EXTRA_BODY) : {}; } catch { extra = {}; }
  return {
    enabled: bool(env.AI_ENABLED, true),
    provider,
    model: env.AI_MODEL || (provider === 'mock' ? 'mock-interviewer' : ''),
    baseUrl: String(env.AI_BASE_URL || '').replace(/\/+$/, ''),
    apiKey: env.AI_API_KEY || '',
    jsonMode: env.AI_JSON_MODE === 'object' ? 'object' : 'schema',
    tokensParam: env.AI_TOKENS_PARAM === 'max_completion_tokens' ? 'max_completion_tokens' : 'max_tokens',
    extraBody: extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : {},
    timeoutMs: int(env.AI_TIMEOUT_MS, 25_000, 1_000, 120_000),
    maxOutputTokens: int(env.AI_MAX_OUTPUT_TOKENS, 1_500, 200, 32_000),
    monthly: int(env.AI_MONTHLY_REVIEWS, 150, 0, 100_000),
    daily: int(env.AI_DAILY_REVIEWS, 20, 0, 10_000),
    dailyTokenCap: int(env.AI_DAILY_TOKEN_CAP, 20_000_000, 0),
    allow: env.AI_ALLOW ? new Set(String(env.AI_ALLOW).split(',').map((s) => s.trim()).filter(Boolean)) : null,
    mockDelayMs: int(env.AI_MOCK_DELAY_MS, 800, 0, 60_000),
  };
}

// Problems with the settings that would make every call fail; logged once at start.
export function configProblems(config) {
  if (!config.enabled || config.provider === 'mock') return [];
  const out = [];
  if (!/^https:\/\//.test(config.baseUrl) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(config.baseUrl)) out.push('AI_BASE_URL must be an https:// address');
  if (!config.apiKey) out.push('AI_API_KEY is empty');
  if (!config.model) out.push('AI_MODEL is empty');
  return out;
}

const RETRY = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

export function createClient(config, { fetch = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now() } = {}) {
  // a hash of provider and model, never the model id itself, in stored data (§12.6)
  const fingerprint = createHash('sha256').update(`${config.provider}:${config.model}`).digest('hex').slice(0, 16);

  async function callMock({ mock }) {
    const t0 = now();
    if (config.mockDelayMs) await sleep(config.mockDelayMs);
    if (!mock) return { ok: false, why: 'mock needs the pack', usage: null, ms: now() - t0 };
    return { ok: true, json: mockReview(mock), usage: { input: 0, cached: 0, output: 0 }, ms: now() - t0 };
  }

  async function attempt(body) {
    let r;
    try {
      r = await fetch(`${config.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(config.timeoutMs) });
    } catch (e) { return { retry: true, why: e?.name === 'TimeoutError' ? 'timeout' : 'network' }; }
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    if (!r.ok) return { retry: RETRY.has(r.status), why: `http ${r.status}` };
    const choice = data?.choices?.[0], message = choice?.message;
    const u = data?.usage || {};
    const usage = { input: u.prompt_tokens ?? 0, cached: u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0, output: u.completion_tokens ?? 0 };
    if (message?.refusal) return { why: 'refusal', usage };
    if (choice?.finish_reason && choice.finish_reason !== 'stop') return { why: `stopped: ${choice.finish_reason}`, usage };
    const text = typeof message?.content === 'string' ? message.content : Array.isArray(message?.content) ? message.content.map((c) => c?.text || '').join('') : '';
    try { return { ok: true, json: JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')), usage }; } catch { return { why: 'not json', usage }; }
  }

  async function callOpenAi({ system, problemBlock, requestBlock, schema, maxOutputTokens }) {
    const t0 = now();
    const body = {
      model: config.model,
      // the unchanging beginning first, so a provider's prefix cache can reuse it
      messages: [{ role: 'system', content: `${system}\n\n${problemBlock}` }, { role: 'user', content: requestBlock }],
      response_format: config.jsonMode === 'schema' ? { type: 'json_schema', json_schema: { name: 'review', strict: true, schema } } : { type: 'json_object' },
      [config.tokensParam]: maxOutputTokens || config.maxOutputTokens,
      ...config.extraBody,
    };
    let r = await attempt(body);
    if (r.retry) { await sleep(1_000); r = await attempt(body); }
    return { ok: !!r.ok, json: r.json, usage: r.usage || null, ms: now() - t0, ...(r.ok ? {} : { why: r.why }) };
  }

  return {
    provider: config.provider, model: config.model, preview: config.provider === 'mock', fingerprint,
    call: (request) => (config.provider === 'mock' ? callMock(request) : callOpenAi(request)),
  };
}

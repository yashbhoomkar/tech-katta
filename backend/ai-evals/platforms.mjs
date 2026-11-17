// The platforms the bake-offs reach every model through, with one key each (bakeoff.mjs explains the choice).
const num = (v) => Number(v || 0) * 1e6;
// A platform: where it lives, its key, and how to read its public price list ($ per token → $ per million).
// The *_BASE_URL variables are only for the tests (a local stand-in).
export const PLATFORMS = {
  vercel: {
    name: 'Vercel AI Gateway',
    base: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1',
    keyVar: 'AI_GATEWAY_API_KEY',
    price: (m) => ({ in: num(m.pricing?.input), out: num(m.pricing?.output), cache: num(m.pricing?.input_cache_read || m.pricing?.input) }),
    schema: (m) => (m.tags || []).includes('structured-output'),
    body: () => ({}),
  },
  openrouter: {
    name: 'OpenRouter',
    base: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    keyVar: 'OPENROUTER_API_KEY',
    price: (m) => ({ in: num(m.pricing?.prompt), out: num(m.pricing?.completion), cache: num(m.pricing?.input_cache_read || m.pricing?.prompt) }),
    schema: (m) => (m.supported_parameters || []).includes('structured_outputs'),
    body: () => ({ provider: { data_collection: 'deny', require_parameters: true } }),
  },
  // Google AI Studio's own API, through its OpenAI-compatible endpoint. Its free tier has no price list: a key from a
  // project with no billing account cannot be charged, so every price is 0 (the cost columns then say nothing). On
  // the free tier Google may use prompts to improve its products: fine for these made-up designs, not for production.
  gemini: {
    name: 'Google AI Studio (Gemini API)',
    base: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyVar: 'GEMINI_API_KEY',
    catalogNeedsKey: true,
    id: (m) => String(m.id).replace(/^models\//, ''),
    price: () => ({ in: 0, out: 0, cache: 0 }),
    schema: () => true,
    body: () => ({}),
    reasoning: (effort) => ({ reasoning_effort: effort }),
  },
};
// The body fields that set a model's reasoning effort: Vercel and OpenRouter take { reasoning }, Gemini its own field.
export const reasoningBody = (P, effort) => (!effort ? {} : P.reasoning ? P.reasoning(effort) : { reasoning: effort === 'none' ? { enabled: false } : { effort } });
export const catalogOf = async (P, key) => (await (await fetch(`${P.base}/models`, P.catalogNeedsKey ? { headers: { Authorization: `Bearer ${key}` } } : {})).json()).data
  .map((m) => (P.id ? { ...m, id: P.id(m) } : m));

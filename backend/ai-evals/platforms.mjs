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
};

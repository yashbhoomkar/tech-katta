const DEFAULT_PORT = 5000;
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';

function parsePort(value) {
  const normalized = typeof value === 'string' ? value.trim() : value;
  const port = normalized === undefined || normalized === '' ? DEFAULT_PORT : Number(normalized);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseFrontendOrigin(value, isProduction) {
  const origin = typeof value === 'string' ? value.trim() : '';

  if (!origin) {
    if (isProduction) {
      throw new Error('FRONTEND_ORIGIN must be configured in production.');
    }
    return DEFAULT_FRONTEND_ORIGIN;
  }

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw new TypeError('FRONTEND_ORIGIN must be a valid HTTP(S) origin.');
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || parsed.origin !== origin.replace(/\/$/, '')
    || parsed.username
    || parsed.password
  ) {
    throw new TypeError('FRONTEND_ORIGIN must contain only an HTTP(S) origin, without credentials or a path.');
  }

  return parsed.origin;
}

/**
 * Parse and validate process configuration once at startup.
 * Pass the returned immutable object into application construction so app code
 * does not read process.env directly.
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const isProduction = nodeEnv === 'production';

  return Object.freeze({
    nodeEnv,
    isProduction,
    port: parsePort(env.PORT),
    frontendOrigin: parseFrontendOrigin(env.FRONTEND_ORIGIN, isProduction),
  });
}

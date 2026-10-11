import { randomUUID } from 'node:crypto';

export function createRequestLogger({
  logger = console,
  createId = randomUUID,
  now = Date.now,
} = {}) {
  return (request, response, next) => {
    const requestId = createId();
    const startedAt = now();

    response.setHeader('X-Request-Id', requestId);
    response.once('finish', () => {
      const event = {
        level: 'info',
        event: 'http_request',
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Math.max(0, now() - startedAt),
      };
      logger.info(JSON.stringify(event));
    });

    next();
  };
}

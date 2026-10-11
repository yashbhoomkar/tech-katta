import { ContentUnavailableError, NotFoundError } from '../errors.js';

/**
 * Convert unmatched routes into the same JSON error contract as other API
 * failures. Keep this after all application routes.
 */
export function notFoundHandler(_request, _response, next) {
  return next(new NotFoundError());
}

/**
 * The final Express error boundary. Controllers pass errors here instead of
 * implementing response serialization independently.
 */
export function createErrorHandler({ logger = console } = {}) {
  return (error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    const requestId = response.getHeader('X-Request-Id');

    if (error instanceof ContentUnavailableError) {
      logger.error(JSON.stringify({
        level: 'error',
        event: 'content_query_failed',
        requestId,
        route: error.route,
        message: error.cause?.message || error.message,
      }));
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Retry-After', error.retryAfterSeconds);
      return response.status(503).json({
        error: 'Content service temporarily unavailable',
      });
    }

    if (error?.type === 'entity.parse.failed') {
      return response.status(400).json({
        error: 'Invalid JSON body',
      });
    }

    if (error?.type === 'entity.too.large') {
      return response.status(413).json({
        error: 'Request body too large',
      });
    }

    if (error instanceof NotFoundError || error.statusCode === 404 || error.status === 404) {
      return response.status(404).json({ error: 'Not found' });
    }

    logger.error(JSON.stringify({
      level: 'error',
      event: 'http_request_failed',
      requestId,
      method: request.method,
      path: request.path,
      message: error?.message || 'Unknown error',
    }));

    return response.status(500).json({
      error: 'Internal server error',
    });
  };
}

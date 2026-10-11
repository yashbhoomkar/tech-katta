export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ContentUnavailableError extends Error {
  constructor(route, cause) {
    super('Content service temporarily unavailable', { cause });
    this.name = 'ContentUnavailableError';
    this.statusCode = 503;
    this.route = route;
    this.retryAfterSeconds = 5;
  }
}

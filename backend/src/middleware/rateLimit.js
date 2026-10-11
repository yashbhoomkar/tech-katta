const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_LIMIT = 120;
const DEFAULT_MAX_BUCKETS = 10_000;

/**
 * Process-local rate limiter for the single-instance VPS deployment.
 * The key comes from Express's resolved request.ip; never parse X-Forwarded-For
 * directly here. app.set('trust proxy', ...) must match the actual proxy topology.
 *
 * This limiter bounds memory and expires idle buckets. It is not a distributed
 * limiter; move enforcement to a shared store or trusted edge before scaling to
 * multiple API instances.
 */
export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  limit = DEFAULT_LIMIT,
  maxBuckets = DEFAULT_MAX_BUCKETS,
  now = Date.now,
} = {}) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new TypeError('windowMs must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError('limit must be a positive integer');
  }
  if (!Number.isInteger(maxBuckets) || maxBuckets <= 0) {
    throw new TypeError('maxBuckets must be a positive integer');
  }

  const buckets = new Map();

  function pruneExpired(currentTime) {
    for (const [ip, bucket] of buckets) {
      if (currentTime - bucket.startedAt >= windowMs) {
        buckets.delete(ip);
      }
    }
  }

  function enforceCapacity() {
    while (buckets.size > maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  const cleanupTimer = setInterval(() => {
    pruneExpired(now());
    enforceCapacity();
  }, Math.min(windowMs, 60_000));
  cleanupTimer.unref?.();

  function rateLimit(request, response, next) {
    const clientIp = request.ip || request.socket?.remoteAddress || 'unknown';
    const currentTime = now();
    let bucket = buckets.get(clientIp);

    if (!bucket || currentTime - bucket.startedAt >= windowMs) {
      bucket = { startedAt: currentTime, count: 0 };
    }

    // Refresh insertion order so capacity eviction removes the least recently
    // active key first.
    buckets.delete(clientIp);
    bucket.count += 1;
    buckets.set(clientIp, bucket);

    pruneExpired(currentTime);
    enforceCapacity();

    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - bucket.count));

    if (bucket.count > limit) {
      const retryAfter = Math.max(
        1,
        Math.ceil((windowMs - (currentTime - bucket.startedAt)) / 1000),
      );
      response.setHeader('Retry-After', retryAfter);
      return response.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
    }

    return next();
  }

  rateLimit.close = () => clearInterval(cleanupTimer);
  rateLimit.getBucketCount = () => buckets.size;
  return rateLimit;
}

export const rateLimit = createRateLimiter();

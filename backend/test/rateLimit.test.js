import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

function invoke(limiter, ip = '192.0.2.1') {
  const headers = {};
  let statusCode = 200;
  let body;
  let nextCalled = false;
  const response = {
    setHeader(name, value) { headers[name] = value; },
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  const result = limiter({ ip }, response, () => { nextCalled = true; });
  return { headers, statusCode, body, nextCalled, result };
}

test('allows requests under the configured limit and emits rate-limit headers', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, limit: 2 });
  try {
    const first = invoke(limiter);
    const second = invoke(limiter);

    assert.equal(first.nextCalled, true);
    assert.equal(first.headers['X-RateLimit-Limit'], 2);
    assert.equal(first.headers['X-RateLimit-Remaining'], 1);
    assert.equal(second.nextCalled, true);
    assert.equal(second.headers['X-RateLimit-Remaining'], 0);
  } finally {
    limiter.close();
  }
});

test('returns 429 and Retry-After after the request limit is exceeded', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, limit: 1 });
  try {
    invoke(limiter);
    const result = invoke(limiter);

    assert.equal(result.statusCode, 429);
    assert.equal(result.headers['Retry-After'], 60);
    assert.equal(result.nextCalled, false);
    assert.match(result.body.error, /Too many requests/);
  } finally {
    limiter.close();
  }
});

test('starts a fresh window after the old window expires', () => {
  let currentTime = 1_000;
  const limiter = createRateLimiter({
    windowMs: 1_000,
    limit: 1,
    now: () => currentTime,
  });
  try {
    invoke(limiter);
    currentTime += 1_001;
    const result = invoke(limiter);

    assert.equal(result.statusCode, 200);
    assert.equal(result.nextCalled, true);
  } finally {
    limiter.close();
  }
});

test('keeps the number of in-memory client buckets bounded', () => {
  const limiter = createRateLimiter({ maxBuckets: 2, limit: 10 });
  try {
    invoke(limiter, '192.0.2.1');
    invoke(limiter, '192.0.2.2');
    invoke(limiter, '192.0.2.3');

    assert.equal(limiter.getBucketCount(), 2);
  } finally {
    limiter.close();
  }
});

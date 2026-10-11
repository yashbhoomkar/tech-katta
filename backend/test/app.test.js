import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('createApp wires health, API, CORS, security headers, and JSON errors', async () => {
  const rateLimiter = createRateLimiter({ limit: 20 });
  const app = createApp({
    getDB: () => null,
    isDBConnected: () => false,
    rateLimiter,
    logger: { info() {}, error() {} },
  });

  try {
    await withServer(app, async (baseUrl) => {
      const liveResponse = await fetch(`${baseUrl}/health/live`);
      assert.equal(liveResponse.status, 200);
      assert.equal((await liveResponse.json()).status, 'ok');
      assert.ok(liveResponse.headers.get('x-request-id'));

      const readyResponse = await fetch(`${baseUrl}/health/ready`);
      assert.equal(readyResponse.status, 503);
      assert.equal(readyResponse.headers.get('cache-control'), 'no-store');

      const rootResponse = await fetch(baseUrl, {
        headers: { Origin: 'http://localhost:5173' },
      });
      assert.equal(rootResponse.status, 200);
      assert.equal(rootResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(rootResponse.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(rootResponse.headers.get('x-powered-by'), null);
      assert.equal((await rootResponse.json()).service, 'tech-katta-api');

      const missingResponse = await fetch(`${baseUrl}/does-not-exist`);
      assert.equal(missingResponse.status, 404);
      assert.deepEqual(await missingResponse.json(), { error: 'Not found' });

      const malformedResponse = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json',
      });
      assert.equal(malformedResponse.status, 400);
      assert.ok(malformedResponse.headers.get('x-request-id'));
      assert.deepEqual(await malformedResponse.json(), { error: 'Invalid JSON body' });

      const oversizedResponse = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'x'.repeat(60 * 1024) }),
      });
      assert.equal(oversizedResponse.status, 413);
      assert.ok(oversizedResponse.headers.get('x-request-id'));
      assert.deepEqual(await oversizedResponse.json(), { error: 'Request body too large' });
    });
  } finally {
    rateLimiter.close();
  }
});

test('malformed JSON requests count toward the rate limit', async () => {
  const rateLimiter = createRateLimiter({ limit: 1 });
  const app = createApp({
    getDB: () => null,
    isDBConnected: () => false,
    rateLimiter,
    logger: { info() {}, error() {} },
  });

  try {
    await withServer(app, async (baseUrl) => {
      const malformedResponse = await fetch(`${baseUrl}/api/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json',
      });
      assert.equal(malformedResponse.status, 400);

      const nextResponse = await fetch(baseUrl);
      assert.equal(nextResponse.status, 429);
      assert.equal(nextResponse.headers.get('retry-after') !== null, true);
    });
  } finally {
    rateLimiter.close();
  }
});


test('health endpoints remain available when the public rate limit is exhausted', async () => {
  const rateLimiter = createRateLimiter({ limit: 1 });
  const app = createApp({
    getDB: () => null,
    isDBConnected: () => true,
    rateLimiter,
    logger: { info() {}, error() {} },
  });

  try {
    await withServer(app, async (baseUrl) => {
      const healthResponse = await fetch(`${baseUrl}/api/health`);
      assert.equal(healthResponse.status, 200);
      assert.equal((await healthResponse.json()).version, '0.1.0');

      const publicResponse = await fetch(baseUrl);
      assert.equal(publicResponse.status, 429);
    });
  } finally {
    rateLimiter.close();
  }
});

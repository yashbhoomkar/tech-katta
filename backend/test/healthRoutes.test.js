import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createHealthRouter } from '../src/routes/health.js';

async function withHealthApi(isDBConnected, run) {
  const app = express();
  app.use('/health', createHealthRouter({ isDBConnected }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test('liveness stays healthy when MongoDB is disconnected', async () => {
  await withHealthApi(() => false, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      service: 'tech-katta-api',
    });
  });
});

test('readiness returns 503 when MongoDB is disconnected', async () => {
  await withHealthApi(() => false, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      status: 'not_ready',
      service: 'tech-katta-api',
      db: 'disconnected',
    });
  });
});

test('readiness returns 200 when MongoDB is connected', async () => {
  await withHealthApi(() => true, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ready',
      service: 'tech-katta-api',
      db: 'connected',
    });
  });
});

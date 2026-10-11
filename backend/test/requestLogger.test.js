import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequestLogger } from '../src/middleware/requestLogger.js';

test('adds a request ID and logs structured path-only request metadata', async () => {
  const events = [];
  let currentTime = 100;
  const app = express();
  app.use(createRequestLogger({
    logger: { info: (line) => events.push(JSON.parse(line)) },
    createId: () => 'test-request-id',
    now: () => {
      currentTime += 7;
      return currentTime;
    },
  }));
  app.get('/items/:id', (_request, response) => response.status(201).json({ ok: true }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/items/42?secret=do-not-log`);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('x-request-id'), 'test-request-id');
    await response.json();

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
      level: 'info',
      event: 'http_request',
      requestId: 'test-request-id',
      method: 'GET',
      path: '/items/42',
      statusCode: 201,
      durationMs: 7,
    });
    assert.equal(JSON.stringify(events[0]).includes('do-not-log'), false);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

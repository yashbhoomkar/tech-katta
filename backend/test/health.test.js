import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';

async function getFreePort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  const port = await getFreePort();
  const server = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const baseUrl = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) throw new Error('API process exited before becoming ready.');
    try {
      const response = await fetch(baseUrl + '/health');
      if (response.status === 200) return { server, baseUrl };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  server.kill('SIGTERM');
  throw new Error('API server did not start in time.');
}

test('health endpoints return a no-store JSON process status', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));

  for (const route of ['/health', '/health/', '/health/live', '/health/ready', '/api/health']) {
    const response = await fetch(running.baseUrl + route);
    assert.equal(response.status, 200, route);
    assert.ok((response.headers.get('content-type') || '').includes('application/json'), route);
    assert.equal(response.headers.get('cache-control'), 'no-store', route);
    const body = await response.json();
    assert.equal(body.status, 'ok', route);
    assert.equal(body.service, 'tech-katta-backend', route);
    assert.ok(Number.isInteger(body.uptimeSeconds), route);
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)), route);
  }
});

test('unknown paths return JSON 404', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));
  const response = await fetch(running.baseUrl + '/missing');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'not_found');
});

test('health route supports HEAD without a response body', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));
  const response = await fetch(running.baseUrl + '/health', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('health route rejects unsupported methods', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));
  const response = await fetch(running.baseUrl + '/health', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

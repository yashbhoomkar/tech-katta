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

test('landing page endpoint returns structured editorial content', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));

  const response = await fetch(running.baseUrl + '/api/content/landing-page');
  assert.equal(response.status, 200);
  assert.ok((response.headers.get('content-type') || '').includes('application/json'));
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300, s-maxage=300');

  const content = await response.json();
  assert.match(content.meta.title, /Tech Katta/);
  assert.ok(content.hero.diagram.groups.length >= 3);
  assert.equal(content.lab.status, "UPCOMING");
  assert.match(content.lab.description, /knowledge base/);
  assert.equal(Object.hasOwn(content.lab, "workspace"), false);
  assert.equal(content.notes.items.length, 3);
  assert.equal(content.principle.comparison.length, 2);
  assert.ok(content.footer.links.length >= 1);
});

test('landing page endpoint supports HEAD without a response body', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));

  const response = await fetch(running.baseUrl + '/api/content/landing-page', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('landing page endpoint rejects unsupported methods', async (t) => {
  const running = await startServer();
  t.after(() => running.server.kill('SIGTERM'));

  const response = await fetch(running.baseUrl + '/api/content/landing-page', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD, OPTIONS');
});

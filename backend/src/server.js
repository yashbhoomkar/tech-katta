import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const startedAt = Date.now();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'https://tech.katta.cc';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

function sendJson(request, response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(request.headers.origin === allowedOrigin ? {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin',
    } : {}),
  });
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
}

function healthPayload() {
  return {
    status: 'ok',
    service: packageJson.name,
    version: packageJson.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      ...(request.headers.origin === allowedOrigin ? {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Vary': 'Origin',
      } : {}),
    });
    response.end();
    return;
  }

  if (['/health', '/health/', '/health/live', '/health/ready', '/api/health'].includes(pathname)) {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.setHeader('Allow', 'GET, HEAD, OPTIONS');
      sendJson(request, response, 405, { status: 'error', error: 'method_not_allowed' });
      return;
    }

    // This starter has no external dependencies yet. A successful response
    // confirms the API process is accepting requests; it does not claim that
    // MongoDB or other future dependencies have been checked.
    sendJson(request, response, 200, healthPayload());
    return;
  }

  sendJson(request, response, 404, {
    status: 'error',
    error: 'not_found',
    message: 'Route not found',
  });
});

server.listen(port, host, () => {
  console.log(`Tech Katta API listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down API server.`);
  server.close((error) => {
    if (error) {
      console.error('HTTP server shutdown failed:', error);
      process.exitCode = 1;
    }
  });
  setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

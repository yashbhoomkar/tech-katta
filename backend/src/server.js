import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadContent, buildBodies } from './content/store.js';

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
    content: { release: content.release, articles: content.articles.length },
    timestamp: new Date().toISOString(),
  };
}

// Public, read-only site content. Any origin may read it (no cookies or credentials are involved),
// which also lets Vercel preview deployments load it. Responses carry an ETag and may be cached
// briefly; content only changes when the API is redeployed.
const contentHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
  'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const etagCache = new WeakMap();

function sendContent(request, response, body) {
  let entry = etagCache.get(body);
  if (!entry) {
    const json = JSON.stringify(body);
    entry = { json, etag: `"${createHash('sha1').update(json).digest('base64url')}"` };
    etagCache.set(body, entry);
  }
  if (request.headers['if-none-match'] === entry.etag) {
    response.writeHead(304, { ...contentHeaders, ETag: entry.etag });
    response.end();
    return;
  }
  response.writeHead(200, { ...contentHeaders, ETag: entry.etag });
  response.end(request.method === 'HEAD' ? undefined : entry.json);
}

function sendContentError(request, response, statusCode, error) {
  response.writeHead(statusCode, { ...contentHeaders, 'Cache-Control': 'no-store' });
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'error', error }));
}

// Content is JSON on disk (repo content/ locally; /var/lib/tech-katta/content/current on the VPS).
// It is validated and loaded at startup; the process refuses to start on invalid content.
// `kill -HUP` reloads it in place, and keeps serving the last good release if the new one is invalid.
const contentDir = process.env.CONTENT_DIR || path.join(path.dirname(root), 'content');
let content = await loadContent(contentDir);
let bodies = buildBodies(content);
console.log(`Content ${content.release}: ${content.articles.length} article(s) from ${contentDir}`);
process.on('SIGHUP', async () => {
  try {
    const next = await loadContent(contentDir);
    content = next;
    bodies = buildBodies(next);
    console.log(`Content reloaded: ${next.release}`);
  } catch (error) {
    console.error(`Content reload failed; still serving ${content.release}.\n${error.message}`);
  }
});
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

function handleContent(request, response, pathname, searchParams) {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, HEAD, OPTIONS');
    sendContentError(request, response, 405, 'method_not_allowed');
    return;
  }
  if (pathname === '/v1/site') return sendContent(request, response, bodies.site);
  if (pathname === '/v1/articles') {
    const section = searchParams.get('section') || '';
    if (section && !SLUG.test(section)) return sendContentError(request, response, 400, 'bad_section');
    return sendContent(request, response, bodies.list(section));
  }
  const slug = pathname.slice('/v1/articles/'.length);
  if (!SLUG.test(slug)) return sendContentError(request, response, 404, 'not_found');
  const article = bodies.article(slug);
  if (!article) return sendContentError(request, response, 404, 'not_found');
  return sendContent(request, response, article);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;

  if (pathname === '/v1/site' || pathname === '/v1/articles' || pathname.startsWith('/v1/articles/')) {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Max-Age': '600' });
      response.end();
      return;
    }
    handleContent(request, response, pathname, url.searchParams);
    return;
  }

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

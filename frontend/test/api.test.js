import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchArticleBySlug, fetchArticles, fetchCategories } from '../src/api.js';

test('successful empty article response remains authoritative', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('[]', { status: 200 }));
  assert.deepEqual(await fetchArticles(), []);
});

test('list endpoints distinguish server errors from network outages', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
  assert.deepEqual(await fetchArticles(), { status: 'error', httpStatus: 503 });
  assert.deepEqual(await fetchCategories(), { status: 'error', httpStatus: 503 });
});

test('article fetch distinguishes a missing slug from a server error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }));
  assert.deepEqual(await fetchArticleBySlug('missing-note'), { status: 'not-found' });

  t.mock.method(globalThis, 'fetch', async () => new Response('unavailable', { status: 503 }));
  assert.deepEqual(await fetchArticleBySlug('known-note'), { status: 'error', httpStatus: 503 });
});

test('article fetch returns canonical data on success', async (t) => {
  const article = { slug: 'sample-note', title: 'Sample' };
  t.mock.method(globalThis, 'fetch', async () => Response.json(article));
  assert.deepEqual(await fetchArticleBySlug('sample-note'), { status: 'ok', article });
});

test('article fetch reports network failure separately so local fallback can be used', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network down'); });
  assert.deepEqual(await fetchArticleBySlug('sample-note'), { status: 'unavailable' });
});

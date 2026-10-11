import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { categories as fallbackCategories } from '../src/data.js';
import { createContentRouter } from '../src/routes/content.js';

async function withApi(dependencies, run) {
  const app = express();
  app.use('/api', createContentRouter(dependencies));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function fakeDatabase({
  categories = [],
  articles = [],
  categoryError = null,
  articlesError = null,
  articleBySlug = null,
} = {}) {
  return {
    collection(name) {
      return {
        find(query = {}) {
          let skip = 0;
          let limit = Infinity;
          let sortSpec = null;
          return {
            sort(spec) {
              sortSpec = spec;
              return this;
            },
            skip(value) {
              skip = value;
              return this;
            },
            limit(value) {
              limit = value;
              return this;
            },
            async toArray() {
              if (name === 'categories') {
                if (categoryError) throw categoryError;
                return categories;
              }
              if (articlesError) throw articlesError;

              let result = [...articles];
              if (typeof query.category === 'string') {
                result = result.filter((article) => article.category === query.category);
              }
              if (sortSpec?.slug === 1) {
                result.sort((a, b) => a.slug.localeCompare(b.slug));
              }
              return result.slice(skip, skip + limit);
            },
          };
        },
        async countDocuments(query = {}) {
          if (articlesError) throw articlesError;
          if (typeof query.category === 'string') {
            return articles.filter((article) => article.category === query.category).length;
          }
          return articles.length;
        },
        async findOne({ slug }) {
          if (articlesError) throw articlesError;
          return articleBySlug?.slug === slug ? articleBySlug : null;
        },
      };
    },
  };
}

test('serves local categories when MongoDB is disconnected', async () => {
  await withApi({
    isDBConnected: () => false,
    getDB: () => { throw new Error('database should not be read'); },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/categories`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), fallbackCategories);
  });
});

test('does not replace an empty connected database result with fallback categories', async () => {
  const db = fakeDatabase({ categories: [] });
  await withApi({
    isDBConnected: () => true,
    getDB: () => db,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/categories`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });
});

test('returns a generic 503 when a connected database query fails', async () => {
  const db = fakeDatabase({ categoryError: new Error('private Atlas detail') });
  await withApi({
    isDBConnected: () => true,
    getDB: () => db,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/categories`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '5');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.error, 'Content service temporarily unavailable');
    assert.equal(JSON.stringify(body).includes('private Atlas detail'), false);
  });
});

test('returns 404 for a missing database article instead of falling back', async () => {
  const db = fakeDatabase();
  await withApi({
    isDBConnected: () => true,
    getDB: () => db,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/articles/distributed-system-components-overview`);
    assert.equal(response.status, 404);
  });
});

test('supports opt-in pagination with stable ordering and metadata headers', async () => {
  const db = fakeDatabase({
    articles: [
      { slug: 'c-article', title: 'C' },
      { slug: 'a-article', title: 'A' },
      { slug: 'b-article', title: 'B' },
    ],
  });

  await withApi({
    isDBConnected: () => true,
    getDB: () => db,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/articles?page=2&limit=1`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ slug: 'b-article', title: 'B' }]);
    assert.equal(response.headers.get('x-total-count'), '3');
    assert.equal(response.headers.get('x-page'), '2');
    assert.equal(response.headers.get('x-page-size'), '1');
    assert.equal(response.headers.get('x-total-pages'), '3');
  });
});

test('rejects invalid pagination values', async () => {
  const db = fakeDatabase({ articles: [] });
  await withApi({
    isDBConnected: () => true,
    getDB: () => db,
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/articles?page=0&limit=10`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: 'page and limit must be positive integers',
    });
  });
});

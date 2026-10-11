import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentController } from '../src/modules/content/contentController.js';
import { createContentRepository } from '../src/modules/content/contentRepository.js';
import { createContentService } from '../src/modules/content/contentService.js';
import { ContentUnavailableError } from '../src/errors.js';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { categories as fallbackCategories } from '../src/data.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    headersSent: false,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    json(body) {
      this.body = body;
      return this;
    },
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
}

test('repository uses local fallback only when MongoDB is disconnected', async () => {
  let databaseRead = false;
  const repository = createContentRepository({
    isDBConnected: () => false,
    getDB: () => {
      databaseRead = true;
      throw new Error('must not query disconnected database');
    },
  });

  assert.deepEqual(await repository.getCategories(), fallbackCategories);
  assert.equal(databaseRead, false);
});

test('repository escapes search text and excludes full article content from list queries', async () => {
  let observedQuery;
  let observedOptions;
  const repository = createContentRepository({
    isDBConnected: () => true,
    getDB: () => ({
      collection(name) {
        assert.equal(name, 'articles');
        return {
          find(query, options) {
            observedQuery = query;
            observedOptions = options;
            return { toArray: async () => [] };
          },
        };
      },
    }),
  });

  await repository.getArticles({ category: 'distributed-systems', search: 'cache.*' });

  assert.equal(observedQuery.category, 'distributed-systems');
  assert.deepEqual(observedQuery.$or[0], {
    title: { $regex: 'cache\\.\\*', $options: 'i' },
  });
  assert.deepEqual(observedOptions, {
    projection: { _id: 0, content: 0 },
  });
});

test('service normalizes article content without mutating repository data', async () => {
  const storedArticle = {
    slug: 'sample-article',
    content: {
      sections: [{
        title: 'Intro',
        paragraphs: ['First paragraph'],
        bullets: ['One item'],
      }],
    },
  };
  const service = createContentService({
    repository: {
      async getArticleBySlug() {
        return storedArticle;
      },
    },
  });

  const result = await service.getArticle('sample-article');

  assert.equal(result.content.schemaVersion, 2);
  assert.deepEqual(result.content.sections[0].blocks, [
    { type: 'text', paragraphs: ['First paragraph'] },
    { type: 'list', items: ['One item'] },
  ]);
  assert.equal(storedArticle.content.schemaVersion, undefined);
  assert.equal(storedArticle.content.sections[0].blocks, undefined);
});

test('controller forwards supported article filters to the service', async () => {
  let observedFilters;
  const controller = createContentController({
    service: {
      async getArticles(filters) {
        observedFilters = filters;
        return [{ slug: 'sample-article' }];
      },
    },
  });
  const response = responseRecorder();

  await controller.listArticles({
    query: { category: 'systems', search: 'cache' },
  }, response, () => {});

  assert.deepEqual(observedFilters, {
    category: 'systems',
    search: 'cache',
  });
  assert.deepEqual(response.body, [{ slug: 'sample-article' }]);
  assert.equal(response.statusCode, 200);
});

test('controller forwards content failures to the shared error handler', async () => {
  const controller = createContentController({
    service: {
      async getCategories() {
        throw new Error('secret MongoDB connection string');
      },
    },
  });
  const response = responseRecorder();
  let forwardedError;

  await controller.listCategories({}, response, (error) => {
    forwardedError = error;
  });

  assert.ok(forwardedError instanceof ContentUnavailableError);
  const errorHandler = createErrorHandler({ logger: { error() {} } });
  errorHandler(forwardedError, { method: 'GET', path: '/api/categories' }, response, () => {});

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['retry-after'], 5);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.body, {
    error: 'Content service temporarily unavailable',
  });
  assert.equal(JSON.stringify(response.body).includes('secret MongoDB'), false);
});

test('controller rejects malformed slugs before calling the service', async () => {
  let serviceCalled = false;
  let forwardedError;
  const controller = createContentController({
    service: {
      async getArticle() {
        serviceCalled = true;
        return null;
      },
    },
  });
  const response = responseRecorder();

  await controller.getArticle({ params: { slug: '../admin' } }, response, (error) => {
    forwardedError = error;
  });

  assert.equal(forwardedError.statusCode, 404);
  assert.equal(serviceCalled, false);
});

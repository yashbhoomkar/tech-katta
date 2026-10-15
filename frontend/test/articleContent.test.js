import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveArticleContent } from '../src/articleContent.js';

test('uses canonical remote content after a successful API response', () => {
  const remoteContent = { sections: [{ id: 'intro', title: 'Introduction', blocks: [{ type: 'text', paragraphs: ['Real content'] }] }] };
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  assert.deepEqual(resolveArticleContent({ status: 'ok', article: { content: remoteContent } }, fallbackContent), {
    content: remoteContent,
    error: false,
  });
});

test('preserves intentionally empty remote content rather than using bundled content', () => {
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  for (const emptyContent of [{}, { sections: [] }]) {
    assert.deepEqual(resolveArticleContent({ status: 'ok', article: { content: emptyContent } }, fallbackContent), {
      content: emptyContent,
      error: false,
    });
  }
});

test('treats missing, null, primitive, and array content as invalid after API success', () => {
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  for (const article of [
    {},
    { content: null },
    { content: 'not-an-object' },
    { content: [] },
  ]) {
    assert.deepEqual(resolveArticleContent({ status: 'ok', article }, fallbackContent), {
      content: null,
      error: true,
    });
  }
});

test('rejects malformed nested content fields that would crash render-time iteration', () => {
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  const malformedContent = [
    { sections: 'not-an-array' },
    { introduction: 'not-an-array' },
    { knowledgeCheck: 'not-an-array' },
    { summary: { text: 'not-a-string' } },
    { sections: [{ paragraphs: 'not-an-array' }] },
    { sections: [{ subsections: 'not-an-array' }] },
    { sections: [{ blocks: 'not-an-array' }] },
    { sections: [{ blocks: [{ type: 'text', paragraphs: 'not-an-array' }] }] },
    { sections: [{ blocks: [{ type: 'table', rows: 'not-an-array' }] }] },
    { sections: [{ code: { type: 'table', code: 'safe-looking', rows: 'not-an-array' } }] },
    { sections: [{ callout: { type: 'table', title: 'bad', rows: 'not-an-array' } }] },
    { sections: [{ blocks: [{ type: 'unsupported' }] }] },
  ];

  for (const content of malformedContent) {
    assert.deepEqual(resolveArticleContent({ status: 'ok', article: { content } }, fallbackContent), {
      content: null,
      error: true,
    });
  }
});

test('uses bundled content only when the network is unavailable', () => {
  const fallbackContent = { sections: [{ id: 'offline', title: 'Offline fallback', blocks: [] }] };
  assert.deepEqual(resolveArticleContent({ status: 'unavailable' }, fallbackContent), {
    content: fallbackContent,
    error: false,
  });
});

test('does not use bundled content for HTTP errors or a missing article', () => {
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  for (const result of [{ status: 'error' }, { status: 'not-found' }, { status: 'loading' }]) {
    assert.deepEqual(resolveArticleContent(result, fallbackContent), { content: null, error: false });
  }
});

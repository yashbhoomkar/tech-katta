import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveArticleContent } from '../src/articleContent.js';

test('uses canonical remote content after a successful API response', () => {
  const remoteContent = { sections: [{ id: 'intro', title: 'Introduction', blocks: [] }] };
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  assert.deepEqual(resolveArticleContent({ status: 'ok', article: { content: remoteContent } }, fallbackContent), {
    content: remoteContent,
    error: false,
  });
});

test('preserves intentionally empty remote content rather than using bundled content', () => {
  const emptyContent = { sections: [] };
  const fallbackContent = { sections: [{ id: 'stale', title: 'Stale bundled section', blocks: [] }] };
  assert.deepEqual(resolveArticleContent({ status: 'ok', article: { content: emptyContent } }, fallbackContent), {
    content: emptyContent,
    error: false,
  });
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

export function resolveArticleContent(result, fallbackContent) {
  if (result?.status === 'unavailable') {
    return { content: fallbackContent, error: false };
  }

  if (result?.status !== 'ok') {
    return { content: null, error: false };
  }

  const article = result.article;
  const content = article?.content;
  const validContent =
    article !== null &&
    typeof article === 'object' &&
    Object.prototype.hasOwnProperty.call(article, 'content') &&
    content !== null &&
    typeof content === 'object' &&
    !Array.isArray(content);

  if (!validContent) return { content: null, error: true };

  // An empty content object or an empty sections array is valid and must not
  // be replaced by stale bundled content after a successful HTTP response.
  return { content, error: false };
}

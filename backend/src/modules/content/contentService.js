import { normalizeArticleContent } from '../../contentSchema.js';

/**
 * Content service: applies application-level content rules without knowing
 * about HTTP requests or MongoDB collection APIs.
 */
export function createContentService({ repository }) {
  if (!repository) {
    throw new TypeError('Content service requires a repository.');
  }

  return {
    getCategories() {
      return repository.getCategories();
    },

    getArticles(filters) {
      return repository.getArticles(filters);
    },

    async getArticle(slug) {
      const article = await repository.getArticleBySlug(slug);
      if (!article) return null;

      return {
        ...article,
        content: normalizeArticleContent(article.content, slug),
      };
    },
  };
}

import { ContentUnavailableError, NotFoundError } from '../../errors.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Content controller: translates HTTP input into service calls and passes
 * failures to the application's shared error boundary.
 */
export function createContentController({ service }) {
  if (!service) {
    throw new TypeError('Content controller requires a service.');
  }

  return {
    async listCategories(_request, response, next) {
      try {
        return response.json(await service.getCategories());
      } catch (error) {
        return next(new ContentUnavailableError('categories', error));
      }
    },

    async listArticles(request, response, next) {
      try {
        const articles = await service.getArticles({
          category: request.query.category,
          search: request.query.search,
        });
        return response.json(articles);
      } catch (error) {
        return next(new ContentUnavailableError('articles', error));
      }
    },

    async getArticle(request, response, next) {
      const { slug } = request.params;
      if (!SLUG_PATTERN.test(slug)) return next(new NotFoundError());

      try {
        const article = await service.getArticle(slug);
        if (!article) return next(new NotFoundError());
        return response.json(article);
      } catch (error) {
        return next(new ContentUnavailableError(`article ${slug}`, error));
      }
    },
  };
}

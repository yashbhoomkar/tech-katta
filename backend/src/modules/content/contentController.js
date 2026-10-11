const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function respondContentUnavailable(response, route, error, logger) {
  logger.error(`Content query failed for ${route}:`, error.message);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Retry-After', '5');

  return response.status(503).json({
    error: 'Content service temporarily unavailable',
  });
}

/**
 * Content controller: translates HTTP input into service calls and service
 * outcomes into the existing public API response contract.
 */
export function createContentController({ service, logger = console }) {
  if (!service) {
    throw new TypeError('Content controller requires a service.');
  }

  return {
    async listCategories(_request, response) {
      try {
        return response.json(await service.getCategories());
      } catch (error) {
        return respondContentUnavailable(response, 'categories', error, logger);
      }
    },

    async listArticles(request, response) {
      try {
        const articles = await service.getArticles({
          category: request.query.category,
          search: request.query.search,
        });
        return response.json(articles);
      } catch (error) {
        return respondContentUnavailable(response, 'articles', error, logger);
      }
    },

    async getArticle(request, response) {
      const { slug } = request.params;
      if (!SLUG_PATTERN.test(slug)) return response.sendStatus(404);

      try {
        const article = await service.getArticle(slug);
        if (!article) return response.sendStatus(404);
        return response.json(article);
      } catch (error) {
        return respondContentUnavailable(response, `article ${slug}`, error, logger);
      }
    },
  };
}

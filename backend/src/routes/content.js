import express from 'express';
import { normalizeArticleContent } from '../contentSchema.js';
import { readPrimaryOrFallback } from '../contentSource.js';
import {
  categories as fallbackCategories,
  articles as fallbackArticles,
  getArticle as getFallbackArticle,
  getArticleContent as getFallbackContent,
} from '../data.js';

export function createContentRouter({ getDB, isDBConnected }) {
  const router = express.Router();

  function respondContentUnavailable(response, route, error) {
    console.error(`Content query failed for ${route}:`, error.message);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Retry-After', '5');
    return response.status(503).json({
      error: 'Content service temporarily unavailable',
    });
  }

  router.get('/categories', async (_request, response) => {
    try {
      const categories = await readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('categories')
          .find({}, { projection: { _id: 0 } })
          .toArray(),
        readFallback: () => fallbackCategories,
      });

      return response.json(categories);
    } catch (err) {
      return respondContentUnavailable(response, 'categories', err);
    }
  });

  router.get('/articles', async (request, response) => {
    const { category, search } = request.query;
    const query = {};

    if (typeof category === 'string' && category) {
      query.category = category.slice(0, 100);
    }

    if (typeof search === 'string') {
      const q = search.trim().slice(0, 100);
      const escaped = q.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

      if (escaped) {
        query.$or = [
          { title: { $regex: escaped, $options: 'i' } },
          { eyebrow: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } },
        ];
      }
    }

    const readFallback = () => {
      let result = [...fallbackArticles];

      if (typeof category === 'string' && category) {
        result = result.filter((item) => item.category === category);
      }

      if (typeof search === 'string') {
        const q = search.trim().slice(0, 100).toLowerCase();
        result = result.filter((item) => {
          const haystack = [
            item.title,
            item.eyebrow,
            item.description,
            ...(item.tags || []),
          ].join(' ').toLowerCase();
          return haystack.includes(q);
        });
      }

      return result;
    };

    try {
      const articles = await readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('articles')
          .find(query, { projection: { _id: 0, content: 0 } })
          .toArray(),
        readFallback,
      });

      return response.json(articles);
    } catch (err) {
      return respondContentUnavailable(response, 'articles', err);
    }
  });

  router.get('/articles/:slug', async (request, response) => {
    const { slug } = request.params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response.sendStatus(404);

    try {
      const article = await readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('articles')
          .findOne({ slug }, { projection: { _id: 0 } }),
        readFallback: () => {
          const fallbackArticle = getFallbackArticle(slug);
          if (!fallbackArticle) return null;

          return {
            ...fallbackArticle,
            content: getFallbackContent(slug),
          };
        },
      });

      if (!article) return response.sendStatus(404);

      return response.json({
        ...article,
        content: normalizeArticleContent(article.content, slug),
      });
    } catch (err) {
      return respondContentUnavailable(response, `article ${slug}`, err);
    }
  });

  return router;
}

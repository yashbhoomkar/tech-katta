import { readPrimaryOrFallback } from '../../contentSource.js';
import {
  categories as fallbackCategories,
  articles as fallbackArticles,
  getArticle as getFallbackArticle,
  getArticleContent as getFallbackContent,
} from '../../data.js';

function buildArticleQuery({ category, search }) {
  const query = {};

  if (typeof category === 'string' && category) {
    query.category = category.slice(0, 100);
  }

  if (typeof search === 'string') {
    const term = search.trim().slice(0, 100);
    const escaped = term.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

    if (escaped) {
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { eyebrow: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
      ];
    }
  }

  return query;
}

function filterFallbackArticles({ category, search }) {
  let result = [...fallbackArticles];

  if (typeof category === 'string' && category) {
    result = result.filter((article) => article.category === category);
  }

  if (typeof search === 'string') {
    const term = search.trim().slice(0, 100).toLowerCase();
    result = result.filter((article) => {
      const haystack = [
        article.title,
        article.eyebrow,
        article.description,
        ...(article.tags || []),
      ].join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }

  return result;
}

/**
 * Content repository: the only content module that knows MongoDB collections
 * and the local fallback data source.
 */
export function createContentRepository({ getDB, isDBConnected }) {
  if (typeof getDB !== 'function' || typeof isDBConnected !== 'function') {
    throw new TypeError('Content repository requires getDB and isDBConnected dependencies.');
  }

  return {
    getCategories() {
      return readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('categories')
          .find({}, { projection: { _id: 0 } })
          .toArray(),
        readFallback: () => fallbackCategories,
      });
    },

    getArticles(filters = {}) {
      const query = buildArticleQuery(filters);

      return readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('articles')
          .find(query, { projection: { _id: 0, content: 0 } })
          .toArray(),
        readFallback: () => filterFallbackArticles(filters),
      });
    },

    getArticleBySlug(slug) {
      return readPrimaryOrFallback({
        databaseConnected: isDBConnected(),
        readDatabase: () => getDB()
          .collection('articles')
          .findOne({ slug }, { projection: { _id: 0 } }),
        readFallback: () => {
          const article = getFallbackArticle(slug);
          if (!article) return null;

          return {
            ...article,
            content: getFallbackContent(slug),
          };
        },
      });
    },
  };
}

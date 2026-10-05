import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { connectDB, getDB, isDBConnected } from './db.js';
import { normalizeArticleContent } from './contentSchema.js';
import {
  categories as fallbackCategories,
  articles as fallbackArticles,
  getArticle as getFallbackArticle,
  getArticleContent as getFallbackContent,
} from './data.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || '*';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '50kb' }));

app.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'tech-katta-api',
    db: isDBConnected() ? 'connected' : 'disconnected',
    message: 'Tech Katta API is operational',
  });
});

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'tech-katta-api',
    version: '2026.10.05-ci-test-2',
    db: isDBConnected() ? 'connected' : 'disconnected',
  });
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'tech-katta-api',
    version: '2026.10.05-ci-test-2',
    db: isDBConnected() ? 'connected' : 'disconnected',
  });
});

app.get('/api/categories', async (_request, response) => {
  try {
    if (isDBConnected()) {
      const db = getDB();
      const categories = await db
        .collection('categories')
        .find({}, { projection: { _id: 0 } })
        .toArray();
      if (categories && categories.length > 0) {
        return response.json(categories);
      }
    }
  } catch (err) {
    console.error('Error fetching categories from DB:', err.message);
  }
  return response.json(fallbackCategories);
});

app.get('/api/articles', async (request, response) => {
  const { category, search } = request.query;

  try {
    if (isDBConnected()) {
      const db = getDB();
      const query = {};

      if (category && typeof category === 'string') {
        query.category = category;
      }

      if (search && typeof search === 'string') {
        const q = search.trim();
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { eyebrow: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { tags: { $regex: q, $options: 'i' } },
        ];
      }

      const articles = await db
        .collection('articles')
        .find(query, { projection: { _id: 0, content: 0 } })
        .toArray();

      if (articles && articles.length > 0) {
        return response.json(articles);
      }
    }
  } catch (err) {
    console.error('Error fetching articles from DB:', err.message);
  }

  // Fallback
  let result = [...fallbackArticles];
  if (category) {
    result = result.filter((item) => item.category === category);
  }
  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    result = result.filter((item) => {
      const haystack = [item.title, item.eyebrow, item.description, ...(item.tags || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  return response.json(result);
});

app.get('/api/articles/:slug', async (request, response) => {
  const { slug } = request.params;

  try {
    if (isDBConnected()) {
      const db = getDB();
      const article = await db.collection('articles').findOne({ slug }, { projection: { _id: 0 } });
      if (article) {
        return response.json({ ...article, content: normalizeArticleContent(article.content) });
      }
    }
  } catch (err) {
    console.error(`Error fetching article "${slug}" from DB:`, err.message);
  }

  // Fallback
  const article = getFallbackArticle(slug);
  if (!article) return response.sendStatus(404);
  const content = getFallbackContent(slug);
  return response.json({
    ...article,
    content: normalizeArticleContent(content),
  });
});

async function startServer() {
  await connectDB();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Tech Katta API listening on port ${port}`);
  });
}

startServer();

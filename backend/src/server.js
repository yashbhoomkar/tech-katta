import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { connectDB, getDB, isDBConnected, closeDB } from './db.js';
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
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !frontendOrigin) {
  throw new Error('FRONTEND_ORIGIN must be configured in production.');
}

const allowedOrigin = frontendOrigin || 'http://localhost:5173';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use((_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

app.use(express.json({ limit: '50kb' }));

const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 120;
const rateBuckets = new Map();

function rateLimit(request, response, next) {
  const forwardedFor = request.get('x-forwarded-for');
  const clientIp = (forwardedFor?.split(',')[0] || request.ip || 'unknown').trim();
  const now = Date.now();
  let bucket = rateBuckets.get(clientIp);

  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
  }

  bucket.count += 1;
  rateBuckets.set(clientIp, bucket);

  response.setHeader('X-RateLimit-Limit', RATE_LIMIT);
  response.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - bucket.count));

  if (bucket.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - bucket.startedAt)) / 1000);
    response.setHeader('Retry-After', retryAfter);
    return response.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (rateBuckets.size > 10000) {
    for (const [ip, entry] of rateBuckets) {
      if (now - entry.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(ip);
    }
  }

  return next();
}

app.use(rateLimit);

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
    version: '2026.10.05-production',
    db: isDBConnected() ? 'connected' : 'disconnected',
  });
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'tech-katta-api',
    version: '2026.10.05-production',
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
        query.category = category.slice(0, 100);
      }

      if (search && typeof search === 'string') {
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
    const q = search.trim().slice(0, 100).toLowerCase();
    result = result.filter((item) => {
      const haystack = [item.title, item.eyebrow, item.description, ...(item.tags || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }

  return response.json(result);
});

app.get('/api/articles/:slug', async (request, response) => {
  const { slug } = request.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response.sendStatus(404);

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

let server;

async function startServer() {
  await connectDB();

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Tech Katta API listening on port ${port}`);
  });
}

async function shutdown(signal) {
  console.log(`🛑 Received ${signal}. Shutting down gracefully...`);

  if (!server) {
    await closeDB();
    process.exit(0);
    return;
  }

  server.close(async () => {
    try {
      await closeDB();
      console.log('✅ HTTP server and MongoDB connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('❌ Graceful shutdown timed out.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  void shutdown('uncaughtException');
});

startServer().catch((err) => {
  console.error('❌ Failed to start Tech Katta API:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { connectDB, getDB, isDBConnected, closeDB } from './db.js';
import { normalizeArticleContent } from './contentSchema.js';
import { readPrimaryOrFallback } from './contentSource.js';
import { rateLimit } from './middleware/rateLimit.js';
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

function respondContentUnavailable(response, route, error) {
  console.error(`Content query failed for ${route}:`, error.message);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Retry-After', '5');
  return response.status(503).json({
    error: 'Content service temporarily unavailable',
  });
}

app.get('/api/categories', async (_request, response) => {
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

app.get('/api/articles', async (request, response) => {
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

app.get('/api/articles/:slug', async (request, response) => {
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

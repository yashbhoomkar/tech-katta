import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { connectDB, getDB, isDBConnected, closeDB } from './db.js';
import { createContentRouter } from './routes/content.js';
import { createHealthRouter } from './routes/health.js';
import { createRequestLogger } from './middleware/requestLogger.js';
import { rateLimit } from './middleware/rateLimit.js';

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
app.use(createRequestLogger());
app.use('/health', createHealthRouter({ isDBConnected }));

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

app.use('/api', createContentRouter({ getDB, isDBConnected }));

let server;

async function startServer() {
  await connectDB();

  server = app.listen(port, '127.0.0.1', () => {
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

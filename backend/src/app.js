import cors from 'cors';
import express from 'express';
import { createContentRouter } from './routes/content.js';
import { createHealthRouter } from './routes/health.js';
import { createRequestLogger } from './middleware/requestLogger.js';
import { rateLimit } from './middleware/rateLimit.js';

/**
 * Build the HTTP application without starting a listener or opening connections.
 *
 * Keeping app construction separate from process startup makes middleware,
 * routing, and HTTP behavior testable without production infrastructure.
 */
export function createApp({
  getDB,
  isDBConnected,
  rateLimiter = rateLimit,
  logger = console,
} = {}) {
  if (typeof getDB !== 'function' || typeof isDBConnected !== 'function') {
    throw new TypeError('createApp requires getDB and isDBConnected dependencies.');
  }

  const app = express();
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
  app.use(createRequestLogger({ logger }));
  app.use('/health', createHealthRouter({ isDBConnected }));

  // Health probes remain outside the general rate limiter for reliable checks.
  app.use(rateLimiter);

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

  return app;
}

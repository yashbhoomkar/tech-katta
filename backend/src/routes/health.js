import express from 'express';

export function createHealthRouter({ isDBConnected }) {
  const router = express.Router();

  router.get('/live', (_request, response) => {
    return response.status(200).json({
      status: 'ok',
      service: 'tech-katta-api',
    });
  });

  router.get('/ready', (_request, response) => {
    if (!isDBConnected()) {
      response.setHeader('Cache-Control', 'no-store');
      return response.status(503).json({
        status: 'not_ready',
        service: 'tech-katta-api',
        db: 'disconnected',
      });
    }

    return response.status(200).json({
      status: 'ready',
      service: 'tech-katta-api',
      db: 'connected',
    });
  });

  return router;
}

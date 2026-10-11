import express from 'express';
import { createContentController } from '../modules/content/contentController.js';
import { createContentRepository } from '../modules/content/contentRepository.js';
import { createContentService } from '../modules/content/contentService.js';

export function createContentRouter({ getDB, isDBConnected, logger = console }) {
  const router = express.Router();
  const repository = createContentRepository({ getDB, isDBConnected });
  const service = createContentService({ repository });
  const controller = createContentController({ service, logger });

  router.get('/categories', controller.listCategories);
  router.get('/articles', controller.listArticles);
  router.get('/articles/:slug', controller.getArticle);

  return router;
}

import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { categories, articles, getArticle, getArticleContent } from './data.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || '*';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '50kb' }));

app.get('/', (_request, response) => {
  response.json({ status: 'ok', service: 'tech-katta-api', message: 'Tech Katta API is operational' });
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'tech-katta-api' });
});

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'tech-katta-api' });
});

app.get('/api/categories', (_request, response) => {
  response.json(categories);
});

app.get('/api/articles', (request, response) => {
  const { category, search } = request.query;
  let result = [...articles];

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

  response.json(result);
});

app.get('/api/articles/:slug', (request, response) => {
  const article = getArticle(request.params.slug);
  if (!article) return response.sendStatus(404);
  const content = getArticleContent(request.params.slug);
  return response.json({
    ...article,
    content,
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Tech Katta API listening on port ' + port);
});

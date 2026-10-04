import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || '*';

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: '50kb' }));

const articles = [
  { slug: 'kafka', title: 'Kafka', eyebrow: 'Messaging', status: 'published', readTime: '12 min read' },
  { slug: 'cassandra', title: 'Cassandra', eyebrow: 'Wide-column storage', status: 'soon', readTime: '10 min read' },
  { slug: 'clickhouse', title: 'ClickHouse', eyebrow: 'Analytics', status: 'soon', readTime: '9 min read' },
];

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'tech-katta-api' });
});

app.get('/api/articles', (_request, response) => {
  response.json(articles);
});

app.get('/api/articles/:slug', (request, response) => {
  const article = articles.find((item) => item.slug === request.params.slug);
  if (!article) return response.sendStatus(404);
  return response.json(article);
});

app.listen(port, '0.0.0.0', () => {
  console.log('Tech Katta API listening on port ' + port);
});

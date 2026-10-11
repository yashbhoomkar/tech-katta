import http from 'k6/http';
import { check, sleep } from 'k6';

const frontendBase = (__ENV.FRONTEND_URL || 'https://tech.katta.cc').replace(/\/+$/, '');
const apiBase = (__ENV.API_URL || 'https://tech-api.katta.cc').replace(/\/+$/, '');

export const options = {
  scenarios: {
    frontend_browse: {
      executor: 'ramping-vus',
      exec: 'frontendBrowse',
      startVUs: 1,
      stages: [
        { duration: '20s', target: 3 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
    api_read: {
      executor: 'constant-vus',
      exec: 'apiRead',
      vus: 1,
      duration: '50s',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    'http_req_failed{scenario:frontend_browse}': ['rate<0.01'],
    'http_req_duration{scenario:frontend_browse}': ['p(95)<2000'],
    'http_req_failed{scenario:api_read}': ['rate<0.02'],
    'http_req_duration{scenario:api_read}': ['p(95)<1500'],
    checks: ['rate>0.98'],
  },
};

const frontendPaths = [
  '/',
  '/unit/distributed-systems',
  '/learn/distributed-system-components-overview',
];

const apiPaths = [
  '/api/health',
  '/api/categories',
  '/api/articles?search=distributed',
];

function validApiBody(response, path) {
  try {
    const body = response.json();
    if (path === '/api/health') {
      return body?.status === 'ok' && body?.service === 'tech-katta-api';
    }
    if (path === '/api/categories') return Array.isArray(body);
    if (path.startsWith('/api/articles?')) return Array.isArray(body);
    return false;
  } catch {
    return false;
  }
}

export function frontendBrowse() {
  const path = frontendPaths[__ITER % frontendPaths.length];
  const response = http.get(`${frontendBase}${path}`, {
    tags: { scenario: 'frontend_browse' },
    timeout: '10s',
    headers: { 'user-agent': 'TechKatta-k6-baseline/1.0' },
  });

  check(response, {
    'frontend route returns HTTP 200': (r) => r.status === 200,
    'frontend route serves the SPA shell': (r) => Boolean(r.body && r.body.includes('<div id="root">')),
  });
  sleep(1);
}

export function apiRead() {
  const path = apiPaths[__ITER % apiPaths.length];
  const response = http.get(`${apiBase}${path}`, {
    tags: { scenario: 'api_read' },
    timeout: '10s',
    headers: { 'user-agent': 'TechKatta-k6-baseline/1.0' },
  });

  check(response, {
    'API endpoint returns HTTP 200': (r) => r.status === 200,
    'API endpoint returns expected JSON shape': (r) => validApiBody(r, path),
  });
  // Keep API traffic below the current per-client rate limit; this is a baseline,
  // not a high-concurrency stress test.
  sleep(1.5);
}

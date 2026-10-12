import http from 'k6/http';
import { check, sleep } from 'k6';

const frontendBase = (__ENV.FRONTEND_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '');
const apiBase = (__ENV.API_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

export const options = {
  scenarios: {
    health_throughput: {
      executor: 'constant-arrival-rate',
      exec: 'healthRead',
      rate: 10,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
    api_reads: {
      executor: 'constant-arrival-rate',
      exec: 'apiRead',
      rate: 1,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 2,
      maxVUs: 5,
    },
    frontend_browse: {
      executor: 'ramping-vus',
      exec: 'frontendBrowse',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 3 },
        { duration: '10s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'http_req_failed{scenario:health_throughput}': ['rate<0.01'],
    'http_req_duration{scenario:health_throughput}': ['p(95)<500'],
    'http_req_failed{scenario:api_reads}': ['rate<0.01'],
    'http_req_duration{scenario:api_reads}': ['p(95)<1000'],
    'http_req_failed{scenario:frontend_browse}': ['rate<0.01'],
    'http_req_duration{scenario:frontend_browse}': ['p(95)<1000'],
    checks: ['rate>0.98'],
    dropped_iterations: ['count==0'],
  },
};

export function healthRead() {
  const response = http.get(`${apiBase}/api/health`, {
    tags: { scenario: 'health_throughput' },
    timeout: '5s',
  });
  check(response, {
    'health returns HTTP 200': (r) => r.status === 200,
    'health reports connected database': (r) => r.json('db') === 'connected',
  });
}

export function apiRead() {
  const path = __ITER % 2 === 0 ? '/api/categories' : '/api/articles?search=distributed';
  const response = http.get(`${apiBase}${path}`, {
    tags: { scenario: 'api_reads' },
    timeout: '5s',
  });
  check(response, {
    'read endpoint returns HTTP 200': (r) => r.status === 200,
    'read endpoint returns an array': (r) => Array.isArray(r.json()),
  });
  // One request/second across this scenario stays comfortably below the
  // existing per-client 120-request/minute rate limiter. Do not bypass it.
}

export function frontendBrowse() {
  const paths = ['/', '/unit/distributed-systems', '/learn/distributed-system-components-overview'];
  const path = paths[__ITER % paths.length];
  const response = http.get(`${frontendBase}${path}`, {
    tags: { scenario: 'frontend_browse' },
    timeout: '5s',
  });
  check(response, {
    'frontend route returns HTTP 200': (r) => r.status === 200,
    'frontend route serves the SPA shell': (r) => Boolean(r.body && r.body.includes('<div id="root">')),
  });
  sleep(1);
}

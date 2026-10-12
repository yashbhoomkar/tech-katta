import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const apiBase = (__ENV.API_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const rateLimitResponses = new Counter('rate_limit_responses');

function header(response, name) {
  const actualName = Object.keys(response.headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return actualName ? response.headers[actualName] : undefined;
}

export const options = {
  scenarios: {
    bounded_rate_limit: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '50s',
      preAllocatedVUs: 5,
      maxVUs: 10,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.98'],
    dropped_iterations: ['count==0'],
    rate_limit_responses: ['count>0'],
  },
};

export default function () {
  const response = http.get(`${apiBase}/api/categories`, {
    timeout: '5s',
    responseCallback: http.expectedStatuses(200, 429),
  });

  if (response.status === 429) rateLimitResponses.add(1);

  check(response, {
    'API returns success or configured HTTP 429': (r) => r.status === 200 || r.status === 429,
    'successful API response is an array': (r) => r.status !== 200 || Array.isArray(r.json()),
    '429 has Retry-After': (r) => r.status !== 429 || Number(r.headers['Retry-After']) >= 1,
    '429 reports the configured rate limit': (r) => r.status !== 429 || Number(header(r, 'X-RateLimit-Limit')) === 120,
    '429 reports no remaining requests': (r) => r.status !== 429 || Number(header(r, 'X-RateLimit-Remaining')) === 0,
  });
}

const checks = [
  { name: 'frontend home', url: 'https://tech.katta.cc/', expected: 200, includes: '<title>Tech Katta' },
  { name: 'frontend unit route', url: 'https://tech.katta.cc/unit/distributed-systems', expected: 200, includes: '<div id="root">' },
  { name: 'frontend article route', url: 'https://tech.katta.cc/learn/distributed-system-components-overview', expected: 200, includes: '<div id="root">' },
  { name: 'api health', url: 'https://tech-api.katta.cc/api/health', expected: 200, json: (body) => body.status === 'ok' && body.service === 'tech-katta-api' && body.db === 'connected' },
  { name: 'api categories', url: 'https://tech-api.katta.cc/api/categories', expected: 200, json: (body) => Array.isArray(body) && body.some((item) => item.id === 'distributed-systems') },
  { name: 'api articles', url: 'https://tech-api.katta.cc/api/articles', expected: 200, json: (body) => Array.isArray(body) && body.some((item) => item.slug === 'distributed-system-components-overview') },
  { name: 'api article by canonical slug', url: 'https://tech-api.katta.cc/api/articles/distributed-system-components-overview', expected: 200, json: (body) => body.slug === 'distributed-system-components-overview' && Array.isArray(body.content?.sections) },
  { name: 'api search regex safety', url: 'https://tech-api.katta.cc/api/articles?search=%5B', expected: 200, json: (body) => Array.isArray(body) },
  { name: 'api invalid slug', url: 'https://tech-api.katta.cc/api/articles/INVALID%20SLUG', expected: 404 },
];

const failures = [];

async function request(check, headers = {}) {
  const response = await fetch(check.url, { headers, redirect: 'manual' });
  const body = await response.text();

  if (response.status !== check.expected) {
    failures.push(`${check.name}: expected HTTP ${check.expected}, got ${response.status}`);
    return { response, body };
  }

  if (check.includes && !body.includes(check.includes)) {
    failures.push(`${check.name}: response did not contain ${JSON.stringify(check.includes)}`);
  }

  if (check.json) {
    try {
      const parsed = JSON.parse(body);
      if (!check.json(parsed)) failures.push(`${check.name}: JSON assertion failed`);
    } catch {
      failures.push(`${check.name}: response was not valid JSON`);
    }
  }

  return { response, body };
}

for (const check of checks) {
  await request(check);
}

const health = await request(checks[3], { Origin: 'https://tech.katta.cc' });
if (health.response.headers.get('access-control-allow-origin') !== 'https://tech.katta.cc') {
  failures.push('CORS: production frontend origin was not allowed');
}

const disallowed = await request(checks[3], { Origin: 'https://evil.example' });
if (disallowed.response.headers.get('access-control-allow-origin') === 'https://evil.example') {
  failures.push('CORS: disallowed origin was reflected back');
}

for (const header of ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']) {
  if (!health.response.headers.has(header)) {
    failures.push(`security headers: missing ${header}`);
  }
}

if (failures.length) {
  console.error('Production smoke tests FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Production smoke tests passed: ${checks.length} endpoint checks + CORS + security headers`);

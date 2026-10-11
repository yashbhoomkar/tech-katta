const target = process.env.API_URL ?? 'https://tech-api.katta.cc';
const concurrency = Number.parseInt(process.env.LOAD_CONCURRENCY ?? '3', 10);
const maxRequests = Number.parseInt(process.env.LOAD_MAX_REQUESTS ?? '60', 10);
const timeoutMs = 10000;

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) {
  throw new Error('LOAD_CONCURRENCY must be between 1 and 3 for this production-safe probe');
}
if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > 60) {
  throw new Error('LOAD_MAX_REQUESTS must be between 1 and 60 for this production-safe probe');
}

const url = new URL('/api/articles?search=distributed', target).toString();
const results = [];
let next = 0;

async function worker() {
  while (true) {
    const index = next++;
    if (index >= maxRequests) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'TechKatta-Controlled-Load-Check/1.0' } });
      await response.arrayBuffer();
      results.push({ status: response.status, ms: performance.now() - started });
    } catch (error) {
      results.push({ status: 0, ms: performance.now() - started, error: error.name === 'AbortError' ? 'timeout' : error.message });
    } finally {
      clearTimeout(timer);
    }
  }
}

console.log(`Controlled production GET probe: ${url}`);
console.log(`Boundaries: concurrency=${concurrency}, maximum requests=${maxRequests}, timeout=${timeoutMs}ms, GET-only`);
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const latencies = results.map((item) => item.ms).sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.ceil(p * latencies.length) - 1)] ?? 0;
const counts = results.reduce((acc, item) => {
  const key = item.status === 0 ? 'network_or_timeout' : String(item.status);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const serverErrors = results.filter((item) => item.status >= 500 || item.status === 0);
const throttled = results.filter((item) => item.status === 429).length;

console.log(JSON.stringify({
  requests: results.length,
  concurrency,
  statusCounts: counts,
  latencyMs: {
    min: Math.round(latencies[0] ?? 0),
    median: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    max: Math.round(latencies.at(-1) ?? 0),
  },
  throttled429: throttled,
  serverOrNetworkErrors: serverErrors.length,
}, null, 2));

if (serverErrors.length) {
  console.error('Controlled production load probe failed: one or more requests returned 5xx or failed at the network layer.');
  process.exitCode = 1;
} else if (throttled) {
  console.log('Probe completed without 5xx/network errors; rate limiting engaged on some requests. This is a bounded smoke load check, not a capacity benchmark.');
} else {
  console.log('Probe completed without 5xx/network errors or throttling. This is a bounded smoke load check, not a capacity benchmark.');
}

// Each service is a list of steps; it is operational only when every step passes.
// Frontend: the landing page and the dashboard load, and the JavaScript they boot with is served
// (a page that returns 200 but whose bundle is missing is still broken for visitors).
// Backend: /health is ok and the content endpoints the pages read answer with JSON.
const SITE = "https://tech.katta.cc";
const API = "https://tech-api.katta.cc";
const SERVICES = [
  { id: "frontend", name: "Frontend", url: SITE + "/", steps: [page(SITE + "/"), page(SITE + "/dashboard/")] },
  { id: "backend", name: "Backend", url: API + "/health", steps: [health(API + "/health"), json(API + "/v1/site"), json(API + "/v1/articles"), json(API + "/v1/lab")] }
];

const get = (url) => fetch(url, { method: "GET", cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(7000), headers: { "user-agent": "TechKattaStatus/1.1" } });
const fail = (msg) => { const e = new Error(msg); e.check = true; throw e; };

function page(url) {
  return async () => {
    const r = await get(url);
    if (!r.ok) fail(new URL(url).pathname + " returned HTTP " + r.status);
    const html = await r.text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], url).href);
    if (!scripts.length) fail(new URL(url).pathname + " has no app script");
    for (const src of scripts) {
      const js = await get(src);
      if (!js.ok || !/javascript/.test(js.headers.get("content-type") || "")) fail("App bundle " + new URL(src).pathname + " is missing (HTTP " + js.status + ")");
    }
  };
}
function health(url) {
  return async () => {
    const r = await get(url);
    if (!r.ok) fail("/health returned HTTP " + r.status);
    const body = await r.json().catch(() => null);
    if (!body || body.status !== "ok") fail("Health endpoint returned an unhealthy response");
  };
}
function json(url) {
  return async () => {
    const r = await get(url);
    if (!r.ok) fail(new URL(url).pathname + " returned HTTP " + r.status);
    if ((await r.json().catch(() => null)) === null) fail(new URL(url).pathname + " did not return JSON");
  };
}

async function check(service) {
  const started = Date.now();
  try {
    for (const step of service.steps) await step();
    return { id: service.id, name: service.name, url: service.url, status: "operational", message: service.steps.length + " checks passed", responseTimeMs: Date.now() - started };
  } catch (error) {
    const message = error && error.check ? error.message : error && error.name === "TimeoutError" ? "Request timed out" : "Unable to reach service";
    return { id: service.id, name: service.name, url: service.url, status: "outage", message, responseTimeMs: Date.now() - started };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const components = await Promise.all(SERVICES.map(check));
  const failures = components.filter(c => c.status !== "operational").length;
  const overall = failures === 0 ? "operational" : failures === components.length ? "outage" : "degraded";
  return res.status(200).json({ overall, checkedAt: new Date().toISOString(), components });
};
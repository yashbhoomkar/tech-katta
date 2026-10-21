const SERVICES = [
  { id: "frontend", name: "Frontend", url: "https://tech.katta.cc/", kind: "http" },
  { id: "backend", name: "Backend", url: "https://tech-api.katta.cc/health", kind: "health" }
];

async function check(service) {
  const started = Date.now();
  try {
    const response = await fetch(service.url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: { "user-agent": "TechKattaStatus/1.0" }
    });
    let healthy = response.ok;
    let message = healthy ? "HTTP " + response.status + " · Response received" : "HTTP " + response.status;
    if (healthy && service.kind === "health") {
      const payload = await response.json();
      healthy = payload && payload.status === "ok";
      message = healthy ? "Health endpoint responding" : "Health endpoint returned an unhealthy response";
    }
    return {
      id: service.id,
      name: service.name,
      url: service.url,
      status: healthy ? "operational" : "outage",
      message,
      httpStatus: response.status,
      responseTimeMs: Date.now() - started
    };
  } catch (error) {
    return {
      id: service.id,
      name: service.name,
      url: service.url,
      status: "outage",
      message: error && error.name === "TimeoutError" ? "Request timed out" : "Unable to reach service",
      responseTimeMs: Date.now() - started
    };
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
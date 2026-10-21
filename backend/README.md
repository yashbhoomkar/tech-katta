# Tech Katta Backend

Minimal Node.js 22 HTTP API starter for the clean rebuild. No third-party runtime dependencies.

## Run locally

```bash
cd backend
npm ci
npm test
npm start
```

By default, the server binds to `127.0.0.1:5000`. Configure `HOST`, `PORT`, and `FRONTEND_ORIGIN` through the process environment. Do not commit secrets.

## Health endpoints

- `GET /health` — primary health endpoint.
- `GET /health/live` — process liveness.
- `GET /health/ready` — currently indicates the HTTP process is ready; there are no external dependencies wired into this starter yet.
- `GET /api/health` — compatibility path for the previous deployment smoke check.

All health endpoints return JSON with status, service, version, uptime, and a UTC timestamp, plus `Cache-Control: no-store`. Unknown routes return JSON 404. Unsupported methods return JSON 405.

**Important:** this starter does not connect to MongoDB or serve the former knowledge-base API yet. Health success confirms the process is responding, not that a database or content subsystem is healthy.

# Tech Katta Backend

Node.js 22 + Express 5 API for Tech Katta. Production runs as a single Node process behind Nginx on the VPS and reads published content from MongoDB Atlas, with local fallback data available when MongoDB is known to be disconnected.

## Architecture

This is a **layered monolith**: one deployable application with clear boundaries, not a collection of microservices.

```text
HTTP request
    |
    v
app.js  -> middleware, CORS, request IDs, body parsing, rate limiting
    |
    v
routes/ -> map URL + method to a controller
    |
    v
modules/content/contentController.js  -> HTTP input/output
    |
    v
modules/content/contentService.js     -> application rules + content normalization
    |
    v
modules/content/contentRepository.js  -> MongoDB reads + local fallback reads
    |                                      |
    v                                      v
MongoDB Atlas                         data.js / content modules
```

## Important files

| File | Responsibility |
|---|---|
| `src/server.js` | Process entry point, configuration loading, DB startup, loopback listener, graceful shutdown |
| `src/config.js` | Parse and validate environment variables once; return immutable runtime configuration |
| `src/app.js` | Build Express app and register middleware/routes; does not start a listener |
| `src/db.js` | MongoDB client lifecycle, connection pool, reconnect behavior, database accessors |
| `src/routes/content.js` | Route registration and dependency wiring |
| `src/modules/content/contentController.js` | Translate HTTP requests to service calls and pass errors to the shared boundary |
| `src/modules/content/contentService.js` | Application-level content operations and response normalization |
| `src/modules/content/contentRepository.js` | MongoDB query construction, projections, and fallback reads |
| `src/contentSchema.js` | Normalize legacy and current article content into the public schema |
| `src/contentSource.js` | Preserve the database-versus-fallback policy |
| `src/data.js` and article modules | Local fallback content |
| `src/middleware/errorHandler.js` | Consistent JSON errors and safe client responses |
| `src/middleware/requestLogger.js` | Request ID and structured path-only request logs |
| `src/middleware/rateLimit.js` | Bounded process-local rate limiting |
| `src/routes/health.js` | Liveness and readiness endpoints |

## Request and error behavior

- Controllers do not construct database queries or normalize stored content.
- Services do not know about Express response objects or MongoDB collection APIs.
- Repositories are the only content module that directly accesses MongoDB collections.
- Local fallback content is used when MongoDB is known to be disconnected. A successful empty database result remains authoritative.
- A content query failure while the database is marked connected returns HTTP 503 with `Retry-After: 5` and `Cache-Control: no-store`; it does not silently substitute stale content.
- Unknown routes return JSON 404; malformed JSON returns JSON 400; request bodies above 50 KB return JSON 413; unexpected failures return a generic JSON 500.
- Internal error details are logged server-side and are not included in client responses.

## Environment

Copy `.env.example` to `.env` for local development. Never commit a real MongoDB URI or other secrets.

| Variable | Required | Meaning |
|---|---|---|
| `NODE_ENV` | No | Use `production` for production behavior |
| `PORT` | No | Node listener port; defaults to `5000` and must be 1–65535 |
| `FRONTEND_ORIGIN` | Production | Exact HTTP(S) frontend origin; production startup fails if missing |
| `MONGODB_URI` | No | MongoDB connection string; absent URI enables local fallback mode |
| `MONGODB_DB` | No | Database name; defaults to `techkatta` |
| `BACKEND_PORT` | Docker only | Host-side port published by Docker Compose on loopback; not the Node listener port |

Production deployment configures `FRONTEND_ORIGIN=https://tech.katta.cc` through the systemd service override. MongoDB credentials remain in the VPS service environment and must never be added to Git.

## Run locally

```bash
cd backend
cp .env.example .env
npm ci
npm test
npm start
```

Direct `npm start` uses `PORT` (default 5000). For a different local port, set `PORT=5002`. With Docker Compose, `BACKEND_PORT=5002` publishes host loopback port 5002 to container port 5000.

## Tests

```bash
cd backend
npm test
```

The native Node.js test suite uses fake repositories/databases and ephemeral HTTP listeners. It covers configuration validation, route behavior, database fallback rules, search escaping, normalization, rate limiting, request logging, security headers, and JSON error responses. CI passing is not a substitute for a production smoke test or load test.

## Health endpoints

- `GET /health/live` — process liveness; does not require MongoDB.
- `GET /health/ready` — readiness; returns 503 when MongoDB is disconnected.
- `GET /api/health` — legacy compatibility endpoint used by deployment smoke checks.
- `GET /health` — legacy compatibility endpoint.

## Operational constraints

- The API binds to `127.0.0.1`; Nginx is expected to proxy to that loopback listener.
- CORS is restricted to the configured frontend origin.
- Rate limiting is process-local and is not shared across multiple API instances.
- Do not expose MongoDB publicly, put secrets in Git, remove slug validation/search escaping, or remove graceful shutdown.
- This refactor branch is not production. Merge/deploy only after reviewing the current PR head, passing CI, and running the normal deployment smoke checks.

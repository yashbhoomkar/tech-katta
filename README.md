# Tech Katta

A dark-only technology knowledge base for distributed systems, backend engineering, architecture deep dives, and practical engineering lessons.

## Repository structure

```text
tech-katta/
├── backend/   # Node.js 22, Express 5, MongoDB Atlas API
└── frontend/  # Vite + React knowledge base UI
```

## Frontend

- Vite and React
- React Router
- Dark-only UI
- Topic filtering and article search
- Long-form article layout and table of contents
- Responsive mobile layout
- SPA rewrite for article routes

## Backend

The backend is a **layered monolith**, not a microservices system. HTTP routing, content application logic, MongoDB access, runtime configuration, and error handling have separate responsibilities.

- Node.js 22 and Express 5
- MongoDB Atlas as the primary content store
- Local fallback content when MongoDB is known to be disconnected
- Validated runtime configuration and graceful shutdown
- CORS restricted to the frontend origin
- Request IDs, structured request logging, security headers, and process-local rate limiting
- Liveness/readiness health endpoints and automated Node.js tests

Start with **[Backend architecture and operations](backend/README.md)** for the request flow, file responsibilities, environment variables, local development commands, health checks, and operational constraints.

## Production topology

```text
Reader
  |
  +--> tech.katta.cc
  |      |
  |      v
  |    Vercel frontend
  |
  +--> tech-api.katta.cc
         |
         v
       Nginx on VPS
         |
         v
       Node.js / Express (127.0.0.1:5000)
         |
         v
       MongoDB Atlas
```

DNS is managed through Cloudflare. Do not assume the API origin is protected by Cloudflare proxying; verify the current DNS/proxy and origin-firewall configuration separately.

The VPS deployment is driven by GitHub Actions. The application must pass backend CI and the deployment smoke checks before production changes are considered verified. A passing unit-test run alone does not prove production availability or load capacity.

## Content philosophy

Write what was learned, not generic summaries:

1. Start from the primitive or mental model.
2. Explain how the pieces work.
3. Show where the technology fits in a real system.
4. Call out trade-offs and operational consequences.
5. Add diagrams, numbers, or code where they clarify the idea.

# Internal Vercel control

This module is a private administrative client for Vercel. It is intentionally
not exposed through the public Express API.

## Authentication

Set the following environment variables on the trusted machine running it:

- `VERCEL_ACCESS_TOKEN` — Vercel access token.
- `VERCEL_TEAM_ID` — optional team ID.

Never commit the token, put it in source code, print it, or expose it through
an HTTP response.

The client uses Node 22's built-in `fetch`, so it adds no dependency.

## Commands

From `backend/`:

```bash
VERCEL_ACCESS_TOKEN=... node src/vercel/index.js project tech-katta
VERCEL_ACCESS_TOKEN=... node src/vercel/index.js deployments
VERCEL_ACCESS_TOKEN=... node src/vercel/index.js inspect <deployment-id>
VERCEL_ACCESS_TOKEN=... node src/vercel/index.js domains tech-katta
```

For the Tech Katta team, set `VERCEL_TEAM_ID` to the team ID that owns the
project.

## Security boundary

This is an internal control plane, not an application endpoint. A future MCP
adapter can call these functions without giving the public Tech Katta API
direct access to Vercel credentials.

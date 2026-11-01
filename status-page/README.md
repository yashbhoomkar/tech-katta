# Tech Katta Status

Standalone public status page inspired by hosted service status pages.

## Components
- Frontend: `https://tech.katta.cc/` and `/dashboard/` load, and every app script they reference is served as JavaScript.
- Backend: `https://tech-api.katta.cc/health` reports `status: "ok"`, and `/v1/site`, `/v1/articles` and `/v1/lab` return JSON.

## Monitoring
The page calls `/api/status`, a Vercel serverless function that checks both public endpoints server-side. A service is operational only when all of its checks pass; the first failing check is shown. The browser refreshes the status every 60 seconds.

## Deploy
This directory is intended as the root directory of the Vercel project `tech-katta-status`, connected to `yashbhoomkar/tech-katta`. Assign the custom domain `status.katta.cc`.

## Limitations
This is live polling, not historical uptime monitoring. It does not claim to show past incidents or 90-day uptime percentages because those checks are not persisted yet.

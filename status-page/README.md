# Tech Katta Status

Standalone public status page inspired by hosted service status pages.

## Components
- Frontend: `https://tech.katta.cc/`
- Backend: `https://tech-api.katta.cc/health`

## Monitoring
The page calls `/api/status`, a Vercel serverless function that checks both public endpoints server-side. It checks the frontend HTTP response and validates that the backend health endpoint returns JSON with `status: "ok"`. The browser refreshes the status every 60 seconds.

## Deploy
This directory is intended as the root directory of the Vercel project `tech-katta-status`, connected to `yashbhoomkar/tech-katta`. Assign the custom domain `status.katta.cc`.

## Limitations
This is live polling, not historical uptime monitoring. It does not claim to show past incidents or 90-day uptime percentages because those checks are not persisted yet.

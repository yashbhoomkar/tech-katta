# Hosting

Where each part of Tech Katta runs, every place a host touches the code, and how to move a part to another host.
Nothing here changes how the site runs today: Vercel still serves the website and the VPS still runs the API.

## Today

| Part | Host | Address | Deployed by |
|---|---|---|---|
| Website (static: landing, dashboard, article pages) | Vercel (project root `frontend/`) | tech.katta.cc, analytics.katta.cc | Vercel's Git integration, on push to `main` |
| API (one Node.js process) | A Linux VPS: Nginx → Node, run by systemd | tech-api.katta.cc (proxied by Cloudflare) | `.github/workflows/deploy-backend.yml` over SSH |
| Status page | Vercel (project root `status-page/`) | status.katta.cc | Vercel's Git integration |
| Database | MongoDB Atlas | (connection string secret) | not deployed |
| DNS, TLS and the API's front door | Cloudflare | all `katta.cc` records | Cloudflare dashboard |

## Where a host touches the code

| Seam | File | What it does | When moving |
|---|---|---|---|
| Routing and headers | `frontend/hosting/routes.json` | The site's rewrites, redirects and security headers, written once | Generate the new host's files from it (below) |
| Vercel config | `frontend/vercel.json` | Generated from `routes.json` by `npm run hosting:vercel`; a test checks they match | Not needed elsewhere |
| Cloudflare files | `frontend/hosting/adapters.js`, `emit.mjs`, `wrangler.jsonc` | `npm run build:cloudflare` adds `_redirects`, `_headers` and 404 pages to the build | Deploy that build |
| Host analytics | `frontend/src/hostanalytics.jsx` | Vercel Web Analytics; `VITE_HOST_ANALYTICS=none` turns it off (`build:cloudflare` does) | Change the privacy text (below) |
| API base address | `VITE_API_BASE` (`frontend/src/api.js`) | Defaults to https://tech-api.katta.cc | Only if the API's address changes |
| API settings | `backend/.env.example` | Every environment variable the API reads, with its default | Set them on the new host |
| Visitor address for rate limits | `CLIENT_IP_HEADERS` | Default `x-real-ip,cf-connecting-ip` (Nginx on the VPS) | Name the new proxy's header |
| Judging threads | `JUDGE_WORKERS` | Default: one fewer than the CPUs, at most 2 | 1 on a single shared CPU |
| API container | `backend/Dockerfile` | The API as an image; CI builds and runs it on every backend PR | Deploy the image |
| API deploy to a VPS | `.github/workflows/deploy-backend.yml` | SSH, systemd, dated content releases, rollback | Point its secrets at the new server |
| Status page | `status-page/api/status.js` | A Vercel serverless function; the checks are plain `fetch` | Rewrite its last 10 lines for the new host |

## Moving the website (for example to Cloudflare)

Cloudflare is the planned next host: its free plan allows commercial use and has no bandwidth limit. Cloudflare
now steers new static sites to Workers with static assets rather than Pages; `hosting/wrangler.jsonc` sets that up.

1. Build: `cd frontend && npm run build:cloudflare` (it builds without Vercel Web Analytics, which only works on
   Vercel). This writes `dist/_redirects`,
   `dist/_headers`, `dist/404.html` and `dist/dashboard/404.html`. It also prints one rule Cloudflare's files can't
   express: `analytics.katta.cc/` → `/analytics/` (307), which becomes a Redirect Rule in the Cloudflare dashboard.
2. Check it locally in Cloudflare's own runtime: `npx wrangler dev --config hosting/wrangler.jsonc` (no account needed).
3. Deploy: `npx wrangler deploy --config hosting/wrangler.jsonc` (needs a Cloudflare API token), ideally as a step
   after the tests in `.github/workflows/frontend.yml`, so a build with failing tests never goes live. Building in
   GitHub Actions also avoids Cloudflare's own build limits; we deploy 40-50 times on a busy day.
4. In Cloudflare, add `tech.katta.cc` and `analytics.katta.cc` as custom domains of the Worker; keep the Vercel
   project for a week so going back is a DNS change.
5. Change the privacy page's sentence about Vercel Web Analytics (`content/site.json`, `privacy`).
6. When the teaching videos arrive, test them in Safari (iPhone and Mac). Cloudflare answers byte-range requests
   with the whole file (status 200, not 206), and Safari may refuse to play media that way.

Differences from Vercel, measured with `wrangler dev` against production:
- `/dashboard`, `/analytics` and `/health/` take one extra hop to `/dashboard/`, `/analytics/` and `/health`.
- An unknown dashboard address (`/dashboard/no-such-page`) still opens the app, but with status 404, not 200.
- Unknown site addresses show `404.html` ("Page not found") instead of Vercel's page.
- Everything else matched: article pages with their own titles, the 308 redirects, the security headers, `noindex`
  on the analytics page, content types of scripts, audio, sitemap and robots.txt.

Why the Cloudflare files differ from `vercel.json` (all handled in `hosting/adapters.js`): Cloudflare applies its
redirect rules even when a file exists, so the dashboard's catch-all becomes `dashboard/404.html` instead (otherwise
it would hide the 138 article pages and their titles); and a `/health → /health.html` rule would loop with
Cloudflare's own page handling, so those rewrites get no rule at all.

Another host: add a function to `hosting/adapters.js` and a target to `hosting/emit.mjs`, with tests in
`hosting/hosting.test.js`. Netlify reads the same `_redirects` and `_headers` files, but applies a rewrite only when
no file exists (like Vercel), so there the dashboard fallback is a plain `/dashboard/* /dashboard/index.html 200` rule.

## Moving the API

### To another Linux VPS (Lightsail, DigitalOcean, any provider)

The deploy workflow works on any VPS that has:
- Node 22, Git, and a checkout of this repository at `/opt/tech-katta` owned by a user `techkatta`;
- a systemd service `tech-katta-api` that runs `node backend/src/server.js` in `/opt/tech-katta` as `techkatta`
  (the deploy adds its settings in a drop-in: host, port, content folder, and `/etc/tech-katta/api.env`, rewritten
  whole from GitHub secrets and variables on every deploy: see `ops/README.md`, "The server keeps nothing of its own");
- passwordless `sudo` for the SSH user for `systemctl`, `journalctl`, `mkdir`, `chown`, `tee`, `sh` and `sudo -u techkatta`;
- Nginx proxying to `http://127.0.0.1:5000` with `X-Real-IP $remote_addr`, and Nginx's real-IP module trusting
  `CF-Connecting-IP` only from Cloudflare's published IP ranges (so `$remote_addr` is the visitor);
- a firewall that lets only Cloudflare's IP ranges reach ports 80 and 443.

Then set the GitHub variables `VPS_HOST`, `VPS_USER` and `VPS_FINGERPRINT` for the new server (the workflows
still fall back to the old Bluehost server when they are missing; `ops/provision-vps.sh` does all of the list above), add the server's IP address to the
MongoDB Atlas network access list, run the deploy, and point the `tech-api` DNS record at it.

### Changing servers: `ops/README.md`

One command sets up a new server (`ops/provision-vps.sh`); then three GitHub variables, the deploy with "Moving
servers" ticked, and the "Point API at the server" workflow (which checks the new server and moves the DNS record).
Everything else the server needs (deploy key, Origin certificate, Cloudflare token, sign-in and AI settings) stays in
GitHub; nothing is set on a server by hand.

### To a container platform (DigitalOcean App Platform, Cloud Run, Render, Fly, Railway, ECS…)

1. Image: `backend/Dockerfile`, built from the repository root (`docker build -f backend/Dockerfile .`). CI already
   builds it, starts it and checks it serves the content.
2. Settings (`backend/.env.example`): `HOST=0.0.0.0` (the image's default), `PORT` as the platform says,
   the three sign-in secrets, `CLIENT_IP_HEADERS` set to the header the platform's proxy sets
   (`cf-connecting-ip` if Cloudflare stays in front), and `JUDGE_WORKERS=1` on a single shared CPU.
3. Health check: `GET /health`.
4. MongoDB Atlas: allow the platform's outgoing IP addresses (some platforms charge for a fixed one).
5. Content changes become a new deploy of the image; the VPS's dated content releases and `kill -HUP` reload are
   not needed. The health endpoint then reports the release as `content`; use the platform's deploy history to see
   which commit is live.
6. Replace the deploy job in `deploy-backend.yml` with the platform's deploy-on-push (keep the test job), and
   point the `tech-api` DNS record at the platform.

Serverless functions (Vercel Functions, AWS Lambda) are not a fit without a rewrite: the API is one long-running
process that judges submissions on worker threads and keeps its rate limits in memory.

### The status page

`status-page/api/status.js` is a Vercel serverless function. Everything above its last 10 lines is plain `fetch`
code; on another host only the handler at the end changes (for a Cloudflare Worker: `export default { fetch }`
returning the same JSON).

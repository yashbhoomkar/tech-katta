# Tech Katta

System design, explained: short structured articles, and interview problems you design on a canvas, run
virtual traffic against and have judged by tests (plus a few challenges with stars). There is no separate Lab
tab: the canvas opens inside a problem, a challenge or the landing page's IND vs PAK.

- Site: https://tech.katta.cc (landing) and https://tech.katta.cc/dashboard/ (articles, problems and challenges)
- Start reading: [System design concepts](https://tech.katta.cc/dashboard/concepts/) ·
  [Components](https://tech.katta.cc/dashboard/components/) ·
  [System design interview questions](https://tech.katta.cc/dashboard/interview-questions/) ·
  [Practice problems](https://tech.katta.cc/dashboard/problems/) ·
  [Real systems](https://tech.katta.cc/dashboard/real-systems/)
- Search: every article and section has its own address and a public preview in its HTML (`frontend/seo.js`,
  `frontend/src/preview.js`); the rest of an article opens after a free Google sign-in. Sitemap:
  https://tech.katta.cc/sitemap.xml
- API: https://tech-api.katta.cc (`/health`, `/v1/site`, `/v1/articles`, `/v1/articles/:slug`, `/v1/lab`)

## Layout

| Path | What it is |
|---|---|
| `frontend/` | React 18 + Vite. Two pages: `index.html` → `src/main.jsx` (landing) and `dashboard/index.html` → `src/dashboard.jsx` (boots the dashboard, whose parts are in `src/dashboard/`: frame and routes, section pages, articles, blocks, figures, read aloud, each with its own stylesheet). **The look** (colours, type, radius, shadows, motion; light and dark) lives in `src/theme/`: change `tokens.css`, see `src/theme/README.md`. The problem workspace is `src/solve.jsx` with its parts in `src/solve/`. The canvas is `src/lab/` (`Lab.jsx` loader, `Canvas.jsx`, `nodes.jsx`, `Palette.jsx`, `Inspector.jsx`, `Score.jsx`; `engine.js` catalogue, `store.js` saved designs) and is lazy-loaded. Article figures are in `src/figs/<tab>/<sub-tab>.jsx`, one module per sub-tab, with shared drawing parts in `parts.jsx` and every figure gathered in `index.js`; the backend mirrors each sub-tab's figure ids in `backend/src/content/figs/<tab>/<sub-tab>.js`. Deployed by Vercel (project root `frontend`). |
| `backend/` | Node 22 HTTP server with no dependencies (`src/server.js`); settings in `.env.example`, a container image in `Dockerfile`. Loads and validates all content at start (`src/content/`), serves it read-only with ETags and short caching, reloads on `SIGHUP`. Sign-in and accounts are in `src/auth/`; a problem's Submit is judged again on worker threads (`src/auth/judge-pool.js`), with a time limit, so a slow design never stalls the API. A request that throws is answered with a 500 (a malformed address with a 400) and never stops the process. |
| `content/` | Every piece of copy, every article and the Lab catalogue, as JSON. The frontend hardcodes none of it. Format: [`content/README.md`](content/README.md). |
| `status-page/` | Separate Vercel project for `status.katta.cc`: live checks of the site and the API. |
| `tools/` | Narration tooling (`tools/tts`, Kokoro); `tools/og/shot.js` makes the link preview image (use a new file name after a redesign); `tools/indexnow/submit.mjs` tells Bing and the other IndexNow engines which pages changed (run by `.github/workflows/indexnow.yml` after each deploy). |

## Run locally

```bash
# API on :5000, serving ./content
cd backend && npm ci && npm start

# Site on :5173, using the local API (without VITE_API_BASE it uses the production API)
cd frontend && npm ci && VITE_API_BASE=http://127.0.0.1:5000 npm run dev
```

Node 22 (`frontend/.nvmrc`; backend `engines`).

## Test

```bash
cd backend && npm test                       # API, content validation, reload
node backend/scripts/check-content.mjs content   # validate a content folder
cd frontend && npm test && npm run build      # Lab engine + saved-design tests, production build
```

CI: `.github/workflows/frontend.yml` (frontend tests and build on every PR), `deploy-backend.yml`
(backend tests and content validation, then deploy), `codeql.yml`.

## Deploy

Where each part runs, every place a host touches the code, and how to move the website or the API to another
host: [`HOSTING.md`](HOSTING.md).

- **Frontend**: Vercel builds `frontend/` on every merge to `main`.
- **Backend and content**: `deploy-backend.yml` runs on changes to `backend/**` or `content/**`.
  It deploys exactly the tested commit to the VPS, copies `content/` into a dated release under
  `/var/lib/tech-katta/content/releases/`, validates it, points `current` at it and restarts the
  API. The deploy succeeds only when `/health` reports the new release; otherwise the previous code
  and content release are restored automatically. The 10 newest releases are kept.
- Manual rollback on the VPS (the deploy does both of these by itself when a release fails):
  - **Content only** (code is fine): point `current` at an older release and reload:
    `ln -sfn /var/lib/tech-katta/content/releases/<older> /var/lib/tech-katta/content/current && sudo systemctl kill -s HUP tech-katta-api`.
  - **Backend code**: check out the previous commit, reinstall, restart, then confirm `/health`:
    `sudo -u techkatta git -C /opt/tech-katta reset --hard <previous-sha> && sudo -u techkatta bash -c 'cd /opt/tech-katta/backend && npm ci --omit=dev' && sudo systemctl restart tech-katta-api && curl -s http://127.0.0.1:5000/health`.
    Release names end with the commit they came from (`<UTC time>-<short sha>`), which helps pick both.

Secrets used by the deploy: `VPS_SSH_KEY` (required), `VPS_HOST`, `VPS_USER`, `VPS_FINGERPRINT`
(host key check).

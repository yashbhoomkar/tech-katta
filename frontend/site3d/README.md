# site3d: the 3D site at tech.katta.cc

Since 2026-11-23 the 3D redesign (built as a prototype on the `prototype` branch; its notes are in
`PROTOTYPE-NOTES.md`) is the site at the root. The React app (`frontend/next`, in its 3d look since #375) keeps the parts the 3D
site does not have yet.

| Address | Served by |
|---|---|
| `/` (landing), `/home` (Dashboard), `/learn`, `/learn/{concepts,components,interview-questions,real-systems}[/<slug>]`, `/problems` (the list) | 3D site |
| `/simulator`, `/simulator/<id>` (pick the parts, watch one evening) | 3D site |
| `/problems/<slug>`, `/problems/sandbox`, `/problems/challenge/<id>` (the canvas, the judge, Replay, the AWS credit; the 3d look), `/practice…`, `/me` (sign-in, account), `/learn/quick-notes…`, `/privacy`, `/terms`, `/dashboard…` (old links) | React app |

## Problems

`/problems` is `scripts/pages/problems.js`: the 22 canvas problems in the prototype's list layout, with a 3D preview of
each problem's design (its article's 3D story), then Sandbox, the Simulator and the Challenges. It reads the canvas's
own record in this browser (solved and started in `tk-progress-v1`, scores in `tk-subs-v1`, stars) and writes nothing.
Each row opens the canvas workspace, which is the React app in its 3d look (`next/src/styles/looks/3d`).

## How it is put together

- Plain ES modules, no build step. three.js is vendored in `scripts/vendor/`.
- `hosting/switch.mjs` (after `npm run build`) copies `scripts/` and `styles/` to `dist/3d/` and writes `index.html` (this
  folder's page shell) at every 3D address, carrying the same search-engine title, description, canonical address,
  JSON-LD and text in `<div id="root">` that the React pages had. The 3D app replaces that text when it starts.
  `/simulator/*` is a rewrite to `/simulator/index.html` (`hosting/routes.json`).
- `scripts/app.js` routes by path (`history.pushState`). A link to one of its own addresses stays in the page; any
  other address loads as a whole page, and Back or Forward onto one reloads. Old `#/…` links from the prototype are
  turned into their real address.
- The React app is built with `VITE_SITE3D=1` in production only (`npm run build:next`): its routes for the 3D
  addresses then load the page again as a whole page, once (`next/src/app/router.tsx`), so its links into Learn
  reach this site. The end-to-end builds leave it off and keep every React page.
- The three lists of 3D addresses must agree: `OWN` in `scripts/app.js`, `OWNED_BY_3D` in `hosting/switch.mjs` and in
  `next/src/app/router.tsx`.
- Progress here (articles read, simulator bests) is kept on the device (`scripts/store.js`), separately from the
  React app's progress and account sync. Joining the two is still to do.


## Sign-in, the content lock and analytics (2026-11-23, phase 0 of tech-katta-context 49)

- `scripts/account.js`, `scripts/analytics.js`: thin wrappers over the current app's `src/account.js` and `src/analytics.js`,
  which `npm run build:site3d` (`vite.site3d.config.js`, entry `legacy/entry.js`) builds into one file, `dist/3d/legacy/legacy.js`
  (about 10 KB gzipped; no React: `legacy/mode.js` stands in for the theme hook). One copy of the account code, so the 3D
  pages and the React islands share a session. A local run without that build treats sign-in as unavailable: nothing is locked.
- `scripts/gate.js` (pure, tested) and `scripts/gating.js` (the account plus the site copy from `GET /v1/site`): signed out,
  lists are open, an article shows its opening (`scripts/preview.js`, a copy of `src/preview.js` with a test that both cut in
  the same place) then the `previewLock` card, the workspace will show `pageLock`; the 3D story at the top stays open. The page
  redraws itself (`window.tkRefresh`) when the answer changes.
- `scripts/signin.js`: the glass sign-in sheet (terms box, Google button), opened from the sidebar's Account group and the lock cards.
- Usage events: one `page_view` per route change with the React app's `{section, slug}` shape (`pageOf`), reading time and depth per
  article (`readArticle`), and Vercel Web Analytics once per page load, with the same opt-outs.

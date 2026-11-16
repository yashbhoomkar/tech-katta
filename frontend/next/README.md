# frontend/next/ — the new Tech Katta frontend

React 18 + TypeScript + Vite + React Router, reading the live content API. It is part of the site build: `frontend`'s
`npm run build` builds it and copies it to `dist/next/` (`hosting/next.mjs`), so it is served at **tech.katta.cc/next/**
as a beta beside the current app (marked `noindex` until it replaces it). The current app links to it from its sidebar
("Try the new design").

It reuses the current app's code where that code is the product: the 232 lesson figures, the workspace (canvas, judge,
tests, hints, interviewer), the challenges, sign-in and account sync, practice progress and analytics, all imported from
`../src` through the `@legacy` alias, with their packages resolved from `frontend/node_modules`.

## Run

```bash
npm ci --prefix ..   # the current app's packages (the workspace's canvas, analytics), which @legacy imports use
npm ci
npm run dev        # http://localhost:5174/next/
npm run check      # typecheck + lint + unit tests (vitest, CI runs this)
npm run build      # dist/, plus one index.html per known route and 404.html (scripts/postbuild.mjs)
npx playwright install chromium   # once
npm run e2e        # end-to-end, in a real browser, for every look (Playwright, CI runs this)
```

- `VITE_STYLE` builds a look (unset is the default look; `neo-brutalism` is the second). Unknown names fail the build.
- `VITE_API_BASE` points it at another API (default `https://tech-api.katta.cc`).
- `BASE_PATH` changes the base (default `/next/`; `/` once it replaces the old app).
- `OUT_DIR` changes the build folder (default `dist`); the e2e suite builds each look into `dist-e2e/<look>`.
- `node scripts/legacy-scope.mjs` regenerates the workspace's scoped tokens after `../src/theme/tokens.css` changes.

## One codebase, two prototypes

prototype.katta.cc/p/next and /p/neo-brutalism are this app built twice: once in the default look and once with
`VITE_STYLE=neo-brutalism`. Pages, data, routes and behaviour are shared; only styling and motion differ. Code never
branches on the look at run time except through `lib/look.ts` (`LOOK` is fixed at build time, so the other look's
code is left out of the bundle).

## Structure

```
src/
  main.tsx               fonts, global CSS, theme, look definitions, router
  app/                   router.tsx (routes, layouts, lazy pages, prefetch), Providers, RouteError (route error page)
  styles/                tokens.css (colours, type, motion; light + dark), global.css (reset, accents, motion),
                         themes/<look>.css (a look's tokens), looks/<look>/motion.css (a look's keyframes, via @look)
  lib/                   framework-free logic: api/ (typed client), resource (cached fetching), theme, look (the look
                         registry), progress, search (stemmed), storage (never throws), analytics, gestures, motion, cx
  content/               sections.ts (ids, colours, paths), model.ts (pure selectors over API data + progress),
                         legacy.ts (tech.katta.cc addresses → new routes), steps, ticker, practice,
                         ContentProvider / ContentGate (load site + articles once; loading and error states)
  features/              reader/ (article blocks, figures, figure palette), workspace/ (the canvas and judge),
                         legacy/ (the bridge to the current app's code in ../src)
  components/            ui/ (Button, Chip, Card, ProgressBar, Skeleton, ThemeSwitch, StateMessage), layout/ (AppShell,
                         Sidebar, TopBar, TabBar, PageMeta, Logo), CommandPalette, SignIn, Tour, Dialog, Toast, ...
  pages/                 one file per route; a page with several parts keeps them in its own folder
                         (landing/: nav, hero, bands, extras; reader/: progress, toc, Burst)
  types/                 env.d.ts (the build's environment variables)
  test/                  setup and fixtures
e2e/                     Playwright specs (pages, reader, navigation, workspace, looks, accessibility) and fixtures
scripts/                 look.mjs (look names, page colours, <html data-style>), hints.mjs (preconnect/preload),
                         postbuild.mjs (per-route index.html), legacy-scope.mjs
```

Data flows one way: `lib/api` fetches → `lib/resource` caches → `content/ContentProvider` holds the site and the
article list → pages select what they show with `content/model.ts` → components render it.

## Extending

- **A page:** a file in `pages/`, a lazy route in `app/router.tsx` (it inherits the error page), a title in
  `scripts/postbuild.mjs` if it should open directly with its own title, and a line in `e2e/pages.spec.ts`.
- **A section:** `content/sections.ts` (id, colour, path); the API supplies its lessons, groups and words.
- **An old address:** `content/legacy.ts` (`legacyTarget`) and a case in `content/legacy.test.ts`.
- **A look:** the six steps at the top of `lib/look.ts`. The e2e suite builds and tests every look in
  `scripts/look.mjs` without changes; `lib/look.test.ts` fails if the two lists disagree.

## Errors

- A failed content load shows ContentGate's error state with Retry.
- A page that throws, or an unknown route, shows `app/RouteError.tsx`. A page whose code is gone after a new release
  (a stale lazy chunk) asks for a reload instead of showing a broken page.
- Storage never throws (`lib/storage.ts`), so private windows and blocked storage still work.

## Testing

- **Unit** (`npm test`, vitest + jsdom): pure logic in `lib/` and `content/`, components, the router and error page.
- **End-to-end** (`npm run e2e`, Playwright): every look is built and served, and each spec runs on desktop and (specs
  tagged `@phone`) on a phone. It calls the live API, so it tests real content; CI retries once for a network blip.
  Any uncaught page error fails a test (`e2e/fixtures.ts`). `e2e/a11y.spec.ts` checks WCAG 2.1 AA with axe, light and dark.

## Rules

- **Colours:** only as tokens (`var(--surface)`), never hex in components. Section colour through `data-accent` (`--c` fill, `--a` accent, `--t` tint).
- **Styles:** component styles are CSS Modules next to the component. `cx()` joins classes.
- **Logic:** pure logic lives in `lib/` and `content/model.ts`, and is unit-tested. Components stay thin.
- **Words:** everything the API sends (titles, groups, hero text, counts) comes from the API, never hard-coded.
- **Motion** follows the motion prototype (Emil Kowalski's rules):
  - press 0.97;
  - hover movement only with a mouse;
  - page change 160 ms fade;
  - reduced motion keeps fades only.
- **CSP:** the site's policy allows script files from this origin only (no inline scripts). The theme is set before first paint by `public/boot-theme.js`, a file.
- **Accessibility:**
  - focus moves to `<main>` on navigation;
  - a skip link;
  - landmarks with unique names;
  - the search is a proper combobox;
  - visible focus rings.

## Milestones

1. **Done:** foundation, app shell and navigation (sidebar and rail, phone top bar and tabs, search), theme, landing, Home, Learn, section pages, You, not found.
2. **Done:** the lesson reader: real articles, every block kind, and the existing figures (`frontend/src/figs`, imported as they are through `@legacy`).
3. **Done:** Problems, the design workspace and challenges (the existing canvas and judge, imported), full-site landing and motion, sign-in dialog, shortcuts, tour.
4. **Beta (this release):** served at `/next/` in production, with page-view and reading analytics (sections `next:<page>`).
5. **The switch:** serve it at `/`, 301 the old `/dashboard/...` URLs to `/learn/...` and `/problems/...`, rebuild the SEO
   article pages for the new URLs, drop `noindex`, and retire the old landing and dashboard shells.

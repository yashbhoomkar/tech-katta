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
npm run check      # typecheck + lint + unit tests (CI runs this)
npm run build      # dist/, plus one index.html per known route and 404.html (scripts/postbuild.mjs)
```

- `VITE_API_BASE` points it at another API (default `https://tech-api.katta.cc`).
- `BASE_PATH` changes the base (default `/next/`; `/` once it replaces the old app).
- `node scripts/legacy-scope.mjs` regenerates the workspace's scoped tokens after `../src/theme/tokens.css` changes.

## Structure

```
src/
  main.tsx               fonts, global CSS, theme, router
  app/                   router (routes + layouts) and providers
  styles/                tokens.css (colours, type, motion values; light + dark "F2"), global.css (reset, accents, motion)
  lib/                   framework-free logic: api/ (typed client), resource (cached fetching), theme, progress,
                         search (stemmed, so "cache" finds "Caching"), storage (never throws), cx, useInView
  content/               sections.ts (section ids, colours, paths), model.ts (pure selectors over API data + progress),
                         ContentProvider / ContentGate (load site + articles once; loading and error states)
  components/            ui/ (Button, ButtonLink, Chip, ProgressBar, Card, Skeleton, ThemeSwitch, StateMessage),
                         layout/ (AppShell, Sidebar, TopBar, TabBar, PageMeta, Logo), CommandPalette, Icon
  pages/                 one file per route
  test/                  setup and fixtures
```

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

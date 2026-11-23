# frontend/next/ — the islands

The React parts of tech.katta.cc. Since phase 6 of tech-katta-context 49 the whole site is the 3D site (`frontend/site3d/`, plain ES modules, three.js);
this package builds only what the 3D pages mount as **islands**: the problem workspace, challenges, sandbox, shared designs, practice and "Numbers worth
knowing". Everything the islands draw is the current app's code (`../src`: the canvas, the judge, the tests, hints, the interviewer, the figures),
imported through the `@legacy` alias. The React app that used to be here (pages, router, looks) was deleted; `tech-katta-context/50-3D-MIGRATION-DONE.md`
says where each old feature lives now.

- `src/islands/index.tsx`: `mountWorkspace / mountChallenge / mountSandbox / mountShared / mountPractice / mountNumbers(el, …)`, each returning `unmount()`.
  The entry is tiny; `impl.tsx` (React, the content provider, the canvas) loads on the first mount.
- `vite.islands.config.ts`: the build (`npm run build:islands`, run by `frontend`'s `npm run build`) into `dist-islands/`, copied by `hosting/switch.mjs` to
  `dist/3d/islands/`. `scripts/island-scope.mjs` scopes the base CSS to `.tk-island`, so nothing here reaches the page around an island. The account and
  usage-event modules are the page's (`/3d/legacy/legacy.js`), not bundled twice.
- `src/theme/look-3d.css` (in `../src/theme/`): the legacy token names mapped onto the 3D site's.
- Decision (phase 6): this stays `frontend/next/` rather than moving to `frontend/islands/`, to keep the lockfile, CI cache paths and history in place.

## Run

`npm ci` here, then `npm run check` (typecheck, lint, unit tests) and `npm run e2e` (Playwright against the whole site built and served the way the host
serves it; `npx playwright install chromium` first). `frontend`'s `npm run check:islands` does the install and the check.

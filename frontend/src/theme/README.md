# theme/ — the site's look in one place

The look is "Katta Paper": warm paper, ink, one brand colour (marigold), Fraunces headings. The spec is tech-katta-context/20-UI-REDESIGN-SPEC.md.

Every page (`main.jsx` landing, `dashboard.jsx`, `admin.jsx` analytics) imports `theme/index.js` first. It loads:

| File | What it holds | Change it to… |
|---|---|---|
| `tokens.css` | Every colour, typeface, radius, shadow and animation speed, as CSS variables (`--accent`, `--brand…`, `--page`, `--font-display`, `--line`, `--dur`…) | change the colour scheme, fonts, corner radius, shadow depth, how fast things move |
| `palette.js` | The same colours for code that needs a value in JavaScript: SVG figures, the landing and library diagrams, the canvas | (kept equal to `tokens.css` by `theme.test.js`; edit both together) |
| `base.css` | Rules every page shares (box sizing, reduced motion) | change page-wide defaults |
| `fonts.js`, `fonts.css` | The self-hosted Inter and IBM Plex Mono; Fraunces (headings) is loaded in `fonts.js` | swap a typeface (then update `--font` / `--mono`) |
| `motion.css` | Every entrance and feedback animation of the interface | slow down, speed up or remove an animation |
| `motion.js` | `SPEED` and `pace()` for figure loops (every figure writes its loop length as `pace(14)`, never `"14s"`), `LOOP`, and `useStill()` for reduced motion | make every figure faster or slower: change `SPEED` (0.7 since #312) |

## Rules (checked by `theme.test.js`, part of `npm test`)

- **No colour codes outside this folder.** Stylesheets write `var(--name)`; JavaScript imports names from
  `palette.js` (figures use the short names `INK`, `GREY`, `RED`, `BLUE`, `LB`, `LR`, `FB` via `figs/parts.jsx`).
- **Name the role, not the hue**: `--accent`, not `--blue`, so a new scheme still reads right.
- Every `var(--name)` a stylesheet reads must be defined (a typo fails the test).
- `tokens.css` and `palette.js` list the same colours with the same values.

## Common changes

- **New brand colour**: --brand, --brand-strong, --brand-edge, --brand-ink, --brand-line, --brand-tint, --on-brand, --mark in tokens.css (light and dark) and the same keys in palette.js TOKENS.
- **Rounder corners**: `--radius`.
- **Slower or faster transitions**: `--dur-fast`, `--dur`, `--ease`; things arriving on a page: `--dur-enter` (0.28 s). Reduced motion sets the durations to 0.
- **Faster or slower figures**: `SPEED` in `motion.js`. How figures move (steps fade, request dots with a trail, the glint on the working path, glows) lives in `figs/parts.jsx`, so a change there reaches all 232 figures.
- **Figures on phones**: `dashboard/figure.jsx` and the phone block at the end of `dashboard/figure.css` (600 px wide in a sideways-scrolling frame, the step line above it).
- **New token**: add it to `tokens.css` (and to `palette.js` if it is a colour), then use it.

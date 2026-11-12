# theme/ — the site's look in one place

The look is "Katta Paper": warm paper, ink, one brand colour (marigold), Fraunces headings. The spec is tech-katta-context/20-UI-REDESIGN-SPEC.md.

Every page (`main.jsx` landing, `dashboard.jsx`, `admin.jsx` analytics) imports `theme/index.js` first. It loads:

| File | What it holds | Change it to… |
|---|---|---|
| `tokens.css` | Every colour, typeface, radius, shadow and animation speed, as CSS variables (`--accent`, `--brand…`, `--page`, `--font-display`, `--line`, `--dur`…) | change the colour scheme, fonts, corner radius, shadow depth, how fast things move |
| `palette.js` | The same colours for code that needs a value in JavaScript: SVG figures, the landing and library diagrams, the canvas | (kept equal to `tokens.css` by `theme.test.js`; edit both together) |
| `base.css` | Rules every page shares (box sizing, reduced motion) | change page-wide defaults |
| `fonts.js`, `fonts.css` | The self-hosted Inter and IBM Plex Mono; Fraunces (headings) is loaded in `fonts.js` | swap a typeface (then update `--font` / `--mono`) |
| `motion.css` | Every entrance and feedback animation | slow down, speed up or remove an animation |

## Rules (checked by `theme.test.js`, part of `npm test`)

- **No colour codes outside this folder.** Stylesheets write `var(--name)`; JavaScript imports names from
  `palette.js` (figures use the short names `INK`, `GREY`, `RED`, `BLUE`, `LB`, `LR`, `FB` via `figs/parts.jsx`).
- **Name the role, not the hue**: `--accent`, not `--blue`, so a new scheme still reads right.
- Every `var(--name)` a stylesheet reads must be defined (a typo fails the test).
- `tokens.css` and `palette.js` list the same colours with the same values.

## Common changes

- **New brand colour**: --brand, --brand-strong, --brand-edge, --brand-ink, --brand-line, --brand-tint, --on-brand, --mark in tokens.css (light and dark) and the same keys in palette.js TOKENS.
- **Rounder corners**: `--radius`.
- **Slower or faster transitions**: `--dur-fast`, `--dur`, `--ease`. Reduced motion sets the durations to 0.
- **New token**: add it to `tokens.css` (and to `palette.js` if it is a colour), then use it.

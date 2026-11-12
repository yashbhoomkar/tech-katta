# theme/ — the site's look in one place

Where the look is heading (observations of fanout.sh, and how they map onto these tokens, step by step): the repo's
[`Design.md`](../../../Design.md).

Every page (`main.jsx` landing, `dashboard.jsx`, `admin.jsx` analytics) imports `theme/index.js` first. It loads:

| File | What it holds | Change it to… |
|---|---|---|
| `tokens.css` | Every colour, typeface, radius, shadow and animation speed, as CSS variables (`--accent`, `--line`, `--dur`…) | change the colour scheme, fonts, corner radius, shadow depth, how fast things move |
| `palette.js` | The same colours for code that needs a value in JavaScript: SVG figures, the landing and library diagrams, the canvas | (kept equal to `tokens.css` by `theme.test.js`; edit both together) |
| `base.css` | Rules every page shares (box sizing, reduced motion) | change page-wide defaults |
| `fonts.js`, `fonts.css` | The self-hosted Inter and IBM Plex Mono | swap a typeface (then update `--font` / `--mono`) |

## Rules (checked by `theme.test.js`, part of `npm test`)

- **No colour codes outside this folder.** Stylesheets write `var(--name)`; JavaScript imports names from
  `palette.js` (figures use the short names `INK`, `GREY`, `RED`, `BLUE`, `LB`, `LR`, `FB` via `figs/parts.jsx`).
- **Name the role, not the hue**: `--accent`, not `--blue`, so a new scheme still reads right.
- Every `var(--name)` a stylesheet reads must be defined (a typo fails the test).
- `tokens.css` and `palette.js` list the same colours with the same values.

## Common changes

- **New accent colour**: `--accent`, `--accent-strong` (hover), `--accent-rgb`, and its tints
  (`--accent-mid`, `--accent-line`, `--accent-soft`, `--accent-tint-2`, `--accent-tint`) in `tokens.css`; the same keys
  in `palette.js` `TOKENS`.
- **Rounder corners**: `--radius`.
- **Slower or faster transitions**: `--dur-fast`, `--dur`, `--ease`. Reduced motion sets the durations to 0.
- **New token**: add it to `tokens.css` (and to `palette.js` if it is a colour), then use it.

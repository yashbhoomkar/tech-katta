# theme/ — the site's look in one place

The look is "Katta Paper": warm paper, ink, one brand colour (marigold). Since spec 32 (2026-11-14, tech-katta-context/32-DESIGN-SKILLS-RENOVATION.md) it follows the design skills the owner chose (elayadesign/ai-design-skills): ONE typeface, Geist (Geist Mono only for figures, code and numbers), no italics, every size a Tailwind step, spacing and radius only from fixed steps, flat backgrounds (the one gradient is the hero heading's text), one motion curve `cubic-bezier(.22,1,.36,1)`, scroll reveals with one IntersectionObserver (`reveal.js`), Phosphor icons (`icons.jsx`). The landing page's rules live in `src/landing.css`. Earlier: spec 30 (premium renovation), the colour spec 20 and 28.

Every page (`main.jsx` landing, `dashboard.jsx`, `admin.jsx` analytics) imports `theme/index.js` first. It loads:

| File | What it holds | Change it to… |
|---|---|---|
| `tokens.css` | Every colour, typeface, radius, shadow and animation speed, as CSS variables (`--accent`, `--brand…`, `--page`, `--font-display`, `--line`, `--dur`…) | change the colour scheme, fonts, corner radius, shadow depth, how fast things move |
| `palette.js` | The same colours for code that needs a value in JavaScript: SVG figures, the landing and library diagrams, the canvas | (kept equal to `tokens.css` by `theme.test.js`; edit both together) |
| `base.css` | Rules every page shares (box sizing, reduced motion) | change page-wide defaults |
| `fonts.js` | The two self-hosted variable fonts (Geist, Geist Mono) from @fontsource; `vite.config.js` (`fontPreload`) preloads the Geist Latin file; the matched fallback face is at the top of `tokens.css` | swap the typeface (then update `--font` / `--mono` and remeasure the fallback) |
| `reveal.js` | Scroll reveals: `[data-reveal]` and the long dashboard lists rise 32 px and fade in once, the first time they are seen (one IntersectionObserver); the CSS is section 10 of `motion.css` | reveal another block: add `data-reveal` |
| `icons.jsx` | Phosphor icons (regular, MIT) copied as paths: `<Ph name="arrow"/>` | add an icon: copy its path from @phosphor-icons/core |
| `motion.css` | Every entrance and feedback animation of the interface | slow down, speed up or remove an animation |
| `premium.css` | The final layer (spec 30): depth, pointer feedback, the focusing landing headline, scroll arrivals, the landing and shell refinements, the reading measure and serif headings | change or switch off the premium look |
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
- **Slower or faster transitions**: one curve, `--ease` = `cubic-bezier(.22,1,.36,1)` (`--ease-spring` and `--ease-in-out` now point at it); `--dur-fast` (.2 s, the floor), `--dur` (.3 s, colour and opacity), `--dur-move` (.5 s, movement); things arriving on a page: `--dur-enter` (0.7 s) over `--rise` (32 px). Reduced motion sets the durations to 0.
- **Type, spacing, radius**: named steps in `tokens.css` (`--t-xs` … `--t-7xl`, `--s-25` … `--s-900`, `--r-sm` … `--r-xl`). Never a size between steps. SVG text inside figures and diagrams keeps its own sizes.
- **Depth and pointer feedback** (cards lift onto `--lift-shadow`, buttons press, the main buttons glow with `--glow-brand`, the landing headline comes into focus, scroll arrivals, the reading measure and serif headings): `premium.css`, the last stylesheet; its selectors start with `:root:not(#_)` so they win over older page rules. Remove its import in `index.js` to switch it all off.
- **Faster or slower figures**: `SPEED` in `motion.js`. How figures move (steps fade, request dots with a trail, the glint on the working path, glows) lives in `figs/parts.jsx`, so a change there reaches all 232 figures.
- **Figures on phones**: `dashboard/figure.jsx` and the phone block at the end of `dashboard/figure.css` (600 px wide in a sideways-scrolling frame, the step line above it).
- **New token**: add it to `tokens.css` (and to `palette.js` if it is a colour), then use it.

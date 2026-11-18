# scroll-3d: a landing page told as one 3D scene

**Live:** https://prototype.katta.cc/p/scroll-3d/ (branch `prototype`). Built 2026-11-17/18 on the owner's request:
"create a new prototype … which will follow the colour schemes [and] 3d animations of rca.gg".

Style taken from rca.gg (pale lavender page, one violet accent, orange only for broken, green only for fixed,
Manrope + IBM Plex Mono, an isometric scene that the camera moves through as you scroll). Words, story and drawings
are Tech Katta's own: a URL shortener on IND vs PAK night loses its only cache, the database drowns, we find why and
add a replica.

## Files
| File | Role |
|---|---|
| `index.html` | the six chapters (hero + 01–05), top bar, progress bar, next button |
| `styles/tokens.css` | every colour, light and dark under the same names |
| `styles/base.css` | type, buttons |
| `styles/story.css` | chapter layout, stats, comparison, track, progress bar, phone layout |
| `styles/scene.css` | how parts, paths, labels and alerts look in each state |
| `scripts/scene3d.js` | the WebGL scene (three.js): parts, paths, dots, glow, camera, HTML labels |
| `scripts/vendor/three.module.min.js` | three.js 0.170.0, copied from npm (the CSP allows only same-site scripts); licence beside it |
| `scripts/scene.js` | the SVG fallback scene, used when WebGL is not available |
| `scripts/main.js` | which chapter is on screen, progress bar, next button, theme switch |

## How the scene works (WebGL, since 2026-11-18)
Owner, after the SVG version: "Theirs look sooo good!! Fix everything". The scene is now real 3D:
- `createScene3d(canvas, overlay)` builds a three.js scene: rounded extruded slabs with outlines, a glossy database,
  soft shadows on a shadow-only ground, a faded grid, fog tied to camera distance, ACES tone mapping.
- Camera: each `CHAPTERS[n]` has a target `t`, `dist`, azimuth `az`, elevation `el` and where on screen the target
  sits (`sx`, `sy`, via `setViewOffset`). `main.js` passes a fractional chapter from scroll (`setProgress`), so the
  camera scrubs between chapters, damped; the chapter's states (alert, ok, hidden, dim) switch when it is on screen.
- Broken parts glow orange with a pulsing ring; fixed parts turn green. Requests are instanced dots along L-shaped
  paths. Labels are HTML pills placed by projecting 3D points each frame (crisp text, theme colours).
- Desktop side chapters: the canvas is masked out under the text column (`--side`). Phones: the scene sits in the
  top 46 % of the screen, and only labels of broken or fixed parts show.
- Light and dark palettes follow `data-theme`. The loop stops while the tab is hidden. Reduced motion: no damping,
  no dots, no drift.
- No WebGL: `main.js` removes the `webgl` class and uses the SVG scene below.

## The SVG fallback scene
- One SVG behind the page. `iso(x, y, z)` turns a world point (x down-right, y down-left, z up) into screen pixels:
  an isometric projection done in code, not CSS 3D. Edges stay crisp, labels stay upright and readable, and it works
  on every browser and phone without WebGL (the site's CSP allows only same-site scripts, no libraries).
- `PARTS` places the parts (server stacks, cache, database cylinder, globe, laptop, load balancer, id generator);
  `PATHS` joins them with L-shaped routes along the grid. Moving dots are drawn each frame along those routes.
- Everything is drawn once. A chapter (`CHAPTERS[n]`) only sets: the camera (`at` world point, `zoom`, where on screen
  it sits, `phoneAt` for phones), classes for parts (`alert`, `ok`, `hidden`, `dim`) and paths (`down`, `hot`, `ok`,
  `hidden`), label texts, request speed, and extras (`sev`, `explode`, `logs`).
- The camera is one CSS transform on `g.cam` with a 0.9 s ease-out transition.
- `prefers-reduced-motion`: no camera transition, no moving dots, no blinking; each chapter shows its final state.

## Add a chapter
1. Add a `<section class="chapter" data-chapter="N" data-name="…">` to `index.html`.
2. Add an entry to `CHAPTERS` in `scene.js` (copy the nearest one and change the camera and classes).
3. Add a segment to `.segs` in the progress bar and update "/ 05".

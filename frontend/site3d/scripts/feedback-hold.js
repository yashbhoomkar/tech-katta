// What is done in the very task of a press on Report (feedback.js), before the popup's code or anything else runs:
//  - hold(): the page's 3D worlds stop drawing while the popup is up and its screenshot is taken (the popup covers them). On a slow phone the drawing and the screenshot
//    would share one CPU, and a frame of a busy 3D page can take longer than the whole screenshot.
//  - grab(): each visible 3D canvas is drawn once more and copied, in this same task (a WebGL canvas can only be read in the task that drew it; and one that has not been drawn
//    for a moment is much slower to read), so the screenshot has the 3D picture however long the rest takes.
// world.js (the 3D engine) tells this file about itself when it loads; on a page without a 3D canvas it is never loaded and nothing here does anything.
let world = null; // { snapshotOf, holdWorlds } of world.js, which registers itself when it loads (so a press never has to wait for it)
export const registerWorld = (api) => { world = api; };
export const loadedWorld = () => world;

/** stop the worlds drawing; returns the function that lets them go on (safe to call twice) */
export function hold() {
  const release = world?.holdWorlds?.() || (() => {}); let done = false;
  return () => { if (!done) { done = true; release(); } };
}

/** Map of canvas → PNG data URL, for the 3D canvases that are on the screen, no wider than `pr` x their size on the page (the picture is shown no larger) */
export function grab(pr) {
  const got = new Map();
  if (!world) return got;
  for (const c of document.querySelectorAll('canvas')) {
    try {
      const r = c.getBoundingClientRect();
      if (r.width <= 4 || r.height <= 4 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;
      const cs = getComputedStyle(c); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const s = world.snapshotOf(c, Math.round(r.width * pr)); if (s) got.set(c, s.toDataURL('image/png'));
    } catch { /* this one is read later, or left blank */ }
  }
  return got;
}

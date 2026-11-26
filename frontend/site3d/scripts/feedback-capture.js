// A screenshot of what is on the screen, for the Report popup's Visual feedback tab. Loaded only when that tab opens.
// html-to-image (vendor/html-to-image.esm.js) draws the page's DOM; it cannot see inside a WebGL canvas (the 3D world, the 3D design canvas, a replay: it
// would draw them blank). So each visible canvas is read first (a world draws one frame again and reads it in the same task, world.js snapshotOf; any other
// canvas is read as it is), and an <img> of it stands in the canvas's place for the length of the capture. The result is the visible window only,
// at the screen's pixel ratio but at most 2, drawn at most 1600 px on its long side, as a PNG under 4 MB (the only format BugDrop's worker takes).
import { fitSize, pixelRatioFor, dataUrlBytes, MAX_BYTES, MAX_SIDE } from './feedback-core.js';

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const onScreen = (r) => r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;

/** put an <img> of every visible canvas where the canvas is; returns the function that takes them away again */
async function standIns() {
  await frame();
  const undo = [], canvases = Array.from(document.querySelectorAll('canvas'));
  // the engine is already loaded on any page that has a world; a page with only flat canvases is not made to load it
  const world = canvases.length ? await import('./world.js').catch(() => null) : null;
  for (const c of canvases) {
    const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
    if (!onScreen(r) || cs.visibility === 'hidden' || cs.display === 'none') continue;
    let url = world?.snapshotOf(c) || ''; // a 3D canvas: one frame drawn again and read now
    if (!url) { try { url = c.toDataURL('image/png'); } catch { continue; } } // a flat canvas; a tainted one cannot be read: left as it is
    if (url.length < 200) continue;
    const img = new Image(); img.src = url; img.alt = '';
    img.style.cssText = `position:${cs.position === 'static' ? 'relative' : cs.position};inset:${cs.inset};left:${cs.left};top:${cs.top};width:${r.width}px;height:${r.height}px;margin:${cs.margin};transform:${cs.transform};z-index:${cs.zIndex};display:block;pointer-events:none`;
    c.parentNode.insertBefore(img, c.nextSibling);
    const was = c.style.visibility; c.style.visibility = 'hidden';
    undo.push(() => { img.remove(); c.style.visibility = was; });
  }
  await Promise.all(Array.from(document.querySelectorAll('img[src^="data:"]')).map((i) => (i.decode ? i.decode().catch(() => {}) : null)));
  return () => undo.forEach((f) => f());
}

/** { dataUrl, width, height, bytes }; throws an Error whose message says why when the page could not be drawn */
export async function capturePage({ hide = [] } = {}) {
  const { toCanvas } = await import('./vendor/html-to-image.esm.js');
  const hidden = hide.map((el) => [el, el.style.visibility]); hidden.forEach(([el]) => { el.style.visibility = 'hidden'; });
  let restore = () => {};
  try {
    restore = await standIns();
    const pr = pixelRatioFor(devicePixelRatio), scrolled = scrollX || scrollY;
    const opts = {
      pixelRatio: pr, width: innerWidth, height: innerHeight, cacheBust: false,
      backgroundColor: getComputedStyle(document.body).backgroundColor || undefined,
      filter: (n) => !(n.classList && (n.classList.contains('tk-report') || n.classList.contains('tk-report-pop'))),
      ...(scrolled ? { style: { transform: `translate(${-scrollX}px, ${-scrollY}px)`, transformOrigin: 'top left' } } : {}),
    };
    let canvas;
    // the fonts are read from the page's stylesheets; one that cannot be read (a cross-origin sheet without CORS) must not cost the picture
    try { canvas = await toCanvas(document.documentElement, opts); } catch (e) { canvas = await toCanvas(document.documentElement, { ...opts, skipFonts: true }).catch(() => { throw e; }); }
    const { width, height } = fitSize(canvas.width, canvas.height, MAX_SIDE);
    const out = document.createElement('canvas'); out.width = width; out.height = height;
    const g = out.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, width, height); g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, width, height);
    // PNG: BugDrop's worker takes only a PNG data URL (it answers 400 INVALID_SCREENSHOT to a JPEG). PNG has no quality to lower,
    // so a picture over the limit is drawn smaller until it fits
    let w = width, h = height, url = out.toDataURL('image/png');
    while (dataUrlBytes(url) > MAX_BYTES && w > 320) {
      w = Math.round(w * 0.8); h = Math.round(h * 0.8);
      const s = document.createElement('canvas'); s.width = w; s.height = h; const sg = s.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(out, 0, 0, w, h);
      url = s.toDataURL('image/png');
    }
    if (dataUrlBytes(url) > MAX_BYTES) throw new Error('the image is over 4 MB');
    return { dataUrl: url, width: w, height: h, bytes: dataUrlBytes(url) };
  } catch (e) {
    throw new Error(String(e?.message || e?.type || e || 'unknown').slice(0, 160));
  } finally {
    restore(); hidden.forEach(([el, v]) => { el.style.visibility = v; });
  }
}

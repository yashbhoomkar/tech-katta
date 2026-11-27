// A screenshot of what is on the screen, for the Report popup's Visual feedback tab. Started the moment the Report button is pressed (feedback-ui.js), so the
// picture is usually ready before the person asks for it.
// html-to-image (vendor/html-to-image.esm.js) draws the page's DOM; it cannot see inside a WebGL canvas (the 3D world, the 3D design canvas, a replay: it
// would draw them blank). So each visible canvas is read first (a world draws one frame again and reads it in the same task, world.js snapshotOf; any other
// canvas is read as it is) and, for the length of the capture, answers html-to-image's toDataURL() with that picture; nothing is added to the page.
// What makes it fast on a slow phone:
//  - the fonts are turned into CSS once per page load, at idle (warmFonts), never during a capture;
//  - only what is on the screen is cloned: an element that is wholly off the screen keeps its box (so the layout does not move) but not its contents,
//    and display:none / visibility:hidden contents are left out;
//  - the page is drawn once, at the size it will be sent (not drawn big and shrunk), and the PNG is encoded only when the report is sent (encodePng).
// The result is the visible window only, at the screen's pixel ratio but at most 2, at most 1600 px on its long side, as a PNG under 4 MB (the only format
// BugDrop's worker takes). Times of the steps are kept in window.__tkReportPerf (for tests and for finding what is slow).
import { loadedWorld } from './feedback-hold.js';
import { fitSize, pixelRatioFor, dataUrlBytes, MAX_BYTES, MAX_SIDE, fontBlocks, pickFontFaces, STYLE_PROPS, INHERITED, canSkipStyle } from './feedback-core.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const now = () => performance.now();
const intersects = (r, margin) => r.bottom > -margin && r.right > -margin && r.top < innerHeight + margin && r.left < innerWidth + margin;

let lib = null; // html-to-image, loaded once
const load = () => (lib ||= import('./vendor/html-to-image.esm.js').catch((e) => { lib = null; throw e; })); // a failed load is tried again next time

// ---- fonts: the @font-face CSS with the font files inside it, worked out once (the page's own sheets and the Google Fonts one are read, the files fetched)
let fontJob = null;
export function warmFonts() {
  return (fontJob ||= load().then((m) => m.getFontEmbedCSS(document.documentElement)).then((css) => fontBlocks(css || '')).catch(() => []));
}

const BLANK = 'data:,';

/** each visible canvas answers html-to-image's toDataURL() with its picture: a 3D one was copied at the press (feedback-hold.js grab), any other is read when asked.
 *  Returns the function that puts the canvases' own toDataURL back. */
async function readCanvases(pr, grabbed) {
  const undo = [], canvases = Array.from(document.querySelectorAll('canvas'));
  const world = loadedWorld(); // set by world.js when it loads; a page with only flat canvases never loads it
  for (const c of canvases) {
    const r = c.getBoundingClientRect();
    if (r.width <= 4 || r.height <= 4 || !intersects(r, 0)) continue;
    const cs = getComputedStyle(c); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const own = Object.getOwnPropertyDescriptor(c, 'toDataURL');
    let url = grabbed?.get(c) || null; // a 3D canvas was copied at the press already
    c.toDataURL = () => {
      if (url !== null) return url;
      try { url = (world?.snapshotOf(c, Math.round(r.width * pr)) || c).toDataURL('image/png'); } catch { url = BLANK; } // a canvas from another origin cannot be read: drawn blank, it must not fail the picture
      return (url = url.length < 200 ? BLANK : url);
    };
    undo.push(() => { if (own) Object.defineProperty(c, 'toDataURL', own); else delete c.toDataURL; });
  }
  return () => undo.forEach((f) => f());
}

/** what an element with no styling of its own has for each property we copy (read in a throwaway iframe), so a declaration that says the same is left off the clone */
function styleSkipper() {
  const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  f.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:600px;border:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(f);
  const doc = f.contentDocument; doc.open(); doc.write('<!doctype html><html><body></body></html>'); doc.close();
  const byTag = new Map(), parents = new WeakMap();
  const defaults = (el) => {
    const k = `${el.namespaceURI}|${el.localName}`; let m = byTag.get(k);
    if (!m) {
      m = new Map();
      try { const d = doc.createElementNS(el.namespaceURI, el.localName); doc.body.appendChild(d); const cs = doc.defaultView.getComputedStyle(d); for (const p of STYLE_PROPS) m.set(p, cs.getPropertyValue(p)); } catch { /* no defaults: nothing is left off */ }
      byTag.set(k, m);
    }
    return m;
  };
  return {
    skip(prop, value, el, cs) {
      const p = el.parentElement; if (!p || el === document.documentElement) return false;
      let ps; if (INHERITED.has(prop)) { ps = parents.get(p) || parents.set(p, getComputedStyle(p)).get(p); }
      return canSkipStyle(prop, value, defaults(el).get(prop), ps ? ps.getPropertyValue(prop) : undefined, (k) => cs.getPropertyValue(k));
    },
    done() { f.remove(); },
  };
}

/** the filter html-to-image calls for every node: false leaves the node (and what is in it) out of the picture. `used` collects the fonts and characters that stay in it. */
function makeFilter(used) {
  const bare = new WeakSet(); // elements kept as an empty box
  return (n) => {
    if (n.nodeType !== 1) { if (bare.has(n.parentNode)) return false; if (n.nodeType === 3) for (const ch of n.data) used.chars.add(ch); return true; }
    if (bare.has(n.parentNode)) return false;
    const c = n.classList;
    if (c && (c.contains('tk-report') || c.contains('tk-report-pop'))) return false;
    const tag = n.tagName;
    if (tag === 'SCRIPT' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return false;
    if (n.namespaceURI !== 'http://www.w3.org/1999/xhtml' || n.firstChild === null) return true; // svg is cloned as a whole; an empty element costs nothing
    const cs = getComputedStyle(n);
    if (cs.display === 'none') return false;
    for (const f of cs.fontFamily.split(',')) used.families.add(f.trim().replace(/^["']|["']$/g, '').toLowerCase());
    used.weights.add(parseInt(cs.fontWeight, 10) || 400);
    if (cs.visibility === 'hidden') { bare.add(n); return true; } // its own box still takes room; its contents can be seen only if they say visible
    const r = n.getBoundingClientRect();
    // wholly off the screen, and nothing sticks out of it that could be on the screen: the box stays so nothing moves, the contents go
    if (!intersects(r, 24) && n.scrollHeight <= n.clientHeight + 1 && n.scrollWidth <= n.clientWidth + 1 && cs.position !== 'fixed' && cs.position !== 'sticky') bare.add(n);
    return true;
  };
}

/** { canvas, width, height }; throws an Error whose message says why when the page could not be drawn. `canvas` holds the picture; encodePng(shot) makes the PNG. */
export async function capturePage({ geometry, grabbed, alive = () => true } = {}) {
  const perf = (window.__tkReportPerf = {}); const t0 = now(); let t = t0;
  const lap = (k) => { const n = now(); perf[k] = Math.round(n - t); t = n; if (!alive()) throw new Error('closed'); };
  let restore = () => {}, skipper = null;
  try {
    const W = geometry?.w || innerWidth, H = geometry?.h || innerHeight, sx = geometry?.x ?? scrollX, sy = geometry?.y ?? scrollY;
    const pr = pixelRatioFor(devicePixelRatio);
    const { toSvg } = await load(); lap('load');
    const blocks = await Promise.race([warmFonts(), new Promise((r) => setTimeout(() => r([]), 1500))]); lap('fonts'); // a font file that will not come must not hold the picture back
    restore = await readCanvases(pr, grabbed); lap('canvases'); await tick(); // between the steps the page gets its turn (a touch, the popup's drawing)
    const used = { families: new Set(), weights: new Set(), chars: new Set() };
    const out = fitSize(Math.round(W * pr), Math.round(H * pr), MAX_SIDE);
    const opts = {
      width: W, height: H, cacheBust: false, includeStyleProperties: STYLE_PROPS,
      backgroundColor: getComputedStyle(document.body).backgroundColor || undefined,
      filter: makeFilter(used), skipStyle: (skipper = styleSkipper()).skip,
      ...(sx || sy ? { style: { transform: `translate(${-sx}px, ${-sy}px)`, transformOrigin: 'top left' } } : {}),
    };
    // html-to-image asks for the font CSS after it has cloned the page, by when `used` holds what is really on the screen
    Object.defineProperty(opts, 'fontEmbedCSS', { get: () => pickFontFaces(blocks, used).join('\n') });
    await tick();
    const svg = await toSvg(document.documentElement, opts);
    perf.svgKB = Math.round(svg.length / 1000); lap('clone+serialize');
    if (window.__tkKeepSvg) window.__tkReportSvg = svg; // tests only: to look at the picture's SVG
    const img = new Image(); img.decoding = 'async'; img.src = svg;
    await img.decode(); lap('rasterize');
    const canvas = document.createElement('canvas'); canvas.width = out.width; canvas.height = out.height;
    const g = canvas.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, out.width, out.height);
    lap('draw'); restore(); restore = () => {}; perf.total = Math.round(now() - t0);
    return { canvas, width: out.width, height: out.height };
  } catch (e) {
    throw new Error(String(e?.message || e?.type || e || 'unknown').slice(0, 160));
  } finally { restore(); skipper?.done(); }
}

/** the picture as a PNG data URL under the size limit (drawn smaller until it fits); { dataUrl, width, height, bytes } */
export async function encodePng(shot) {
  const src = shot.canvas; let w = src.width, h = src.height, c = src, url = c.toDataURL('image/png');
  while (dataUrlBytes(url) > MAX_BYTES && w > 320) {
    w = Math.round(w * 0.8); h = Math.round(h * 0.8);
    c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); url = c.toDataURL('image/png');
  }
  if (dataUrlBytes(url) > MAX_BYTES) throw new Error('the image is over 4 MB');
  return { dataUrl: url, width: w, height: h, bytes: dataUrlBytes(url) };
}

// A screenshot of what is on the screen, for the Report popup's Visual feedback tab. It starts when the Report button is pressed (feedback-ui.js), in the
// background, so the picture is usually ready before the tab is opened.
// html-to-image (vendor/html-to-image.esm.js) draws the page's DOM; it cannot see inside a WebGL canvas (the 3D world, the 3D design canvas, a replay: it
// would draw them blank). So each visible 3D canvas is read first (a world draws one frame again and reads it in the same task, world.js snapshotOf) and the
// library is handed that picture for the canvas. What makes it fast: the fonts are read once per page load (warmFonts, at idle) and handed over ready; only
// what is on the screen is copied (an element off the screen keeps its size but not its contents, so nothing shifts); no image or font is fetched again.
// The result is the visible window only, at the screen's pixel ratio but at most 2, at most 1600 px on its long side. It is returned as a canvas: the PNG
// (the only format BugDrop's worker takes, under 4 MB) is made when it is sent (feedback-markup.js flatten), not here.
import { fitSize, pixelRatioFor, MAX_SIDE } from './feedback-core.js';

let lib = null;
const loadLib = () => (lib ||= import('./vendor/html-to-image.esm.js'));
const onScreen = (r) => r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
/** the popup gets its paint before the heavy work starts: after the next frame, but never more than 100 ms (a page that is busy drawing its own frames must not hold the picture up) */
const settle = () => new Promise((r) => { const t = setTimeout(r, 100); requestAnimationFrame(() => setTimeout(() => { clearTimeout(t); r(); }, 0)); });

// ---- fonts: the page's @font-face rules for Latin text, as CSS with the font files inside, made once per page load and reused by every capture
let fontCss = null;
async function readFonts() {
  const faces = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules; try { rules = Array.from(sheet.cssRules); } catch { continue; } // a sheet the page may not read (no CORS): its fonts are left out
    for (const r of rules) {
      if (r.type !== CSSRule.FONT_FACE_RULE) continue;
      const range = r.style.getPropertyValue('unicode-range'); // the site is English: the other scripts' files would only make every picture heavier
      if (range && !/U\+0+-0*FF\b/i.test(range)) continue; // the browser writes U+0000-00FF back as U+0-FF
      faces.push({ css: r.cssText, base: sheet.href || location.href });
    }
  }
  const files = new Map();
  const toData = (url) => files.get(url) || files.set(url, fetch(url).then((res) => (res.ok ? res.blob() : Promise.reject(new Error('font')))).then((b) => new Promise((ok, no) => { const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = no; f.readAsDataURL(b); }))).get(url);
  const out = await Promise.all(faces.map(async ({ css, base }) => {
    const urls = Array.from(new Set((css.match(/url\((?:"[^"]+"|'[^']+'|[^)]+)\)/g) || []).map((u) => u.slice(4, -1).replace(/^["']|["']$/g, ''))));
    let text = css;
    for (const u of urls) { if (u.startsWith('data:')) continue; try { text = text.split(u).join(await toData(new URL(u, base).href)); } catch { return ''; } }
    return text;
  }));
  return out.filter(Boolean).join('\n');
}
/** the fonts' CSS, computed the first time it is asked for and kept; capturePage never fetches a font itself */
export function warmFonts() { return (fontCss ||= readFonts().catch(() => '')); }
/** at idle after load: the library and the fonts are ready before anyone presses Report */
export function warmCapture() { return Promise.all([loadLib(), warmFonts(), import('./world.js').catch(() => null)]).then(() => true, () => false); }

// ---- what the library is handed for each canvas: the 3D ones' picture drawn now, the flat ones as they are, the rest blank (still their size)
async function canvasPictures() {
  const canvases = Array.from(document.querySelectorAll('canvas')); if (!canvases.length) return () => {};
  const world = await import('./world.js').catch(() => null); // already loaded on any page that has a 3D canvas
  const undo = [];
  for (const c of canvases) {
    let url = 'data:,';
    const r = c.getBoundingClientRect(), cs = getComputedStyle(c);
    if (onScreen(r) && cs.visibility !== 'hidden' && cs.display !== 'none') {
      url = world?.snapshotOf(c) || '';
      if (!url) { try { url = c.toDataURL('image/png'); } catch { url = 'data:,'; } } // a canvas the page may not read stays blank
      if (url.length < 200) url = 'data:,';
    }
    c.toDataURL = () => url; undo.push(() => { delete c.toDataURL; });
  }
  return () => undo.forEach((f) => f());
}

// the CSS properties copied from each element into the picture: everything that changes how it is laid out or painted. The library's default is all ~350 of them on every
// element (4.8 MB of markup for a 650-element page, which the browser then has to parse again); these ~150 give the same picture at a fraction of the size
const STYLE = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear', 'visibility', 'opacity', 'overflow-x', 'overflow-y', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'aspect-ratio',
  ...['top', 'right', 'bottom', 'left'].flatMap((d) => [`margin-${d}`, `padding-${d}`, `border-${d}-width`, `border-${d}-style`, `border-${d}-color`]),
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-collapse', 'border-spacing', 'table-layout', 'caption-side',
  'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'box-shadow', 'text-shadow',
  'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-clip', 'background-origin', 'background-blend-mode',
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'font-stretch', 'font-feature-settings', 'font-variation-settings', 'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset', 'text-transform', 'text-indent', 'text-overflow', 'text-wrap',
  'white-space', 'word-break', 'overflow-wrap', 'vertical-align', 'direction', 'unicode-bidi', 'writing-mode', 'tab-size', 'list-style-type', 'list-style-position', 'list-style-image',
  '-webkit-text-fill-color', '-webkit-text-stroke-width', '-webkit-text-stroke-color', '-webkit-line-clamp', '-webkit-box-orient',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'align-items', 'align-self', 'align-content', 'justify-content', 'justify-items', 'justify-self', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'column-count',
  'transform', 'transform-origin', 'translate', 'rotate', 'scale', 'filter', 'backdrop-filter', '-webkit-backdrop-filter', 'mix-blend-mode', 'isolation', 'clip-path',
  'mask-image', '-webkit-mask-image', 'mask-size', 'mask-position', 'mask-repeat', '-webkit-mask-size', '-webkit-mask-position', '-webkit-mask-repeat', 'object-fit', 'object-position',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'stop-color', 'stop-opacity', 'opacity'];

/** keep what is on the screen: an element outside it, or with visibility:hidden, is kept as an empty box of its size (the page's layout does not shift), display:none is left out */
function makeFilter() {
  const empty = new WeakSet(), vw = innerWidth, vh = innerHeight;
  return (n) => {
    if (n.nodeType !== 1) return !(n.parentNode && empty.has(n.parentNode)); // text: only inside an element that is kept whole
    const cl = n.classList; if (cl.contains('tk-report') || cl.contains('tk-report-pop')) return false;
    if (n.parentNode && empty.has(n.parentNode)) return false;
    if (n === document.documentElement || n === document.body) return true;
    const cs = getComputedStyle(n);
    if (cs.display === 'none') return false;
    if (cs.visibility === 'hidden') { empty.add(n); return true; }
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw)) empty.add(n);
    return true;
  };
}

/** { canvas, width, height }; throws an Error whose message says why when the page could not be drawn */
export async function capturePage() {
  let undo = () => {};
  try {
    undo = await canvasPictures(); // before anything waits: the 3D picture is of the moment the button was pressed
    await settle();
    const [{ toCanvas }, fontEmbedCSS] = await Promise.all([loadLib(), warmFonts()]);
    const pr = pixelRatioFor(devicePixelRatio), scrolled = scrollX || scrollY;
    const opts = {
      pixelRatio: pr, width: innerWidth, height: innerHeight, cacheBust: false, fontEmbedCSS, includeStyleProperties: STYLE,
      backgroundColor: getComputedStyle(document.body).backgroundColor || undefined,
      filter: makeFilter(),
      ...(scrolled ? { style: { transform: `translate(${-scrollX}px, ${-scrollY}px)`, transformOrigin: 'top left' } } : {}),
    };
    const canvas = await toCanvas(document.documentElement, opts);
    const { width, height } = fitSize(canvas.width, canvas.height, MAX_SIDE);
    if (width === canvas.width && height === canvas.height) return { canvas, width, height };
    const out = document.createElement('canvas'); out.width = width; out.height = height;
    const g = out.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(canvas, 0, 0, width, height);
    return { canvas: out, width, height };
  } catch (e) {
    throw new Error(String(e?.message || e?.type || e || 'unknown').slice(0, 160));
  } finally { undo(); }
}

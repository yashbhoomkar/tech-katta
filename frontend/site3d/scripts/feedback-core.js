// The Report popup's pure parts (no page, no network): what the address means, the title and body of a report, the request the worker takes,
// the rate limit, the size of a screenshot, and the prefilled GitHub issue for when sending is not possible. Used by feedback-ui.js;
// site3d/test/feedback.test.js has its cases.
export const REPO = 'yashbhoomkar/tech-katta-feedback';
/** BugDrop's hosted worker: the same endpoint BugDrop's own widget posts to (the script itself is no longer loaded) */
export const ENDPOINT = 'https://bugdrop.neonwatty.workers.dev/api/feedback';
export const GAP_MS = 30_000, MAX_SIDE = 1600, MAX_BYTES = 4_000_000, TITLE_MAX = 80;

/** "on" | "off" from the address's ?feedback=, else null */
export function feedbackParam(search = '') { const m = /[?&]feedback=(on|off)(?:&|$)/.exec(search); return m ? m[1] : null; }
/** whether to show the button: the address decides when it says so, else what this browser remembered */
export function feedbackWanted(search, stored) { const p = feedbackParam(search); return p ? p === 'on' : stored !== '0'; }

/** the page's address without its query or fragment (a report must not carry what was typed into an address) */
export function cleanUrl(href = '') { try { const u = new URL(href); return u.origin + u.pathname; } catch { return String(href).split(/[?#]/)[0]; } }

/** the issue title: the first line of what was written, trimmed to 80 characters; a visual report with no note is named after its page */
export function titleOf(text = '', page = '') {
  const line = String(text).split('\n').map((l) => l.trim()).find(Boolean) || '';
  if (line) return line.length > TITLE_MAX ? line.slice(0, TITLE_MAX).trimEnd() : line;
  let path = ''; try { path = new URL(page).pathname; } catch { path = String(page); }
  return `Visual feedback: ${path || '/'}`.slice(0, TITLE_MAX);
}
/** the two chips: Bug or Idea, as the worker's categories */
export const categoryOf = (chip) => (chip === 'idea' ? 'feature' : 'bug');

/** the page details a report carries, as lines */
export function detailsText(m = {}) {
  return [`Page: ${m.url ?? ''}`, `Browser: ${m.userAgent ?? ''}`, `Window: ${m.viewport?.width ?? ''}×${m.viewport?.height ?? ''} at ${m.devicePixelRatio ?? ''}x`,
    `Language: ${m.language ?? ''}`, `Version: ${m.appVersion ?? ''}`, `Time: ${m.timestamp ?? ''}`].join('\n');
}
/** the issue body: what was written, then the details, and why there is no screenshot when it was asked for and failed */
export function descriptionOf({ text = '', meta = {}, captureError = '' } = {}) {
  return [String(text).trim() || '(no message)', '', '---', detailsText(meta), ...(captureError ? [`Screenshot: capture failed (${captureError})`] : [])].join('\n');
}

/** the body of the POST the worker takes (BugDrop's own widget sends the same fields) */
export function payloadOf({ title, description, category, screenshot = null, meta }) {
  return { repo: REPO, title, description, category, screenshot, attachments: [], metadata: meta };
}

/** one report per browser per 30 s: { ok } or { ok: false, wait: seconds left } */
export function canSend(last, now, gap = GAP_MS) {
  const t = Number(last) || 0, left = t + gap - now;
  return left > 0 && t > 0 ? { ok: false, wait: Math.ceil(left / 1000) } : { ok: true, wait: 0 };
}

// ---- spam and privacy rules (tested in test/feedback.test.js)
export const MIN_QUICK = 10, DAILY_MAX = 10, DAY_MS = 86_400_000, MIN_OPEN_MS = 2000;
/** Quick feedback needs a few real words: at least MIN_QUICK characters once trimmed */
export const quickOk = (text) => String(text || '').trim().length >= MIN_QUICK;
/** the times (ms) of this browser's recent reports, from the stored JSON; only the last day, only numbers */
export function recentLog(raw, now = Date.now()) {
  let l = []; try { const j = JSON.parse(raw || '[]'); if (Array.isArray(j)) l = j; } catch { /* not ours: start again */ }
  return l.filter((t) => typeof t === 'number' && Number.isFinite(t) && now - t < DAY_MS && t <= now + 60_000).slice(-DAILY_MAX);
}
/** at most DAILY_MAX reports per browser in any 24 hours: { ok } or { ok: false, hours: until the oldest drops out } */
export function dailyCap(raw, now = Date.now(), max = DAILY_MAX) {
  const l = recentLog(raw, now);
  return l.length < max ? { ok: true, hours: 0 } : { ok: false, hours: Math.max(1, Math.ceil((l[0] + DAY_MS - now) / 3_600_000)) };
}
/** the stored JSON with this report added */
export const logReport = (raw, now = Date.now()) => JSON.stringify([...recentLog(raw, now), now].slice(-DAILY_MAX));
/** a report sent less than MIN_OPEN_MS after the popup opened is not a person (it is dropped like the honeypot's) */
export const tooSoon = (openedAt, now = Date.now()) => now - openedAt < MIN_OPEN_MS;

/** what the Visual screenshot always covers: every field a person types in, and anything the page marks data-private (the signed-in person's name, email and photo) */
export const REDACT_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-private], [data-private] *';
/** boxes to paint over the picture: `rects` are screen rectangles read now (scroll `now`); the picture shows the window as it was at the press (`geo`: its scroll and size);
 *  `scale` turns screen pixels into picture pixels. Clipped to the picture; empty ones dropped. */
export function redactBoxes(rects, geo, now = { x: 0, y: 0 }, scale = 1, pad = 2) {
  const out = [];
  for (const r of rects) {
    const l = Math.max(0, r.left + now.x - geo.x - pad), t = Math.max(0, r.top + now.y - geo.y - pad);
    const rr = Math.min(geo.w, r.right + now.x - geo.x + pad), b = Math.min(geo.h, r.bottom + now.y - geo.y + pad);
    if (rr - l > 1 && b - t > 1) out.push({ x: Math.floor(l * scale), y: Math.floor(t * scale), w: Math.ceil((rr - l) * scale), h: Math.ceil((b - t) * scale) });
  }
  return out;
}

/** the size to draw a screenshot at: its long side at most `max` */
export function fitSize(w, h, max = MAX_SIDE) {
  const long = Math.max(w, h); if (long <= max) return { width: Math.round(w), height: Math.round(h) };
  const k = max / long; return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}
/** the capture's pixel ratio: the screen's, at most 2 (a phone at 3.4x would draw an image it cannot hold) */
export const pixelRatioFor = (dpr) => Math.max(1, Math.min(Number(dpr) || 1, 2));
/** the CSS properties that change how a page looks, for the screenshot. html-to-image copies every computed property (563 in Chrome) onto every element, which
 *  made the picture's SVG megabytes long; these ~170 draw the same page. (Nothing that only matters for interaction or motion: cursor, transition, animation.) */
export const STYLE_PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear', 'box-sizing', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'border-image-source', 'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'overflow-x', 'overflow-y', 'opacity', 'visibility', 'transform', 'transform-origin', 'translate', 'rotate', 'scale',
  'filter', 'backdrop-filter', '-webkit-backdrop-filter', 'mix-blend-mode', 'isolation', 'clip-path', 'clip', 'mask-image', '-webkit-mask-image', 'mask-size', 'mask-position', 'mask-repeat', '-webkit-mask-size', '-webkit-mask-position', '-webkit-mask-repeat',
  'background-color', 'background-image', 'background-size', 'background-position-x', 'background-position-y', 'background-repeat', 'background-clip', 'background-origin', 'background-blend-mode', '-webkit-background-clip',
  'box-shadow', 'text-shadow', 'color', 'color-scheme', 'accent-color', 'caret-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant-caps', 'font-variant-numeric', 'font-variant-ligatures', 'font-feature-settings', 'font-variation-settings', 'font-kerning',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-align-last', 'text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-decoration-thickness', 'text-underline-offset', 'text-transform', 'text-indent', 'text-overflow',
  'white-space', 'word-break', 'overflow-wrap', 'hyphens', 'tab-size', 'vertical-align', 'direction', 'writing-mode', 'text-orientation', 'unicode-bidi', '-webkit-text-fill-color', '-webkit-text-stroke-width', '-webkit-text-stroke-color', '-webkit-line-clamp', '-webkit-box-orient', 'line-break',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'justify-content', 'justify-items', 'justify-self', 'align-items', 'align-content', 'align-self', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'aspect-ratio',
  'object-fit', 'object-position', 'list-style-type', 'list-style-position', 'list-style-image', 'table-layout', 'border-collapse', 'border-spacing', 'caption-side', 'empty-cells', 'appearance',
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'stop-color', 'stop-opacity', 'vector-effect', 'content',
];

/** CSS properties a child takes from its parent when it does not say; one that equals the parent's value need not be written on the clone (it inherits the same) */
export const INHERITED = new Set(['color', 'color-scheme', 'accent-color', 'caret-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant-caps', 'font-variant-numeric', 'font-variant-ligatures',
  'font-feature-settings', 'font-variation-settings', 'font-kerning', 'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-align-last', 'text-transform', 'text-indent', 'text-shadow', 'white-space', 'word-break', 'overflow-wrap', 'hyphens',
  'tab-size', 'direction', 'writing-mode', 'text-orientation', 'visibility', 'list-style-type', 'list-style-position', 'list-style-image', 'border-collapse', 'border-spacing', 'caption-side', 'empty-cells', '-webkit-text-fill-color',
  '-webkit-text-stroke-width', '-webkit-text-stroke-color', 'line-break', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'fill-rule']);
/** a colour property that is only the text colour (currentcolor) does not need writing; and a colour of something that is not drawn does not either */
export const COLOR_OF = { 'border-top-color': 'border-top-style', 'border-right-color': 'border-right-style', 'border-bottom-color': 'border-bottom-style', 'border-left-color': 'border-left-style', 'outline-color': 'outline-style',
  'text-decoration-color': 'text-decoration-line', 'text-decoration-style': 'text-decoration-line', 'text-decoration-thickness': 'text-decoration-line', 'text-underline-offset': 'text-decoration-line', 'transform-origin': 'transform' };
/** true when a declaration can be left off the clone: `value` is the element's computed value, `def` what an unstyled element of its tag has, `parent` what its parent has (or undefined), `get` reads another property of the element */
export function canSkipStyle(prop, value, def, parent, get) {
  if (prop === 'display' || prop === 'content') return false;
  if (value === def) return true;
  if (INHERITED.has(prop) && parent !== undefined && value === parent) return true;
  const gate = COLOR_OF[prop];
  if (gate) { const g = get(gate); if (g === 'none') return true; if (prop.endsWith('-color') && value === get('color')) return true; }
  return false;
}
/** the @font-face blocks inside a font CSS text (the embedded CSS html-to-image makes), one string each */
export const fontBlocks = (css = '') => css.match(/@font-face\s*\{[^}]*\}/g) || [];
const unq = (v = '') => v.trim().replace(/^["']|["']$/g, '').toLowerCase();
/** the code-point ranges of a unicode-range value ("U+0000-00FF, U+0131, U+4??"), as [lo, hi] pairs; none means every character */
export function unicodeRanges(v = '') {
  const out = []; v.replace(/u\+([0-9a-f?]+)(?:-([0-9a-f]+))?/gi, (_, a, b) => { out.push(a.includes('?') ? [parseInt(a.replace(/\?/g, '0'), 16), parseInt(a.replace(/\?/g, 'f'), 16)] : [parseInt(a, 16), parseInt(b || a, 16)]); return ''; });
  return out;
}
/** which @font-face blocks a screenshot needs: those of a family and a weight that are on the screen (when a weight has no face of its own, the nearest one),
 *  that have a character that is on the screen in their unicode-range. `used` is { families, weights, chars } (Sets of lower-case family names, numbers and
 *  characters). A block that cannot be read is kept. */
export function pickFontFaces(blocks, used) {
  const cps = Array.from(used.chars || [], (c) => c.codePointAt(0)), wts = Array.from(used.weights || []);
  const info = blocks.map((b) => {
    const fam = /font-family:\s*([^;]+);/i.exec(b)?.[1], w = /font-weight:\s*([^;]+);/i.exec(b)?.[1]?.trim().toLowerCase();
    const n = (w || '400').split(/\s+/).map((x) => (x === 'normal' ? 400 : x === 'bold' ? 700 : Number(x))).filter((x) => x > 0);
    return { b, fam: fam ? unq(fam) : '', lo: n.length ? Math.min(...n) : 400, hi: n.length ? Math.max(...n) : 400 };
  });
  const want = new Set(); // "family|lo|hi" of the faces the screen's weights land on
  for (const w of wts.length ? wts : [400]) {
    const byFam = new Map(); info.forEach((i) => { if (i.fam) (byFam.get(i.fam) || byFam.set(i.fam, []).get(i.fam)).push(i); });
    byFam.forEach((list, fam) => {
      const dist = (i) => (w < i.lo ? i.lo - w : w > i.hi ? w - i.hi : 0), best = Math.min(...list.map(dist));
      list.forEach((i) => { if (dist(i) === best) want.add(`${fam}|${i.lo}|${i.hi}`); });
    });
  }
  return info.filter((i) => {
    if (!i.fam) return true;
    if (used.families && !used.families.has(i.fam)) return false;
    if (!want.has(`${i.fam}|${i.lo}|${i.hi}`)) return false;
    const r = unicodeRanges(/unicode-range:\s*([^;]+);/i.exec(i.b)?.[1] || '');
    return !r.length || !cps.length || cps.some((c) => r.some(([a, z]) => c >= a && c <= z));
  }).map((i) => i.b);
}
/** bytes of a data: URL's payload */
export const dataUrlBytes = (u = '') => Math.floor(((u.split(',')[1] || '').length * 3) / 4);

/** a new issue in the feedback repository with the report already written in (for when the worker cannot be reached); a long body is cut for GitHub's address limit */
export function issueUrl({ title = '', description = '' } = {}) {
  const body = (description + '\n\n(If you had a screenshot, add it here.)').slice(0, 1800);
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

// ---- the markup editor's pure geometry (feedback-markup.js draws with it)
/** the three pen colours: red first (what people reach for), yellow and blue; the Highlight tool is always yellow and Hide always black */
export const MARK_COLORS = { red: '#e5251b', yellow: '#f5c400', blue: '#2563eb' };
export const HIDE_COLOR = '#111111';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
/** a pointer position on the screen -> a point in the picture (its own pixels), kept inside it; `rect` is the canvas as shown */
export function toImagePoint(clientX, clientY, rect, w, h) {
  const rw = Math.max(1, rect.width), rh = Math.max(1, rect.height);
  return { x: clamp(((clientX - rect.left) * w) / rw, 0, w), y: clamp(((clientY - rect.top) * h) / rh, 0, h) };
}
/** picture pixels per screen pixel for a picture of width `w` shown `shownW` wide */
export const scaleOf = (w, shownW) => w / Math.max(1, shownW);
/** a line about 3 screen pixels thick wherever the picture is shown (the preview is small, the full screen is large), never under 3 picture pixels or over w/40 */
export const lineWidthFor = (w, shownW) => Math.max(3, Math.min(3 * scaleOf(w, shownW), w / 40));
/** a label about 16 screen pixels tall */
export const textSizeFor = (w, shownW) => Math.max(14, Math.min(16 * scaleOf(w, shownW), w / 12));
/** the rectangle two corners make, whichever way it was dragged */
export function boxOf(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }; }
/** the two ends of an arrow's head: `len` long, either side of the line, at its tip b */
export function arrowHead(a, b, len, spread = Math.PI / 7) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  return [ang - spread, ang + spread].map((t) => ({ x: b.x - len * Math.cos(t), y: b.y - len * Math.sin(t) }));
}
/** whether a drag from a to b is too small to be a shape (a stray touch): shorter than `min` picture pixels on both sides */
export const tooSmall = (a, b, min = 6) => Math.abs(b.x - a.x) < min && Math.abs(b.y - a.y) < min;

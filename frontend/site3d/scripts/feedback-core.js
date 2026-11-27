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

/** the size to draw a screenshot at: its long side at most `max` */
export function fitSize(w, h, max = MAX_SIDE) {
  const long = Math.max(w, h); if (long <= max) return { width: Math.round(w), height: Math.round(h) };
  const k = max / long; return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}
/** the capture's pixel ratio: the screen's, at most 2 (a phone at 3.4x would draw an image it cannot hold) */
export const pixelRatioFor = (dpr) => Math.max(1, Math.min(Number(dpr) || 1, 2));
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

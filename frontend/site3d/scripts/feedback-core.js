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

// Public preview of an article (owner, 2026-11-13: "Preview only", like fanout.sh: the opening is readable,
// the rest fades into a sign-in card). The same cut is used by the app for signed-out readers and by the build
// (seo.js) for the HTML that search engines read, so both always show the same text.
// The cut: blocks from the start until about PREVIEW_WORDS words of text, or PREVIEW_SHARE of the article if
// that is less, never ending on a heading and never the whole article.
export const PREVIEW_WORDS = 300, PREVIEW_SHARE = 0.35;
const n = (s) => String(s || "").split(/\s+/).filter(Boolean).length;
export const blockWords = (b) => n(b.x) + n(b.cap) + (b.items || []).reduce((m, x) => m + n(x), 0) + (b.rows || []).reduce((m, r) => m + r.reduce((k, x) => k + n(x), 0), 0) + n(b.what) + n(b.use);

export function previewCut(body) {
  const total = body.reduce((m, b) => m + blockWords(b), 0), limit = Math.min(PREVIEW_WORDS, total * PREVIEW_SHARE);
  let w = 0, i = 0;
  while (i < body.length - 1 && w < limit) w += blockWords(body[i++]);
  while (i > 1 && /^h[23]$/.test(body[i - 1].t)) i--;
  return Math.max(1, Math.min(i, body.length - 1));
}

export const previewOf = (a) => ({ ...a, body: a.body.slice(0, previewCut(a.body)), preview: true });

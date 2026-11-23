// Usage events for the 3D pages, sent through the current app's pipeline (src/analytics.js, in /3d/legacy/legacy.js):
// the same /v1/events, the same rules (no cookies; nothing from browsers that ask not to be tracked or from automated
// ones). Page views carry the same { section, slug } shape the React app sent, so the owner's /analytics page groups
// old and new views together.
let mod = null, loading = null, first = true;
const load = () => (loading ||= import('/3d/legacy/legacy.js').then((m) => (mod = m)).catch(() => null));

/** "/learn/concepts/caching" → { section: "next:concepts", slug: "caching" }; "/problems" → { section: "next:problems", slug: "" }
 *  (the same mapping as next/src/lib/analytics.ts pageOf; site3d/test/analytics.test.js keeps them in step) */
export function pageOf(pathname) {
  const [a = '', b = '', c = ''] = pathname.split('/').filter(Boolean);
  if (!a) return { section: 'next:landing', slug: '' };
  if (a === 'learn') return b ? { section: `next:${b}`, slug: c } : { section: 'next:learn', slug: '' };
  if (a === 'problems' && b === 'challenge') return { section: 'next:challenge', slug: c };
  return { section: `next:${a}`, slug: b };
}
/** one page_view per route change; the first also says where the visitor came from */
export function pageView(pathname) {
  load().then((m) => { if (!m) return; const ref = first ? m.referrer() : ''; first = false; m.track('page_view', { ...pageOf(pathname), ref }); });
}
/** reading time and depth for an open article; returns the function that stops it */
export function readArticle(section, slug) {
  let stop = null, gone = false;
  load().then((m) => { if (m && !gone) stop = m.readArticle(section, slug); });
  return () => { gone = true; stop?.(); };
}
/** Vercel Web Analytics, once per page load */
export const hostAnalytics = () => load().then((m) => m?.hostAnalytics());

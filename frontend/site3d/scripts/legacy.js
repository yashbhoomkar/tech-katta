// tech.katta.cc's old addresses (/dashboard/…, and /dashboard/#<key> in-app links), sent to their pages: a port of
// next/src/content/legacy.ts (site3d/test/legacy.test.js has its cases). The current app addressed every page as a "key": "" (home),
// a section, "section/lesson", "problems[/…]", "practice[/slug]", "privacy", "terms", or an old "lab/…" address.
// fromLab (frontend/src/routes.js, which knows the old Lab names) is passed in, so this file stays plain.
const clean = (s) => s.replace(/^\/+|\/+$/g, '');
const decode = (s) => { try { return decodeURIComponent(s); } catch { return ''; } };

/** the route key of a /dashboard address; a #fragment, when there is one, wins */
export function legacyKey(pathname, hash) {
  if (hash.length > 0) return clean(decode(hash.slice(1)));
  const m = pathname.match(/^\/dashboard(?:\/(.*))?$/);
  return m ? clean(decode(m[1] ?? '')) : '';
}
/** the new path of a key; `problems`: slugs of the problems, `sections`: the section ids. Unknown keys go to the Dashboard. */
export function legacyTarget(key, problems, sections, fromLab = (k) => k) {
  const k = fromLab(clean(key), problems);
  const [sec = '', slug, more, ...rest] = k.split('/').filter(Boolean);
  const seg = encodeURIComponent;
  if (!sec) return '/home';
  // /dashboard/learn/<section>/<slug> and the other new-style paths under /dashboard: the same path without /dashboard
  if (sec === 'learn') return slug ? legacyTarget(k.split('/').filter(Boolean).slice(1).join('/'), problems, sections, (x) => x) : '/learn/concepts';
  if (sec === 'simulator') return slug ? `/simulator/${seg(slug)}` : '/simulator';
  if (sec === 'home' || sec === 'me') return `/${sec}`;
  if (sec === 'privacy' || sec === 'terms') return `/${sec}`;
  if (sec === 'practice') return slug ? `/practice/${seg(slug)}` : '/practice';
  if (sec === 'problems') {
    if (!slug) return '/problems';
    if (slug === 'sandbox') return '/problems/sandbox';
    if (slug === 'challenge') return more ? `/problems/challenge/${seg(more)}` : '/problems';
    if (slug === 'shared') return more ? `/problems/shared#problems/shared/${[more, ...rest].join('/')}` : '/problems';
    return problems.includes(slug) ? `/problems/${seg(slug)}` : '/problems';
  }
  if (sections.includes(sec)) {
    if (slug && slug !== 'all' && !more) return `/learn/${seg(sec)}/${seg(slug)}`;
    return `/learn/${seg(sec)}`;
  }
  return '/home';
}

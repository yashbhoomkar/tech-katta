// The shell: routes, the top bar, the theme, page transitions. Each page module exports mount(view, params, ctx)
// and returns a cleanup function. Routes (real paths since the 3D site took tech.katta.cc's root): / · /learn[/<section>] ·
// /learn/<section>/<slug> · /simulator[/<scenario>] · /home · /problems (the list). Every other address (a problem's
// canvas /problems/<slug>, /practice, /me, /quick-notes, the policies) belongs to the React app and loads as a whole page. Old #/… links from the prototype still work.
import * as landing from './pages/landing.js';
import * as learn from './pages/learn.js';
import * as article from './pages/article.js';
import * as sim from './pages/sim.js';
import * as me from './pages/me.js';
import * as problems from './pages/problems.js';
import * as workspace from './pages/workspace.js';
import * as you from './pages/you.js';
import * as notes from './pages/notes.js';
import * as policy from './pages/policy.js';
import { legacyKey, legacyTarget } from './legacy.js';
import { wireSearch } from './search.js';
import { updateShell } from './shell.js';
import { listNow, listArticles, splitTitle, SECTIONS } from './articles.js';
import { store } from './store.js';
import { INCIDENTS } from './sim.js';
import { startGate } from './gating.js';
import { hashTarget } from './legacy-hash.js';
import { pageView, hostAnalytics } from './analytics.js';

/** the browser tab and history say where you are */
function titleFor(path, nav) {
  const brand = 'Tech Katta';
  if (nav === 'home') return `${brand}: everything for your system design interview`;
  if (nav === 'me') return `Home · ${brand}`;
  if (nav === 'you') return `You · ${brand}`;
  if (nav === 'legal') return `${policy.policyTitle(path.replace(/\W/g, ''))} · ${brand}`;
  if (nav === 'notes') return `Quick Notes · ${brand}`;
  if (nav === 'problems') return workspace.titleOf(path) || `Problems · ${brand}`;
  if (nav === 'sim') { const inc = INCIDENTS.find((i) => path.endsWith(`/${i.id}`)); return `${inc ? inc.title : 'Warm-ups'} · ${inc ? 'Warm-ups · ' : ''}${brand}`; }
  const m = path.match(/^\/learn\/([\w-]+)(?:\/([\w-]+))?/);
  if (m) { const sec = SECTIONS.find((s) => s.id === m[1]); const a = m[2] && listNow().find((x) => x.slug === m[2] && x.section === m[1]); return a ? `${splitTitle(a.title)[0]} · ${sec.name} · ${brand}` : `${sec ? sec.name : 'Learn'} · ${brand}`; }
  return `Not found · ${brand}`;
}

// back and forward return you to where you were on a page (links open pages at the top)
const positions = {}; let linkClick = false, curPath = '';
addEventListener('scroll', () => { if (curPath) positions[curPath] = scrollY; }, { passive: true });
document.addEventListener('click', (e) => { if (e.target.closest('a[href^="/"], [data-next], [data-skip]')) linkClick = true; }, true);

// which addresses this app draws: every page of the site. What it does not draw are files (a path with an extension), /3d (its own files), /analytics and /health
// (the owner's pages) and /_vercel; any other address it does not know is its "Nothing runs at this address" page (the host answers those with 404.html: this shell)
const OWN = /^\/(?!(?:analytics|health|3d|_vercel)(?:\/|$))(?!.*\.[A-Za-z0-9]+$).*$/;
export const owns = (path) => OWN.test(path);
/** go to an address: inside the app without a reload, anywhere else with one */
export function go(to, { replace = false } = {}) {
  const u = new URL(to, location.href);
  if (u.origin !== location.origin || !owns(u.pathname)) { if (replace) location.replace(u.href); else location.assign(u.href); return; }
  if (replace) history.replaceState(null, '', u.pathname + u.search + u.hash); else history.pushState(null, '', u.pathname + u.search + u.hash);
  route();
}
window.tkGo = go;
// the HTML the server sent for this address (the public part, for search engines): kept for the first page, so it can still be shown if the API cannot be reached
try { const pre = document.querySelector('#root .tk-static'); window.__tkPre = pre ? { path: location.pathname.replace(/(.)\/$/, '$1'), node: pre.cloneNode(true) } : null; } catch { window.__tkPre = null; }
// draw the current page again without a history entry or a page view (the sign-in state changed under a lock)
let refreshing = false;
// the reader stays where they were: after signing in under a locked page the same page opens in full at the same scroll position
let keepY = 0;
window.tkRefresh = () => { refreshing = true; keepY = scrollY; route(); };
// the React app reloads an address once to reach this site (next/src/app/router.tsx); arriving here ends that
try { sessionStorage.removeItem('tk-3d-away'); } catch { /* storage blocked */ }
// plain left clicks on links to the app's own addresses stay in the app
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download')) return;
  const u = new URL(a.getAttribute('href'), location.href);
  if (u.origin !== location.origin || !owns(u.pathname)) return;
  if (u.pathname === location.pathname && u.hash && u.search === location.search) return; // a link within the page
  e.preventDefault(); go(u.href);
});
import { applyPaletteVars } from './palette.js';

applyPaletteVars();

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const view = document.getElementById('view');
const SEC = /^\/learn\/(concepts|components|interview-questions|real-systems)\/?$/;
const ART = /^\/learn\/(concepts|components|interview-questions|real-systems)\/([\w-]+)\/?$/;
// the retired sample lessons, and bare slugs, go to the real article
const OLD = { caching: 'caching', replicas: 'scaling-reads', queues: 'scaling-writes', 'load-balancing': 'networking-essentials', cdn: 'big-files' };
const ROUTES = [
  [/^\/?$/, landing, 'home'], [/^\/learn\/?$/, learn, 'learn'], [SEC, learn, 'learn'], [ART, article, 'learn'],
  [/^\/simulator\/([\w-]+)$/, sim, 'sim'], [/^\/home\/?$/, me, 'me'], [/^\/problems\/?$/, problems, 'problems'],
  [/^\/me\/?$/, you, 'you'], [/^\/(privacy|terms)\/?$/, policy, 'legal'], [/^\/learn\/quick-notes\/?$/, notes, 'notes'],
  [/^\/(?:problems\/(?:challenge\/[\w-]+|[\w-]+)|practice(?:\/[\w-]+)?)\/?$/, workspace, 'problems'],
];
/** one address per page: the canonical link follows the route (no trailing slash; /learn is /learn/concepts); none on the not-found page */
function setCanonical(path, missing) {
  let l = document.head.querySelector('link[rel="canonical"]');
  if (missing) { l?.remove(); return; }
  if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
  l.href = `${location.origin}${path === '/learn' ? '/learn/concepts' : path === '/' ? '/' : path}`;
}
let cleanup = null, token = 0, prevPath = '', lastLoc = '';
async function legacyRedirect(path) {
  const key = legacyKey(path, location.hash);
  let fromLab; try { fromLab = (await import('/3d/legacy/legacy.js')).fromLab; } catch { /* the bridge did not load: the key is used as it is */ }
  await listArticles().catch(() => {});
  const problems = listNow().filter((a) => a.section === 'interview-questions' && a.group !== 'start').map((a) => a.slug);
  go(legacyTarget(key, problems, [...SECTIONS.map((x) => x.id), 'quick-notes'], fromLab), { replace: true });
}

function route() {
  lastLoc = location.pathname + location.search;
  // an old prototype link (#/learn/…, #/me, #/sim/…) becomes its real address
  if (location.hash.startsWith('#/')) { const h = location.hash.slice(1).replace(/^\/me\b/, '/home').replace(/^\/sim\b/, '/simulator'); history.replaceState(null, '', h); }
  const path = location.pathname.replace(/(.)\/$/, '$1') || '/';
  // one address per page: /x/ is shown as /x (the host redirects too; this covers the ones that do not)
  if (path !== location.pathname && !/^\/dashboard(?:\/|$)/.test(path)) history.replaceState(null, '', path + location.search + location.hash);
  // Back or Forward onto an address of the React app (it handed over with a whole page load, so the browser keeps its
  // entries in this page's history): load that page for real
  if (!owns(path)) { location.reload(); return; }
  // tech.katta.cc's old addresses (/dashboard/…, and /dashboard/#<key>: the #fragment never reaches the host, so this cannot be a host rule)
  if (/^\/dashboard(?:\/|$)/.test(path)) { legacyRedirect(path); return; }
  if (/^\/simulator\/?$/.test(path)) { go('/problems#warm-ups', { replace: true }); return; } // the warm-ups are listed under Solve
  if (/^\/learn\/?$/.test(path)) { go('/learn/concepts', { replace: true }); return; } // the Learn tab opens its first section
  const old = path.match(/^\/learn\/([\w-]+)\/?$/);
  if (old && !SEC.test(path) && old[1] in OLD) { go(`/learn/concepts/${OLD[old[1]] || old[1]}`, { replace: true }); return; }
  const [re, mod, nav] = ROUTES.find(([r]) => r.test(path)) || [null, null, null];
  const my = ++token;
  const swap = () => {
    if (my !== token) return;
    try { cleanup?.(); } catch (e) { console.warn(e); }
    cleanup = null;
    document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === nav || (a.dataset.nav === 'problems' && nav === 'sim'))); // Solve covers the warm-ups
    document.body.dataset.page = nav || 'missing';
    updateShell(nav || 'missing', path);
    if (!refreshing) pageView(path);
    const keep = refreshing ? keepY : 0; refreshing = false; keepY = 0;
    view.replaceChildren();
    document.title = titleFor(path, nav || 'missing');
    setCanonical(path, !mod);
    const back = keep || (!linkClick && !window.tkFresh && positions[path] > 0 ? positions[path] : 0); linkClick = false; window.tkFresh = false; curPath = '';
    scrollTo(0, 0);
    if (!mod) { view.innerHTML = `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>Not found</span></nav><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy">at this address</span></h1><p><a class="btn dark" href="/home">Go to Home<span class="chip">→</span></a></p></section>`; }
    else cleanup = mod.mount(view, (path.match(re) || []).slice(1), { reduced, go: (h) => { window.tkFresh = true; go(h); } }) || null;
    view.classList.remove('leaving');
    view.focus({ preventScroll: true });
    curPath = path;
    // restore after the content has its height (articles load their text a moment later)
    if (back) { let n = 0; const t = setInterval(() => { scrollTo(0, back); if (Math.abs(scrollY - back) < 4 || ++n > 12) clearInterval(t); }, 120); }
  };
  const rank = { me: 0, learn: 1, problems: 2, sim: 3 }, was = document.body.dataset.page;
  const inApp = (n) => n in rank;
  if (cleanup && !reduced && !refreshing && inApp(was) && inApp(nav) && document.startViewTransition) {
    const hint = document.documentElement.dataset.dirHint; delete document.documentElement.dataset.dirHint;
    document.documentElement.dataset.dir = hint || rank[nav] < rank[was] || (nav === was && path.split('/').length < prevPath.split('/').length) ? 'back' : 'fwd';
    const vt = document.startViewTransition(swap); // a skipped transition (a quick second tap) is not an error
    for (const k of ['ready', 'finished', 'updateCallbackDone']) vt[k]?.catch?.(() => {});
    // while a slide runs, taps cannot reach the page; a new page building its 3D can stall the slide on a slow phone
    // (the bottom bar's buttons stopped answering), so a slide that has not finished in 0.6 s is skipped
    const cap = setTimeout(() => vt.skipTransition?.(), 600); vt.finished?.finally?.(() => clearTimeout(cap));
  } else if (cleanup && !reduced) { view.classList.add('leaving'); setTimeout(swap, 140); } else swap();
  prevPath = path;
}
// a change of the #fragment alone (the workspace's tabs set one, the way the canvas's code always did) is not a new page
addEventListener('popstate', () => { if (location.pathname + location.search === lastLoc && !location.hash.startsWith('#/')) return; route(); });
// the canvas's code sets a #fragment to move to another page: that entry becomes the page itself (one Back returns)
addEventListener('hashchange', () => {
  const to = hashTarget(location.hash, location.pathname.replace(/(.)\/$/, '$1'));
  if (to && owns(to)) { history.replaceState(null, '', to); route(); }
});
wireSearch(); // ⌘K, "/" and every [data-search] button
startGate(); // who is signed in, and the site's lock copy: articles wait on both
hostAnalytics(); // Vercel Web Analytics, once per page load
route();
// articles finished in the React app count here too (store.js)
listArticles().then(() => store.syncFrom(listNow())).catch(() => {});

// top bar: solid once you scroll (phones navigate with the floating bar at the bottom)
const top = document.getElementById('top');
// the top bar belongs to the top of the page: it leaves once you scroll down and comes back only at the top
addEventListener('scroll', () => {
  top.classList.toggle('solid', scrollY > 8);
  document.body.classList.toggle('bar-away', scrollY > 120);
}, { passive: true });
addEventListener('popstate', () => document.body.classList.remove('bar-away'));
document.addEventListener('tk-route', () => document.body.classList.remove('bar-away'));


// theme: System / Light / Dark, the same key as the other prototypes (boot-theme.js sets it before paint)
// every theme button (the landing's top bar and the sidebar) shows and changes the same setting
const themeBtns = () => [document.getElementById('theme'), ...document.querySelectorAll('[data-theme-btn]')].filter(Boolean);
const order = ['dark', 'light', 'system'], label = { system: 'System', light: 'Light', dark: 'Dark' };
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = { dark: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'), light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'), system: svg('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/>') };
let pref = 'dark'; // dark is the default for everyone
try { pref = localStorage.getItem('tk-theme') || localStorage.getItem('tk-r3d-theme') || 'dark'; } catch { /* storage blocked */ }
function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtns().forEach((b) => { b.innerHTML = `${ICON[pref]}<span class="lbl lbl-t">Theme: ${label[pref]}</span>`; b.setAttribute('aria-label', `Theme: ${label[pref]}. Press to change`); b.title = `Theme: ${label[pref]}. Press to change`; });
}
window.tkThemePref = () => pref;
window.tkSetTheme = (v) => { if (!order.includes(v)) return; pref = v; try { localStorage.setItem('tk-theme', pref); } catch { /* blocked */ } applyTheme(); };
const cycle = () => { pref = order[(order.indexOf(pref) + 1) % 3]; try { localStorage.setItem('tk-theme', pref); } catch { /* blocked */ } applyTheme(); };
const wire = () => themeBtns().forEach((b) => { if (!b._wired) { b._wired = true; b.addEventListener('click', cycle); } applyTheme(); });
document.addEventListener('tk-theme-buttons', wire);
wire();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();

// The shell: hash routes, the top bar, the theme, page transitions. Each page module exports mount(view, params, ctx)
// and returns a cleanup function. Routes: #/ · #/learn[/<section>] · #/learn/<section>/<slug> · #/sim/<scenario> ·
// #/me (also #/dashboard). Old sample-lesson links (#/learn/<id>) redirect to the real concept.
import * as landing from './pages/landing.js';
import * as learn from './pages/learn.js';
import * as article from './pages/article.js';
import * as sim from './pages/sim.js';
import * as me from './pages/me.js';
import * as practice from './pages/practice.js';
import { updateShell } from './shell.js';
import { listNow, splitTitle, SECTIONS } from './articles.js';
import { INCIDENTS } from './sim.js';

/** the browser tab and history say where you are */
function titleFor(path, nav) {
  const brand = 'Tech Katta';
  if (nav === 'home') return `${brand}: everything for your system design interview`;
  if (nav === 'me') return `Dashboard · ${brand}`;
  if (nav === 'sim') { const inc = INCIDENTS.find((i) => path.endsWith(`/${i.id}`)); return `${inc ? inc.title : 'Practice'} · ${inc ? 'Practice · ' : ''}${brand}`; }
  const m = path.match(/^\/learn\/([\w-]+)(?:\/([\w-]+))?/);
  if (m) { const sec = SECTIONS.find((s) => s.id === m[1]); const a = m[2] && listNow().find((x) => x.slug === m[2] && x.section === m[1]); return a ? `${splitTitle(a.title)[0]} · ${sec.name} · ${brand}` : `${sec ? sec.name : 'Learn'} · ${brand}`; }
  return `Not found · ${brand}`;
}

// back and forward return you to where you were on a page (links open pages at the top)
const positions = {}; let linkClick = false, curPath = '';
addEventListener('scroll', () => { if (curPath) positions[curPath] = scrollY; }, { passive: true });
document.addEventListener('click', (e) => { if (e.target.closest('a[href^="#/"], [data-next], [data-skip]')) linkClick = true; }, true);
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
  [/^\/sim\/([\w-]+)$/, sim, 'sim'], [/^\/sim\/?$/, practice, 'sim'], [/^\/(?:me|dashboard)\/?$/, me, 'me'],
];
let cleanup = null, token = 0, prevPath = '';

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  if (/^\/home\/?$/.test(path)) { location.replace('#/me'); return; } // one page: the Dashboard is home
  if (/^\/learn\/?$/.test(path)) { location.replace('#/learn/concepts'); return; } // the Learn tab opens its first section
  const old = path.match(/^\/learn\/([\w-]+)\/?$/);
  if (old && !SEC.test(path)) { location.replace(`#/learn/concepts/${OLD[old[1]] || old[1]}`); return; }
  const [re, mod, nav] = ROUTES.find(([r]) => r.test(path)) || [null, null, null];
  const my = ++token;
  const swap = () => {
    if (my !== token) return;
    try { cleanup?.(); } catch (e) { console.warn(e); }
    cleanup = null;
    document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === nav));
    document.body.dataset.page = nav || 'missing';
    updateShell(nav || 'missing', path);
    view.replaceChildren();
    document.title = titleFor(path, nav || 'missing');
    const back = !linkClick && !window.tkFresh && positions[path] > 0 ? positions[path] : 0; linkClick = false; window.tkFresh = false; curPath = '';
    scrollTo(0, 0);
    if (!mod) { view.innerHTML = `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="#/me">Dashboard</a><span>/</span><span>Not found</span></nav><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy">at this address</span></h1><p><a class="btn dark" href="#/me">Go to the Dashboard<span class="chip">→</span></a></p></section>`; }
    else cleanup = mod.mount(view, (path.match(re) || []).slice(1), { reduced, go: (h) => { window.tkFresh = true; location.hash = h; } }) || null;
    view.classList.remove('leaving');
    view.focus({ preventScroll: true });
    curPath = path;
    // restore after the content has its height (articles load their text a moment later)
    if (back) { let n = 0; const t = setInterval(() => { scrollTo(0, back); if (Math.abs(scrollY - back) < 4 || ++n > 12) clearInterval(t); }, 120); }
  };
  const rank = { me: 0, learn: 1, sim: 2 }, was = document.body.dataset.page;
  const inApp = (n) => n in rank;
  if (cleanup && !reduced && inApp(was) && inApp(nav) && document.startViewTransition) {
    const hint = document.documentElement.dataset.dirHint; delete document.documentElement.dataset.dirHint;
    document.documentElement.dataset.dir = hint || rank[nav] < rank[was] || (nav === was && path.split('/').length < prevPath.split('/').length) ? 'back' : 'fwd';
    const vt = document.startViewTransition(swap); // a skipped transition (a quick second tap) is not an error
    for (const k of ['ready', 'finished', 'updateCallbackDone']) vt[k]?.catch?.(() => {});
  } else if (cleanup && !reduced) { view.classList.add('leaving'); setTimeout(swap, 140); } else swap();
  prevPath = path;
}
addEventListener('hashchange', route);
route();

// top bar: solid once you scroll (phones navigate with the floating bar at the bottom)
const top = document.getElementById('top');
// the top bar belongs to the top of the page: it leaves once you scroll down and comes back only at the top
addEventListener('scroll', () => {
  top.classList.toggle('solid', scrollY > 8);
  document.body.classList.toggle('bar-away', scrollY > 120);
}, { passive: true });
addEventListener('hashchange', () => document.body.classList.remove('bar-away'));


// theme: System / Light / Dark, the same key as the other prototypes (boot-theme.js sets it before paint)
// every theme button (the landing's top bar and the sidebar) shows and changes the same setting
const themeBtns = () => [document.getElementById('theme'), ...document.querySelectorAll('[data-theme-btn]')].filter(Boolean);
const order = ['dark', 'light', 'system'], label = { system: 'System', light: 'Light', dark: 'Dark' };
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = { dark: svg('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'), light: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>'), system: svg('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/>') };
let pref = 'dark'; // dark is the default for everyone
try { pref = localStorage.getItem('tk-r3d-theme') || 'dark'; } catch { /* storage blocked */ }
function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtns().forEach((b) => { b.innerHTML = `${ICON[pref]}<span class="lbl lbl-t">Theme: ${label[pref]}</span>`; b.setAttribute('aria-label', `Theme: ${label[pref]}. Press to change`); b.title = `Theme: ${label[pref]}. Press to change`; });
}
const cycle = () => { pref = order[(order.indexOf(pref) + 1) % 3]; try { localStorage.setItem('tk-r3d-theme', pref); } catch { /* blocked */ } applyTheme(); };
const wire = () => themeBtns().forEach((b) => { if (!b._wired) { b._wired = true; b.addEventListener('click', cycle); } applyTheme(); });
document.addEventListener('tk-theme-buttons', wire);
wire();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();

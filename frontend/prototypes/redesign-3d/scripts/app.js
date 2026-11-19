// The shell: hash routes, the top bar, the theme, page transitions. Each page module exports mount(view, params, ctx)
// and returns a cleanup function. Routes: #/ · #/learn[/<section>] · #/learn/<section>/<slug> · #/sim/<scenario> ·
// #/me (also #/dashboard). Old sample-lesson links (#/learn/<id>) redirect to the real concept.
import * as landing from './pages/landing.js';
import * as learn from './pages/learn.js';
import * as article from './pages/article.js';
import * as sim from './pages/sim.js';
import * as me from './pages/me.js';
import * as home from './pages/home.js';
import { updateShell } from './shell.js';
import { applyPaletteVars } from './palette.js';

applyPaletteVars();

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const view = document.getElementById('view');
const SEC = /^\/learn\/(concepts|components|interview-questions|real-systems)\/?$/;
const ART = /^\/learn\/(concepts|components|interview-questions|real-systems)\/([\w-]+)\/?$/;
// the retired sample lessons, and bare slugs, go to the real article
const OLD = { caching: 'caching', replicas: 'scaling-reads', queues: 'scaling-writes', 'load-balancing': 'networking-essentials', cdn: 'big-files' };
const ROUTES = [
  [/^\/?$/, landing, 'home'], [/^\/home\/?$/, home, 'start'], [/^\/learn\/?$/, learn, 'learn'], [SEC, learn, 'learn'], [ART, article, 'learn'],
  [/^\/sim\/([\w-]+)$/, sim, 'sim'], [/^\/sim\/?$/, sim, 'sim'], [/^\/(?:me|dashboard)\/?$/, me, 'me'],
];
let cleanup = null, token = 0, prevPath = '';

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
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
    updateShell(nav, path);
    view.replaceChildren();
    scrollTo(0, 0);
    if (!mod) { view.innerHTML = `<section class="page narrow missing"><p class="kicker"><span>404</span><i></i>NOT FOUND</p><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy accent">at this address.</span></h1><p><a class="btn dark" href="#/">Go home<span class="chip">→</span></a></p></section>`; }
    else cleanup = mod.mount(view, (path.match(re) || []).slice(1), { reduced, go: (h) => { location.hash = h; } }) || null;
    view.classList.remove('leaving');
    view.focus({ preventScroll: true });
  };
  const rank = { start: 0, me: 1, learn: 2, sim: 3 }, was = document.body.dataset.page;
  const inApp = (n) => n in rank;
  if (cleanup && !reduced && inApp(was) && inApp(nav) && document.startViewTransition) {
    const hint = document.documentElement.dataset.dirHint; delete document.documentElement.dataset.dirHint;
    document.documentElement.dataset.dir = hint || rank[nav] < rank[was] || (nav === was && path.split('/').length < prevPath.split('/').length) ? 'back' : 'fwd';
    document.startViewTransition(swap);
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
let pref = 'dark'; // dark is the default for everyone
try { pref = localStorage.getItem('tk-r3d-theme') || 'dark'; } catch { /* storage blocked */ }
function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtns().forEach((b) => { b.textContent = label[pref]; b.setAttribute('aria-label', `Theme: ${label[pref]}`); });
}
const cycle = () => { pref = order[(order.indexOf(pref) + 1) % 3]; try { localStorage.setItem('tk-r3d-theme', pref); } catch { /* blocked */ } applyTheme(); };
const wire = () => themeBtns().forEach((b) => { if (!b._wired) { b._wired = true; b.addEventListener('click', cycle); } applyTheme(); });
document.addEventListener('tk-theme-buttons', wire);
wire();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();

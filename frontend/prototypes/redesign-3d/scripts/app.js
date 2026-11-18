// The shell: hash routes, the top bar, the theme, page transitions. Each page module exports mount(view, params, ctx)
// and returns a cleanup function. Routes: #/ · #/learn · #/learn/<lesson> · #/sim/<scenario> · #/me
import * as landing from './pages/landing.js';
import * as learn from './pages/learn.js';
import * as lesson from './pages/lesson.js';
import * as sim from './pages/sim.js';
import * as me from './pages/me.js';
import { applyPaletteVars } from './palette.js';

applyPaletteVars();

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const view = document.getElementById('view');
const ROUTES = [
  [/^\/?$/, landing, 'home'], [/^\/learn\/?$/, learn, 'learn'], [/^\/learn\/([\w-]+)$/, lesson, 'learn'],
[/^\/sim\/([\w-]+)$/, sim, 'sim'], [/^\/sim\/?$/, sim, 'sim'], [/^\/me\/?$/, me, 'me'],
];
let cleanup = null, token = 0;

function route() {
  const path = location.hash.replace(/^#/, '') || '/';
  const [re, mod, nav] = ROUTES.find(([r]) => r.test(path)) || [null, null, null];
  const my = ++token;
  const swap = () => {
    if (my !== token) return;
    try { cleanup?.(); } catch (e) { console.warn(e); }
    cleanup = null;
    document.querySelectorAll('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === nav));
    document.body.dataset.page = nav || 'missing';
    view.replaceChildren();
    scrollTo(0, 0);
    if (!mod) { view.innerHTML = `<section class="page narrow missing"><p class="kicker"><span>404</span><i></i>NOT FOUND</p><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy accent">at this address.</span></h1><p><a class="btn dark" href="#/">Go home<span class="chip">→</span></a></p></section>`; }
    else cleanup = mod.mount(view, (path.match(re) || []).slice(1), { reduced, go: (h) => { location.hash = h; } }) || null;
    view.classList.remove('leaving');
    view.focus({ preventScroll: true });
  };
  if (cleanup && !reduced) { view.classList.add('leaving'); setTimeout(swap, 140); } else swap();
}
addEventListener('hashchange', route);
route();

// top bar: solid once you scroll; phone menu
const top = document.getElementById('top');
addEventListener('scroll', () => top.classList.toggle('solid', scrollY > 8), { passive: true });
const menu = document.getElementById('menu');
menu.addEventListener('click', () => document.body.classList.toggle('menu-open'));
addEventListener('hashchange', () => document.body.classList.remove('menu-open'));

// theme: System / Light / Dark, the same key as the other prototypes (boot-theme.js sets it before paint)
const themeBtn = document.getElementById('theme');
const order = ['system', 'light', 'dark'], label = { system: 'System', light: 'Light', dark: 'Dark' };
let pref = 'system';
try { pref = localStorage.getItem('tk-proto-theme') || 'system'; } catch { /* storage blocked */ }
function applyTheme() {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeBtn.textContent = label[pref]; themeBtn.setAttribute('aria-label', `Theme: ${label[pref]}`);
}
themeBtn.addEventListener('click', () => { pref = order[(order.indexOf(pref) + 1) % 3]; try { localStorage.setItem('tk-proto-theme', pref); } catch { /* blocked */ } applyTheme(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();

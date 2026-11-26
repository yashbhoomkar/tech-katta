// The app's frame for everything past the landing: a left sidebar on wide screens (after tech.katta.cc's own: the Dashboard,
// then Learn by section with how much is read, the open section's articles under it, then Practice; the active row's
// fill slides between rows; "[" folds it to a rail of icons) and the glass bottom bar on phones. The landing keeps
// its own top bar; this frame is for working in the app.
import { listNow, listArticles, splitTitle, SECTIONS } from './articles.js';
import { INCIDENTS } from './sim.js';
import { store } from './store.js';
import { accountState, onAccount, signOut } from './account.js';
import { openSignIn } from './signin.js';
import { lab, challengeTally } from './solve.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/** each place in the app has one colour, shared by its sidebar row, its home card and its icon */
export const PLACES = [
  { id: 'me', href: '/home', name: 'Home', colour: 'sky', icon: 'grid', blurb: 'Where you are, what is next, and everything here' },
  { id: 'concepts', href: '/learn/concepts', name: 'Concepts', colour: 'lilac', section: true, blurb: 'The ideas every design is built from' },
  { id: 'components', href: '/learn/components', name: 'Components', colour: 'peach', section: true, blurb: 'The tools interviewers name, and when to pick them' },
  { id: 'interview-questions', href: '/learn/interview-questions', name: 'Interview guides', colour: 'mint', section: true, blurb: 'How to answer, and the written answer to every problem' },
  { id: 'real-systems', href: '/learn/real-systems', name: 'Real systems', colour: 'rose', section: true, blurb: 'How apps you use are built, part by part' },
  { id: 'practice', href: '/problems#warm-ups', name: 'Warm-ups', colour: 'lemon', icon: 'play', blurb: 'Pick the parts and watch them survive an evening' },
  // Solve: the canvas problems, the challenges and the warm-ups are one list (/problems; the challenge and warm-up rows are its filters, kept in the #fragment)
  { id: 'problems', href: '/problems', name: 'Problems', colour: 'sky', icon: 'canvas', blurb: 'Draw the design on the canvas; the judge runs every test' },
  { id: 'quick-notes', href: '/learn/quick-notes', name: 'Quick Notes', colour: 'mist', icon: 'note', blurb: 'Short notes on one system each' },
  { id: 'you', href: '/me', name: 'You', colour: 'mist', icon: 'you', blurb: 'Sign in, your account and settings' },
  { id: 'challenges', href: '/problems#challenges', name: 'Challenges', colour: 'lemon', icon: 'star', blurb: 'Stars for staying up, not crashing, keeping to budget' },
  { id: 'sandbox', href: '/problems/sandbox', name: 'Sandbox', colour: 'mist', icon: 'canvas', blurb: 'A free canvas: any parts, any traffic' },
];
const ICONS = {
  home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="4" y="4" width="7" height="8" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="14" width="7" height="6" rx="2"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  canvas: '<rect x="3.5" y="4.5" width="6" height="5" rx="1.5"/><rect x="14.5" y="14.5" width="6" height="5" rx="1.5"/><path d="M9.5 7h3a2 2 0 0 1 2 2v5.5"/>',
  note: '<path d="M6 3.5h9l3.5 3.5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
  you: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  star: '<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
  rail: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9.5 4.5v15"/>',
};
export const icon = (p) => (p.icon ? `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon]}</svg>` : `<i class="sq" style="--c:var(--${p.colour})" aria-hidden="true"></i>`);
/** read and total for a place */
export function tally(id, list = listNow()) {
  const read = store.get().read;
  if (id === 'problems') { // the canvas's own record (pages/problems.js reads the same)
    let steps = {}; try { steps = JSON.parse(localStorage.getItem('tk-progress-v1') || '{}')?.steps || {}; } catch { /* blocked */ }
    const probs = list.filter((a) => a.section === 'interview-questions' && a.group !== 'start');
    return { done: probs.filter((a) => steps[`solved:${a.slug}`] === true).length, total: probs.length };
  }
  if (id === 'challenges') return challengeTally();
  if (id === 'practice') { const best = store.get().best; return { done: INCIDENTS.filter((i) => best[i.id]?.passed).length, total: INCIDENTS.length }; }
  const mine = list.filter((a) => a.section === id);
  return { done: mine.filter((a) => read[`${a.section}/${a.slug}`]).length, total: mine.length };
}

const RAIL_KEY = 'tk-r3d-side';
let side = null, railSaved = false, here = { nav: '', path: '' }, openHere = false;
try { railSaved = localStorage.getItem(RAIL_KEY) === 'rail'; } catch { /* storage blocked */ }

/** The account slot above You is always drawn, so nothing moves when the sign-in check answers: "Sign in" while signed out or not yet known (also when sign-in
 *  is unavailable: its card then says so), "Sign out" once signed in (the You row carries the name). */
function accountRow() {
  const a = accountState();
  const inn = !!a.user;
  return `<button type="button" class="side-row" ${inn ? 'data-signout title="Sign out"' : 'data-signin title="Sign in"'}><svg viewBox="0 0 24 24" aria-hidden="true">${inn ? '<path d="M10 4H5.5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1H10"/><path d="M20 12H10M16.5 8.5 20 12l-3.5 3.5"/>' : '<path d="M14 4h4.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H14"/><path d="M4 12h10M10.5 8.5 14 12l-3.5 3.5"/>'}</svg><span class="lbl">${inn ? 'Sign out' : 'Sign in'}</span></button>`;
}

function draw() {
  const list = listNow(), { nav, path } = here;
  const sec = (path.match(/^\/learn\/([\w-]+)/) || [])[1] || (nav === 'learn' ? 'concepts' : '');
  const slug = (path.match(/^\/learn\/[\w-]+\/([\w-]+)/) || [])[1];
  const hash = location.hash, onList = nav === 'problems' && path === '/problems';
  const active = nav === 'learn' ? sec : nav === 'sim' ? 'practice' : onList ? (hash === '#challenges' ? 'challenges' : hash === '#warm-ups' ? 'practice' : 'problems') : nav === 'problems' ? (/^\/problems\/challenge\//.test(path) ? 'challenges' : path === '/problems/sandbox' ? 'sandbox' : 'problems') : nav;
  const row = (p, label = p.name) => { const t = p.section || ['practice', 'problems', 'challenges'].includes(p.id) ? tally(p.id, list) : null;
    return `<a class="side-row${p.id === active ? ' on' : ''}" href="${p.href}" title="${esc(label)}" ${p.id === active ? 'aria-current="page"' : ''}>${icon(p)}<span class="lbl">${esc(label)}</span>${t ? `<small class="lbl">${t.done}/${t.total}</small>` : ''}</a>`; };
  const sub = (id) => { if (id !== sec || !slug) return ''; const read = store.get().read;
    // a long section (29 questions) would push Practice off screen, so the list is a window round where you are, plus "All"
    const all = list.filter((a) => a.section === id), at = all.findIndex((a) => a.slug === slug), WIN = 9;
    const from = all.length > WIN + 3 ? Math.max(0, Math.min(at - 4, all.length - WIN)) : 0, shown = all.length > WIN + 3 ? all.slice(from, from + WIN) : all;
    const more = shown.length < all.length ? `<a href="/learn/${id}" class="all">All ${all.length}<i aria-hidden="true"></i></a>` : '';
    return `<div class="side-sub lbl">${shown.map((a) => `<a href="/learn/${a.section}/${a.slug}" class="${a.slug === slug ? 'on' : ''}${read[`${a.section}/${a.slug}`] ? ' done' : ''}"><i aria-hidden="true"></i>${esc(splitTitle(a.title)[0])}</a>`).join('')}${more}</div>`; };
  side.innerHTML = `
    <div class="side-top"><a class="logo" href="/" aria-label="tech katta, the landing page"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span><span class="lbl">tech katta</span></a>
      <button type="button" class="side-btn icon-btn" data-rail aria-label="Fold the sidebar" title="Fold the sidebar  [">${`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS.rail}</svg>`}</button></div>
    <nav class="side-nav" aria-label="App"><i class="side-mark" aria-hidden="true"></i>
      <button type="button" class="side-row" data-search title="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span class="lbl">Search</span><small class="lbl">⌘K</small></button>
      ${row(PLACES[0])}
      <p class="side-head lbl">Learn</p>
      ${PLACES.filter((p) => p.section).map((p) => row(p) + sub(p.id)).join('')}
      ${row(PLACES.find((p) => p.id === 'quick-notes'))}
      <p class="side-head lbl">Solve</p>
      ${['problems', 'challenges', 'practice', 'sandbox'].map((id) => row(PLACES.find((p) => p.id === id))).join('')}
      <p class="side-head lbl">Account</p>
      ${accountRow()}
      ${row(PLACES.find((p) => p.id === 'you'), accountState().user?.name || accountState().user?.email)}
    </nav>
    <div class="side-foot"><button class="theme" type="button" data-theme-btn></button></div>`;
  side.querySelector('[data-rail]').addEventListener('click', toggleRail);
  side.querySelector('[data-signin]')?.addEventListener('click', () => openSignIn());
  side.querySelector('[data-signout]')?.addEventListener('click', () => signOut());
  document.dispatchEvent(new CustomEvent('tk-theme-buttons'));
  requestAnimationFrame(placeMark);
}
/** the active row's fill: one shape that slides to the row you are on */
function placeMark() {
  const nav = side?.querySelector('.side-nav'), mark = nav?.querySelector('.side-mark'), on = nav?.querySelector('.side-row.on');
  if (!mark) return;
  if (!on) { mark.style.opacity = '0'; return; }
  mark.style.opacity = '1';
  mark.style.transform = `translateY(${on.offsetTop}px)`; mark.style.height = `${on.offsetHeight}px`;
  if (side.dataset.prev !== on.getAttribute('href')) { side.dataset.prev = on.getAttribute('href'); on.scrollIntoView({ block: 'nearest' }); }
}
// the simulator folds the sidebar to a rail for width (without touching your saved choice); touch screens never fold it,
// because a rail shows names only as tooltips
/** the workspace pages (the canvas island): a problem, challenge, sandbox, shared design or practice */
export const WS = /^\/(?:problems\/[\w-]+(?:\/[\w-]+)?|practice(?:\/[\w-]+)?)\/?$/;
// (a workspace address that shows the lock card, or is still waiting for the account, is an ordinary page: the sidebar stays open; pages/workspace.js sets body.ws-locked)
const focusPage = () => (here.nav === 'sim' && /^\/simulator\/[\w-]+/.test(here.path)) || (WS.test(here.path) && !document.body.classList.contains('ws-locked'));
const touchOnly = () => matchMedia('(hover: none)').matches;
function applyRail() { const rail = !touchOnly() && (focusPage() ? !openHere : railSaved); document.documentElement.toggleAttribute('data-rail', rail); setTimeout(placeMark, 260); }
/** fold or open the sidebar again after the page changed what kind of page it is */
export function syncRail() { applyRail(); }
function toggleRail() { if (touchOnly()) return; document.documentElement.classList.add('rail-anim'); setTimeout(() => document.documentElement.classList.remove('rail-anim'), 400); if (focusPage()) openHere = !openHere; else { railSaved = !railSaved; try { localStorage.setItem(RAIL_KEY, railSaved ? 'rail' : 'full'); } catch { /* blocked */ } } applyRail(); }

/** called by the router on every page: shows the frame on app pages, marks where you are */
export function updateShell(nav, path) {
  if (path !== here.path) openHere = false;
  here = { nav, path };
  const app = nav && nav !== 'home';
  document.body.classList.toggle('in-app', !!app);
  document.body.classList.toggle('focus-page', /^\/simulator\/[\w-]+/.test(path)); // the full-screen simulator
  document.body.classList.toggle('ws-page', WS.test(path)); // the workspace pages: no page scroll, the island fills the area
  if (!side) {
    side = document.createElement('aside'); side.className = 'side'; side.setAttribute('aria-label', 'Sidebar');
    document.body.prepend(side);
    addEventListener('keydown', (e) => { const el = document.activeElement; if (e.key === '[' && !e.metaKey && !e.ctrlKey && !/^(input|textarea|select)$/i.test(el?.tagName || '')) toggleRail(); });
    addEventListener('resize', placeMark);
    addEventListener('tk-progress', () => side && document.body.classList.contains('in-app') && draw());
    // Problems · Challenges · Warm-ups are one list; its filter is in the #fragment, and the sidebar's row follows it
    const again = () => side && document.body.classList.contains('in-app') && draw();
    addEventListener('hashchange', again); addEventListener('tk-filter', again);
    lab().then((l) => l && again()); // the challenges' count for the sidebar
    listArticles().then(() => side && draw());
    onAccount(() => side && document.body.classList.contains('in-app') && draw());
    // the phone bar's You: the account's initial once signed in
    const you = document.querySelector('.tabbar [data-you]');
    if (you) { const mark = () => { const u = accountState().user, t = (u?.name || u?.email || '').trim().charAt(0).toUpperCase(); you.classList.toggle('has-i', !!t); you.querySelector('i').dataset.i = t; }; mark(); onAccount(mark); }
    // the top bar's "Sign in" (phones, and the landing on wide screens): always there while signed out
    const topIn = document.querySelector('.top-signin');
    if (topIn) { topIn.addEventListener('click', () => openSignIn()); const sync = () => { topIn.hidden = !!accountState().user; }; sync(); onAccount(sync); }
  }
  if (app) { draw(); applyRail(); }
}

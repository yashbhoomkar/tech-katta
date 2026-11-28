// You (/me): the account, how Tech Katta looks, what is kept on this device, shortcuts. Always open.
import { listArticles, listNow, SECTIONS } from '../articles.js';
import { accountState, onAccount, signOut, signOutAll, startAccount } from '../account.js';
import { signInCard, wireSignInCard } from '../signin.js';
import { store } from '../store.js';
import { INCIDENTS } from '../sim.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']];
const KEYS = [['⌘ K or Ctrl K', 'Search'], ['[', 'Fold the sidebar'], ['Esc', 'Close a sheet or a dialog'], ['← →', 'Step through a replay or a watched request'], ['Space', 'Play or pause a replay']];
/** the keys this page clears (reading progress, solved marks, scores and submissions); designs and answers stay */
const CLEAR = ['tk-r3d-progress', 'tk-progress-v1', 'tk-subs-v1', 'tk-hints-v1'];

export function mount(view) {
  startAccount(); let alive = true, offWire = null; const offs = [];
  const draw = () => {
    if (!alive) return;
    offWire?.(); offWire = null;
    const a = accountState(), u = a.user, list = listNow(), rd = store.get().read, steps = read('tk-progress-v1').steps || {};
    const sec = SECTIONS.map((s) => { const mine = list.filter((x) => x.section === s.id); return [s.name, mine.filter((x) => rd[`${x.section}/${x.slug}`]).length, mine.length]; });
    const probs = list.filter((x) => x.section === 'interview-questions' && x.group !== 'start'), solved = probs.filter((x) => steps[`solved:${x.slug}`] === true).length;
    const best = store.get().best, sims = INCIDENTS.filter((i) => best[i.id]?.passed).length, pref = window.tkThemePref?.() || 'dark';
    view.innerHTML = `<section class="page narrow you">
      <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>You</span></nav>
      <h1 class="headline"><span class="thin">You</span><span class="heavy accent">Account and look</span></h1><p class="lead">Your account and how Tech Katta looks for you.</p>
      ${u ? `      <div class="you-card glass" data-private><i class="avatar" aria-hidden="true">${u?.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer"/>` : esc((u?.name || '?')[0])}</i>
        <div><b>${u ? esc(u.name || 'Signed in') : 'Not signed in'}</b><small class="muted">${u ? `${esc(u.email || '')} · signed in with Google` : a.ready && a.enabled ? 'Your progress is kept in this browser.' : 'Sign-in is not available right now. Your progress is kept in this browser.'}</small></div>
        <div class="you-acts">${u ? '<button type="button" class="btn light sm" data-out>Sign out</button><button type="button" class="btn light sm" data-outall>Sign out everywhere</button>' : a.ready && a.enabled ? '<button type="button" class="btn dark sm" data-in>Sign in<span class="chip">→</span></button>' : ''}</div></div>` : signInCard('dashboard')}
      <div class="you-card glass block"><h2>Appearance</h2><p class="muted">System follows your device and switches by itself at night if your device does.</p>
        <div class="seg you-themes" role="radiogroup" aria-label="Theme" style="--n:3">${THEMES.map(([v, n], i) => `<button type="button" role="radio" aria-checked="${v === pref}" data-theme-pref="${v}" data-i="${i}">${n}</button>`).join('')}<i class="seg-pill" aria-hidden="true"></i></div></div>
      ${u ? `      <div class="you-card glass block"><h2>Your progress</h2><p class="muted">On this device${u ? ', and in your account' : ''}.</p>
        <ul class="you-stats">${sec.map(([n, d, t]) => `<li><b>${d} of ${t}</b><span>${esc(n)} read</span></li>`).join('')}<li><b>${solved} of ${probs.length}</b><span>Problems solved</span></li><li><b>${sims} of ${INCIDENTS.length}</b><span>Simulator scenarios passed</span></li></ul>
        <button type="button" class="btn light sm" data-clear>Clear progress on this device</button></div>` : ''}
      <div class="you-card glass block you-keys"><h2>Keyboard shortcuts</h2><dl>${KEYS.map(([k, d]) => `<div><dt class="mono">${esc(k)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></div>
      <p class="muted"><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p></section>${footer()}`;
    if (!u) offWire = wireSignInCard(view);
    view.querySelector('[data-out]')?.addEventListener('click', () => signOut());
    view.querySelector('[data-outall]')?.addEventListener('click', () => { if (confirm('Sign out on every device signed in to this account?')) signOutAll(); });
    view.querySelectorAll('[data-theme-pref]').forEach((b) => b.addEventListener('click', () => { window.tkSetTheme?.(b.dataset.themePref); draw(); }));
    view.querySelector('[data-clear]')?.addEventListener('click', () => {
      if (!confirm('Clear your reading progress, solved marks, scores and submissions on this device? Your designs and answers stay.')) return;
      store.reset(); for (const k of CLEAR) { try { localStorage.removeItem(k); } catch { /* blocked */ } } dispatchEvent(new Event('tk-progress')); draw();
    });
  };
  document.title = 'You · Tech Katta';
  listArticles().catch(() => {}).then(draw); draw(); offs.push(onAccount(draw));
  return () => { alive = false; offs.forEach((f) => f()); offWire?.(); };
}

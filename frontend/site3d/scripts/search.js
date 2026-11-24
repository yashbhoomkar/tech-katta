// Search (⌘K or Ctrl K, the search button in the top bar and the sidebar, and the phone bar's fifth item): a glass dialog over everything the site has:
// lessons by title and summary, the problems, Quick Notes, and the places (Dashboard, Problems, Simulator, You). Arrow keys and Enter; Esc closes.
import { listArticles, listNow, splitTitle, SECTIONS } from './articles.js';
import { INCIDENTS } from './sim.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const PLACES = [['Dashboard', '/home', 'Where you are, what is next'], ['Problems', '/problems', 'Draw the design, get judged'], ['Simulator', '/simulator', 'Watch parts survive an evening'], ['Sandbox', '/problems/sandbox', 'A free canvas'], ['You', '/me', 'Account, theme, progress'], ['Quick Notes', '/learn/quick-notes', 'Short notes on one system each'], ['Privacy', '/privacy', ''], ['Terms', '/terms', '']];

/** every searchable thing: { title, sub, kind, href } */
export function index(list = listNow()) {
  const sec = (id) => SECTIONS.find((s) => s.id === id)?.name || id;
  return [
    ...PLACES.map(([title, href, sub]) => ({ title, sub, kind: 'Place', href })),
    ...list.map((a) => ({ title: splitTitle(a.title)[0], sub: a.dek || '', kind: a.section === 'interview-questions' && a.group !== 'start' ? 'Problem' : sec(a.section).replace(/s$/, ''), href: `/learn/${a.section}/${a.slug}`, alt: a.title })),
    ...list.filter((a) => a.section === 'interview-questions' && a.group !== 'start').map((a) => ({ title: splitTitle(a.title)[0], sub: 'Open the canvas', kind: 'Canvas', href: `/problems/${a.slug}`, alt: a.title })),
    ...INCIDENTS.map((i) => ({ title: i.title, sub: 'Simulator scenario', kind: 'Simulator', href: `/simulator/${i.id}` })),
  ];
}
/** the best matches for a query: all words must appear; a title match outranks a summary match */
export function find(items, q, n = 8) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items.slice(0, n);
  return items.map((it) => {
    const t = `${it.title} ${it.alt || ''}`.toLowerCase(), s = (it.sub || '').toLowerCase();
    if (!words.every((w) => t.includes(w) || s.includes(w))) return null;
    return [words.every((w) => t.includes(w)) ? (t.startsWith(words[0]) ? 0 : 1) : 2, it];
  }).filter(Boolean).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
}

let openNow = null;
export function openSearch() {
  if (openNow) return;
  const back = document.createElement('div'); back.className = 'search-back';
  back.innerHTML = `<div class="search glass" role="dialog" aria-modal="true" aria-label="Search"><input type="search" placeholder="Search lessons, problems, places" aria-label="Search" autocomplete="off" spellcheck="false"/><ul role="listbox"></ul></div>`;
  document.body.appendChild(back); document.body.classList.add('modal-open');
  const input = back.querySelector('input'), ul = back.querySelector('ul'), prev = document.activeElement;
  let at = 0, shown = [], items = index();
  listArticles().then(() => { items = index(); draw(); }).catch(() => {});
  const close = () => { back.remove(); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', key, true); openNow = null; try { prev?.focus?.({ preventScroll: true }); } catch { /* gone */ } };
  const go = (it) => { close(); window.tkGo?.(it.href); };
  function draw() {
    shown = find(items, input.value); at = Math.min(at, Math.max(0, shown.length - 1));
    ul.innerHTML = shown.length ? shown.map((it, i) => `<li role="option" aria-selected="${i === at}" data-i="${i}"><b>${esc(it.title)}</b><small class="muted">${esc(it.sub)}</small><span class="mono">${esc(it.kind)}</span></li>`).join('') : '<li class="none">Nothing matches. Try a part, a system or a word from a problem.</li>';
    ul.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  function key(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(shown.length - 1, at + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(0, at - 1); draw(); }
    else if (e.key === 'Enter' && shown[at]) { e.preventDefault(); go(shown[at]); }
  }
  document.addEventListener('keydown', key, true);
  input.addEventListener('input', () => { at = 0; draw(); });
  ul.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) go(shown[+li.dataset.i]); });
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  draw(); input.focus();
  openNow = { close };
}
/** ⌘K or Ctrl K anywhere; "/" when no field has focus */
export function wireSearch() {
  addEventListener('keydown', (e) => {
    const field = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
    else if (e.key === '/' && !field && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openSearch(); }
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-search]')) { e.preventDefault(); openSearch(); } });
}

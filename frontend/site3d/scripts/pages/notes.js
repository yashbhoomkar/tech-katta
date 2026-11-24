// Quick Notes, the fifth Learn section: the notes being written (GET /v1/site → notes, with their status) and "Numbers worth
// knowing" (the canvas code's chart and estimation shortcuts, a React island). A note that is published links to its article
// (/learn/quick-notes/<slug>, from the article list); the others show their status.
import { API, listArticles, listNow } from '../articles.js';
import { footer } from './landing.js';
import { normalCase } from '../case.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let site = null;
const getSite = () => (site ||= fetch(`${API}/v1/site`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function mount(view) {
  let alive = true, unmount = null;
  // the loading page has the finished page's header (crumbs, label, title, intro), so nothing moves when the list arrives
  view.innerHTML = `<section class="page learn reader-wait" style="--acc: var(--lemon)" aria-busy="true"><header class="sec-head"><div><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/concepts">Learn</a><span>/</span><span>Quick Notes</span></nav><p class="kicker"><span>Quick Notes</span></p><h1 class="headline"><span class="thin">Quick Notes</span></h1><p class="lead wait-lead">&nbsp;</p></div></header><div class="skel" role="status" aria-label="Loading"><i></i><i></i><i></i></div></section>`;
  Promise.all([getSite(), listArticles().catch(() => [])]).then(async ([s]) => {
    if (!alive) return;
    const n = s?.notes;
    if (!n) { view.innerHTML = `<section class="page narrow missing"><h1 class="headline"><span class="thin">Quick Notes</span><span class="heavy">could not load</span></h1></section>${footer()}`; return; }
    const published = listNow().filter((a) => a.section === 'quick-notes');
    view.innerHTML = `<section class="page learn" style="--acc: var(--lemon)">
      <header class="sec-head"><div>
        <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/learn/concepts">Learn</a><span>/</span><span>Quick Notes</span></nav>
        <p class="kicker"><span>${esc(normalCase(n.eyebrow || 'Quick Notes'))}</span></p>
        <h1 class="headline"><span class="thin">${esc(n.title || 'Quick Notes')}</span></h1><p class="lead">${esc(n.desc || '')}</p></div></header>
      <ol class="lessons">${n.items.map(([no, title, topic, status]) => { const a = published.find((x) => slugOf(x.title) === slugOf(title) || x.title === title);
        return a ? `<li><a class="lesson" href="/learn/quick-notes/${esc(a.slug)}"><span class="st"></span><span class="l-n mono">${esc(no)}</span><span class="l-main"><b>${esc(title)}</b><span class="muted">${esc(topic)}</span></span><span class="l-tag mono">READ</span></a></li>`
          : `<li><a class="lesson" aria-disabled="true"><span class="st"></span><span class="l-n mono">${esc(no)}</span><span class="l-main"><b>${esc(title)}</b><span class="muted">${esc(topic)}</span></span><span class="l-tag mono">${esc(normalCase(status))}</span></a></li>`; }).join('')}</ol>
      <div class="numbers-card glass"><div class="numbers-host"></div></div></section>${footer()}`;
    try {
      const island = await import('/3d/islands/islands.js');
      if (alive) unmount = island.mountNumbers(view.querySelector('.numbers-host'));
    } catch (e) { console.warn('numbers failed to load', e); view.querySelector('.numbers-card')?.remove(); }
  });
  return () => { alive = false; try { unmount?.(); } catch { /* gone */ } };
}

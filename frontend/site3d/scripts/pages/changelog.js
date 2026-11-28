// What changed, in plain words: dated lines from the site copy (GET /v1/site → changelog, content/site.json).
import { API } from '../articles.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function mount(view) {
  let alive = true;
  view.innerHTML = `<article class="page narrow policy reader-wait" aria-busy="true"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>What's new</span></nav><h1 class="headline"><span class="thin">What's new</span></h1><div class="skel" role="status" aria-label="Loading"><i></i><i></i><i></i></div></article>`;
  fetch(`${API}/v1/site`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((s) => {
    if (!alive) return;
    const log = s?.changelog;
    if (!Array.isArray(log)) { view.innerHTML = `<section class="page narrow missing"><h1 class="headline"><span class="thin">This page could not load</span><span class="heavy">Check your connection and try again</span></h1></section>${footer()}`; return; }
    view.innerHTML = `<article class="page narrow policy changelog"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>What's new</span></nav>
      <h1 class="headline"><span class="thin">What's new</span><span class="heavy accent">on Tech Katta</span></h1><p class="lead">Every change that a learner can notice, newest first.</p>
      <ol class="log">${log.map((d) => `<li><h2 class="mono">${esc(d.date)}</h2><ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></li>`).join('')}</ol></article>${footer()}`;
  });
  return () => { alive = false; };
}

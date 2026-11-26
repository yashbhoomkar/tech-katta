// Privacy and Terms: reading pages from the site copy (GET /v1/site → privacy, terms). Always open, no story.
import { API } from '../articles.js';
import { footer } from './landing.js';
import { normalCase } from '../case.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let site = null;
const getSite = () => (site ||= fetch(`${API}/v1/site`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null));

export const policyTitle = (which) => (which === 'terms' ? 'Terms and conditions' : 'Privacy');
export function mount(view, [which]) {
  let alive = true;
  // the loading page has the finished page's layout (crumbs, label, title, date line), so nothing moves when the text arrives
  view.innerHTML = `<article class="page narrow policy reader-wait" aria-busy="true"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>${esc(policyTitle(which))}</span></nav><p class="kicker"><span>&nbsp;</span></p><h1 class="headline"><span class="thin">${esc(policyTitle(which))}</span></h1><p class="muted">&nbsp;</p><div class="skel" role="status" aria-label="Loading"><i></i><i></i><i></i></div></article>`;
  getSite().then((s) => {
    if (!alive) return;
    const p = s?.[which];
    if (!p) { view.innerHTML = `<section class="page narrow missing"><h1 class="headline"><span class="thin">This page could not load</span><span class="heavy">Check your connection and try again</span></h1></section>${footer()}`; return; }
    document.title = `${p.title} · Tech Katta`;
    view.innerHTML = `<article class="page narrow policy"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>${esc(policyTitle(which))}</span></nav>
      <p class="kicker"><span>${esc(normalCase(p.eyebrow))}</span></p><h1 class="headline"><span class="thin">${esc(p.title)}</span></h1><p class="muted">${esc(p.updated)}</p>
      <div class="prose">${p.sections.map(([h, text]) => `<h2>${esc(h)}</h2>${String(text).split(/\n\n+/).map((para) => `<p>${esc(para)}</p>`).join('')}`).join('')}</div></article>${footer()}`;
  });
  return () => { alive = false; };
}

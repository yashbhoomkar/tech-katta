// Decision guides (/guides and /guides/<slug>): when to pick which, a small table, a worked Zotato example, and links to the articles and a problem.
// The text comes from the API (content/guides.json); the same text is in the page's HTML for search engines (hosting/learn-html.mjs).
import { API } from '../articles.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slugOf = (path) => (path.match(/^\/guides\/([\w-]+)\/?$/) || [])[1] || '';
let listP = null;
const getList = () => (listP ||= fetch(`${API}/v1/guides`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
/** the browser tab's title: the guide's own */
export function titleOf(path) { return slugOf(path) ? null : 'Decision guides · Tech Katta'; }

const crumbs = (last) => `<nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><a href="/learn/interview-questions">Learn</a><span>/</span>${last}</nav>`;
export function guideHtml(g) {
  return `<article class="page narrow guide">
    ${crumbs(`<a href="/guides">Guides</a><span>/</span><span>${esc(g.title)}</span>`)}
    <h1 class="headline"><span class="heavy accent">${esc(g.title)}</span></h1>
    <p class="lead">${esc(g.dek)}</p>
    <div class="prose"><p>${esc(g.intro)}</p></div>
    ${g.picks.map((p) => `<h2>${esc(p.title)}</h2><div class="prose"><ul>${p.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
    <div class="prose"><figure class="tbl"><figcaption>${esc(g.table.label)}</figcaption><div class="tbl-scroll" tabindex="0"><table><thead><tr>${g.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${g.table.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join('')}</tr>`).join('')}</tbody></table></div></figure></div>
    <h2>${esc(g.example.title)}</h2>
    <div class="prose">${g.example.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    <h2>Read more, then try it</h2>
    <ul class="shelf">${g.articles.map((a) => `<li><a href="/learn/${esc(a.article)}"><b>${esc(a.title.split(': ')[0])}</b><span class="muted">${esc(a.why)}</span></a></li>`).join('')}
      <li><a href="/problems/${esc(g.problem)}"><b>${esc(g.problemTitle.split(': ')[0])}</b><span class="muted">${esc(g.problemWhy)}</span></a></li></ul>
  </article>${footer()}`;
}
export function mount(view) {
  let alive = true;
  const slug = slugOf(location.pathname);
  const fail = (msg) => `<section class="page narrow">${crumbs('<span>Guides</span>')}<p class="muted">${msg} <button class="btn light sm" type="button" onclick="location.reload()">Try again</button></p></section>${footer()}`;
  if (slug) {
    view.innerHTML = `<section class="page narrow"><p class="muted" role="status">Loading the guide…</p></section>`;
    fetch(`${API}/v1/guides/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g) => { if (!alive) return; view.innerHTML = guideHtml(g); document.title = `${g.title} · Decision guides · Tech Katta`; })
      .catch((s) => { if (alive) view.innerHTML = s === 404 ? `<section class="page narrow missing"><h1 class="headline"><span class="thin">No guide</span><span class="heavy">at this address</span></h1><p><a class="btn dark" href="/guides">See the guides<span class="chip">→</span></a></p></section>` : fail('The guide could not be loaded.'); });
  } else {
    view.innerHTML = `<section class="page narrow"><p class="muted" role="status">Loading the guides…</p></section>`;
    getList().then((j) => {
      if (!alive) return;
      view.innerHTML = j?.guides ? `<section class="page narrow guides">${crumbs('<span>Guides</span>')}
        <h1 class="headline"><span class="thin">Which one</span><span class="heavy accent">should you pick?</span></h1>
        <p class="lead">Five choices that come up in every design interview: when to pick which, a small table, and a worked example from Zotato.</p>
        <ul class="shelf">${j.guides.map((g) => `<li><a href="/guides/${esc(g.slug)}"><b>${esc(g.title)}</b><span class="muted">${esc(g.dek)}</span></a></li>`).join('')}</ul>
        <p class="actions"><a class="btn dark" href="/drills">Try the one-minute drills<span class="chip">→</span></a></p></section>${footer()}` : fail('The guides could not be loaded.');
    });
  }
  return () => { alive = false; };
}

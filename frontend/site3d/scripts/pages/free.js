// What opens without signing in: the free shelf. Everything is free while Tech Katta is in beta; these are the pieces that also open in full
// signed out (the articles marked access "free" and the URL shortener problem), so a visitor can try before deciding to sign in.
import { listArticles, listNow, splitTitle, SECTIONS } from '../articles.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function mount(view) {
  let alive = true;
  const draw = (list) => {
    const free = list.filter((a) => a.access === 'free');
    const kind = (a) => (a.section === 'interview-questions' && a.group !== 'start' ? 'Problem' : SECTIONS.find((s) => s.id === a.section)?.name.replace(/s$/, '') || '');
    view.innerHTML = `<section class="page narrow free-page">
      <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>Free</span></nav>
      <h1 class="headline"><span class="thin">Free while</span><span class="heavy accent">Tech Katta is in beta</span></h1>
      <p class="lead">Everything on the site is free to use during the beta. Sign in only if you want your progress on every device. These ${free.length ? free.length : ''} open in full without signing in, so you can try them first.</p>
      ${free.length ? `<ul class="shelf">${free.map((a) => `<li><a href="${a.section === 'interview-questions' && a.group !== 'start' ? `/problems/${esc(a.slug)}` : `/learn/${esc(a.section)}/${esc(a.slug)}`}"><span class="mono">${esc(kind(a))}</span><b>${esc(splitTitle(a.title)[0])}</b><i class="free-tag">Free</i></a></li>`).join('')}</ul>` : '<p class="muted">The list could not load. Check your connection and try again.</p>'}
      <p class="actions"><a class="btn dark" href="/problems/url-shortener">Solve your first problem<span class="chip">→</span></a></p>
    </section>${footer()}`;
  };
  draw(listNow());
  listArticles().then((l) => { if (alive) draw(l); });
  return () => { alive = false; };
}

// Not sure where to start? Three paths by experience, each a short ordered list of existing articles that ends in a problem.
// A step shows done from this device's progress (articles read, problems solved). Choosing a path makes Home recommend its next step.
import { listArticles, listNow, splitTitle } from '../articles.js';
import { store } from '../store.js';
import { readJson } from '../solving.js';
import { PATHS, pathState, chosenPath, choosePath } from '../paths.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const href = (a, problem) => (problem ? `/problems/${a.slug}` : `/learn/${a.section}/${a.slug}`);

export function mount(view) {
  let alive = true;
  const draw = (list) => {
    const chosen = chosenPath(), prog = readJson('tk-progress-v1'), subs = readJson('tk-subs-v1'), { read } = store.get();
    view.innerHTML = `<section class="page start">
      <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>Start here</span></nav>
      <h1 class="headline"><span class="thin">Not sure</span><span class="heavy accent">where to start?</span></h1>
      <p class="lead">Pick the path that fits your experience. Each is a short list of lessons that ends with a problem you solve on the canvas. Everything is free while Tech Katta is in beta.</p>
      <div class="paths">${PATHS.map((p) => { const s = pathState(p, list, read, prog, subs);
        return `<section class="path${chosen === p.id ? ' chosen' : ''}" id="${p.id}" aria-labelledby="h-${p.id}">
          <p class="mono">${esc(p.years)}</p><h2 id="h-${p.id}">${esc(p.name)}</h2><p class="muted">${esc(p.blurb)}</p>
          <p class="mono path-count">${s.done} of ${s.steps.length} done</p>
          <ol class="steps">${s.steps.map((st, i) => `<li class="${st.done ? 'done' : ''}"><a href="${esc(href(st.a, st.problem))}"><span class="mono step-n">${st.done ? '<i class="tk" aria-hidden="true"></i><span class="sr">Done: </span>' : i + 1}</span><span>${esc(splitTitle(st.a.title)[0])}${st.problem ? ' <em class="mono">Problem</em>' : ''}</span></a></li>`).join('')}</ol>
          ${s.next ? `<a class="btn dark" href="${esc(href(s.next.a, s.next.problem))}" data-path="${p.id}">${s.done ? 'Continue' : 'Start'} this path<span class="chip">→</span></a>` : '<p class="ok"><b>Path finished.</b></p>'}
        </section>`; }).join('')}</div>
    </section>${footer()}`;
    view.querySelectorAll('[data-path]').forEach((a) => a.addEventListener('click', () => choosePath(a.dataset.path)));
  };
  draw(listNow());
  listArticles().then((l) => { if (alive) draw(l); });
  const again = () => alive && draw(listNow());
  addEventListener('tk-progress', again);
  return () => { alive = false; removeEventListener('tk-progress', again); };
}

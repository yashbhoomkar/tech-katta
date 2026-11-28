// Problems (/problems, since 2026-11-23): the canvas problems in the 3D site's design, after the prototype's practice
// list (a progress card, a difficulty filter, rows with a status tick, a live 3D preview of each problem's design).
// Each problem is an interview question; its row opens the canvas workspace (/problems/<slug>, the React app), where
// the design is drawn and the judge runs every test. Below: the Sandbox, the Simulator and the Challenges.
//
// What it reads is the canvas's own record in this browser (frontend/src/progress.js and practice.js): solved and
// started marks in tk-progress-v1 ("solved:<slug>", "practice:<slug>", a challenge's stars), submissions in
// tk-subs-v1 (the best score, ignoring copied solutions). Nothing here writes to them.
// Solve (/problems): one list for everything you can solve, after the prototype's practice list (a progress card, a segmented
// filter, rows with a status tick, a live 3D preview of each problem's design on wide screens). The filter is Problems (the
// canvas problems; each is an interview question and its row opens the canvas workspace, /problems/<slug>, where the design
// is drawn and the judge runs every test), Challenges (the same canvas, scored in stars) and Warm-ups (the simulator's five,
// each at /simulator/<id>). The choice is kept in the #fragment (#challenges, #warm-ups; none is Problems), which the
// sidebar's rows set too. The Sandbox is one quiet line at the end.
//
// What it reads is the canvas's own record in this browser (solve.js): nothing here writes to it.
import { createWorld } from '../world-lazy.js';
import { listArticles, listNow, splitTitle, FREE } from '../articles.js';
import { recipeFor, PREVIEW } from '../figures.js';
import { ensureStories } from '../articles.js';
import { accountState } from '../account.js';
import { INCIDENTS, rupees } from '../sim.js';
import { store } from '../store.js';
import { readJson, record, problemsOf, lab, labNow } from '../solve.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
const FILTERS = [['problems', 'Problems'], ['challenges', 'Challenges'], ['warm-ups', 'Warm-ups']];
const filterNow = () => (location.hash === '#challenges' ? 'challenges' : location.hash === '#warm-ups' ? 'warm-ups' : 'problems');

export function mount(view, _p, { reduced }) {
  ensureStories(!!accountState().user); // signed in: the 3D previews get their words (never sent to anyone else)
  let world = null, alive = true, cleanup = [], labTried = !!labNow();
  const draw = (list, labData) => {
    cleanup.forEach((f) => f()); cleanup = [];
    const prog = readJson('tk-progress-v1'), subs = readJson('tk-subs-v1'), best = store.get().best;
    const probs = problemsOf(list);
    const rec = Object.fromEntries(probs.map((a) => [a.slug, record(a.slug, prog, subs)]));
    const solved = probs.filter((a) => rec[a.slug].solved).length;
    const next = probs.find((a) => !rec[a.slug].solved);
    const levels = LEVELS.filter(([l]) => probs.some((a) => a.group === l));
    const chals = labData?.challenges || [];
    const stars = prog.stars && typeof prog.stars === 'object' ? prog.stars : {};
    const count = { problems: probs.length || '', challenges: chals.length || '', 'warm-ups': INCIDENTS.length };
    const at = FILTERS.findIndex(([f]) => f === filterNow());
    let n = 0;
    view.innerHTML = `
    <section class="page learn solve" style="--acc: var(--sky)">
      <header class="sec-head">
        <div>
          <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><span>Solve</span></nav>
          <h1 class="headline"><span class="thin">Solve</span><span class="heavy accent">Draw it, run it, get judged</span></h1>
          <p class="lead">Draw your design on the canvas. It passes when every test does, and ▶ Replay shows it minute by minute.</p>
        </div>
        <div class="cprog">
          <b>${solved} of ${probs.length} solved</b>
          <span class="cbar"><i style="width:${probs.length ? (solved / probs.length) * 100 : 0}%"></i></span>
          ${next ? `<small>Next up: ${esc(splitTitle(next.title)[0])}</small><a class="btn dark sm" href="/problems/${esc(next.slug)}">${solved || Object.values(rec).some((r) => r.started) ? 'Continue' : 'Start'}<span class="chip">→</span></a>` : '<small>Every problem solved</small>'}
        </div>
      </header>
      <div class="seg levels solve-seg" role="group" aria-label="What to solve" style="--n:3; --at:${at}">${FILTERS.map(([f, name], i) => `<button type="button" data-filter="${f}" data-i="${i}" aria-pressed="${i === at}">${name}<span class="mono">${count[f]}</span></button>`).join('')}<i class="seg-pill" aria-hidden="true"></i></div>
      <div class="learn-cols">
        <div class="learn-list">
          <div data-pane="problems">
          ${levels.map(([l, name]) => { const items = probs.filter((a) => a.group === l), gd = items.filter((a) => rec[a.slug].solved).length;
            return `<section class="track-block" data-group="${l}">
              <div class="track-head"><h2>${name}</h2><span class="chip-done mono">${gd} of ${items.length} solved</span></div>
              <ol class="lessons">
                ${items.map((a) => { const r = rec[a.slug], [h] = splitTitle(a.title); n += 1;
                  const meta = [a.tests ? `${a.tests} tests` : '', r.best != null ? `best ${r.best}` : '', r.solved ? 'solved' : r.started ? 'started' : ''].filter(Boolean).join(' · ');
                  return `<li>
                  <a class="lesson${r.solved ? ' done' : ''}" href="/problems/${esc(a.slug)}" data-preview="${esc(a.slug)}">
                    <span class="st" role="img" aria-label="${r.solved ? 'Solved' : r.started ? 'Started' : 'Not started'}">${r.solved ? '<i class="tk" aria-hidden="true"></i>' : r.started ? '<i class="half" aria-hidden="true"></i>' : ''}</span>
                    <span class="l-n mono">${String(n).padStart(2, '0')}</span>
                    <span class="l-main"><b>${esc(h)}${a.access === 'free' ? FREE : ''}</b><span class="muted">${esc(meta || a.dek || '')}</span></span>
                    <span class="l-tag mono">Open the canvas →</span>
                  </a></li>`; }).join('')}
              </ol>
            </section>`; }).join('')}
          </div>
          <div data-pane="challenges" hidden>
            <p class="muted pane-note">The same canvas, scored in stars: for staying up, not crashing, and keeping to the budget.</p>
            ${chals.length ? `<ol class="lessons">
              ${chals.map((c, i) => { const got = Math.min(stars[c.id] ?? 0, (c.stars || []).length), of = (c.stars || []).length;
                return `<li><a class="lesson${got === of && of ? ' done' : ''}" href="/problems/challenge/${esc(c.id)}">
                  <span class="st" role="img" aria-label="${got} of ${of} stars">${got === of && of ? '<i class="tk" aria-hidden="true"></i>' : ''}</span>
                  <span class="l-n mono">${String(i + 1).padStart(2, '0')}</span>
                  <span class="l-main"><b>${esc(c.title)}</b><span class="muted">${esc(labData.levels?.[c.level] ?? c.level ?? '')}</span></span>
                  <span class="l-tag mono stars" aria-hidden="true">${'★'.repeat(got)}<span class="off">${'★'.repeat(Math.max(0, of - got))}</span></span>
                </a></li>`; }).join('')}
            </ol>` : `<p class="muted empty">${labTried ? 'The challenges could not be loaded. Try again in a moment.' : 'Loading the challenges…'}</p>`}
          </div>
          <div data-pane="warm-ups" hidden>
            <p class="muted pane-note">Pick how many servers, caches and replicas, then watch them survive one evening in 3D. No canvas.</p>
            <ol class="lessons">
              ${INCIDENTS.map((i) => { const b = best[i.id]; return `<li>
                <a class="lesson${b?.passed ? ' done' : ''}" href="/simulator/${i.id}">
                  <span class="st" role="img" aria-label="${b?.passed ? 'Done' : 'Not started'}">${b?.passed ? '<i class="tk" aria-hidden="true"></i>' : ''}</span>
                  <span class="l-n mono">${i.no}</span>
                  <span class="l-main"><b>${esc(i.title)}</b><span class="muted">${esc(i.level)}${b ? ` · best score ${b.score}` : ''} · budget ${rupees(i.budget)} a month</span></span>
                  <span class="l-tag mono">${esc(i.system)}</span>
                </a></li>`; }).join('')}
            </ol>
          </div>
          <p class="solve-more muted">Just want to play? <a href="/problems/sandbox">Sandbox: a free canvas</a>, no tests and no score.</p>
        </div>
        <aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap"><span class="cap-t mono"></span><span class="cap-s"></span></p></div></aside>
      </div>
    </section>
    ${footer()}`;

    // the filter: the pill slides to the choice, one pane shows, the choice goes into the #fragment (Problems: none)
    const cols = view.querySelector('.learn-cols'), seg = view.querySelector('.solve-seg');
    const apply = (f) => {
      const i = FILTERS.findIndex(([x]) => x === f);
      seg.style.setProperty('--at', i);
      seg.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === f)));
      view.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== f; });
      cols.classList.toggle('one', f !== 'problems'); // the 3D preview belongs to the problems
    };
    apply(filterNow());
    seg.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      try { history.replaceState(null, '', location.pathname + location.search + (f === 'problems' ? '' : `#${f}`)); } catch { /* blocked */ }
      apply(f); dispatchEvent(new Event('tk-filter'));
    }));
    const onHash = () => apply(filterNow());
    addEventListener('hashchange', onHash); cleanup.push(() => removeEventListener('hashchange', onHash));

    // the 3D preview: the problem's high-level design, from its article's 3D story (figures.js). Phones have none: the list is the page
    world?.destroy(); world = null;
    if (innerWidth <= 900) return;
    const card = view.querySelector('.preview-card');
    try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true, start: 'visible', button: false, onFail: () => card.classList.add('flat') }); } catch { world = null; }
    card.classList.toggle('flat', !world);
    world?.setLabelBand(0.8); world?.setLabelTop(10);
    const capT = card.querySelector('.cap-t'), capS = card.querySelector('.cap-s');
    const bySlug = Object.fromEntries(probs.map((a) => [a.slug, a]));
    let shown = null;
    function preview(slug) {
      if (shown === slug || !bySlug[slug]) return; shown = slug;
      const a = bySlug[slug], steps = recipeFor(a), s = steps[Math.min(steps.length - 1, PREVIEW[slug] ?? 0)], r = rec[slug];
      capT.textContent = `${a.group} · ${a.tests ? `${a.tests} tests` : 'the canvas'}${r.best != null ? ` · best ${r.best}` : ''}`;
      capS.textContent = splitTitle(a.title)[1] || a.dek || '';
      view.querySelectorAll('.lesson.on').forEach((x) => x.classList.remove('on'));
      view.querySelector(`[data-preview="${slug}"]`)?.classList.add('on');
      if (!world || !s?.system) return;
      world.setSystem(s.system);
      const f = world.frame();
      world.setCamera({ t: f.t, dist: f.dist * 0.8, az: 42, el: 32, sx: 0.5, sy: 0.56 });
      world.setState({ ...s.state, avoid: 0 });
    }
    const rows = [...view.querySelectorAll('[data-preview]')];
    rows.forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
    preview((next && next.slug) || rows[0]?.dataset.preview);
  };
  draw(listNow(), labNow());
  Promise.all([listArticles(), lab()]).then(([l, labData]) => { labTried = true; if (alive) draw(l, labData); });
  // the canvas's record can change in another tab (a solve): redraw with it
  const onStorage = (e) => { if (alive && (e.key === 'tk-progress-v1' || e.key === 'tk-subs-v1')) draw(listNow(), labNow()); };
  addEventListener('storage', onStorage);
  return () => { alive = false; removeEventListener('storage', onStorage); cleanup.forEach((f) => f()); world?.destroy(); };
}

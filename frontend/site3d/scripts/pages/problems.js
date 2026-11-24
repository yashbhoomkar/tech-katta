// Problems (/problems, since 2026-11-23): the canvas problems in the 3D site's design, after the prototype's practice
// list (a progress card, a difficulty filter, rows with a status tick, a live 3D preview of each problem's design).
// Each problem is an interview question; its row opens the canvas workspace (/problems/<slug>, the React app), where
// the design is drawn and the judge runs every test. Below: the Sandbox, the Simulator and the Challenges.
//
// What it reads is the canvas's own record in this browser (frontend/src/progress.js and practice.js): solved and
// started marks in tk-progress-v1 ("solved:<slug>", "practice:<slug>", a challenge's stars), submissions in
// tk-subs-v1 (the best score, ignoring copied solutions). Nothing here writes to them.
import { createWorld } from '../world.js';
import { listArticles, listNow, splitTitle, apiFetch } from '../articles.js';
import { recipeFor, PREVIEW } from '../figures.js';
import { ensureStories } from '../articles.js';
import { accountState } from '../account.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
const readJson = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };

/** the canvas's record for one problem: solved, started, best score */
function record(slug, prog, subs) {
  const list = Array.isArray(subs[slug]) ? subs[slug].filter((x) => x && typeof x.score === 'number') : [];
  const own = list.filter((x) => !x.copied);
  const steps = prog.steps && typeof prog.steps === 'object' ? prog.steps : {};
  return { solved: steps[`solved:${slug}`] === true, started: steps[`practice:${slug}`] === true || list.length > 0, best: own.length ? Math.max(...own.map((x) => x.score)) : null };
}

let labCache = null;
async function lab() {
  if (labCache) return labCache;
  try { const r = await apiFetch('/v1/lab', { headers: { accept: 'application/json' } }); if (r.ok) labCache = await r.json(); } catch { /* offline: no challenges */ }
  return labCache;
}

export function mount(view, _p, { reduced }) {
  ensureStories(!!accountState().user); // signed in: the 3D previews get their words (never sent to anyone else)
  let world = null, alive = true, cleanup = [];
  const draw = (list, labData) => {
    cleanup.forEach((f) => f()); cleanup = [];
    const prog = readJson('tk-progress-v1'), subs = readJson('tk-subs-v1');
    const probs = list.filter((a) => a.section === 'interview-questions' && a.group !== 'start');
    const rec = Object.fromEntries(probs.map((a) => [a.slug, record(a.slug, prog, subs)]));
    const solved = probs.filter((a) => rec[a.slug].solved).length;
    const next = probs.find((a) => !rec[a.slug].solved);
    const levels = LEVELS.filter(([l]) => probs.some((a) => a.group === l));
    const chals = labData?.challenges || [];
    const stars = prog.stars && typeof prog.stars === 'object' ? prog.stars : {};
    let n = 0;
    view.innerHTML = `
    <section class="page learn" style="--acc: var(--sky)">
      <header class="sec-head">
        <div>
          <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><span>Problems</span></nav>
          <h1 class="headline"><span class="thin">Problems</span><span class="heavy accent">Draw it, run it, get judged</span></h1>
          <p class="lead">Each problem has a test suite: an evening's traffic, spikes, a crash and a budget. Draw your design on the canvas; it passes when every test does, and ▶ Replay shows it minute by minute.</p>
        </div>
        <div class="cprog">
          <b>${solved} of ${probs.length} solved</b>
          <span class="cbar"><i style="width:${probs.length ? (solved / probs.length) * 100 : 0}%"></i></span>
          ${next ? `<small>Next up: ${esc(splitTitle(next.title)[0])}</small><a class="btn dark sm" href="/problems/${esc(next.slug)}">${solved || Object.values(rec).some((r) => r.started) ? 'Continue' : 'Start'}<span class="chip">→</span></a>` : '<small>Every problem solved</small>'}
        </div>
      </header>
      ${levels.length > 1 ? `<div class="seg levels" role="group" aria-label="Filter by difficulty" style="--n:${levels.length + 1}">${[['all', 'All'], ...levels].map(([l, name], i) => `<button type="button" data-level="${l}" data-i="${i}" aria-pressed="${l === 'all'}">${name}</button>`).join('')}<i class="seg-pill" aria-hidden="true"></i></div>` : ''}
      <div class="learn-cols">
        <div class="learn-list">
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
                    <span class="l-main"><b>${esc(h)}</b><span class="muted">${esc(meta || a.dek || '')}</span></span>
                    <span class="l-tag mono">Open the canvas →</span>
                  </a></li>`; }).join('')}
              </ol>
            </section>`; }).join('')}
          <section class="track-block more-practice">
            <div class="track-head"><h2>More practice</h2></div>
            <ol class="lessons">
              <li><a class="lesson" href="/problems/sandbox"><span class="st"></span><span class="l-n mono">··</span><span class="l-main"><b>Sandbox</b><span class="muted">A free canvas: any parts, any traffic. No tests, no score.</span></span><span class="l-tag mono">Canvas →</span></a></li>
              <li><a class="lesson" href="/simulator"><span class="st"></span><span class="l-n mono">··</span><span class="l-main"><b>Simulator</b><span class="muted">Pick how many servers, caches and replicas, then watch them survive one evening in 3D.</span></span><span class="l-tag mono">3D →</span></a></li>
            </ol>
          </section>
          ${chals.length ? `<section class="track-block" id="challenges">
            <div class="track-head"><h2>Challenges</h2><span class="chip-done mono">stars for staying up, not crashing, keeping to budget</span></div>
            <ol class="lessons">
              ${chals.map((c, i) => { const got = Math.min(stars[c.id] ?? 0, (c.stars || []).length), of = (c.stars || []).length;
                return `<li><a class="lesson${got === of && of ? ' done' : ''}" href="/problems/challenge/${esc(c.id)}">
                  <span class="st" role="img" aria-label="${got} of ${of} stars">${got === of && of ? '<i class="tk" aria-hidden="true"></i>' : ''}</span>
                  <span class="l-n mono">${String(i + 1).padStart(2, '0')}</span>
                  <span class="l-main"><b>${esc(c.title)}</b><span class="muted">${esc(labData.levels?.[c.level] ?? c.level ?? '')}</span></span>
                  <span class="l-tag mono stars" aria-hidden="true">${'★'.repeat(got)}<span class="off">${'★'.repeat(Math.max(0, of - got))}</span></span>
                </a></li>`; }).join('')}
            </ol>
          </section>` : ''}
        </div>
        <aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap"><span class="cap-t mono"></span><span class="cap-s"></span></p></div></aside>
      </div>
    </section>
    ${footer()}`;

    // difficulty filter: the pill slides to the choice; More practice and Challenges always show
    view.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
      view.querySelectorAll('[data-level]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      view.querySelector('.levels').style.setProperty('--at', b.dataset.i);
      view.querySelectorAll('.track-block[data-group]').forEach((g) => { g.hidden = !(b.dataset.level === 'all' || g.dataset.group === b.dataset.level); });
    }));

    // the 3D preview: the problem's high-level design, from its article's 3D story (figures.js)
    const card = view.querySelector('.preview-card');
    world?.destroy(); world = null;
    try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; }
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
      world.setCamera({ t: f.t, dist: f.dist * (innerWidth <= 760 ? 0.72 : 0.8), az: 42, el: 32, sx: 0.5, sy: 0.56 });
      world.setState({ ...s.state, avoid: 0 });
    }
    const rows = [...view.querySelectorAll('[data-preview]')];
    rows.forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
    const onScroll = () => {
      if (innerWidth > 900) return;
      const mid = innerHeight * 0.62; let best = null, bd = Infinity;
      for (const el of rows) { const r = el.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = el; } }
      if (best) preview(best.dataset.preview);
    };
    addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => removeEventListener('scroll', onScroll));
    preview((next && next.slug) || rows[0]?.dataset.preview);
  };
  const first = listNow();
  draw(first, labCache);
  Promise.all([listArticles(), lab()]).then(([l, labData]) => { if (alive) draw(l, labData); });
  // the canvas's record can change in another tab (a solve): redraw with it
  const onStorage = (e) => { if (alive && (e.key === 'tk-progress-v1' || e.key === 'tk-subs-v1')) draw(listNow(), labCache); };
  addEventListener('storage', onStorage);
  return () => { alive = false; removeEventListener('storage', onStorage); cleanup.forEach((f) => f()); world?.destroy(); };
}

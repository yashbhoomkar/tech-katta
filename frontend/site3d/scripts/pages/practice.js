// Practice: every problem in one list, like a section page (progress card, rows with a status tick, a live 3D preview
// of the design you start from). Each row opens the simulator for that problem.
import { createWorld } from '../world.js';
import { INCIDENTS, layout, rupees } from '../sim.js';
import { store } from '../store.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mount(view, _p, { reduced }) {
  const best = store.get().best;
  const passed = INCIDENTS.filter((i) => best[i.id]?.passed).length;
  const next = INCIDENTS.find((i) => !best[i.id]?.passed);
  view.innerHTML = `
  <section class="page learn" style="--acc: var(--lemon)">
    <header class="sec-head">
      <div>
        <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><span>Simulator</span></nav>
        <h1 class="headline"><span class="thin">Simulator</span><span class="heavy accent">Design it, then watch it survive an evening</span></h1>
        <p class="lead">Pick a problem. Choose your servers, caches and replicas within a budget, then a judge sends the evening's traffic through your design and tells you what broke and why.</p>
      </div>
      <div class="cprog">
        <b>${passed} of ${INCIDENTS.length} done</b>
        <span class="cbar"><i style="width:${(passed / INCIDENTS.length) * 100}%"></i></span>
        ${next ? `<small>Next up: ${esc(next.title)}</small><a class="btn dark sm" href="/simulator/${next.id}">${passed ? 'Continue' : 'Start'}<span class="chip">→</span></a>` : '<small>All done here</small>'}
      </div>
    </header>
    <div class="learn-cols">
      <div class="learn-list">
        <section class="track-block">
          <div class="track-head"><h2>Problems</h2><span class="chip-done mono">${passed} of ${INCIDENTS.length} done</span></div>
          <ol class="lessons">
            ${INCIDENTS.map((i) => { const b = best[i.id]; return `<li>
              <a class="lesson${b?.passed ? ' done' : ''}" href="/simulator/${i.id}" data-preview="${i.id}">
                <span class="st" role="img" aria-label="${b?.passed ? 'Done' : 'Not started'}">${b?.passed ? '<i class="tk" aria-hidden="true"></i>' : ''}</span>
                <span class="l-n mono">${i.no}</span>
                <span class="l-main"><b>${esc(i.title)}</b><span class="muted">${esc(i.level)}${b ? ` · best score ${b.score}` : ''} · budget ${rupees(i.budget)} a month</span></span>
                <span class="l-tag mono">${esc(i.system)}</span>
              </a></li>`; }).join('')}
          </ol>
        </section>
      </div>
      <aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap"><span class="cap-t mono"></span><span class="cap-s"></span></p></div></aside>
    </div>
  </section>
  ${footer()}`;

  const card = view.querySelector('.preview-card');
  let world = null;
  try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; }
  card.classList.toggle('flat', !world);
  world?.setLabelBand(0.8); world?.setLabelTop(10);
  const capT = card.querySelector('.cap-t'), capS = card.querySelector('.cap-s');
  let shown = null;
  const preview = (id) => {
    if (shown === id) return; shown = id;
    const inc = INCIDENTS.find((x) => x.id === id); if (!inc) return;
    capT.textContent = `${inc.no} · ${inc.system} · ${inc.level}`; capS.textContent = inc.brief;
    view.querySelectorAll('.lesson.on').forEach((x) => x.classList.remove('on'));
    view.querySelector(`[data-preview="${id}"]`)?.classList.add('on');
    if (!world) return;
    const sys = layout(inc.start);
    world.setSystem(sys);
    const f = world.frame();
    world.setCamera({ t: f.t, dist: f.dist * 0.8, az: 42, el: 32, sx: 0.5, sy: 0.56 });
    world.setState({ parts: Object.fromEntries(Object.keys(sys.parts).filter((k) => !['client', 'lb', 'cdn'].includes(k)).map((k) => [k, 'ok'])), speed: 1.2, avoid: 0 });
  };
  const rows = [...view.querySelectorAll('[data-preview]')];
  rows.forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
  const onScroll = () => { if (innerWidth > 900) return; const mid = innerHeight * 0.62; let best2 = null, bd = Infinity; for (const el of rows) { const r = el.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best2 = el; } } if (best2) preview(best2.dataset.preview); };
  addEventListener('scroll', onScroll, { passive: true });
  preview(rows[0]?.dataset.preview);
  return () => { removeEventListener('scroll', onScroll); world?.destroy(); };
}

// Incidents: real Indian evenings, each a traffic curve, its failures and a budget. Pick one to run.
import { INCIDENTS, rupees, perSec } from '../sim.js';
import { sparkline } from '../ui.js';
import { store } from '../store.js';
import { footer } from './landing.js';

export function mount(view) {
  const best = store.get().best;
  const survived = INCIDENTS.filter((i) => best[i.id]?.passed).length;
  let filter = 'All';
  view.innerHTML = `
  <section class="page incidents">
    <div class="inc-head">
      <div>
        <p class="kicker"><span>INCIDENTS</span><i></i>${survived} OF ${INCIDENTS.length} SURVIVED</p>
        <h1 class="headline"><span class="thin">Five evenings.</span><span class="heavy accent">Keep them up.</span></h1>
        <p class="lead">Each one is a night that really happens in India: its traffic, the part that fails, and what you may spend. Design for it, run it, read what broke.</p>
      </div>
      <div class="filters" role="group" aria-label="Level">${['All', 'Easy', 'Medium', 'Hard'].map((f) => `<button type="button" class="filter" aria-pressed="${f === 'All'}">${f}</button>`).join('')}</div>
    </div>
    <div class="inc-grid"></div>
  </section>
  ${footer()}`;
  const grid = view.querySelector('.inc-grid');
  function draw() {
    grid.innerHTML = INCIDENTS.filter((i) => filter === 'All' || i.level === filter).map((inc) => {
      const b = best[inc.id];
      const peak = Math.max(...inc.curve.map((c) => c[1]));
      return `<a class="inc" href="#/sim/${inc.id}">
        <div class="inc-top"><span class="mono">INC-${inc.no}</span><span class="tag ${inc.level.toLowerCase()}">${inc.level}</span>${b ? `<span class="tag ${b.passed ? 'passed' : 'failed'}">${b.passed ? `Survived · ${b.score}` : `Best ${b.score}`}</span>` : ''}</div>
        <h2>${inc.title}</h2>
        <p class="muted">${inc.brief}</p>
        ${sparkline(inc, { w: 360, h: 84 })}
        <div class="inc-facts"><span><small>Peak</small><b>${perSec(peak)}</b></span><span><small>Budget</small><b>${rupees(inc.budget)}</b></span><span><small>p99</small><b>&lt; ${inc.p99} ms</b></span><span><small>System</small><b>${inc.system}</b></span></div>
      </a>`;
    }).join('');
  }
  view.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => {
    filter = b.textContent; view.querySelectorAll('.filter').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw();
  }));
  draw();
  return null;
}

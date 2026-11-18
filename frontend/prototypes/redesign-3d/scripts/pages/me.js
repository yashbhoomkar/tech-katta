// You: what you have read and survived, on this device. No streaks, no badges: just where you are.
import { INCIDENTS, rupees, cost } from '../sim.js';
import { LESSONS } from '../content.js';
import { store } from '../store.js';
import { footer } from './landing.js';

export function mount(view) {
  const draw = () => {
    const { read, best } = store.get();
    const lessons = Object.entries(LESSONS).filter(([, l]) => !l.soon);
    const readN = lessons.filter(([id]) => read[id]).length, survived = INCIDENTS.filter((i) => best[i.id]?.passed).length;
    const nextLesson = lessons.find(([id]) => !read[id]), nextInc = INCIDENTS.find((i) => !best[i.id]?.passed);
    view.innerHTML = `
    <section class="page me">
      <p class="kicker"><span>YOU</span><i></i>ON THIS DEVICE</p>
      <h1 class="headline"><span class="thin">Where you are.</span><span class="heavy accent">What comes next.</span></h1>
      <div class="me-stats">
        <div><small>Lessons read</small><b>${readN}<em> / ${lessons.length}</em></b><span class="bar"><i style="width:${(readN / lessons.length) * 100}%"></i></span></div>
        <div><small>Incidents survived</small><b>${survived}<em> / ${INCIDENTS.length}</em></b><span class="bar"><i style="width:${(survived / INCIDENTS.length) * 100}%"></i></span></div>
      </div>
      <div class="me-next">
        ${nextLesson ? `<a class="next-card" href="#/learn/${nextLesson[0]}"><span class="mono">NEXT LESSON</span><b>${nextLesson[1].title}</b><span class="muted">${nextLesson[1].hook}</span><span class="go">Read →</span></a>` : ''}
        ${nextInc ? `<a class="next-card" href="#/sim/${nextInc.id}"><span class="mono">NEXT INCIDENT · ${nextInc.level.toUpperCase()}</span><b>${nextInc.title}</b><span class="muted">${nextInc.brief}</span><span class="go">Run →</span></a>` : ''}
      </div>
      <h2 class="sub">Your runs</h2>
      <table class="runs"><thead><tr><th>Incident</th><th>Best score</th><th>Design</th><th>Cost</th></tr></thead><tbody>
        ${INCIDENTS.map((i) => { const b = best[i.id]; return `<tr><td><a href="#/sim/${i.id}">${i.title}</a></td><td>${b ? `<span class="${b.passed ? 'ok' : 'alert'}">${b.score}${b.passed ? ' · survived' : ''}</span>` : '<span class="muted">not run</span>'}</td><td class="mono">${b ? `${b.design.apps} app · ${b.design.cache} cache · ${b.design.replicas} rep${b.design.queue ? ' · queue' : ''}${b.design.cdn ? ' · cdn' : ''}` : '—'}</td><td>${b ? rupees(cost(b.design)) : '—'}</td></tr>`; }).join('')}
      </tbody></table>
      <p><button type="button" class="btn light reset">Clear my progress</button></p>
    </section>
    ${footer()}`;
    view.querySelector('.reset').addEventListener('click', () => { if (confirm('Clear what you have read and run on this device?')) { store.reset(); draw(); } });
  };
  draw();
  return null;
}

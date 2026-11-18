// A lesson: a scroll story. Steps on the left; the system on the right rebuilds itself for each step.
import { mountStory, stageHtml } from '../story.js';
import { LESSONS, TRACKS } from '../content.js';
import { INCIDENTS } from '../sim.js';
import { store } from '../store.js';

export function mount(view, [id], { reduced }) {
  const l = LESSONS[id];
  if (!l || l.soon) {
    view.innerHTML = `<section class="page narrow missing"><p class="kicker"><span>LEARN</span><i></i>SOON</p><h1 class="headline"><span class="thin">${l ? l.title : 'This lesson'}</span><span class="heavy accent">is being written.</span></h1><p class="lead">${l ? l.hook : ''}</p><p><a class="btn dark" href="#/learn">All lessons<span class="chip">→</span></a></p></section>`;
    return null;
  }
  const order = TRACKS.flatMap((t) => t.lessons).filter((k) => !LESSONS[k].soon);
  const next = order[order.indexOf(id) + 1];
  const inc = INCIDENTS.find((x) => x.id === l.incident);
  view.innerHTML = `
  <section class="story lesson-story">
    ${stageHtml(`<div class="progress"><span class="mono n">01 / 0${l.steps.length}</span><span class="segs">${l.steps.map(() => '<i></i>').join('')}</span><span class="mono name">${l.title.toUpperCase()}</span></div>`)}
    <header class="step lesson-head" data-step="0">
      <a class="back mono" href="#/learn">← LEARN</a>
      <p class="kicker"><span>LESSON</span><i></i>${l.minutes} MIN</p>
      <h1 class="headline"><span class="heavy">${l.title}</span></h1>
      <p class="lead">${l.hook}</p>
      <p class="hint mono">SCROLL: THE SYSTEM MOVES FIRST, THEN THE WORDS</p>
    </header>
    ${l.steps.map((s, i) => `
    <div class="step" data-step="${i + 1}">
      <p class="kicker"><span>${String(i + 1).padStart(2, '0')}</span><i></i>${s.kicker.toUpperCase()}</p>
      <h2 class="headline sm"><span class="thin">${s.thin}</span><span class="heavy accent">${s.heavy}</span></h2>
      ${s.body.map((p) => `<p class="lead">${p}</p>`).join('')}
      ${s.fact ? `<div class="fact"><span class="mono">${s.fact[0]}</span><b>${s.fact[1]}</b></div>` : ''}
    </div>`).join('')}
    <div class="step finale" data-step="${l.steps.length + 1}">
      <p class="kicker"><span>DONE</span><i></i>NOW TRY IT</p>
      <h2 class="headline sm"><span class="thin">You have read it.</span><span class="heavy accent">Now keep it up.</span></h2>
      ${inc ? `<a class="next-card" href="#/sim/${inc.id}"><span class="mono">TRY IT IN THE SIMULATOR · ${inc.level.toUpperCase()}</span><b>${inc.title}</b><span class="muted">${inc.brief}</span><span class="go">Run it →</span></a>` : ''}
      ${next ? `<a class="btn light" href="#/learn/${next}">Next: ${LESSONS[next].title}<span class="chip violet">→</span></a>` : ''}
    </div>
  </section>`;
  const steps = [{ ...l.steps[0], state: { ...l.steps[0].state, parts: {}, labels: {} } }, ...l.steps, { ...l.steps[l.steps.length - 1] }];
  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), segs = [...root.querySelectorAll('.segs i')];
  const story = mountStory(root, steps, {
    reduced,
    onStep: (i, _f, t) => {
      const k = Math.min(Math.max(i, 1), l.steps.length);
      n.textContent = `${String(k).padStart(2, '0')} / ${String(l.steps.length).padStart(2, '0')}`;
      segs.forEach((s, j) => s.classList.toggle('on', j < k && i > 0));
      if (i === l.steps.length + 1 && t > 0.5) store.markRead(id);
    },
  });
  return () => story.destroy();
}

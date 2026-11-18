// Learn: the tracks as a plain list on the left; on the right, a live preview of the system each lesson ends with.
// Hover or focus a lesson and the system rebuilds itself.
import { createWorld } from '../world.js';
import { layout } from '../sim.js';
import { TRACKS, LESSONS } from '../content.js';
import { store } from '../store.js';
import { footer } from './landing.js';

export function mount(view, _p, { reduced }) {
  const read = store.get().read;
  const total = Object.values(LESSONS).filter((l) => !l.soon).length, done = Object.keys(LESSONS).filter((id) => read[id] && !LESSONS[id].soon).length;
  view.innerHTML = `
  <section class="page learn">
    <div class="learn-list">
      <p class="kicker"><span>LEARN</span><i></i>${done} OF ${total} READ</p>
      <h1 class="headline"><span class="thin">Every idea,</span><span class="heavy accent">as a moving system.</span></h1>
      <p class="lead">Short scroll stories. The system on screen changes with every paragraph, so you see why each part exists.</p>
      ${TRACKS.map((t, ti) => `
        <div class="track-block">
          <div class="track-head"><span class="mono">0${ti + 1}</span><div><h2>${t.name}</h2><p class="muted">${t.blurb}</p></div></div>
          <ol class="lessons">
            ${t.lessons.map((id, i) => { const l = LESSONS[id]; return `<li>
              ${l.soon ? `<div class="lesson soon" data-preview="${id}" tabindex="0">` : `<a class="lesson" href="#/learn/${id}" data-preview="${id}">`}
                <span class="l-n mono">${String(i + 1).padStart(2, '0')}</span>
                <span class="l-main"><b>${l.title}</b><span class="muted">${l.hook}</span></span>
                <span class="l-meta mono">${l.soon ? 'SOON' : read[id] ? '<span class="ok">✓ READ</span>' : `${l.minutes} MIN`}</span>
              ${l.soon ? '</div>' : '</a>'}</li>`; }).join('')}
          </ol>
        </div>`).join('')}
    </div>
    <aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap mono"><span class="cap-t">LOAD BALANCING</span><span class="cap-s">the system this lesson ends with</span></p></div></aside>
  </section>
  ${footer()}`;

  const card = view.querySelector('.preview-card');
  let world = null;
  if (matchMedia('(min-width: 900px)').matches) { try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; } }
  card.classList.toggle('flat', !world);
  const capT = card.querySelector('.cap-t');
  let shown = null;
  function preview(id) {
    if (!world || shown === id) return; shown = id;
    const l = LESSONS[id];
    world.setSystem(layout(l.preview));
    const f = world.frame();
    world.setCamera({ t: f.t, dist: f.dist * 1.05, az: 42, el: 32, sx: 0.5, sy: 0.55 });
    const ok = Object.fromEntries(Object.keys(layout(l.preview).parts).filter((k) => !['client', 'lb', 'cdn'].includes(k)).map((k) => [k, l.soon ? '' : 'ok']));
    world.setState({ parts: ok, speed: 0.9 });
    capT.textContent = l.title.toUpperCase();
  }
  view.querySelectorAll('[data-preview]').forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
  preview('load-balancing');
  return () => world?.destroy();
}

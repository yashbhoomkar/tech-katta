// A scroll story: steps on one side, one 3D world on a sticky stage. When a step reaches the middle of the screen,
// the world becomes that step's design and state, and the camera glides to frame it. Used by the landing and lessons.
import { createWorld } from './world.js';
import { layout } from './sim.js';

export function mountStory(root, steps, { reduced, onStep, side = true } = {}) {
  const stage = root.querySelector('.stage');
  const canvas = stage.querySelector('canvas'), overlay = stage.querySelector('.overlay');
  let world = null;
  try { world = createWorld(canvas, overlay, { reduced }); } catch { world = null; }
  root.classList.toggle('flat', !world);
  const els = [...root.querySelectorAll('[data-step]')];
  let current = -1;
  function show(i) {
    if (i === current) return;
    current = i;
    const s = steps[i];
    els.forEach((e, k) => e.classList.toggle('on', k === i));
    if (world && s) {
      world.setSystem(layout(s.design), { instant: i === 0 && !world._started });
      world._started = true;
      const f = world.frame();
      const c = s.cam || {};
      const isSide = side && c.side !== false;
      world.setCamera({ t: c.t || f.t, dist: (c.dist || f.dist) * (c.zoom || 1), az: c.az ?? 42, el: c.el ?? 30, sx: c.sx ?? (isSide ? 0.68 : 0.5), sy: c.sy ?? 0.54, phoneSy: c.phoneSy ?? 0.58 }, { instant: i === 0 && current === 0 && !world._camSet });
      world._camSet = true;
      world.setState({ ...s.state, avoid: isSide ? 0.47 : 0 });
    }
    onStep?.(i);
  }
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) show(Number(e.target.dataset.step)); }, { rootMargin: '-45% 0px -45% 0px' });
  const reveal = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('seen'); reveal.unobserve(e.target); } }, { threshold: 0.15 });
  els.forEach((e) => { io.observe(e); reveal.observe(e); });
  show(0);
  return { world, show, destroy() { io.disconnect(); reveal.disconnect(); world?.destroy(); } };
}

/** the stage markup (sticky, spans the story) */
export const stageHtml = (extra = '') => `<div class="stage-wrap" aria-hidden="true"><div class="stage"><canvas></canvas><div class="overlay"></div>${extra}</div></div>`;

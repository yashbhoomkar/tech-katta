// A scroll story: the scroll drives the animation, then the words take over.
// Step 0 is the opening (a normal screen). Every later step is a tall section in two phases:
//   1. while the section scrolls into place (its top travels from the bottom of the screen to the top), the 3D world
//      plays the change from the previous step to this one: the camera travels, new parts rise one by one, colours
//      blend. The scene is centre stage and the old words have scrolled away. Scroll back and it plays backwards.
//   2. then the section is pinned: the words fade in and the scene slides aside to make room. They stay while you
//      read, and leave as the next section starts its own animation.
// Nothing runs on a timer: where you are on the page is where the animation is.
import { createWorld } from './world.js';
import { layout } from './sim.js';

const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const lerpCam = (a, b, k) => ({ t: [lerp(a.t[0], b.t[0], k), lerp(a.t[1], b.t[1], k)], dist: lerp(a.dist, b.dist, k), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), sx: lerp(a.sx, b.sx, k), sy: lerp(a.sy, b.sy, k), phoneSy: lerp(a.phoneSy, b.phoneSy, k) });

/** the camera that frames a design (the world measures it; we keep our own copy so the scroll can blend) */
/** a step's 3D system: a hand-built one (step.system) or the layout of a simulator design (step.design) */
const sysOf = (step) => step.system || layout(step.design);

function frameOf(step) {
  const ps = Object.values(sysOf(step).parts);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ps) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const span = Math.max(x1 - x0, z1 - z0, 4);
  return { t: [(x0 + x1) / 2, (z0 + z1) / 2], dist: span * 2.2 + 12 };
}

export function mountStory(root, steps, { reduced, onStep, intro = false } = {}) {
  const stage = root.querySelector('.stage');
  const canvas = stage.querySelector('canvas'), overlay = stage.querySelector('.overlay');
  let world = null;
  try { world = createWorld(canvas, overlay, { reduced }); } catch { world = null; }
  root.classList.toggle('flat', !world);
  const els = [...root.querySelectorAll('[data-step]')];
  // every step after the opening: pin its words so they can wait for the animation
  els.forEach((el, i) => {
    if (i === 0) return;
    el.classList.add('scrub');
    const pin = document.createElement('div'); pin.className = 'pin';
    while (el.firstChild) pin.appendChild(el.firstChild);
    el.appendChild(pin);
  });

  // each step's two cameras: centre stage (while it animates) and aside (while you read)
  const cams = steps.map((s) => {
    const f = frameOf(s), c = s.cam || {};
    const base = { t: c.t || f.t, dist: (c.dist || f.dist) * (c.zoom || 1), az: c.az ?? 42, el: c.el ?? 30, phoneSy: c.phoneSy ?? 0.58 };
    const side = c.side !== false;
    // centre: the system is the focus while the scroll plays the change (closer, centre stage);
    // aside: the words are the focus while you read (further away, to the side, faded by --read in app.css)
    return { centre: { ...base, dist: base.dist * 0.86, sx: c.cx ?? 0.5, sy: c.sy ?? (side ? 0.52 : 0.6) }, aside: { ...base, dist: base.dist * 1.18, sx: side ? (c.sx ?? 0.7) : 0.5, sy: c.sy ?? 0.54 }, side };
  });

  let sysKey = '';
  function system(key, design) { if (key !== sysKey && world) { sysKey = key; world.setSystem(design); } }
  const union = (a, b) => { const A = sysOf(a), B = sysOf(b); return { parts: { ...A.parts, ...B.parts }, paths: { ...A.paths, ...B.paths } }; };

  let raf = 0, lastStep = -1;
  function update() {
    raf = 0;
    const vh = innerHeight;
    // which step is animating or showing: the last one whose section has started to come in
    let i = 0, a = 1, t = 1;
    for (let k = 1; k < els.length; k++) {
      const r = els[k].getBoundingClientRect();
      if (r.top < vh) { i = k; a = clamp((vh - r.top) / (vh * 0.8)); t = clamp((vh * 0.24 - r.top) / (vh * 0.22)); }
    }
    if (i === 0) { a = 1; t = 1; if (introRaf && lastStep <= 0) { lastStep = 0; onStep?.(0, 0, 1); return; } }
    // the words: hidden while the scene animates, then in
    els.forEach((el, k) => { if (k > 0) { const v = k === i ? t : k === i - 1 && i > 0 ? 1 - clamp(a * 1.6) : 0; el.style.setProperty('--t', v.toFixed(3)); el.classList.toggle('live', k === i && t > 0.5); } });
    if (world) {
      const cur = steps[i], prev = steps[Math.max(0, i - 1)];
      if (i > 0 && a < 1) {
        // phase 1: from the previous step to this one, driven by the scroll
        const m = ease(a);
        system(`u${i}`, union(prev, cur));
        const before = sysOf(prev).parts, after = sysOf(cur).parts;
        const reveal = {};
        const fresh = Object.keys(after).filter((id) => !before[id]).sort((p, q) => after[p].x - after[q].x || after[p].z - after[q].z);
        const gap = Math.min(0.09, 0.45 / Math.max(1, fresh.length));
        fresh.forEach((id, n) => { reveal[id] = clamp((a - 0.15 - n * gap) / 0.35); });
        for (const id of Object.keys(before)) if (!after[id]) reveal[id] = 1 - clamp(a / 0.5);
        world.setState({ ...cur.state, avoid: 0 }, { from: prev.state, mix: m, reveal, rate: 9 });
        world.setCamera(lerpCam(cams[i - 1].side ? cams[i - 1].aside : cams[i - 1].centre, cams[i].centre, m), { rate: 7 });
        canvas.style.setProperty('--side', ((1 - m) * (cams[i - 1].side && i - 1 > 0 ? 1 : 0)).toFixed(3));
        // the system comes forward as soon as the scroll starts the change
        stage.style.setProperty('--read', (i - 1 > 0 ? 1 - clamp(a / 0.25) : 0).toFixed(3));
      } else {
        // phase 2: this step, while its words come in; the scene slides aside
        system(`s${i}`, sysOf(cur));
        const k = i === 0 ? 0 : ease(t), side = cams[i].side && i > 0;
        world.setState({ ...cur.state, avoid: side && k > 0.5 ? 0.47 : 0 }, { rate: 9 });
        world.setCamera(i === 0 ? cams[0].centre : lerpCam(cams[i].centre, cams[i].aside, k), { rate: 7 });
        canvas.style.setProperty('--side', (side ? k : 0).toFixed(3));
        stage.style.setProperty('--read', k.toFixed(3));
      }
    }
    const frac = i === 0 ? 0 : i - 1 + (a < 1 ? a * 0.5 : 0.5 + t * 0.5);
    if (i !== lastStep || true) onStep?.(i, frac, t);
    lastStep = i;
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (world) { system('s0', sysOf(steps[0])); world.setState(steps[0].state); world.setCamera(cams[0].centre, { instant: true }); }
  // the opening builds itself: parts rise out of the floor one by one, from the users to the database
  let introRaf = 0;
  if (world && intro && !reduced) {
    const order = Object.entries(sysOf(steps[0]).parts).sort((a, b) => a[1].x - b[1].x || a[1].z - b[1].z).map(([id]) => id);
    const t0 = performance.now();
    const tick = (now) => {
      if (lastStep > 0) { introRaf = 0; return; } // the reader has scrolled on: the story takes over
      const t = (now - t0) / 1000, reveal = {};
      order.forEach((id, k) => { reveal[id] = clamp((t - 0.15 - k * 0.13) / 0.45); });
      world.setState(steps[0].state, { reveal, rate: 12 });
      if (t < 0.6 + order.length * 0.13) introRaf = requestAnimationFrame(tick); else { introRaf = 0; world.setState(steps[0].state); }
    };
    introRaf = requestAnimationFrame(tick);
  }
  update();
  return { world, destroy() { cancelAnimationFrame(raf); cancelAnimationFrame(introRaf); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); world?.destroy(); } };
}

/** the stage markup (sticky, spans the story) */
export const stageHtml = (extra = '') => `<div class="stage-wrap" aria-hidden="true"><div class="stage"><canvas></canvas><div class="overlay"></div>${extra}</div></div>`;

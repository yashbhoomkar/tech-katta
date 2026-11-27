// The 3D engine, loaded when it is wanted, not when the page opens. world.js pulls in three.js (676 KB) and, once it draws, keeps the phone's main thread busy
// (a budget phone at 4x CPU: 5 to 7 s of blocking in the first view). So no page imports world.js any more; they import createWorld from here. It answers at once with a
// world that keeps what the page tells it (the system, the state, the camera, the labels) and replays it on the real engine the moment that arrives, so the callers
// (story.js, the pages) did not have to change. Until then the stage shows its poster: an image of the same scene, already drawn.
//
// When the engine loads (the trade-off, measured in e2e/perf-first-view.spec.ts):
//   · reading the page comes first: nothing loads before the first view is painted and the page has been left alone for a while (IDLE_AT), so a tap on a link in the
//     first seconds is answered at once; then the engine loads in an idle moment;
//   · sooner when the reader asks for it: a tap on the picture, "Play in 3D", or the first scroll of a page that is a scroll story (the scroll is what drives it);
//   · a card that scrolls into view (a list's preview, an article's figure) loads it then, never before it can be seen;
//   · never by itself on a weak device (a phone with 4 or fewer cores or 4 GB or less, Data Saver on, a device that was measured too slow), or when the reader asks for
//     less motion: the poster stays and "Play in 3D" is offered. The canvas and the Replay still work on demand.
const IDLE_AT = 6000; // ms after the navigation started: the earliest the engine starts by itself (a tap in the first seconds is answered, nothing competes with the first view)
const Q_KEY = 'tk-r3d-q', PLAY_KEY = 'tk-3d-played';

export const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const phoneClass = () => { try { return matchMedia('(pointer: coarse)').matches || innerWidth <= 760; } catch { return false; } };
/** why this device should not start 3D by itself ('' when it can) */
export function whyNotAuto() {
  const n = navigator;
  if (reducedMotion()) return 'reduced-motion';
  if (n.connection?.saveData) return 'save-data';
  try { if (localStorage.getItem(Q_KEY) === '2') return 'slow-frames'; } catch { /* storage blocked */ } // world.js measured it too slow to hold 45 fps
  try { if (sessionStorage.getItem(PLAY_KEY)) return ''; } catch { /* storage blocked */ } // the reader pressed Play in 3D on this visit: the other pages follow
  if (phoneClass() && ((n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4)) return 'weak-device';
  return '';
}

let engine = null; // the import, once started (world.js and three.js are fetched once for the whole visit)
const loadEngine = () => engine || (engine = import('./world.js'));
let probed = null;
/** can this browser draw WebGL at all (a throw-away canvas, once, only when 3D is about to start) */
function hasWebGL() {
  if (probed === null) { try { const c = document.createElement('canvas'); probed = !!(c.getContext('webgl2') || c.getContext('webgl')); c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { probed = false; } }
  return probed;
}

const afterFirstView = (fn) => {
  const go = () => { const left = IDLE_AT - performance.now(); if (left > 0) setTimeout(go, left); else if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 4000 }); else setTimeout(fn, 200); };
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
};

/**
 * createWorld(canvas, overlay, { reduced, still, label, start })  →  the same object world.js gives, plus ready, play(), onReady(fn)
 *   start: 'idle' (default; the stage the page is about) · 'visible' (a card: when it scrolls into view) · 'scroll' (a scroll story: also on the first scroll) · 'manual'
 */
export function createWorld(canvas, overlay, opts = {}) {
  const { start = 'idle', label = '', button = true } = opts; // button: false for a decorative card (aria-hidden): where 3D will not start by itself, it stays without
  const host = canvas.parentElement;
  if (label) { canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label); }
  let real = null, dead = false, started = false, failed = false, btn = null, io = null; const ready = [], undo = [];
  const kept = { system: null, state: null, camera: null, band: null, top: null, minX: null, mode: null, pick: null };
  const setHost = (s) => { if (host) host.dataset.three = s; };
  const why = whyNotAuto();
  setHost('poster');

  const run = async () => {
    if (started || dead) return; started = true;
    btn?.remove(); btn = null; undo.forEach((f) => f()); undo.length = 0; setHost('loading');
    try {
      if (!hasWebGL()) throw new Error('no webgl');
      const m = await loadEngine();
      if (dead) return;
      real = m.createWorld(canvas, overlay, { reduced: opts.reduced, still: opts.still }) || null;
      if (!real) throw new Error('no world');
    } catch { failed = true; setHost('none'); opts.onFail?.(); return; }
    // what the page said so far, in the order it matters; the camera is set where it was (no flight from the default)
    if (kept.system) real.setSystem(kept.system.a, kept.system.o);
    if (kept.state) real.setState(kept.state.a, kept.state.o);
    if (kept.band !== null) real.setLabelBand(kept.band);
    if (kept.top !== null) real.setLabelTop(kept.top);
    if (kept.minX !== null) real.setLabelMinX(kept.minX);
    if (kept.mode !== null) real.setLabelMode(kept.mode);
    if (kept.pick) real.onPick(kept.pick);
    if (kept.camera) real.setCamera(kept.camera.a, { ...(kept.camera.o || {}), instant: true });
    setHost('on'); ready.splice(0).forEach((f) => f(real));
  };

  // a button is offered where the 3D will not start by itself
  const offer = () => {
    if (!host || btn || started) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'play3d'; btn.textContent = 'Play in 3D';
    btn.setAttribute('aria-label', 'Play in 3D: draw this scene live');
    btn.addEventListener('click', (e) => { e.stopPropagation(); try { sessionStorage.setItem(PLAY_KEY, '1'); } catch { /* storage blocked */ } run(); });
    host.appendChild(btn);
  };

  if (start === 'manual' || why) { if (button) offer(); else { setHost('none'); opts.onFail?.(); } }
  else if (start === 'visible') {
    if (typeof IntersectionObserver === 'undefined') afterFirstView(run);
    else { io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); afterFirstView(run); } }, { rootMargin: '200px' }); io.observe(host || canvas); }
  } else {
    afterFirstView(run);
    if (start === 'scroll') {
      const onScroll = () => { if (scrollY > 40) { removeEventListener('scroll', onScroll); afterFirstView(run); } };
      addEventListener('scroll', onScroll, { passive: true }); undo.push(() => removeEventListener('scroll', onScroll));
    }
    // a press on the picture asks for it at once
    const press = () => run(); canvas.addEventListener('pointerdown', press, { once: true }); undo.push(() => canvas.removeEventListener('pointerdown', press));
  }

  const keep = (k) => (a, o) => { kept[k] = { a, o }; real?.[{ system: 'setSystem', state: 'setState', camera: 'setCamera' }[k]](a, o); };
  const frame = (pad = 1) => {
    if (real) return real.frame(pad);
    const ps = Object.values(kept.system?.a?.parts || {});
    if (!ps.length) return { t: [0, 0], dist: 30 };
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of ps) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    return { t: [(x0 + x1) / 2, (z0 + z1) / 2], dist: (Math.max(x1 - x0, z1 - z0, 4) * 2.2 + 12) * pad };
  };
  const api = {
    get ready() { return !!real; }, get failed() { return failed; }, get lazy() { return true; },
    play: run, onReady: (fn) => { if (real) fn(real); else ready.push(fn); },
    setSystem: keep('system'), setState: keep('state'), setCamera: keep('camera'), frame,
    setLabelBand: (y) => { kept.band = y; real?.setLabelBand(y); }, setLabelTop: (v) => { kept.top = v; real?.setLabelTop(v); },
    setLabelMinX: (v) => { kept.minX = v; real?.setLabelMinX(v); }, setLabelMode: (m) => { kept.mode = m; real?.setLabelMode(m); },
    onPick: (cb) => { kept.pick = cb; real?.onPick(cb); },
    pickAt: (...a) => (real ? real.pickAt(...a) : null), groundAt: (...a) => (real ? real.groundAt(...a) : null),
    getCamera: () => (real ? real.getCamera() : { ...(kept.camera?.a || {}), t: [...(kept.camera?.a?.t || [0, 0])] }),
    screenOf: (id) => (real ? real.screenOf(id) : null), snapshot: (w) => (real ? real.snapshot?.(w) : null),
    destroy() { dead = true; io?.disconnect(); undo.forEach((f) => f()); btn?.remove(); if (real) { try { real.destroy(); } catch { /* gone */ } real = null; } setHost('poster'); },
  };
  return api;
}

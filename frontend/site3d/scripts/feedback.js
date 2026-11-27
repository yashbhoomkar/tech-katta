// The Report button, on every page of the site (the 3D shell, and /health and /analytics through feedback-boot.js). The button and the popup it opens are
// ours (feedback-ui.js): Quick feedback (words) and Visual feedback (a screenshot taken when that tab opens), sent to BugDrop's hosted worker, which makes
// the GitHub issue in yashbhoomkar/tech-katta-feedback. BugDrop's own script is no longer loaded. On for everyone by default (owner, 2026-11-26);
// ?feedback=off hides the button in this browser, ?feedback=on shows it again. Not drawn in automated browsers (navigator.webdriver) unless a test says it is not one.
import { feedbackParam, feedbackWanted } from './feedback-core.js';
import { hold, grab } from './feedback-hold.js';
import { pixelRatioFor } from './feedback-core.js';
export { feedbackParam, feedbackWanted };
const KEY = 'tk-feedback';
let uiMod = null, uiLoad = null, capMod = null; // feedback-ui.js once loaded, and the promise of it while it loads
const loadUi = () => (uiLoad ||= import('./feedback-ui.js').then((m) => (uiMod = m), (e) => { uiLoad = null; throw e; }));

const CSS = `
:root { --tk-blue: #1d4ed8; } /* white on this blue is 6.7:1; on the dark pages it is the one bright thing at the screen's edge */
.tk-report { position: fixed; z-index: 70; left: 0; top: 38%; width: 32px; height: 92px; margin: 0; padding: 0; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-left: 0; border-radius: 0 12px 12px 0;
  background: var(--tk-blue, #1d4ed8); color: #fff; font: 600 13px/1 var(--font, system-ui, sans-serif); letter-spacing: .04em; writing-mode: vertical-rl; cursor: pointer; box-shadow: var(--shadow-2, 0 2px 10px rgb(0 0 0 / .18)); -webkit-tap-highlight-color: transparent; }
.tk-report::before { content: ""; position: absolute; inset: -6px -10px -6px 0; } /* a bigger target than the tab looks */
.tk-report:focus-visible { outline: 2px solid var(--accent, currentColor); outline-offset: 2px; } .tk-report[aria-busy] { opacity: .6; }
@media (min-width: 901px) { .tk-report { left: auto; right: 0; top: auto; bottom: 96px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-right: 0; border-radius: 12px 0 0 12px; } .tk-report::before { inset: -6px 0 -6px -10px; } }
.tk-report-pop { position: fixed; z-index: 2147483000; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: var(--scrim, rgb(0 0 0 / .45)); }
.tk-rp-box { box-sizing: border-box; width: 100%; max-width: 480px; max-height: 92%; display: flex; flex-direction: column; border-radius: 22px 22px 0 0; background: var(--card, var(--bg, #fff)); color: var(--ink, #111); font: 15px/1.45 var(--font, system-ui, sans-serif); box-shadow: var(--shadow-3, 0 -12px 40px rgb(0 0 0 / .35)); padding-bottom: env(safe-area-inset-bottom, 0px); animation: tk-rp-rise .22s ease-out; transition: transform .2s; }
@keyframes tk-rp-rise { from { transform: translateY(24px); opacity: .6; } }
@media (prefers-reduced-motion: reduce) { .tk-rp-box { animation: none; transition: none; } .tk-rp-spin { animation: none; } }
.tk-rp-grab { flex: none; display: grid; place-items: center; height: 26px; touch-action: none; cursor: grab; } .tk-rp-grab i { width: 40px; height: 5px; border-radius: 3px; background: var(--line-2, rgb(128 128 128 / .5)); }
.tk-rp-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 6px 4px 20px; } .tk-rp-head b { font-size: 18px; }
.tk-rp-x { width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 18px; cursor: pointer; }
.tk-rp-tabs { flex: none; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; margin: 4px 20px 12px; padding: 4px; border-radius: 12px; background: var(--sunken, rgb(128 128 128 / .15)); }
.tk-rp-tabs button { min-height: 44px; border: 0; border-radius: 9px; background: transparent; color: var(--ink-2, inherit); font: 600 14px var(--font, system-ui, sans-serif); cursor: pointer; }
.tk-rp-tabs button[aria-selected="true"] { background: var(--page, var(--bg, #fff)); color: var(--ink, #111); box-shadow: 0 1px 3px rgb(0 0 0 / .2); }
.tk-rp-body { flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 12px; align-content: start; padding: 0 20px 20px; overscroll-behavior: contain; }
.tk-rp-chips { display: flex; gap: 8px; } .tk-rp-chips button { min-height: 44px; padding: 0 20px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 999px; background: transparent; color: inherit; font: 600 14px var(--font, system-ui, sans-serif); cursor: pointer; }
.tk-rp-chips button[aria-checked="true"] { background: var(--ink, #111); border-color: var(--ink, #111); color: var(--page, var(--bg, #fff)); }
.tk-rp-f { display: grid; gap: 6px; font-size: 14px; } .tk-rp-f span { color: var(--ink-2, inherit); }
.tk-rp-f textarea { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 12px; background: var(--page, var(--bg, #fff)); color: inherit; font: 16px/1.4 var(--font, system-ui, sans-serif); resize: vertical; }
.tk-rp-hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
.tk-rp-small { margin: 0; font-size: 13px; color: var(--ink-3, var(--ink-2, inherit)); } .tk-rp-note { margin: 0; min-height: 1.2em; font-size: 14px; }
.tk-rp-act { display: flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 16px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 12px; background: transparent; color: inherit; font: 600 15px var(--font, system-ui, sans-serif); text-decoration: none; cursor: pointer; }
.tk-rp-act.main { background: var(--tk-blue, #1d4ed8); border-color: var(--tk-blue, #1d4ed8); color: #fff; } .tk-rp-act.quiet { border-color: transparent; color: var(--ink-2, inherit); } .tk-rp-act:disabled { opacity: .45; cursor: default; }
.tk-rp-foot { position: sticky; bottom: 0; display: grid; gap: 8px; padding: 10px 0 2px; background: var(--card, var(--bg, #fff)); }
.tk-rp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tk-rp-shot { display: grid; place-items: center; min-height: 120px; max-height: 30vh; overflow: hidden; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 12px; background: var(--sunken, rgb(128 128 128 / .12)); }
.tk-rp-shot img { display: block; max-width: 100%; max-height: 30vh; object-fit: contain; } .tk-rp-shot.wait, .tk-rp-shot.fail { padding: 16px; text-align: center; font-size: 14px; color: var(--ink-2, inherit); } .tk-rp-shot small { display: block; margin-top: 6px; opacity: .7; }
.tk-rp-spin { display: inline-block; width: 16px; height: 16px; margin-right: 8px; vertical-align: -3px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: tk-rp-spin .7s linear infinite; } @keyframes tk-rp-spin { to { transform: rotate(360deg); } }
.tk-mk { display: grid; gap: 8px; }
.tk-mk-stage { position: relative; display: grid; place-items: center; min-height: 120px; overflow: hidden; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 12px; background: var(--sunken, rgb(128 128 128 / .12)); }
.tk-mk-stage canvas { display: block; max-width: 100%; max-height: 34vh; width: auto; height: auto; touch-action: none; cursor: crosshair; background: #fff; -webkit-user-select: none; user-select: none; }
.tk-mk-fs { position: absolute; top: 6px; right: 6px; min-width: 44px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 22px; background: rgb(0 0 0 / .7); color: #fff; font: 600 13px var(--font, system-ui, sans-serif); cursor: pointer; }
.tk-mk-bar { display: flex; align-items: center; gap: 4px; overflow-x: auto; padding: 2px 0; scrollbar-width: none; -webkit-overflow-scrolling: touch; } .tk-mk-bar::-webkit-scrollbar { display: none; }
.tk-mk-bar { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 22px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 22px), transparent); } /* the row scrolls: its right edge fades to say so */
.tk-mk-t { flex: none; display: grid; place-items: center; align-content: center; gap: 2px; min-width: 52px; min-height: 52px; padding: 0 6px; border: 1px solid transparent; border-radius: 12px; background: transparent; color: inherit; cursor: pointer; font: 600 11px var(--font, system-ui, sans-serif); }
.tk-mk-t i { font-style: normal; font-size: 18px; line-height: 1; } .tk-mk-t small { font-size: 11px; color: var(--ink-2, inherit); }
.tk-mk-t[aria-pressed="true"] { background: var(--tk-blue, #1d4ed8); color: #fff; } .tk-mk-t[aria-pressed="true"] small { color: #fff; } .tk-mk-t:disabled { opacity: .35; cursor: default; }
.tk-mk-sep { flex: none; width: 1px; height: 28px; margin: 0 4px; background: var(--line-2, rgb(128 128 128 / .5)); }
.tk-mk-cols { flex: none; display: flex; }
.tk-mk-c { flex: none; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; cursor: pointer; }
.tk-mk-c i { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--card, #fff); box-shadow: 0 0 0 1px var(--line-2, rgb(128 128 128 / .6)); }
.tk-mk-c[aria-checked="true"] i { box-shadow: 0 0 0 3px var(--ink, #111); }
.tk-mk-text { position: absolute; z-index: 2; width: 150px; height: 36px; box-sizing: border-box; padding: 0 8px; border: 2px solid currentColor; border-radius: 8px; background: rgb(255 255 255 / .92); font: 700 16px var(--font, system-ui, sans-serif); }
.tk-mk-full { position: fixed; inset: 0; z-index: 5; grid-template-rows: minmax(0, 1fr) auto; align-content: stretch; padding: 10px 10px calc(8px + env(safe-area-inset-bottom, 0px)); background: var(--card, var(--bg, #fff)); }
.tk-mk-full .tk-mk-stage { min-height: 0; } .tk-mk-full .tk-mk-stage canvas { max-height: calc(100vh - 190px); max-height: calc(100dvh - 190px); }
.tk-mk-full .tk-mk-t { min-width: 44px; padding: 0 3px; } .tk-mk-full .tk-mk-sep { display: none; }
.tk-mk-full .tk-mk-bar { flex-wrap: wrap; justify-content: center; overflow: visible; -webkit-mask-image: none; mask-image: none; } /* room for every tool, the colours and Undo at once */
.tk-mk-full .tk-mk-fs { background: var(--tk-blue, #1d4ed8); }
.tk-rp-done { display: grid; gap: 10px; padding-top: 4px; } .tk-rp-done b { font-size: 19px; } .tk-rp-done p { margin: 0; color: var(--ink-2, inherit); }
@media (min-width: 901px) { .tk-report-pop { align-items: center; } .tk-rp-box { border-radius: 20px; } .tk-rp-grab { display: none; } .tk-rp-head { padding-top: 14px; } }
`;

/** draw the button (once) unless the address or this browser's choice hides it */
export function startFeedback() {
  let stored = null; try { stored = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  const p = feedbackParam(location.search);
  if (p) { try { if (p === 'off') localStorage.setItem(KEY, '0'); else localStorage.removeItem(KEY); } catch { /* blocked: this page only */ } }
  // not in automated browsers (the end-to-end tests say they are not one): a report there would only add noise
  if (navigator.webdriver || !feedbackWanted(location.search, stored) || document.querySelector('.tk-report')) return;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tk-report'; b.textContent = 'Report'; b.setAttribute('aria-label', 'Report a problem');
  b.addEventListener('click', async () => {
    performance.mark('tk-report:tap');
    const geometry = { w: innerWidth, h: innerHeight, x: scrollX, y: scrollY }; // what the person is looking at
    const grabbed = grab(pixelRatioFor(devicePixelRatio)); // first: the 3D canvases are copied, while they are fresh
    const held = hold(); // then the page's 3D stops drawing, so what follows is not stuck behind its frames
    try {
      // the popup's code is normally loaded already (when the browser was idle): then the popup opens in this very task, with nothing to wait for
      (uiMod || await loadUi()).openReport(b, held, capMod, { geometry, grabbed });
    } catch (e) { held(); throw e; }
  });
  document.body.appendChild(b);
  // when the browser is idle: load the popup and the screenshot code, and work out the fonts once, so pressing Report has nothing left to fetch
  const warm = () => {
    // the mark 'tk-report:ready' says all of it is loaded and the fonts are worked out (the speed tests wait for it)
    Promise.all([loadUi(), import('./feedback-capture.js').then((m) => { capMod = m; return m.preload(); })]).then(() => performance.mark('tk-report:ready')).catch(() => {});
  };
  const go = () => (window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 2000 }) : setTimeout(warm, 1500));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}

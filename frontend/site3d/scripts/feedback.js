// The Report button. The button is ours: it is drawn by this file on every page of the site (the 3D shell, and /health and /analytics through
// feedback-boot.js), so it never depends on a third-party script to appear. BugDrop (a report becomes a GitHub issue in the owner's
// yashbhoomkar/tech-katta-feedback, with a screenshot) is loaded only when the button is pressed, with its own button turned off
// (data-button="false"), and opened through its JavaScript API, window.BugDrop.open() (bugdrop.dev/docs/javascript-api). If the script is blocked (an
// ad blocker, a browser's tracking protection, a private DNS) or does not open within 4 s, a small sheet says so and offers a prefilled GitHub issue
// and "Copy details". On for everyone by default (owner, 2026-11-26); ?feedback=off hides it in this browser, ?feedback=on shows it again.
// The host's CSP allows bugdrop.neonwatty.workers.dev (hosting/routes.json).
const KEY = 'tk-feedback', SRC = 'https://bugdrop.neonwatty.workers.dev/widget.js', REPO = 'yashbhoomkar/tech-katta-feedback', WAIT = 4000;

/** "on" | "off" from the address's ?feedback=, else null */
export function feedbackParam(search = '') { const m = /[?&]feedback=(on|off)(?:&|$)/.exec(search); return m ? m[1] : null; }
/** whether to show the button: the address decides when it says so, else what this browser remembered */
export function feedbackWanted(search, stored) { const p = feedbackParam(search); return p ? p === 'on' : stored !== '0'; }

/** what a report needs to be useful, as text (for the new-issue body and for Copy details) */
export function reportDetails({ page = '', ua = '', viewport = '', time = '' } = {}) {
  return [`Page: ${page}`, `Browser: ${ua}`, `Window: ${viewport}`, `Time: ${time}`].join('\n');
}
/** a new issue in the feedback repository with those details already in its body (a long body is cut: GitHub refuses very long addresses) */
export function reportIssueUrl(d = {}) {
  const body = `What happened?\n\n\n\n---\n${reportDetails(d)}`.slice(0, 1800);
  return `https://github.com/${REPO}/issues/new?title=${encodeURIComponent('Report: ')}&body=${encodeURIComponent(body)}`;
}

const details = () => ({ page: location.href, ua: navigator.userAgent, viewport: `${innerWidth}×${innerHeight} at ${devicePixelRatio || 1}x`, time: new Date().toISOString() });
const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/** resolves true once BugDrop's API answers, false if the script errors or says nothing for `ms` */
function loadBugDrop(ms = WAIT) {
  return new Promise((resolve) => {
    if (window.BugDrop?.open) return resolve(true);
    let s = document.querySelector('script[data-tk-feedback]');
    const done = (ok) => { clearInterval(iv); if (!ok) s?.remove(); resolve(ok); }; // a failed script is removed, so the next press tries again
    if (!s) {
      s = document.createElement('script'); // a classic script, not async: BugDrop reads its settings from its own tag while it runs
      s.src = SRC; s.async = false; s.dataset.tkFeedback = '1'; s.dataset.repo = REPO; s.dataset.theme = theme();
      s.dataset.button = 'false'; // ours is the button
      s.dataset.sendConsoleLogs = 'true';
      document.head.appendChild(s);
    }
    s.addEventListener('error', () => done(false));
    const t0 = Date.now(), iv = setInterval(() => { if (window.BugDrop?.open) done(true); else if (Date.now() - t0 > ms) done(false); }, 100);
  });
}

let busy = false;
async function open(btn) {
  if (busy) return; busy = true; btn.setAttribute('aria-busy', 'true');
  try { if ((await loadBugDrop()) && (() => { try { window.BugDrop.open(); return true; } catch { return false; } })()) return; sheet(); }
  finally { busy = false; btn.removeAttribute('aria-busy'); }
}

/** "Your browser blocked the report form": a prefilled issue, Copy details, Close */
function sheet() {
  if (document.querySelector('.tk-report-back')) return;
  const d = details(), back = document.createElement('div'); back.className = 'tk-report-back';
  back.innerHTML = '<div class="tk-report-sheet" role="dialog" aria-modal="true" aria-labelledby="tk-report-t"><h2 id="tk-report-t">Your browser blocked the report form.</h2>'
    + '<p>That is usually an ad blocker or a privacy setting. You can still tell us: both of these send what we need to find the problem.</p>'
    + '<a class="tk-report-act main" target="_blank" rel="noopener"></a><button type="button" class="tk-report-act" data-copy>Copy details</button><button type="button" class="tk-report-act quiet" data-close>Close</button><p class="tk-report-note" role="status" aria-live="polite"></p></div>';
  back.querySelector('a').href = reportIssueUrl(d); back.querySelector('a').textContent = 'Open a GitHub issue';
  const close = () => { back.remove(); removeEventListener('keydown', key); }, key = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  back.querySelector('[data-copy]').addEventListener('click', async () => {
    const text = reportDetails(d); let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch { /* blocked */ } t.remove();
    }
    back.querySelector('.tk-report-note').textContent = ok ? 'Copied. Paste it into your message.' : 'Could not copy. Select the text in the issue link instead.';
  });
  addEventListener('keydown', key); document.body.appendChild(back); back.querySelector('.tk-report-act').focus();
}

const CSS = `
.tk-report { position: fixed; z-index: 70; left: 0; top: 38%; width: 32px; height: 92px; margin: 0; padding: 0; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-left: 0; border-radius: 0 12px 12px 0;
  background: var(--card, var(--bg, #fff)); color: var(--ink, #111); font: 600 13px/1 var(--font, system-ui, sans-serif); letter-spacing: .04em; writing-mode: vertical-rl; cursor: pointer; box-shadow: 0 2px 10px rgb(0 0 0 / .18); -webkit-tap-highlight-color: transparent; }
.tk-report::before { content: ""; position: absolute; inset: -6px -10px -6px 0; } /* a bigger target than the tab looks */
.tk-report:focus-visible { outline: 2px solid var(--accent, currentColor); outline-offset: 2px; } .tk-report[aria-busy] { opacity: .6; }
@media (min-width: 901px) { .tk-report { left: auto; right: 0; top: auto; bottom: 96px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-right: 0; border-radius: 12px 0 0 12px; } .tk-report::before { inset: -6px 0 -6px -10px; } }
.tk-report-back { position: fixed; z-index: 2147483000; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgb(0 0 0 / .45); }
.tk-report-sheet { box-sizing: border-box; width: 100%; max-width: 440px; display: grid; gap: 10px; padding: 22px 20px calc(20px + env(safe-area-inset-bottom, 0px)); border-radius: 20px 20px 0 0; background: var(--card, var(--bg, #fff)); color: var(--ink, #111); font: 15px/1.45 var(--font, system-ui, sans-serif); box-shadow: 0 -12px 40px rgb(0 0 0 / .35); }
.tk-report-sheet h2 { margin: 0; font-size: 19px; line-height: 1.25; } .tk-report-sheet p { margin: 0; color: var(--ink-2, inherit); }
.tk-report-act { display: flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 16px; border: 1px solid var(--line-2, rgb(128 128 128 / .5)); border-radius: 12px; background: transparent; color: inherit; font: 600 15px var(--font, system-ui, sans-serif); text-decoration: none; cursor: pointer; }
.tk-report-act.main { background: var(--ink, #111); border-color: var(--ink, #111); color: var(--page, var(--bg, #fff)); } .tk-report-act.quiet { border-color: transparent; color: var(--ink-2, inherit); }
.tk-report-note { min-height: 1.2em; font-size: 14px; }
@media (min-width: 901px) { .tk-report-back { align-items: center; } .tk-report-sheet { border-radius: 20px; } }
`;

/** draw the button (once) unless the address or this browser's choice hides it */
export function startFeedback() {
  let stored = null; try { stored = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  const p = feedbackParam(location.search);
  if (p) { try { if (p === 'off') localStorage.setItem(KEY, '0'); else localStorage.removeItem(KEY); } catch { /* blocked: this page only */ } }
  // not in automated browsers (the end-to-end tests): a third-party widget there would only add noise
  if (navigator.webdriver || !feedbackWanted(location.search, stored) || document.querySelector('.tk-report')) return;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'tk-report'; b.textContent = 'Report'; b.setAttribute('aria-label', 'Report a problem');
  b.addEventListener('click', () => open(b));
  document.body.appendChild(b);
}

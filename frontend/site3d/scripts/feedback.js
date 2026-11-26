// The testers' feedback button (BugDrop: a report becomes a GitHub issue in the owner's private yashbhoomkar/tech-katta-feedback,
// with a screenshot). Off for everyone: opening any page with ?feedback=on turns it on in this browser, ?feedback=off turns it off.
// Ordinary visitors never load BugDrop's script. The host's CSP allows bugdrop.neonwatty.workers.dev (hosting/routes.json).
const KEY = 'tk-feedback', SRC = 'https://bugdrop.neonwatty.workers.dev/widget.js', REPO = 'yashbhoomkar/tech-katta-feedback';

/** "on" | "off" from the address's ?feedback=, else null */
export function feedbackParam(search = '') { const m = /[?&]feedback=(on|off)(?:&|$)/.exec(search); return m ? m[1] : null; }
/** whether to load the button: the address decides when it says so, else what this browser remembered */
export function feedbackWanted(search, stored) { const p = feedbackParam(search); return p ? p === 'on' : stored === '1'; }

export function startFeedback() {
  let stored = null; try { stored = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  const p = feedbackParam(location.search);
  if (p) { try { if (p === 'on') localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch { /* blocked: this page only */ } }
  if (!feedbackWanted(location.search, stored) || document.querySelector('script[data-tk-feedback]')) return;
  const s = document.createElement('script'); // a classic script, not async: BugDrop reads its settings from its own tag while it runs
  s.src = SRC; s.async = false; s.dataset.tkFeedback = '1'; s.dataset.repo = REPO;
  s.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  s.dataset.buttonStyle = 'tab'; // a slim tab on the edge, clear of the phone's bottom bar
  s.dataset.sendConsoleLogs = 'true';
  s.dataset.label = 'Report';
  document.head.appendChild(s);
}

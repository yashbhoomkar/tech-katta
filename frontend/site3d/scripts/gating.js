// The gate for the page being shown: the account's state put through gate.js, and the wording of the sign-in card.
// The wording comes from the site copy (GET /v1/site → account) where it has it; the sign-in card never depends on it, so it
// still reads right when the API cannot be reached.
import { accountState, onAccount, startAccount } from './account.js';
import { API } from './articles.js';
import { gateFor } from './gate.js';

let copy = null, state = 'idle'; // idle | loading | ready | failed
export const accountCopy = () => copy;
function loadCopy() {
  if (state !== 'idle') return;
  state = 'loading';
  fetch(`${API}/v1/site`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null))
    .then((s) => { copy = s?.account || null; state = copy ? 'ready' : 'failed'; }, () => { state = 'failed'; })
    .finally(() => document.dispatchEvent(new Event('tk-gate')));
}
/** ask for the account and the copy (the router does this once, at start) */
export function startGate() { loadCopy(); startAccount(); }

/** local development only: `localStorage.setItem('tk-dev-open', '1')` on localhost opens every page (the API still decides what text it sends) */
export function devOpen() { try { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('tk-dev-open') === '1'; } catch { return false; } }

/** "open" | "wait" | "preview" | "locked" for a kind of page (see gate.js) */
export function gateNow(kind, { free = false } = {}) { loadCopy(); return gateFor(kind, accountState(), { devOpen: devOpen(), free }); }
/** calls cb(gate) whenever the answer for this kind changes (the account arrived, or someone signed in or out) */
export function watchGate(kind, cb, opts) {
  let last = gateNow(kind, opts);
  const check = () => { const g = gateNow(kind, opts); if (g !== last) { last = g; cb(g); } };
  const off = onAccount(check); document.addEventListener('tk-gate', check);
  return () => { off(); document.removeEventListener('tk-gate', check); };
}

/** the wording of the sign-in card: "article" | "problem" | "page" */
export const CARD = {
  article: { title: 'Sign in to keep reading', text: 'Free with a Google account. Sign in once and everything opens, on every device.' },
  problem: { title: 'Sign in to design this', text: 'Free with a Google account. Sign in once and everything opens, on every device.' },
  page: { title: 'Sign in to open this', text: 'Free with a Google account. Sign in once and everything opens, on every device.' },
  dashboard: { title: 'Sign in to see your progress', text: 'Free with a Google account. Sign in once and everything opens, on every device.' },
  action: { title: 'Sign in to continue', text: 'Free with a Google account. Sign in once and everything opens, on every device.' },
};
export const UNAVAILABLE = 'Sign-in is unavailable right now. Please try again in a few minutes.';
export const NOT_NOW = 'Not now';

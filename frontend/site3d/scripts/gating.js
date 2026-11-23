// The gate for the page being shown: the site's account copy (GET /v1/site → account: pageLock, previewLock, the terms
// wording) and the account's state, put through gate.js.
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
/** "open" | "wait" | "preview" | "locked" for a kind of page ("open", "list", "article", "workspace") */
export function gateNow(kind) {
  if (kind === 'open') return 'open';
  loadCopy();
  if (state === 'failed') return 'open';
  return state === 'ready' ? gateFor(kind, accountState(), copy) : 'wait';
}
/** calls cb(gate) whenever the answer for this kind changes (the copy or the account arrived, or someone signed in or out) */
export function watchGate(kind, cb) {
  let last = gateNow(kind);
  const check = () => { const g = gateNow(kind); if (g !== last) { last = g; cb(g); } };
  const off = onAccount(check); document.addEventListener('tk-gate', check);
  return () => { off(); document.removeEventListener('tk-gate', check); };
}

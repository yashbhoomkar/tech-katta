// Sign-in for the 3D pages: a thin wrapper over the current app's account module (src/account.js), which is built
// into /3d/legacy/legacy.js (vite.site3d.config.js). Same API session, same terms rule, same Lab sync after sign-in.
// If that file cannot load (a local run without the build), the account counts as "sign-in unavailable":
// nothing is locked, as when the API cannot be reached.
let mod = null, loading = null;
const load = () => (loading ||= import('/3d/legacy/legacy.js').then((m) => (mod = m)).catch(() => { loading = null; return null; }));
const OFF = { ready: true, enabled: false, user: null };
let started = false;
/** ask who is signed in (once; the answer arrives as a "tk-account" event) */
export function startAccount() {
  if (started) return load();
  started = true;
  return load().then((m) => { if (m) return m.startAccount(); mod = null; document.dispatchEvent(new Event('tk-account')); });
}
/** { ready, enabled, user, error }: ready is false until the API has answered */
export function accountState() { return mod ? mod.account() : (started && loading ? { ready: false, enabled: false, user: null } : OFF); }
export function onAccount(cb) {
  const h = () => cb(accountState());
  addEventListener('tk-account', h); document.addEventListener('tk-account', h);
  return () => { removeEventListener('tk-account', h); document.removeEventListener('tk-account', h); };
}
export const setTermsChoice = (v) => mod?.setTermsChoice(v);
export const renderGoogleButton = (el, o) => load().then((m) => m.renderGoogleButton(el, o));
export const signOut = () => load().then((m) => m?.signOut());
export const signOutAll = () => load().then((m) => m?.signOutAll());

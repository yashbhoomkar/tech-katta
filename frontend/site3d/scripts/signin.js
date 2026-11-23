// The sign-in sheet: a glass dialog with the terms checkbox and the Google button (the button only appears once the
// terms are ticked, and the API refuses a sign-in without them, as in the current app). Opened from the sidebar's
// Account row and from the lock cards. `kind`: "page" and "preview" use the lock wording from the site copy, anything
// else the plain sign-in wording.
import { accountState, onAccount, renderGoogleButton, setTermsChoice, startAccount } from './account.js';
import { accountCopy } from './gating.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let open = null;

export function openSignIn(kind = 'plain') {
  if (open) return;
  const acc = accountCopy() || {}, lock = kind === 'page' ? acc.pageLock : kind === 'preview' ? acc.previewLock : null;
  const dlg = acc.signInDialog || { title: 'Sign in to Tech Katta', text: '', close: 'Close' };
  const title = lock?.title || dlg.title, text = lock?.text || dlg.text;
  const back = document.createElement('div'); back.className = 'signin-back';
  back.innerHTML = `<div class="signin glass" role="dialog" aria-modal="true" aria-labelledby="si-t">
    <h2 id="si-t">${esc(title)}</h2><p class="si-text">${esc(text)}</p>
    <div class="si-body"><p class="si-note muted">Checking sign-in…</p></div>
    <button type="button" class="btn light sm si-close">${esc(kind === 'plain' ? dlg.close || 'Close' : 'Not now')}</button></div>`;
  document.body.appendChild(back); document.body.classList.add('modal-open');
  const body = back.querySelector('.si-body'), prevFocus = document.activeElement;
  let terms = false, offAcc = () => {};
  const close = () => { offAcc(); back.remove(); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', onKey, true); open = null; try { prevFocus?.focus?.({ preventScroll: true }); } catch { /* gone */ } };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('.si-close')) close(); });
  const draw = (a) => {
    if (a.user) { close(); return; }
    if (!a.ready) return;
    if (!a.enabled) { body.innerHTML = `<p class="si-note">Sign-in isn't available right now. Your progress stays in this browser.</p>`; return; }
    if (body.querySelector('.si-terms')) return; // already drawn
    body.innerHTML = `<label class="si-terms"><input type="checkbox" ${terms ? 'checked' : ''}/><span>${esc(acc.agree || 'I agree to the')} <a href="/terms" target="_blank" rel="noopener">${esc(acc.termsLink || 'Terms and conditions')}</a> ${esc(acc.and || 'and the')} <a href="/privacy" target="_blank" rel="noopener">${esc(acc.privacyLink || 'Privacy policy')}</a></span></label>
      <div class="si-g" hidden></div><p class="si-note muted">${esc(acc.agreeFirst || 'Tick the box to agree to the Terms and conditions first.')}</p><p class="si-err" role="alert" hidden></p>`;
    const box = body.querySelector('input'), slot = body.querySelector('.si-g'), hint = body.querySelector('.si-note'), err = body.querySelector('.si-err');
    box.addEventListener('change', () => {
      terms = box.checked; setTermsChoice(terms); slot.hidden = !terms; hint.hidden = terms;
      if (terms && !slot.firstChild) renderGoogleButton(slot).catch(() => { err.textContent = acc.googleBlocked || "Google sign-in couldn't load. Check your connection and try again."; err.hidden = false; });
    });
  };
  offAcc = onAccount((a) => { draw(a); if (a.error === 'sign_in_failed') { const e = body.querySelector('.si-err'); if (e) { e.textContent = acc.signInFailed || "Sign-in didn't work. Try again."; e.hidden = false; } } });
  startAccount().then(() => draw(accountState()));
  draw(accountState());
  open = { close };
  (back.querySelector('input') || back.querySelector('.si-close')).focus({ preventScroll: true });
}

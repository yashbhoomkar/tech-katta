// Sign-in on the 3D pages (tech-katta-context 52): one card, used in two places.
//   inline : under the public part of a locked page (signInCard + wireSignInCard); never a pop-up on load or on scroll
//   dialog : a small dialog with the same card, opened only when a signed-out reader tries a gated action (requireSignIn)
// The card shows the terms checkbox and the "Sign in with Google" button at the same time; the button cannot be used until
// the box is ticked (it is inert, and the API refuses a sign-in without the terms anyway). When sign-in cannot be reached the
// card says so and nothing opens.
import { accountState, onAccount, renderGoogleButton, setTermsChoice, signInUnavailable, startAccount } from './account.js';
import { accountCopy, CARD, NOT_NOW, UNAVAILABLE } from './gating.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let open = null;

/** the card's HTML: kind is "article" | "problem" | "page" | "action" (the wording in gating.js CARD) */
export function signInCard(kind = 'article', { id = '' } = {}) {
  const c = CARD[kind] || CARD.page, acc = accountCopy() || {};
  return `<aside class="gate-card si-card" data-si="${esc(kind)}"${id ? ` id="${esc(id)}"` : ''} aria-label="${esc(c.title)}">
    <h2>${esc(c.title)}</h2><p class="si-text">${esc(c.text)}</p>
    <div class="si-body">
      <label class="si-terms"><input type="checkbox" data-si-terms/><span>${esc(acc.agree || 'I agree to the')} <a href="/terms" target="_blank" rel="noopener">${esc(acc.termsLink || 'Terms and conditions')}</a> ${esc(acc.and || 'and the')} <a href="/privacy" target="_blank" rel="noopener">${esc(acc.privacyLink || 'Privacy policy')}</a></span></label>
      <div class="si-g is-off" data-si-g inert aria-label="Sign in with Google"></div>
      <p class="si-hint muted" data-si-hint>${esc(acc.agreeFirst || 'Tick the box to agree to the Terms and conditions first.')}</p>
      <p class="si-err" role="alert" data-si-err hidden></p>
    </div></aside>`;
}

/** makes the card(s) inside root work: the checkbox turns the button on, the Google button is drawn, "unavailable" replaces the form */
export function wireSignInCard(root) {
  const offs = [];
  root.querySelectorAll('[data-si]').forEach((card) => {
    const acc = accountCopy() || {};
    const box = card.querySelector('[data-si-terms]'), slot = card.querySelector('[data-si-g]'), hint = card.querySelector('[data-si-hint]'), err = card.querySelector('[data-si-err]'), body = card.querySelector('.si-body');
    let drawn = false, unavailable = false;
    const fail = (msg) => { err.textContent = msg; err.hidden = false; };
    box.addEventListener('change', () => {
      setTermsChoice(box.checked);
      slot.inert = !box.checked; slot.classList.toggle('is-off', !box.checked); hint.hidden = box.checked;
      if (box.checked) err.hidden = true;
    });
    const draw = (a) => {
      if (a.user) return;
      if (!a.ready) return;
      if (signInUnavailable()) {
        if (!unavailable) { unavailable = true; body.innerHTML = `<p class="si-unavailable" role="status">${esc(UNAVAILABLE)}</p>`; }
        return;
      }
      if (!drawn && a.enabled) {
        drawn = true;
        renderGoogleButton(slot).catch(() => fail(acc.googleBlocked || "Google sign-in couldn't load. Check your connection and try again."));
      }
      if (a.error === 'sign_in_failed') fail(acc.signInFailed || "Sign-in didn't work. Try again.");
    };
    offs.push(onAccount(draw));
    startAccount().then(() => draw(accountState()));
    draw(accountState());
  });
  return () => offs.forEach((off) => off());
}

/** the dialog: the same card in a small modal. "Not now" (or Escape, or a click outside) closes it. */
export function openSignIn(kind = 'action') {
  if (open) return;
  const back = document.createElement('div'); back.className = 'signin-back';
  back.innerHTML = `<div class="signin glass" role="dialog" aria-modal="true" aria-label="Sign in">${signInCard(kind)}<button type="button" class="btn light sm si-close">${esc(NOT_NOW)}</button></div>`;
  document.body.appendChild(back); document.body.classList.add('modal-open');
  const prevFocus = document.activeElement;
  const offWire = wireSignInCard(back);
  const offAcc = onAccount((a) => { if (a.user) close(); });
  const close = () => { offWire(); offAcc(); back.remove(); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', onKey, true); open = null; try { prevFocus?.focus?.({ preventScroll: true }); } catch { /* gone */ } };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('.si-close')) close(); });
  open = { close };
  (back.querySelector('input') || back.querySelector('.si-close')).focus({ preventScroll: true });
}

/** for a gated action (Run, Submit, Play the story, mark complete, star, note): true when the reader is signed in; otherwise the dialog opens and the action does not run */
export function requireSignIn(kind = 'action') {
  const a = accountState();
  if (a.user) return true;
  openSignIn(kind);
  return false;
}

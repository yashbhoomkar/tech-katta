// The Report popup: a sheet on phones, a small dialog on wide screens, drawn by the site (not by BugDrop). Two tabs: Quick feedback (words only) and
// Visual feedback (the page is photographed when the tab opens, with a note). Sending is a POST to BugDrop's hosted worker, which makes the GitHub issue in
// yashbhoomkar/tech-katta-feedback. If that cannot be done (blocked, offline, refused) the popup offers a prefilled GitHub issue and Copy details.
// Loaded the first time the Report button is pressed (feedback.js). The page's own sheets stay where they are: this one sits above them.
import { ENDPOINT, REPO, GAP_MS, titleOf, categoryOf, descriptionOf, detailsText, payloadOf, canSend, cleanUrl, issueUrl } from './feedback-core.js';

const TAB_KEY = 'tk-report-tab', LAST_KEY = 'tk-report-at';
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* blocked */ } } };
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** where the report comes from, for the issue and for finding the problem */
export function pageMeta() {
  return {
    url: cleanUrl(location.href), userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, timestamp: new Date().toISOString(),
    appVersion: document.querySelector('meta[name="tk-build"]')?.content || 'unknown', devicePixelRatio: devicePixelRatio || 1, language: navigator.language || '',
  };
}

let open = null;
export function openReport(opener) {
  if (open) return;
  const prevFocus = document.activeElement;
  const root = document.createElement('div'); root.className = 'tk-report-pop';
  root.innerHTML = `<div class="tk-rp-box" role="dialog" aria-modal="true" aria-labelledby="tk-rp-t">
    <div class="tk-rp-grab" aria-hidden="true"><i></i></div>
    <div class="tk-rp-head"><b id="tk-rp-t">Send feedback</b><button type="button" class="tk-rp-x" aria-label="Close">✕</button></div>
    <div class="tk-rp-tabs" role="tablist" aria-label="Kind of feedback"><button type="button" role="tab" data-tab="quick">Quick feedback</button><button type="button" role="tab" data-tab="visual">Visual feedback</button></div>
    <div class="tk-rp-body"></div></div>`;
  const box = root.querySelector('.tk-rp-box'), body = root.querySelector('.tk-rp-body');
  const state = { tab: store.get(TAB_KEY) === 'visual' ? 'visual' : 'quick', chip: 'bug', quick: '', note: '', shot: null, shotErr: '', capturing: false, view: 'form', busy: false, msg: '', sent: null, wait: 0 };

  // ---- closing: ✕, Esc, a tap outside, a swipe down (phones), Back. A history entry is taken while the popup is open; the page's own sheets ignore a Back that only pops it
  let popped = false;
  const close = () => {
    if (!open) return; open = null; removeEventListener('keydown', key); removeEventListener('popstate', pop); root.remove();
    if (!popped && history.state?.tkReport) { try { history.back(); } catch { /* none */ } }
    try { (opener || prevFocus)?.focus?.({ preventScroll: true }); } catch { /* gone */ }
  };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const pop = () => { popped = true; close(); };
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });
  root.querySelector('.tk-rp-x').addEventListener('click', close);
  addEventListener('keydown', key); addEventListener('popstate', pop);
  try { history.pushState({ tkReport: 1 }, ''); } catch { /* blocked */ }
  { // the handle: down closes
    const g = root.querySelector('.tk-rp-grab'); let y0 = null, t0 = 0;
    g.addEventListener('pointerdown', (e) => { y0 = e.clientY; t0 = e.timeStamp; g.setPointerCapture?.(e.pointerId); });
    g.addEventListener('pointermove', (e) => { if (y0 !== null) box.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
    const up = (e) => { if (y0 === null) return; const d = e.clientY - y0, v = d / Math.max(1, e.timeStamp - t0); y0 = null; box.style.transform = ''; if (d > 90 || v > 0.6) close(); };
    g.addEventListener('pointerup', up); g.addEventListener('pointercancel', () => { y0 = null; box.style.transform = ''; });
  }

  // ---- what each view draws
  const paint = () => {
    root.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === state.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    root.querySelector('.tk-rp-tabs').hidden = state.view !== 'form';
    if (state.view === 'sent') { body.innerHTML = '<div class="tk-rp-done"><b>Sent, thank you.</b><p>We read every report.</p><button type="button" class="tk-rp-act main" data-close>Close</button></div>'; body.querySelector('[data-close]').addEventListener('click', close); body.querySelector('[data-close]').focus(); return; }
    if (state.view === 'fallback') {
      const url = issueUrl(state.sent);
      body.innerHTML = `<div class="tk-rp-done"><b>We could not send your report from here.</b><p>${esc(state.msg)} You can still tell us in one of these ways.</p>
        <a class="tk-rp-act main" target="_blank" rel="noopener" href="${esc(url)}">Open a GitHub issue</a><button type="button" class="tk-rp-act" data-copy>Copy details</button><button type="button" class="tk-rp-act quiet" data-back>Back to my report</button><p class="tk-rp-note" role="status" aria-live="polite"></p></div>`;
      body.querySelector('[data-copy]').addEventListener('click', async () => {
        const text = `${state.sent.title}\n\n${state.sent.description}`; let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch {
          const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select();
          try { ok = document.execCommand('copy'); } catch { /* blocked */ } t.remove();
        }
        body.querySelector('.tk-rp-note').textContent = ok ? 'Copied. Paste it into your message.' : 'Could not copy. Select the text in the issue link instead.';
      });
      body.querySelector('[data-back]').addEventListener('click', () => { state.view = 'form'; state.msg = ''; paint(); });
      body.querySelector('.tk-rp-act').focus(); return;
    }
    const hp = '<input class="tk-rp-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';
    if (state.tab === 'quick') {
      body.innerHTML = `<div class="tk-rp-chips" role="radiogroup" aria-label="Kind of report"><button type="button" role="radio" data-chip="bug" aria-checked="${state.chip === 'bug'}">Bug</button><button type="button" role="radio" data-chip="idea" aria-checked="${state.chip === 'idea'}">Idea</button></div>
        <label class="tk-rp-f"><span>What happened?</span><textarea rows="5" maxlength="2000" data-msg placeholder="Tell us what you saw, or what you would like to see."></textarea></label>${hp}
        <p class="tk-rp-small">Sent to a public GitHub page with your page address and browser. Leave out anything private.</p>
        <div class="tk-rp-foot"><p class="tk-rp-note" role="status" aria-live="polite" data-status></p><button type="button" class="tk-rp-act main" data-send disabled>Send</button></div>`;
      const ta = body.querySelector('[data-msg]'); ta.value = state.quick;
      const sync = () => { state.quick = ta.value; body.querySelector('[data-send]').disabled = state.busy || !ta.value.trim(); };
      ta.addEventListener('input', sync); sync();
      body.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { state.chip = b.dataset.chip; body.querySelectorAll('[data-chip]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }));
      body.querySelector('[data-send]').addEventListener('click', () => send());
      status(); return;
    }
    // visual
    const shot = state.capturing ? '<div class="tk-rp-shot wait" role="status"><i class="tk-rp-spin" aria-hidden="true"></i>Taking a screenshot…</div>'
      : state.shot ? `<div class="tk-rp-shot"><img alt="A screenshot of this page, to be sent with your report" src="${esc(state.shot.dataUrl)}"></div>`
      : `<div class="tk-rp-shot fail" role="status">Couldn't take the screenshot on this ${innerWidth <= 900 ? 'phone' : 'browser'}. You can still send your note.${state.shotErr ? `<small>${esc(state.shotErr)}</small>` : ''}</div>`;
    body.innerHTML = `${shot}<label class="tk-rp-f"><span>Add a note (optional)</span><textarea rows="3" maxlength="2000" data-note placeholder="What should we look at?"></textarea></label>${hp}
      <p class="tk-rp-small">The picture shows this page as it is now, and goes to a public GitHub page. Leave out anything private.</p>
      <div class="tk-rp-foot"><p class="tk-rp-note" role="status" aria-live="polite" data-status></p>
      <div class="tk-rp-two"><button type="button" class="tk-rp-act" data-retake ${state.capturing ? 'disabled' : ''}>Retake</button><button type="button" class="tk-rp-act main" data-send ${state.capturing || state.busy ? 'disabled' : ''}>Send</button></div></div>`;
    const note = body.querySelector('[data-note]'); note.value = state.note; note.addEventListener('input', () => { state.note = note.value; });
    body.querySelector('[data-retake]').addEventListener('click', () => capture());
    body.querySelector('[data-send]').addEventListener('click', () => send());
    status();
  };
  const status = () => { const s = body.querySelector('[data-status]'); if (s) s.textContent = state.msg; };

  // ---- the screenshot: the popup and the button are hidden while the page is drawn
  let token = 0;
  async function capture() {
    const mine = ++token; state.capturing = true; state.shot = null; state.shotErr = ''; state.msg = ''; paint();
    root.style.visibility = 'hidden'; const btn = document.querySelector('.tk-report'); if (btn) btn.style.visibility = 'hidden';
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // the page repaints without the popup
    try {
      const { capturePage } = await import('./feedback-capture.js');
      const shot = await capturePage({ hide: [root, ...(btn ? [btn] : [])] });
      if (mine === token) state.shot = shot;
    } catch (e) { if (mine === token) state.shotErr = String(e?.message || e).slice(0, 160); }
    finally { root.style.visibility = ''; if (btn) btn.style.visibility = ''; if (mine === token) { state.capturing = false; if (open) paint(); } }
  }

  // ---- sending
  async function send() {
    if (state.busy) return;
    if (root.querySelector('.tk-rp-hp')?.value) { state.view = 'sent'; paint(); return; } // a bot filled the hidden field: it is told it worked
    const rl = canSend(store.get(LAST_KEY), Date.now(), GAP_MS);
    if (!rl.ok) { state.msg = `Please wait ${rl.wait} s before sending another report.`; status(); return; }
    const visual = state.tab === 'visual', text = visual ? state.note : state.quick;
    if (!visual && !text.trim()) return;
    const meta = pageMeta(), title = titleOf(text, meta.url), category = visual ? 'bug' : categoryOf(state.chip);
    const description = descriptionOf({ text, meta, captureError: visual && !state.shot ? state.shotErr || 'unknown' : '' });
    const report = { title, description };
    state.busy = true; state.msg = 'Sending…'; paint();
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 20_000);
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payloadOf({ title, description, category, screenshot: visual && state.shot ? state.shot.dataUrl : null, meta })), signal: ctrl.signal }).finally(() => clearTimeout(timer));
      const j = r.ok ? await r.json().catch(() => null) : null;
      if (!j || j.success !== true) throw new Error(r.ok ? 'the service did not accept it' : `the service answered ${r.status}`);
      store.set(LAST_KEY, String(Date.now())); state.busy = false; state.msg = ''; state.view = 'sent'; paint();
    } catch (e) {
      state.busy = false; state.sent = report; state.msg = e?.name === 'AbortError' ? 'It took too long.' : /fetch|network|failed|load/i.test(String(e?.message)) ? 'The service could not be reached from this browser.' : `${String(e?.message || 'It did not go through.')}.`; state.view = 'fallback'; paint();
    }
  }

  // ---- tabs
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    if (state.busy || b.dataset.tab === state.tab) return;
    state.tab = b.dataset.tab; state.msg = ''; store.set(TAB_KEY, state.tab); paint();
    if (state.tab === 'visual' && !state.shot && !state.capturing && !state.shotErr) capture();
  }));
  root.querySelector('.tk-rp-tabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const other = root.querySelector(`[data-tab="${state.tab === 'quick' ? 'visual' : 'quick'}"]`); other.click(); other.focus(); } });

  open = root; document.body.appendChild(root); paint();
  if (state.tab === 'visual') capture(); else body.querySelector('[data-msg]')?.focus({ preventScroll: true });
}

/** the repository's issue page for a person who would rather look (not linked from the popup; used by tests) */
export const feedbackRepo = REPO;
/** the details as text, for tests and Copy details */
export const detailsOf = () => detailsText(pageMeta());

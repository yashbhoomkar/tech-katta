// The Report popup: a sheet on phones, a small dialog on wide screens, drawn by the site (not by BugDrop). Two tabs: Quick feedback (words only) and
// Visual feedback (the page is photographed from the moment the Report button is pressed, so the picture is usually ready when the tab opens; with a note). Sending is a POST to BugDrop's hosted worker, which makes the GitHub issue in
// yashbhoomkar/tech-katta-feedback. If that cannot be done (blocked, offline, refused) the popup offers a prefilled GitHub issue and Copy details.
// Loaded the first time the Report button is pressed (feedback.js). The page's own sheets stay where they are: this one sits above them.
import { createEditor } from './feedback-markup.js';
import { hold, grab } from './feedback-hold.js';
import { pixelRatioFor, ENDPOINT, REPO, GAP_MS, titleOf, categoryOf, descriptionOf, detailsText, payloadOf, canSend, cleanUrl, issueUrl } from './feedback-core.js';

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
/** `held` (from feedback.js): lets the page's 3D go on again; the first capture's end calls it. `capMod`: feedback-capture.js, if it is loaded already (then nothing is waited for). `first`: { geometry, grabbed } read at the press, for the first capture. */
export function openReport(opener, held, capMod, first) {
  performance.mark('tk-report:open-start');
  if (open) { held?.(); return; } // already up: nothing to hold
  const prevFocus = document.activeElement;
  const root = document.createElement('div'); root.className = 'tk-report-pop';
  root.innerHTML = `<div class="tk-rp-box" role="dialog" aria-modal="true" aria-labelledby="tk-rp-t">
    <div class="tk-rp-grab" aria-hidden="true"><i></i></div>
    <div class="tk-rp-head"><b id="tk-rp-t">Send feedback</b><button type="button" class="tk-rp-x" aria-label="Close">✕</button></div>
    <div class="tk-rp-tabs" role="tablist" aria-label="Kind of feedback"><button type="button" role="tab" data-tab="quick">Quick feedback</button><button type="button" role="tab" data-tab="visual">Visual feedback</button></div>
    <div class="tk-rp-body"></div></div>`;
  const box = root.querySelector('.tk-rp-box'), body = root.querySelector('.tk-rp-body');
  const state = { tab: store.get(TAB_KEY) === 'visual' ? 'visual' : 'quick', chip: 'bug', quick: '', note: '', shot: null, shotErr: '', capturing: false, view: 'form', busy: false, msg: '', sent: null, wait: 0 };
  let ed = null; // the picture editor for state.shot (marks live in it)

  // ---- closing: ✕, Esc, a tap outside, a swipe down (phones), Back. A history entry is taken while the popup is open; the page's own sheets ignore a Back that only pops it
  let popped = false;
  const close = () => {
    if (!open) return; open = null; token++; state.shot = null; ed = null; holds.splice(0).forEach((f) => f()); removeEventListener('keydown', key); removeEventListener('popstate', pop); root.remove();
    if (!popped && history.state?.tkReport) { try { history.back(); } catch { /* none */ } }
    try { (opener || prevFocus)?.focus?.({ preventScroll: true }); } catch { /* gone */ }
  };
  const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (ed?.isFull()) ed.exitFull(); else close(); } };
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
      : state.shot ? '<div data-editor></div>'
      : `<div class="tk-rp-shot fail" role="status">Couldn't take the screenshot on this ${innerWidth <= 900 ? 'phone' : 'browser'}. You can still send your note.${state.shotErr ? `<small>${esc(state.shotErr)}</small>` : ''}</div>`;
    body.innerHTML = `${shot}<label class="tk-rp-f"><span>Add a note (optional)</span><textarea rows="3" maxlength="2000" data-note placeholder="What should we look at?"></textarea></label>${hp}
      <p class="tk-rp-small">The picture shows this page as it is now. Draw on it to point at the problem, and use Hide to cover anything private. It goes to a public GitHub page.</p>
      <div class="tk-rp-foot"><p class="tk-rp-note" role="status" aria-live="polite" data-status></p>
      <div class="tk-rp-two"><button type="button" class="tk-rp-act" data-retake ${state.capturing ? 'disabled' : ''}>Retake</button><button type="button" class="tk-rp-act main" data-send ${state.capturing || state.busy ? 'disabled' : ''}>Send</button></div></div>`;
    if (state.shot) { if (!ed) ed = createEditor(state.shot); body.querySelector('[data-editor]').replaceWith(ed.el); performance.mark('tk-report:preview'); }
    const note = body.querySelector('[data-note]'); note.value = state.note; note.addEventListener('input', () => { state.note = note.value; });
    body.querySelector('[data-retake]').addEventListener('click', () => capture());
    body.querySelector('[data-send]').addEventListener('click', () => send());
    status();
  };
  const status = () => { const s = body.querySelector('[data-status]'); if (s) s.textContent = state.msg; };

  // ---- the screenshot: started as the popup opens (the capture leaves the popup and the button out itself); kept for this popup only, dropped when it closes.
  // Quick feedback never waits for it, and Visual shows it at once if it is ready, else a spinner until it is.
  let token = 0;
  const holds = held ? [held] : []; // the page's 3D worlds stay stopped for as long as the popup is up (the popup covers them): a world drawing at 4x CPU starves the touches and the frames the popup needs
  let firstRead = first;
  async function capture() {
    const mine = ++token; state.capturing = true; state.shot = null; ed = null; state.shotErr = ''; state.msg = ''; if (state.tab === 'visual') paint();
    const { geometry, grabbed } = firstRead || { geometry: { w: innerWidth, h: innerHeight, x: scrollX, y: scrollY }, grabbed: grab(pixelRatioFor(devicePixelRatio)) }; firstRead = null; // what the person was looking at when they asked
    if (!holds.length) holds.push(hold());
    try {
      const cap = capMod || await import('./feedback-capture.js'); performance.mark('tk-report:capture-start');
      // (no wait: the work starts at once; it yields between its steps)
      const shot = await cap.capturePage({ geometry, grabbed, alive: () => mine === token && open === root });
      performance.mark('tk-report:capture-end'); if (mine === token) { state.shot = shot; ed = createEditor(shot); } // the editor is made now, so the tab only has to show it
    } catch (e) { if (mine === token) state.shotErr = String(e?.message || e).slice(0, 160); }
    finally { if (mine === token) { state.capturing = false; if (open && state.tab === 'visual' && state.view === 'form') paint(); } }
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
    state.busy = true; state.msg = 'Sending…'; paint();
    let shotUrl = null, shotErr = '';
    if (visual && state.shot) {
      try { shotUrl = ed?.hasMarks() ? (await ed.flatten()).dataUrl : (await (await import('./feedback-capture.js')).encodePng(state.shot)).dataUrl; } catch (e) { shotErr = String(e?.message || 'the picture could not be made'); } // no picture goes; the words do, and the issue says why
    }
    const description = descriptionOf({ text, meta, captureError: visual && !shotUrl ? shotErr || state.shotErr || 'unknown' : '' });
    const report = { title, description };
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 20_000);
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payloadOf({ title, description, category, screenshot: shotUrl, meta })), signal: ctrl.signal }).finally(() => clearTimeout(timer));
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
    if (state.tab === 'visual' && !state.shot && !state.capturing && !state.shotErr) capture(); // normally already taken or on its way
  }));
  root.querySelector('.tk-rp-tabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const other = root.querySelector(`[data-tab="${state.tab === 'quick' ? 'visual' : 'quick'}"]`); other.click(); other.focus(); } });

  open = root; document.body.appendChild(root); paint(); performance.mark('tk-report:popup');
  capture(); // from the first moment, whichever tab is open
  // on a phone the keyboard would cover the sheet (and resize the page that is being photographed): the person taps the box when they are ready
  if (state.tab !== 'visual' && matchMedia('(pointer: fine)').matches) body.querySelector('[data-msg]')?.focus({ preventScroll: true });
}

/** the repository's issue page for a person who would rather look (not linked from the popup; used by tests) */
export const feedbackRepo = REPO;
/** the details as text, for tests and Copy details */
export const detailsOf = () => detailsText(pageMeta());

// A guided tour (owner: "There should be a popup given to the user on the landing page to take a tour"). It does not
// lay tooltips over a still page: each step moves the real page (scrolls the story, so the 3D camera flies) and lights
// one thing with a coral spotlight, and one step waits for the visitor to tap a part themselves.
//
// steps: [{ title, body, at: () => {x, y, w, h, round?} | null, enter?: () => void, wait?: true, cta?: {href, label} }]
// The spotlight never blocks the page (pointer-events: none), so the visitor can tap through it.

const KEY = 'tk-r3d-tour';
export const tourSeen = () => { try { return localStorage.getItem(KEY) === 'seen'; } catch { return false; } };
export const markTourSeen = () => { try { localStorage.setItem(KEY, 'seen'); } catch { /* storage blocked */ } };

export function runTour(steps, { reduced = false, onEnd = () => {}, onShow } = {}) {
  let i = -1, raf = 0, done = false;
  const spot = document.createElement('div'); spot.className = 'tour-spot'; spot.setAttribute('aria-hidden', 'true');
  const card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Tour of this page');
  if (reduced) { spot.classList.add('still'); card.classList.add('still'); }
  document.body.append(spot, card);

  const render = () => {
    const s = steps[i], last = i === steps.length - 1;
    card.innerHTML = `
      <div class="tour-top"><span class="mono tour-n">${i + 1} of ${steps.length}</span><span class="tour-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'past' : ''}"></i>`).join('')}</span>
        <button type="button" class="pc-x" data-t="end" aria-label="End the tour">×</button></div>
      <p class="tour-h">${s.title}</p>
      <p class="tour-p">${s.body}</p>
      <div class="tour-act">
        ${i > 0 ? '<button type="button" class="btn light sm" data-t="back">Back</button>' : '<button type="button" class="tour-skip" data-t="end">Skip tour</button>'}
        ${s.wait ? '<button type="button" class="btn light sm" data-t="show">Show me</button>'
          : last && s.cta ? `<a class="btn dark sm" href="${s.cta.href}" data-t="cta">${s.cta.label}<span class="chip">→</span></a>`
          : `<button type="button" class="btn dark sm" data-t="next">${last ? 'Done' : 'Next'}</button>`}
      </div>`;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    card.querySelector('.tour-act .btn:last-child, .tour-act a')?.focus({ preventScroll: true });
  };
  const go = (k) => {
    if (done || k < 0 || k >= steps.length) return;
    i = k; render(); steps[i].enter?.(); onShow?.(i);
  };
  const end = () => {
    if (done) return; done = true; cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey, true);
    spot.remove(); card.remove(); markTourSeen(); onEnd();
  };
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (t === 'next') { i === steps.length - 1 ? end() : go(i + 1); }
    else if (t === 'back') go(i - 1);
    else if (t === 'end') end();
    else if (t === 'show') steps[i].show?.();
    else if (t === 'cta') end();
  });
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); end(); }
    else if (e.key === 'ArrowRight' && !steps[i].wait) { e.preventDefault(); i === steps.length - 1 ? end() : go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  };
  addEventListener('keydown', onKey, true);
  // swipe the card sideways on phones, like the topic cards in the reader
  let sx = 0, sy = 0;
  card.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !steps[i].wait && i < steps.length - 1) go(i + 1); else if (dx > 0) go(i - 1);
  }, { passive: true });

  // every frame: the spotlight follows its target (the camera and the page move), the card sits clear of it
  const place = () => {
    raf = requestAnimationFrame(place);
    if (i < 0) return;
    const r = steps[i].at?.(), phone = innerWidth <= 760;
    if (r) {
      Object.assign(spot.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: r.round ? '999px' : '18px' });
      spot.classList.add('on');
    } else spot.classList.remove('on');
    const cw = card.offsetWidth, ch = card.offsetHeight, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    if (phone) {
      // a sheet: at the bottom above the tab bar, or at the top when what it points at (or the part card) is low
      const low = (r && r.y + r.h / 2 > innerHeight * 0.5) || document.querySelector('.part-card.sheet:not([hidden])');
      card.classList.toggle('at-top', !!low);
      card.style.left = ''; card.style.top = '';
      return;
    }
    card.classList.remove('at-top');
    let x, y;
    if (!r) { x = innerWidth - cw - 24; y = innerHeight - ch - 24; }
    else if (r.x + r.w + 24 + cw < innerWidth - 16) { x = r.x + r.w + 24; y = clamp(r.y + r.h / 2 - ch / 2, 84, innerHeight - ch - 16); }
    else if (r.x - 24 - cw > 16) { x = r.x - 24 - cw; y = clamp(r.y + r.h / 2 - ch / 2, 84, innerHeight - ch - 16); }
    else if (r.y + r.h + 20 + ch < innerHeight - 16) { x = clamp(r.x + r.w / 2 - cw / 2, 16, innerWidth - cw - 16); y = r.y + r.h + 20; }
    else { x = clamp(r.x + r.w / 2 - cw / 2, 16, innerWidth - cw - 16); y = Math.max(84, r.y - ch - 20); }
    card.style.left = `${Math.round(x)}px`; card.style.top = `${Math.round(y)}px`;
  };
  raf = requestAnimationFrame(place);
  go(0);
  return { next: () => go(i + 1), end, get step() { return i; }, get waiting() { return !!steps[i]?.wait; } };
}

/** the first-visit offer: a small card, not a modal; any answer (or scrolling on) counts as seen */
export function offerTour({ start, delay = 1500 }) {
  if (tourSeen()) return () => {};
  const el = document.createElement('div'); el.className = 'tour-offer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Take a tour');
  el.innerHTML = `<button type="button" class="pc-x" data-o="no" aria-label="Close">×</button>
    <p class="tour-kick"><i class="eh-dot" aria-hidden="true"></i>New here?</p>
    <p class="tour-h">Take a 40-second tour</p>
    <p class="tour-p">See how to explore this page: what to tap, and what scrolling does.</p>
    <div class="tour-act"><button type="button" class="tour-skip" data-o="no">I'll explore myself</button><button type="button" class="btn dark sm" data-o="yes">Start tour<span class="chip">→</span></button></div>`;
  let shown = false;
  const hide = (seen = true) => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 260); if (seen && shown) markTourSeen(); removeEventListener('scroll', onScroll); };
  const onScroll = () => { if (scrollY > innerHeight * 0.35) hide(); };
  el.addEventListener('click', (e) => { const o = e.target.closest('[data-o]')?.dataset.o; if (!o) return; hide(); if (o === 'yes') start(); });
  const t = setTimeout(() => {
    if (tourSeen() || document.querySelector('.tour-card') || scrollY > innerHeight * 0.35) return;
    document.body.appendChild(el); shown = true; addEventListener('scroll', onScroll, { passive: true });
  }, delay);
  return () => { clearTimeout(t); hide(false); el.remove(); };
}

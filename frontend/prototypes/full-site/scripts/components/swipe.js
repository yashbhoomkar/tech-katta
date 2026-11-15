// Touch gestures for phones.
//   dragToClose(panel, close, axis)  sheets and drawers follow the finger and close on a flick or past 30 %;
//                                    resistance past the open edge; pointer capture; one finger only.
//   swipeX(el, onLeft, onRight)      a horizontal swipe (lesson cards), ignored when the gesture is mostly vertical.
// Velocity, not only distance, decides (rules after Emil Kowalski: a flick of ~0.11 px/ms is enough).

export function dragToClose(panel, close, axis = "y") {
  let start = null, d = 0, t0 = 0;
  const pos = (e) => (axis === "y" ? e.clientY : e.clientX);
  const down = (e) => {
    if (e.pointerType === "mouse" || start !== null) return;
    // only start from the top strip of a sheet (or anywhere on a drawer), and never from a scrolled list
    const scroller = e.target.closest(".sheet-list, .alog, .cres, textarea, input");
    if (scroller && scroller.scrollTop > 0) return;
    start = pos(e); d = 0; t0 = performance.now(); panel.style.transition = "none";
  };
  const move = (e) => {
    if (start === null) return;
    const raw = pos(e) - start;
    d = raw > 0 ? raw : raw / 4;          // dragging the wrong way moves less and less
    panel.style.transform = axis === "y" ? `translateY(${d}px)` : `translateX(${d}px)`;
  };
  const up = () => {
    if (start === null) return;
    const size = axis === "y" ? panel.offsetHeight : panel.offsetWidth, v = d / Math.max(1, performance.now() - t0);
    panel.style.transition = "transform 300ms cubic-bezier(.32,.72,0,1)";
    if (d > size * 0.3 || v > 0.11) { panel.style.transform = axis === "y" ? "translateY(100%)" : "translateX(100%)"; setTimeout(() => { close(true); panel.style.transform = ""; panel.style.transition = ""; }, 260); }
    else { panel.style.transform = ""; setTimeout(() => (panel.style.transition = ""), 300); }
    start = null;
  };
  panel.addEventListener("pointerdown", down);
  addEventListener("pointermove", move, { passive: true });
  addEventListener("pointerup", up); addEventListener("pointercancel", up);
  return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
}

export function swipeX(el, onLeft, onRight) {
  let x0 = null, y0 = 0, t0 = 0;
  el.addEventListener("touchstart", (e) => { if (e.touches.length !== 1) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = performance.now(); }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, v = Math.abs(dx) / Math.max(1, performance.now() - t0);
    x0 = null;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Math.abs(dx) > 60 || v > 0.3) (dx < 0 ? onLeft : onRight)();
  }, { passive: true });
}

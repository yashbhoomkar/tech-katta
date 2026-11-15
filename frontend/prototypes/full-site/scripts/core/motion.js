// Motion helpers. Every animation respects reduced motion: movement goes, short fades stay (motion.css).
export const RM = matchMedia("(prefers-reduced-motion: reduce)");

// a delay that shrinks to almost nothing when the viewer asked for less motion
export const later = (fn, ms) => setTimeout(fn, RM.matches ? Math.min(ms, 60) : ms);

// run fn once, the first time el is at least `th` visible
export const once = (el, fn, th = 0.15) => {
  if (!el) return () => {};
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.disconnect(); fn(e.target); } }), { threshold: th });
  io.observe(el);
  return () => io.disconnect();
};

// count a number up with an ease-out curve
export const countUp = (el, to, ms = 900, fmt = (v) => v) => {
  if (!el) return;
  if (RM.matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
};

// restart a CSS animation class on an element
export const replay = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// open/close for overlays: closing plays the exit animation (class "closing") before hiding
export const closeWithExit = (el, ms = 220) => new Promise((res) => {
  if (!el || el.hidden) return res();
  el.classList.add("closing");
  setTimeout(() => { el.hidden = true; el.classList.remove("closing"); res(); }, RM.matches ? 60 : ms);
});

// slide a pill/underline under the chosen item of a group (segmented controls, tabs)
export const placeIndicator = (group, ind, chosenSel, mode = "pill") => {
  const b = group.querySelector(chosenSel);
  if (!b || !b.offsetWidth || !ind) return;
  if (mode === "pill") { ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft}px)`; }
  else ind.style.transform = `translateX(${b.offsetLeft}px) scaleX(${b.offsetWidth})`;
};

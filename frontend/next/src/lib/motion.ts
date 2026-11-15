import { useEffect, type RefObject } from "react";

// Motion helpers (the system from /p/motion/). Every one respects reduced motion: movement goes, short fades stay.

export const reducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** setTimeout that shrinks to almost nothing when the viewer asked for less motion. Returns a cancel. */
export function later(fn: () => void, ms: number): () => void {
  const t = window.setTimeout(fn, reducedMotion() ? Math.min(ms, 60) : ms);
  return () => window.clearTimeout(t);
}

/** Counts a number up into el with an ease-out curve. Returns a cancel. */
export function countUp(el: HTMLElement, to: number, ms = 900, fmt: (v: number) => string = String): () => void {
  if (reducedMotion()) {
    el.textContent = fmt(to);
    return () => {};
  }
  const t0 = performance.now();
  let frame = 0;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

/** Runs fn once, the first time the element is `threshold` visible. fn may return a cleanup. */
export function useOnce(ref: RefObject<Element | null>, fn: (el: Element) => (() => void) | undefined, threshold = 0.15): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    if (typeof IntersectionObserver !== "function") {
      cleanup = fn(el);
      return () => cleanup?.();
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect();
        cleanup = fn(el);
      }
    }, { threshold });
    io.observe(el);
    return () => {
      io.disconnect();
      cleanup?.();
    };
    // fn is read once, on first sight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, threshold]);
}

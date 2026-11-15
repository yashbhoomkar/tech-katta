import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

// A figure's clock. Figures with steps carry an SVG group `.tk-caps` (data-dur = loop seconds, one <text> per
// step); their SMIL loop starts from step 1 when the figure is first 30 % in view and pauses when it leaves. The
// reader can pause and step: go(k) pauses the SVG clock just after step k has faded in. Figures without steps
// report n = 0.

export interface Steps {
  n: number;
  i: number;
  text: string | null;
  held: boolean;
  go: (k: number) => void;
  toggle: () => void;
}

interface Snapshot { n: number; i: number; text: string | null }
const NONE: Snapshot = { n: 0, i: 0, text: null };

function read(svg: SVGSVGElement | null, at?: number): Snapshot {
  const caps = svg?.querySelector<SVGGElement>(".tk-caps");
  if (!svg || !caps) {
    const one = svg?.querySelector(".tk-cap");
    return one ? { n: 1, i: 0, text: one.textContent } : NONE;
  }
  const texts = caps.querySelectorAll("text");
  const dur = Number(caps.dataset.dur) || 8;
  const n = texts.length;
  const i = at ?? Math.min(n - 1, Math.floor(((svg.getCurrentTime() % dur) / dur) * n));
  return { n, i, text: texts[i]?.textContent ?? null };
}

export function useFigureSteps(box: RefObject<HTMLElement | null>, still: boolean, key: string): Steps {
  const [snap, setSnap] = useState<Snapshot & { held: boolean }>({ ...NONE, held: false });
  const held = useRef(false);
  const svg = useCallback(() => box.current?.querySelector("svg") ?? null, [box]);
  const show = useCallback((x: Snapshot) => {
    setSnap((o) => (o.n === x.n && o.i === x.i && o.text === x.text && o.held === held.current ? o : { ...x, held: held.current }));
  }, []);

  useEffect(() => {
    held.current = false;
    setSnap({ ...NONE, held: false });
    const el = box.current;
    if (!el) return;
    let visible = typeof IntersectionObserver !== "function";
    let started = false;
    let known = false;
    const io = visible ? null : new IntersectionObserver(([e]) => (visible = !!e && e.intersectionRatio >= 0.3), { threshold: [0, 0.3, 0.6] });
    io?.observe(el);
    // the figure module may draw after this effect runs, so the clock is applied on a short tick
    const tick = () => {
      const s = svg();
      if (!s) return;
      if (!known) {
        known = true; // the step count is known as soon as the figure draws, in view or not
        show(read(s, 0));
      }
      if (still) {
        show(read(s));
        return;
      }
      try {
        if (!visible) {
          if (!s.animationsPaused()) s.pauseAnimations();
          return;
        }
        if (!started) {
          started = true;
          if (!held.current) {
            s.setCurrentTime(0);
            s.unpauseAnimations();
          }
        } else if (s.animationsPaused() && !held.current) s.unpauseAnimations();
      } catch {
        // SMIL missing (old engines, jsdom): show the figure as drawn
      }
      if (!held.current) show(read(s));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => {
      window.clearInterval(timer);
      io?.disconnect();
    };
  }, [box, svg, show, still, key]);

  const go = useCallback((k: number) => {
    const s = svg();
    const caps = s?.querySelector<SVGGElement>(".tk-caps");
    if (!s || !caps) return;
    const n = caps.querySelectorAll("text").length;
    const dur = Number(caps.dataset.dur) || 8;
    const at = Math.max(0, Math.min(n - 1, k));
    try {
      s.pauseAnimations();
      s.setCurrentTime((at * dur) / n + Math.min(0.3, dur / n / 2));
    } catch {
      return;
    }
    held.current = true;
    show(read(s, at));
  }, [svg, show]);

  const toggle = useCallback(() => {
    const s = svg();
    if (!s) return;
    try {
      if (held.current) s.unpauseAnimations();
      else s.pauseAnimations();
    } catch {
      return;
    }
    held.current = !held.current;
    show(read(s));
  }, [svg, show]);

  return { ...snap, go, toggle };
}

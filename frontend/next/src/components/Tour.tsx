import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { useToast } from "./Toast";
import { reducedMotion } from "@/lib/motion";
import { useSwipeX } from "@/lib/gestures";
import s from "./Overlays.module.css";

// A short guided tour of Home: one card at a time is lifted above a dimmed page, with a popover beside it that
// grows from the card it points at.

/** target: a CSS selector (a bare word means [data-tour="word"]) */
export interface TourStep { target: string; title: string; text: string }

const sel = (t: string) => (/^[\w-]+$/.test(t) ? `[data-tour="${t}"]` : t);
const find = (t: string): HTMLElement | null => {
  try { return [...document.querySelectorAll<HTMLElement>(sel(t))].find((e) => e.offsetParent !== null) ?? null; } catch { return null; }
};

export function useTour(steps: TourStep[]) {
  const [shown, setShown] = useState<{ steps: TourStep[]; i: number } | null>(null);
  // only the steps whose element is on the page now
  const start = useCallback(() => setShown({ steps: steps.filter((st) => find(st.target)), i: 0 }), [steps]);
  const setI = useCallback((i: number | null) => setShown((o) => (o && i !== null ? { ...o, i } : null)), []);
  const ui = shown && shown.steps.length ? <TourPop steps={shown.steps} i={shown.i} setI={setI} /> : null;
  return { start, ui, count: steps.length };
}

function TourPop({ steps, i, setI }: { steps: TourStep[]; i: number; setI: (i: number | null) => void }) {
  const toast = useToast();
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; to: string } | null>(null);
  const step = steps[i];
  const end = useCallback((done: boolean) => {
    setI(null);
    if (done) toast("Tour done. Press ? for shortcuts");
  }, [setI, toast]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = find(step.target);
    if (!el) return;
    el.classList.add(s.spot ?? "");
    el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
    const place = () => {
      const r = el.getBoundingClientRect();
      const w = pop.current?.offsetWidth ?? 320;
      const h = pop.current?.offsetHeight ?? 170;
      let left = r.left + scrollX;
      let top = r.bottom + scrollY + 12;
      let to = "top left";
      if (left + w > innerWidth - 16) { left = innerWidth - 16 - w; to = "top right"; }
      if (r.bottom + h + 24 > innerHeight && r.top > h + 24) { top = r.top + scrollY - 12 - h; to = to.replace("top", "bottom"); }
      setPos({ left: Math.max(16, left), top, to });
    };
    place();
    const t = window.setTimeout(place, reducedMotion() ? 0 : 420);
    return () => {
      window.clearTimeout(t);
      el.classList.remove(s.spot ?? "");
    };
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && end(false);
    window.addEventListener("keydown", onKey);
    pop.current?.querySelector<HTMLButtonElement>("[data-next]")?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [end, i]);

  if (!step) return null;
  const last = i === steps.length - 1;
  return <TourCard pop={pop} pos={pos} i={i} n={steps.length} step={step} last={last} setI={setI} end={end} />;
}

/** The popover: Skip, Next/Done; on phones it also swipes (left for next, right for back), as on tech.katta.cc. */
function TourCard({ pop, pos, i, n, step, last, setI, end }: { pop: RefObject<HTMLDivElement>; pos: { left: number; top: number; to: string } | null; i: number; n: number; step: TourStep; last: boolean; setI: (i: number | null) => void; end: (done: boolean) => void }) {
  useSwipeX(pop, { onNext: () => (last ? end(true) : setI(i + 1)), onBack: () => setI(i - 1), canNext: true, canBack: i > 0 });
  return createPortal(
    <>
      <div className={s.tourScrim} onClick={() => end(false)} />
      <div ref={pop} className={s.tourPop} role="dialog" aria-label="Tour" style={pos ? { left: pos.left, top: pos.top, ["--to" as string]: pos.to } : { visibility: "hidden" }}>
        <span className="mono">{i + 1} of {n}</span>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <div className={s.tourFoot}>
          <Button size="sm" variant="ghost" onClick={() => end(false)}>Skip</Button>
          <div><Button size="sm" variant="primary" data-next="" onClick={() => (last ? end(true) : setI(i + 1))}>{last ? "Done" : "Next"}</Button></div>
        </div>
      </div>
    </>,
    document.body,
  );
}

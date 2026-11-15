import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui";
import { useToast } from "./Toast";
import { reducedMotion } from "@/lib/motion";
import s from "./Overlays.module.css";

// A short guided tour of Home: one card at a time is lifted above a dimmed page, with a popover beside it that
// grows from the card it points at.

export interface TourStep { target: string; title: string; text: string }

export function useTour(steps: TourStep[]) {
  const [i, setI] = useState<number | null>(null);
  const start = useCallback(() => setI(0), []);
  const ui = i === null ? null : <TourPop steps={steps.filter((st) => document.querySelector(`[data-tour="${st.target}"]`))} i={i} setI={setI} />;
  return { start, ui };
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
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
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
  return createPortal(
    <>
      <div className={s.tourScrim} onClick={() => end(false)} />
      <div ref={pop} key={i} className={s.tourPop} role="dialog" aria-label="Tour" style={pos ? { left: pos.left, top: pos.top, ["--to" as string]: pos.to } : { visibility: "hidden" }}>
        <span className="mono">{i + 1} of {steps.length}</span>
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

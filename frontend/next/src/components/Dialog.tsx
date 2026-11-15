import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { reducedMotion } from "@/lib/motion";
import s from "./Overlays.module.css";

// A modal dialog: centred on wide screens (fades in from 0.96), a bottom sheet on phones. Focus moves in and
// comes back on close; Escape and the scrim close it; the page behind is inert. Closing plays its exit first.

export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const [closing, setClosing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const exit = useRef(() => {});
  exit.current = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => close.current(), reducedMotion() ? 40 : 160);
  };
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const app = document.getElementById("root");
    if (app) app.inert = true;
    document.body.style.overflow = "hidden";
    box.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exit.current();
    window.addEventListener("keydown", onKey);
    return () => {
      if (app) app.inert = false;
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div className={`${s.scrim} ${closing ? s.closing : ""}`} onMouseDown={(e) => e.target === e.currentTarget && exit.current()}>
      <div ref={box} className={`${s.dialog} ${wide ? s.wide : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.dHead}>
          <h2>{title}</h2>
          <button type="button" className={s.x} aria-label="Close" onClick={() => exit.current()}><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

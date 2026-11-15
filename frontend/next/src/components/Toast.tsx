import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import s from "./Overlays.module.css";

// One short message at a time at the bottom of the screen ("Copied the link"), gone after 2.6 s; a bar shows the time left.

const Ctx = createContext<((text: string) => void) | null>(null);

export function useToast(): (text: string) => void {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null);
  const timer = useRef(0);
  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMsg((m) => ({ text, n: (m?.n ?? 0) + 1 }));
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = useMemo(() => show, [show]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className={s.toastHost} role="status" aria-live="polite">
        {msg && <div key={msg.n} className={s.toast}>{msg.text}<i aria-hidden="true" /></div>}
      </div>
    </Ctx.Provider>
  );
}

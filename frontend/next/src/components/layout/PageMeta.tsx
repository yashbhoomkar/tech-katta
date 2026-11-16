import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Each page tells the chrome what it is: its title (window title and the phone top bar) and its parent
// ("up", for the phone top bar's back arrow: up a level, not back in history, so it works from a shared link).

export interface PageMeta {
  title: string;
  up?: { to: string; label: string };
}

const Ctx = createContext<{ meta: PageMeta | null; set: (m: PageMeta | null) => void } | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, set] = useState<PageMeta | null>(null);
  return <Ctx.Provider value={{ meta, set }}>{children}</Ctx.Provider>;
}

export function usePageMetaValue(): PageMeta | null {
  return useContext(Ctx)?.meta ?? null;
}

const SITE = "Tech Katta";

export function usePageMeta(title: string, up?: PageMeta["up"]): void {
  const ctx = useContext(Ctx);
  const set = ctx?.set;
  const upTo = up?.to;
  const upLabel = up?.label;
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} · System design, explained`;
    set?.(upTo && upLabel ? { title, up: { to: upTo, label: upLabel } } : { title });
    return () => set?.(null);
  }, [set, title, upTo, upLabel]);
}

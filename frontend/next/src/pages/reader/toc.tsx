// "On this page": the heading in view, the desktop contents rail with its sliding marker, and the phone's contents.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import s from "@/features/reader/reader.module.css";

/** The h2 nearest above the reading line (a third down the screen). */
function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!ids.length) return;
    let frame = 0;
    const pick = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let cur: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      setActive(cur ?? ids[0] ?? null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

function jump(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
  history.replaceState(history.state, "", `#${id}`);
}

export function Toc({ toc }: { toc: { id: string; text: string }[] }) {
  const ids = useMemo(() => toc.map((t) => t.id), [toc]);
  const active = useActiveHeading(ids);
  // the marker beside the current heading slides to the next one instead of jumping
  const list = useRef<HTMLUListElement>(null);
  const [mark, setMark] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const a = list.current?.querySelector<HTMLElement>("a[aria-current]");
    setMark(a ? { y: a.offsetTop, h: a.offsetHeight } : null);
  }, [active]);
  return (
    <nav className={s.toc} aria-label="On this page" data-tour="toc">
      <p className="mono">On this page</p>
      <ul ref={list}>
        {mark && <i className={s.tocMark} style={{ transform: `translateY(${mark.y}px)`, height: mark.h }} aria-hidden="true" />}
        {toc.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} aria-current={t.id === active ? "location" : undefined} onClick={(e) => { e.preventDefault(); jump(t.id); }}>{t.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PhoneToc({ toc }: { toc: { id: string; text: string }[] }) {
  return (
    <details className={s.phoneToc}>
      <summary><Icon name="toc" size={18} /> On this page <Icon name="down" size={16} /></summary>
      <ul>
        {toc.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} onClick={(e) => { e.preventDefault(); (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); jump(t.id); }}>{t.text}</a>
          </li>
        ))}
      </ul>
    </details>
  );
}

// The landing page's navigation: the Learn menu (desktop), the phone menu sheet, and smooth scrolling to a band.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { SECTIONS, paths } from "@/content/sections";
import { Icon } from "@/components/Icon";
import { Button, ButtonLink } from "@/components/ui";
import { useSheetDrag } from "@/lib/gestures";
import { useSignIn } from "@/components/SignIn";
import s from "../Landing.module.css";

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

/** "Learn" in the landing nav: a menu of the sections. Opens on hover with a mouse (80 ms in, 200 ms out), click or Enter otherwise. */
export function LearnMenu() {
  const { site, articles } = useContent();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  const fine = typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const soon = (v: boolean, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(v), ms); };
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("click", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); window.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div ref={wrap} className={s.megaWrap} onPointerEnter={fine ? () => soon(true, 80) : undefined} onPointerLeave={fine ? () => soon(false, 200) : undefined}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls="learn-menu" onClick={() => setOpen((o) => !o)}>Learn <Icon name="down" size={16} /></button>
      {open && (
        <div id="learn-menu" className={s.mega}>
          {SECTIONS.filter((m) => articles.some((a) => a.section === m.id)).map((m) => (
            <Link key={m.id} to={paths.section(m.id)} className={s.megaItem} data-accent={m.accent} onClick={() => setOpen(false)}>
              <i aria-hidden="true" /><span><b>{site.dashboard.sections.find(([id]) => id === m.id)?.[1] ?? m.label}</b><small>{m.blurb}</small></span>
            </Link>
          ))}
          <Link to={paths.problems} className={s.megaItem} data-accent="problems" onClick={() => setOpen(false)}>
            <i aria-hidden="true" /><span><b>Problems</b><small>{site.counts.questions} problems with a real judge.</small></span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function MobileMenu({ onClose }: { onClose: () => void }) {
  const { site, articles } = useContent();
  const signIn = useSignIn();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useSheetDrag(sheet, onClose);
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className={s.sheetScrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={sheet} className={s.sheet} role="dialog" aria-modal="true" aria-label="Menu">
        <div className={s.sheetHead}>
          <span className="mono">Learn</span>
          <button ref={closeBtn} type="button" className={s.menuBtn} aria-label="Close menu" onClick={onClose}><Icon name="close" /></button>
        </div>
        {SECTIONS.filter((m) => articles.some((a) => a.section === m.id)).map((m) => (
          <Link key={m.id} to={paths.section(m.id)} className={s.sheetItem} data-accent={m.accent} onClick={onClose}>
            <i aria-hidden="true" />
            <span><b>{site.dashboard.sections.find(([id]) => id === m.id)?.[1] ?? m.label}</b><small>{m.blurb}</small></span>
          </Link>
        ))}
        <Link to={paths.problems} className={s.sheetItem} data-accent="problems" onClick={onClose}>
          <i aria-hidden="true" />
          <span><b>Problems</b><small>Design problems with a real judge.</small></span>
        </Link>
        <ButtonLink variant="primary" to={paths.home} onClick={onClose}>Start free</ButtonLink>
        <Button onClick={() => { onClose(); signIn.open(); }}>Log in</Button>
      </div>
    </div>
  );
}

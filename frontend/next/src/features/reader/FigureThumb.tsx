import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { figOf, knownFig, loadFigs, type LegacyFigure } from "@legacy/figs/index.js";
import { readTokens } from "@legacy/theme/palette.js";
import { useDocTheme } from "./useDocTheme";
import tokens from "./figureTokens.module.css";
import s from "./reader.module.css";
import { look } from "@/lib/look";
import { MarkSticker } from "@/components/MarkSticker";

// A lesson's first figure, drawn still and small, as the picture on its card (Home, section lists). Its code loads
// only when the card comes near the screen, so a long list stays light.

/** In the neo-brutalism look a lesson's card shows its section's mark as a sticker with the lesson's tag instead
 *  (`section` and `label`): a whole figure shrunk to a thumbnail cannot be read. */
export function FigureThumb({ id, className, section, label }: { id: string | undefined; className?: string | undefined; section?: string | undefined; label?: string | undefined }) {
  if (section && look() === "neo-brutalism") return <MarkSticker section={section} label={label} className={className} />;
  return <FigureDrawing id={id} className={className} />;
}

function FigureDrawing({ id, className }: { id: string | undefined; className?: string | undefined }) {
  const box = useRef<HTMLSpanElement>(null);
  const theme = useDocTheme();
  const [fig, setFig] = useState<LegacyFigure | undefined>(() => (id ? figOf(id) : undefined));
  const [readFor, setReadFor] = useState<string | null>(null);

  useLayoutEffect(() => {
    readTokens(box.current);
    setReadFor(theme);
  }, [theme]);

  useEffect(() => {
    if (!id || fig || !knownFig(id)) return;
    const el = box.current;
    if (!el) return;
    let gone = false;
    const go = () => loadFigs([id]).then(() => !gone && setFig(figOf(id)), () => {});
    if (typeof IntersectionObserver !== "function") { void go(); return () => { gone = true; }; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); void go(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => { gone = true; io.disconnect(); };
  }, [id, fig]);

  const Draw = fig?.C;
  return (
    <span ref={box} className={`${tokens.tokens} ${s.thumb} ${className ?? ""}`} aria-hidden="true">
      {Draw && readFor && <Draw key={readFor} still uid={`t${id}`} />}
    </span>
  );
}

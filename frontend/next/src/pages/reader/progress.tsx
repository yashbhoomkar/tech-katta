// Reading progress in a lesson: how far the reader has scrolled (saved as they read) and the thin line at the top.
import { useEffect, useRef } from "react";
import { recordReading } from "@/lib/progress";
import s from "@/features/reader/reader.module.css";

/** Saves how far down the lesson the reader has got (at most every second), so Home can offer "Continue". */
export function useReadingProgress(slug: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let last = 0;
    let timer = 0;
    const save = () => {
      timer = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const read = max > 0 ? window.scrollY / max : 1;
      if (read > last + 0.02 || read >= 0.99) {
        last = read;
        recordReading(slug, read);
      }
    };
    const onScroll = () => {
      if (!timer) timer = window.setTimeout(save, 1000);
    };
    recordReading(slug, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [slug, ready]);
}

export function ProgressLine() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const draw = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current?.style.setProperty("--p", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={bar} className={s.progress} aria-hidden="true" />;
}

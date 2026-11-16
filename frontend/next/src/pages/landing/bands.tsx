// The landing bands below the hero: the reveal-on-scroll wrapper, "Take a look inside" and the judge card.
import { useRef, useState, type ReactNode } from "react";
import { useContent } from "@/content/ContentProvider";
import { paths } from "@/content/sections";
import { ButtonLink } from "@/components/ui";
import { useInView } from "@/lib/useInView";
import { countUp, later, useOnce } from "@/lib/motion";
import { cx } from "@/lib/cx";
import s from "../Landing.module.css";

export function Reveal({ className, children, id }: { className: string | undefined; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  return <section ref={ref} id={id} className={cx(className, s.reveal, seen && s.in)}>{children}</section>;
}

/** A window onto the app: a section's lesson list beside an open lesson. */
export function LookInside() {
  const { articles } = useContent();
  const core = articles.filter((a) => a.section === "concepts").slice(0, 7);
  const cur = Math.min(3, core.length - 1);
  return (
    <div className={s.stage} data-accent="problems">
      <div className={s.win}>
        <div className={s.winSide}>
          <b>Core concepts</b>
          <div className={s.miniBar}><i style={{ width: `${Math.round((cur / Math.max(1, core.length)) * 100)}%` }} /></div>
          <small>{cur} of {core.length} done</small>
          {core.map((a, i) => <div key={a.slug} className={s.lrow} data-state={i < cur ? "done" : i === cur ? "cur" : undefined}><i />{a.title.split(":")[0]}</div>)}
        </div>
        <div className={s.winMain}>
          <div className={s.winHead}><h3>{core[cur]?.title ?? "Caching"}</h3><ButtonLink variant="primary" size="sm" to={paths.article("concepts", core[cur]?.slug ?? "caching")}>Open the lesson</ButtonLink></div>
          <div className={s.video}><span>▶ Watch Yash explain it · 6 min</span></div>
          <p>{core[cur]?.dek}</p>
        </div>
      </div>
    </div>
  );
}

/** The judge's verdict card: the first time it is seen, its tests run, the score counts up and the stars land. */
export function JudgeCard() {
  const { site } = useContent();
  const j = site.hero.judge;
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState<number>(j.rows.length);
  const [stars, setStars] = useState(true);
  const score = useRef<HTMLElement>(null);
  useOnce(ref, () => {
    setDone(-1);
    setStars(false);
    if (score.current) score.current.textContent = "— / 100";
    const stops = j.rows.map((_, i) => later(() => setDone(i), 500 + i * 380 + (i === 2 ? 160 : 0)));
    let stopCount = () => {};
    const end = later(() => {
      if (score.current) stopCount = countUp(score.current, 92, 800, (v) => `${v} / 100`);
      stops.push(later(() => setStars(true), 700));
    }, 500 + j.rows.length * 380 + 200);
    return () => { stops.forEach((f) => f()); end(); stopCount(); };
  }, 0.5);
  return (
    <div ref={ref} className={s.jcard} role="group" aria-label={j.label}>
      <div className={s.jrow}><b>{j.title}</b><span className={cx(s.stars, stars && s.starsGo)} style={{ visibility: stars ? undefined : "hidden" }} role="img" aria-label={`${j.stars} of 3 stars`}>{Array.from({ length: j.stars }, (_, i) => <i key={i}>★</i>)}</span></div>
      {j.rows.map(([test, result], i) => (
        <div key={test} className={s.jrow}><span>{test}</span><b className={cx(s.ts, i > done ? s.run : i === done && s.tsDone)}>{i > done ? "Running" : `${result} ✓`}</b></div>
      ))}
      <div className={s.jscore}><span>Score</span><b ref={score}>92 / 100</b></div>
    </div>
  );
}

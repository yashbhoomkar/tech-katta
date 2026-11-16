// The landing hero's pieces: the title split for its slanted last word, and the four tilted section cards with
// their previews.
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SectionPicture } from "@/components/SectionPicture";
import s from "../Landing.module.css";

/** "System design, explained." → ["System design,", "explained."]: the last word gets the serif accent. */
export function splitTitle(title: string): [string, string] {
  const i = title.trimEnd().lastIndexOf(" ");
  return i < 0 ? ["", title] : [title.slice(0, i), title.slice(i + 1)];
}

/** Each card's tilt and drop: the four fan out like a hand of cards and straighten under the mouse. */
const TILT = [["-4deg", "16px", 560], ["-1.5deg", "0px", 500], ["1.5deg", "0px", 540], ["4deg", "16px", 610]] as const;

interface HeroCard { id: string; accent: string; to: string; no: string; title: string; desc: string }

export function HeroCards({ cards }: { cards: HeroCard[] }) {
  const row = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  return (
    <>
      <div ref={row} className={s.rise} onScroll={(e) => { const el = e.currentTarget; setAt(Math.round(el.scrollLeft / (el.scrollWidth / cards.length))); }}>
        {cards.map((c, i) => {
          const [r, y, dl] = TILT[i] ?? TILT[0];
          return (
            <Link key={c.id} to={c.to} className={s.rcard} data-accent={c.accent} style={{ ["--r" as string]: r, ["--y" as string]: y, ["--dl" as string]: `${dl}ms` }}>
              <span className="mono">{c.no}</span>
              <h2>{c.title} ▸</h2>
              <p>{c.desc}</p>
              {c.id === "problems" ? <Preview id={c.id} /> : <SectionPicture sectionId={c.id} className={s.pvPic} />}
            </Link>
          );
        })}
      </div>
      <div className={s.riseDots} aria-hidden="true">{cards.map((c, i) => <i key={c.id} data-on={i === at ? "" : undefined} />)}</div>
    </>
  );
}

/** A small look at what is inside each section. */
function Preview({ id }: { id: string }) {
  const rows = (r: [string, string, "ok" | "wn" | "bd"][]) => r.map(([a, b, k]) => <div key={a} className={s.pvRow}><span>{a}</span><b className={s[k]}>{b}</b></div>);
  return (
    <div className={s.pv}>
      {id === "concepts" && <><div className={s.flow}><span>Client</span>→<span className={s.hl}>Cache</span>→<span>DB</span></div>{rows([["Reads answered from memory", "95%", "ok"], ["Load on the database", "−80%", "ok"]])}</>}
      {id === "components" && <div className={s.tags}>{["Redis", "Kafka", "Postgres", "Cassandra", "DynamoDB", "Flink"].map((t) => <span key={t}>{t}</span>)}</div>}
      {id === "interview-questions" && rows([["Design a URL shortener", "Easy", "ok"], ["Design a chat app", "Medium", "wn"], ["Design payments", "Hard", "bd"]])}
      {id === "problems" && rows([["Evening peak", "Passed ✓", "ok"], ["A server dies", "Passed ✓", "ok"], ["Inside budget", "2 issues", "wn"]])}
    </div>
  );
}

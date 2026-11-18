import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mini } from "@legacy/library.jsx";
import { LabLock } from "@legacy/accountui.jsx";
import "@legacy/library.css";
import "@legacy/account.css";
import "@legacy/lablite.css";
import "@/features/workspace/legacy-scope.css";
import { useContent } from "@/content/ContentProvider";
import { paths } from "@/content/sections";
import { ArticleBody } from "@/features/reader/ArticleBody";
import tokens from "@/features/reader/figureTokens.module.css";
import { LOOK } from "@/lib/look";
import { tickerItems } from "@/content/ticker";
import type { ArticleResponse, SiteResponse } from "@/lib/api/types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useOnce, countUp } from "@/lib/motion";
import { Skeleton } from "@/components/ui";
import { useLegacySite } from "@/features/legacy/site";
import s from "../Landing.module.css";

// The landing sections tech.katta.cc has, from the same site copy: the hero figure (an animated Kafka diagram),
// the numbers strip, "Practise system design the way interviews test it", and IND vs PAK on a real canvas.

/** The current site's links ("/dashboard/problems/") as this app's routes. */
export function routeOf(href: string): string {
  const m = href.match(/^\/dashboard\/([^/]+)\/?(?:([^/]+)\/?)?$/);
  if (!m) return href;
  const [, sec = "", slug] = m;
  if (sec === "problems") return slug ? paths.problem(slug) : paths.problems;
  return slug ? paths.article(sec, slug) : paths.section(sec);
}

/** The hero figure, drawn by the lesson figure it is (kafka-group), with the site's head and caption. */
export function HeroFigure() {
  const { site } = useContent();
  const article = useMemo(
    () => ({ slug: "landing", section: "concepts", title: "", dek: "", example: site.example ?? { name: "Zotato", kind: "", text: "", parts: [] }, body: [{ t: "fig", id: "kafka-group", cap: site.hero.caption ?? "" }] }) as unknown as ArticleResponse,
    [site],
  );
  return (
    <div className={s.heroFig}>
      <div className={s.heroFigHead}><b><i aria-hidden="true" />{site.hero.figure}</b><span>{site.hero.status}</span></div>
      <ArticleBody article={article} />
    </div>
  );
}

/** "22 problems with tests · 24 challenge stars · …", counting up when seen (site.hero.stats). */
export function Stats() {
  const { site, articles } = useContent();
  const n = site.counts;
  const v: Record<string, number | undefined> = { ...n, articles: articles.length || (n.concepts + n.components) || undefined, stars: n.challenges ? n.challenges * 3 : undefined };
  return (
    <ul className={s.stats}>
      {(site.hero.stats ?? []).map(([k, label]) => {
        const m = k.match(/^\{(\w+)\}$/);
        const value = m ? v[m[1] ?? ""] : undefined;
        if (m && value === undefined) return null;
        return <li key={label}>{value !== undefined ? <Count to={value} /> : <b>{k}</b>}<span>{label}</span></li>;
      })}
    </ul>
  );
}

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLElement>(null);
  useOnce(ref, (el) => countUp(el as HTMLElement, to, 1000), 0.4);
  return <b ref={ref}>{to}</b>;
}

const fill = (t: string, site: SiteResponse, articles: number) =>
  t.replace(/\{(\w+)\}/g, (_, k: string) => String(k === "articles" ? articles : k === "stars" ? site.counts.challenges * 3 : (site.counts as unknown as Record<string, number>)[k] ?? ""));

/** What's inside (site.inside): the four things the site offers, as picture tiles. */
export function Inside() {
  const { site, articles } = useContent();
  const t = site.inside;
  if (!t) return null;
  return (
    <div className={s.wrap}>
      <p className="mono">{t.eyebrow}</p>
      <h2>{t.title}</h2>
      <p className={s.sub}>{t.desc}</p>
      <ol className={s.insideGrid}>
        {t.items.map((x) => (
          <li key={x.title}>
            <Link to={routeOf(x.href)}>
              <span className="mono">{fill(x.kind, site, articles.length)}</span>
              <b>{x.title}</b>
              <p>{x.text}</p>
              <span className={s.visual}>
                {x.visual?.startsWith("mini:") && <span className={`tk-legacy ${tokens.tokens} ${s.mini}`}><Mini type={x.visual.slice(5)} /></span>}
                {x.visual === "tests" && <ul className={s.tileTests}>{(x.tests ?? []).map(([a, b]) => <li key={a} data-ok={b === "Passed" ? "" : undefined}><span>{a}</span><b>{b}</b></li>)}</ul>}
                {x.visual === "stars" && <span className={s.tileStars} role="img" aria-label="Two of three stars"><i>★</i><i>★</i><i data-off="">★</i></span>}
              </span>
              <em>{x.link} →</em>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

const LandingProblem = lazy(() => import("@legacy/landingproblem.jsx"));

/** IND vs PAK on a real canvas (site.landingLab), loaded when it nears the screen; signed out, "Sign in to play". */
export function LandingLab() {
  const { site } = useContent();
  useLegacySite();
  const l = site.landingLab;
  const ref = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);
  const narrow = useMediaQuery("(max-width: 760px)");
  useOnce(ref, () => { setShow(true); return undefined; }, 0);
  if (!l) return null;
  const wait = <div className={s.labWait}><Skeleton height={20} width="40%" /><Skeleton height={320} /><small>{l.loading}</small></div>;
  return (
    <section ref={ref} id="ind-vs-pak" className={s.band}>
      <div className={s.wrap}>
        <p className="mono">{l.eyebrow}</p>
        <h2>{l.title}</h2>
        <p className={s.sub}>{l.desc}</p>
        <div className={`tk-legacy ${tokens.tokens} ${s.lpLab}`}>
          <LabLock t={site.account} lock={l.lock} lite={narrow}>
            {show ? <Suspense fallback={wait}><LandingProblem l={l} account={site.account} narrow={narrow} /></Suspense> : wait}
          </LabLock>
        </div>
        <p className={s.note}>{l.note}</p>
      </div>
    </section>
  );
}

/** The neo-brutalism look's running strip under the hero (its mock-up's ticker), from live counts. Drawn twice so it
 *  loops without a seam; screen readers get it once. The default look has no ticker. */
export function Ticker() {
  const { site, articles } = useContent();
  if (LOOK !== "neo-brutalism") return null;
  const items = tickerItems(site, articles);
  const run = (hidden: boolean) => (
    <span aria-hidden={hidden || undefined}>{items.map((t) => <span key={t}>{t}<i aria-hidden="true">✦</i></span>)}</span>
  );
  return (
    <div className={s.ticker} role="marquee" aria-label="Tech Katta in numbers">
      <div className={s.tickerRun}>{run(false)}{run(true)}</div>
    </div>
  );
}

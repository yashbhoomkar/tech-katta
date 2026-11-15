import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api/client";
import { useResource } from "@/lib/resource";
import { markComplete, recordReading, useProgress } from "@/lib/progress";
import { useContent } from "@/content/ContentProvider";
import { sectionView } from "@/content/model";
import { isSectionId, paths, sectionMeta } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Icon } from "@/components/Icon";
import { Button, ButtonLink, Skeleton, StateMessage } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { readJson, writeJson } from "@/lib/storage";
import { later, reducedMotion } from "@/lib/motion";
import { ArticleBody, outline, readMinutes } from "@/features/reader/ArticleBody";
import { cx } from "@/lib/cx";
import { useReadArticle } from "@/lib/analytics";
import { extraWords, words } from "@legacy/dashboard/text.jsx";
import { useReader } from "@legacy/dashboard/reader.jsx";
import { topicsOf } from "@legacy/dashboard/topics.jsx";
import { ListenBar, Topics } from "@/features/reader/LegacyLesson";
import { useLegacySite } from "@/features/legacy/site";
import type { ArticleResponse } from "@/lib/api/types";

const EMPTY = { slug: "", section: "", body: [], dek: "", title: "" } as unknown as ArticleResponse;
import { previewCut } from "@legacy/preview.js";
import { useGate } from "@/content/gate";
import { PreviewLock } from "@/components/Locks";
import s from "@/features/reader/reader.module.css";
import { NotFoundPage } from "./NotFound";

// The lesson reader: /learn/<section>/<slug>. The list data (title, dek, group) is already loaded with the
// app; the body comes from /v1/articles/<slug>, so the header shows at once and the body follows.

export function ReaderPage() {
  const { section = "", slug = "" } = useParams();
  const { site, articles } = useContent();
  const summary = articles.find((a) => a.slug === slug && a.section === section);
  const fetcher = useCallback((signal: AbortSignal) => api.article(slug, signal), [slug]);
  const res = useResource(`article:${slug}`, fetcher);
  const progress = useProgress();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setModeState] = useState<"full" | "cards">(() => readJson<"full" | "cards">("tk-reader-mode", "full", (v): v is "full" | "cards" => v === "full" || v === "cards"));
  const setMode = (m: "full" | "cards") => { setModeState(m); writeJson("tk-reader-mode", m); };
  const [topic, setTopic] = useState<number | null>(null);
  const [bursting, setBursting] = useState(false);
  const completeBtn = useRef<HTMLDivElement>(null);
  useEffect(() => setTopic(null), [slug]);

  const view = useMemo(() => (isSectionId(section) ? sectionView(site, articles, section) : null), [site, articles, section]);
  const order = useMemo(() => view?.groups.flatMap((g) => g.articles) ?? [], [view]);
  const at = order.findIndex((a) => a.slug === slug);
  const prev = at > 0 ? order[at - 1] : undefined;
  const next = at >= 0 ? order[at + 1] : undefined;
  const group = view?.groups.find((g) => g.articles.some((a) => a.slug === slug));

  const gate = useGate("article");
  usePageMeta(summary?.title ?? "Lesson", view ? { to: paths.section(section), label: view.title } : undefined);
  useReadingProgress(slug, res.status === "success");
  useReadArticle(section, slug, res.status === "success");
  // read aloud (the current app's reader): listening switches to the full text, where the block being read is marked
  const loaded = res.status === "success" ? res.data : null;
  const r = useReader(loaded ?? EMPTY);
  useEffect(() => { if (r.cur != null) setModeState("full"); }, [r.cur]);
  useLegacySite();

  if (!summary || !view) return <NotFoundPage />;
  const full = res.status === "success" ? res.data : null;
  // signed out (where sign-in is on): the opening of the lesson, then a sign-in card, as on tech.katta.cc
  const article = full && gate === "preview" ? { ...full, body: full.body.slice(0, previewCut(full.body)) } : full;
  // read time as tech.katta.cc counts it: the main text, and with the "Go deeper" parts and details
  const minutes = full ? Math.max(1, Math.round(words(full) / 220)) : article ? readMinutes(article) : null;
  const withDetails = full && minutes ? Math.max(minutes, Math.round((words(full) + extraWords(full)) / 220)) : null;
  const isProblem = section === "interview-questions" && summary.group !== "start";
  const iq = isProblem ? articles.filter((a) => a.section === section && a.group !== "start") : [];
  const nextProblem = iq[iq.findIndex((a) => a.slug === slug) + 1];
  const labTo = full?.body.find((b): b is Extract<typeof b, { t: "lab" }> => b.t === "lab")?.to;
  const toc = article ? outline(article.body) : [];
  const done = progress[slug]?.done ?? false;

  const ts = article && gate !== "preview" ? topicsOf(article) : [];
  const showCards = mode === "cards" && ts.length > 1 && gate !== "preview";
  const figNumbers: Record<number, number> = {};
  article?.body.reduce((n, b, k) => (b.t === "fig" ? (figNumbers[k] = n + 1) : n), 0);

  // mark complete: a tick and a burst in the section colours, a toast, then on to the next lesson
  const complete = () => {
    if (bursting) return;
    const wasDone = done;
    markComplete(slug);
    if (!wasDone) toast("Marked complete");
    setBursting(true);
    later(() => {
      setBursting(false);
      navigate(next ? paths.article(section, next.slug) : paths.section(section));
    }, wasDone ? 0 : 650);
  };

  const share = async () => {
    const url = window.location.href.split("#")[0] ?? window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: summary.title, text: summary.dek, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Copied the link");
      }
    } catch {
      // the reader closed the share sheet
    }
  };

  return (
    <div className={s.reader} data-accent={sectionMeta(section)?.accent}>
      <ProgressLine />
      <div className={s.layout}>
        <article className={s.main}>
          <nav className={s.crumbs} aria-label="Breadcrumb">
            <Link to={paths.learn}>Learn</Link>
            <span aria-hidden="true">/</span>
            <Link to={paths.section(section)}>{view.title}</Link>
            {group && group.id !== "more" && <><span aria-hidden="true">/</span><span>{group.title}</span></>}
          </nav>
          <header className={s.head}>
            <p className="mono">{summary.no}{summary.tag ? ` · ${summary.tag}` : ""}</p>
            <h1 style={{ viewTransitionName: "tk-title" }}>{summary.title}</h1>
            <p className={s.dek} data-reading={r.cur === "head" ? "" : undefined}>{summary.dek}</p>
            <p className={s.meta}>
              {minutes ? <span>{showCards ? `${ts.length} topics · ` : ""}{minutes} min read{withDetails && withDetails > minutes ? ` · ${withDetails} with details` : ""}</span> : <span>&nbsp;</span>}
              {done && <span className={s.doneChip}><Icon name="check" size={14} /> Completed</span>}
            </p>
            <div className={s.tools}>
              <div className={s.seg} role="radiogroup" aria-label="Read as">
                {(["full", "cards"] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setTopic(null); }}>{m === "full" ? "Full text" : "Cards"}</button>
                ))}
                <i className={s.segPill} style={{ transform: mode === "cards" ? "translateX(100%)" : undefined }} aria-hidden="true" />
              </div>
              <button type="button" className={s.toolBtn} onClick={share}><Icon name="share" size={16} /> Share</button>
            </div>
            {loaded && gate !== "preview" && <ListenBar r={r} />}
            {isProblem && gate !== "preview" && (
              <ButtonLink variant="primary" to={paths.problem(slug)} className={s.solveBtn}>{site.problems?.solve?.button ?? "Solve it on the canvas"} →</ButtonLink>
            )}
          </header>

          {toc.length > 0 && mode === "full" && <PhoneToc toc={toc} />}

          {res.status === "loading" && (
            <div className={s.loading} aria-label="Loading the lesson">
              <Skeleton height={18} /><Skeleton height={18} width="92%" /><Skeleton height={18} width="80%" />
              <Skeleton height={220} />
            </div>
          )}
          {res.status === "error" && (
            <StateMessage scene="offline" title="This lesson didn't load" action={res.error instanceof Error && "retryable" in res.error && !res.error.retryable ? undefined : <Button onClick={res.retry}>Try again</Button>}>
              {res.error.message}
            </StateMessage>
          )}
          {article && !showCards && <ArticleBody article={article} reading={r.cur} />}
          {article && gate === "preview" && <PreviewLock />}
          {article && showCards && article.body.some((b) => b.t === "example") && (
            <details className={s.exMini}>
              <summary>Examples use <b>{article.example.name}</b>, a made-up {article.example.kind.toLowerCase()}</summary>
              <ArticleBody article={{ ...article, body: [{ t: "example" }] }} />
            </details>
          )}
          {article && showCards && <Topics ts={ts} open={topic} setOpen={setTopic} still={reducedMotion()} fn={figNumbers} />}

          {article && gate !== "preview" && (
            <footer className={s.foot}>
              <div ref={completeBtn} className={s.completeWrap}>
                <Button variant="primary" onClick={complete}>
                  {bursting ? <Icon name="check" size={18} className={s.tick} /> : null}
                  {done ? "Next" : "Mark complete"}{next ? " & next" : ""} <Icon name="arrow" size={18} />
                </Button>
                {bursting && !reducedMotion() && <Burst />}
              </div>
              <div className={s.pager}>
                {prev ? (
                  <Link viewTransition to={paths.article(section, prev.slug)} className={s.pageLink}><small>Previous</small><span>{prev.title}</span></Link>
                ) : <span />}
                {next ? (
                  <Link viewTransition to={paths.article(section, next.slug)} className={cx(s.pageLink, s.pageNext)}><small>Next</small><span>{next.title}</span></Link>
                ) : (
                  <ButtonLink to={paths.section(section)}>Back to {view.title}</ButtonLink>
                )}
              </div>
              {isProblem && (
                <nav className={s.nextProblem} aria-label={site.problems?.next ?? "Next problem"}>
                  {nextProblem && <Link to={paths.article(section, nextProblem.slug)}><small>{site.problems?.next ?? "Next problem"}</small><b>{nextProblem.title} →</b></Link>}
                  <Link to={paths.problems} className={s.allProblems}>{site.problems?.allProblems ?? "All problems →"}</Link>
                </nav>
              )}
              <Link to={paths.section(section)} className={s.backLink}>← All {view.title.toLowerCase()}</Link>
            </footer>
          )}
        </article>

        <aside className={s.side} aria-label="Lesson navigation">
          {toc.length > 0 && !showCards && <Toc toc={toc} />}
          {(isProblem || labTo) && (
            <Link to={isProblem ? paths.problem(slug) : `/${labTo?.replace(/^\/+|\/+$/g, "")}`} className={s.railCta}>
              <small className="mono">{isProblem ? "Practise" : "Try it"}</small>
              <b>{isProblem ? (site.problems?.solve?.button ?? "Solve it on the canvas") : "Open the challenge"} →</b>
            </Link>
          )}
          {group && (
            <nav className={s.group} aria-label={`Lessons in ${group.title}`}>
              <p className="mono">{group.id === "more" ? view.title : group.title}</p>
              <ol>
                {group.articles.map((a) => (
                  <li key={a.slug}>
                    <Link viewTransition to={paths.article(section, a.slug)} aria-current={a.slug === slug ? "page" : undefined} data-done={progress[a.slug]?.done ? "" : undefined}>
                      <i aria-hidden="true">{progress[a.slug]?.done ? <Icon name="check" size={12} /> : null}</i>
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Ten pieces in the section colours fly out from the button. */
function Burst() {
  const colours = ["var(--a-concepts)", "var(--a-components)", "var(--a-interview)", "var(--a-problems)", "var(--marigold)"];
  return (
    <span className={s.burstHost} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const d = 46 + (i % 3) * 14;
        return <i key={i} className={s.burst} style={{ background: colours[i % colours.length], ["--x" as string]: `${Math.cos(a) * d}px`, ["--y" as string]: `${Math.sin(a) * d}px`, ["--rot" as string]: `${(i % 2 ? 1 : -1) * 120}deg` }} />;
      })}
    </span>
  );
}

/** Saves how far down the lesson the reader has got (at most every second), so Home can offer "Continue". */
function useReadingProgress(slug: string, ready: boolean) {
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

function ProgressLine() {
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

function Toc({ toc }: { toc: { id: string; text: string }[] }) {
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

function PhoneToc({ toc }: { toc: { id: string; text: string }[] }) {
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

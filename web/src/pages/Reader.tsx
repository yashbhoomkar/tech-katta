import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ArticleBody, outline, readMinutes } from "@/features/reader/ArticleBody";
import { cx } from "@/lib/cx";
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

  const view = useMemo(() => (isSectionId(section) ? sectionView(site, articles, section) : null), [site, articles, section]);
  const order = useMemo(() => view?.groups.flatMap((g) => g.articles) ?? [], [view]);
  const at = order.findIndex((a) => a.slug === slug);
  const prev = at > 0 ? order[at - 1] : undefined;
  const next = at >= 0 ? order[at + 1] : undefined;
  const group = view?.groups.find((g) => g.articles.some((a) => a.slug === slug));

  usePageMeta(summary?.title ?? "Lesson", view ? { to: paths.section(section), label: view.title } : undefined);
  useReadingProgress(slug, res.status === "success");

  if (!summary || !view) return <NotFoundPage />;
  const article = res.status === "success" ? res.data : null;
  const minutes = article ? readMinutes(article) : null;
  const toc = article ? outline(article.body) : [];
  const done = progress[slug]?.done ?? false;

  const complete = () => {
    markComplete(slug);
    navigate(next ? paths.article(section, next.slug) : paths.section(section));
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
            <h1>{summary.title}</h1>
            <p className={s.dek}>{summary.dek}</p>
            <p className={s.meta}>
              {minutes ? <span>{minutes} min read</span> : <span>&nbsp;</span>}
              {done && <span className={s.doneChip}><Icon name="check" size={14} /> Completed</span>}
            </p>
          </header>

          {toc.length > 0 && <PhoneToc toc={toc} />}

          {res.status === "loading" && (
            <div className={s.loading} aria-label="Loading the lesson">
              <Skeleton height={18} /><Skeleton height={18} width="92%" /><Skeleton height={18} width="80%" />
              <Skeleton height={220} />
            </div>
          )}
          {res.status === "error" && (
            <StateMessage title="This lesson didn't load" action={res.error instanceof Error && "retryable" in res.error && !res.error.retryable ? undefined : <Button onClick={res.retry}>Try again</Button>}>
              {res.error.message}
            </StateMessage>
          )}
          {article && <ArticleBody article={article} />}

          {article && (
            <footer className={s.foot}>
              <Button variant="primary" onClick={complete}>
                {done ? "Next" : "Mark complete"}{next ? " & next" : ""} <Icon name="arrow" size={18} />
              </Button>
              <div className={s.pager}>
                {prev ? (
                  <Link to={paths.article(section, prev.slug)} className={s.pageLink}><small>Previous</small><span>{prev.title}</span></Link>
                ) : <span />}
                {next ? (
                  <Link to={paths.article(section, next.slug)} className={cx(s.pageLink, s.pageNext)}><small>Next</small><span>{next.title}</span></Link>
                ) : (
                  <ButtonLink to={paths.section(section)}>Back to {view.title}</ButtonLink>
                )}
              </div>
            </footer>
          )}
        </article>

        <aside className={s.side} aria-label="Lesson navigation">
          {toc.length > 0 && <Toc toc={toc} />}
          {group && (
            <nav className={s.group} aria-label={`Lessons in ${group.title}`}>
              <p className="mono">{group.id === "more" ? view.title : group.title}</p>
              <ol>
                {group.articles.map((a) => (
                  <li key={a.slug}>
                    <Link to={paths.article(section, a.slug)} aria-current={a.slug === slug ? "page" : undefined} data-done={progress[a.slug]?.done ? "" : undefined}>
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
  return (
    <nav className={s.toc} aria-label="On this page">
      <p className="mono">On this page</p>
      <ul>
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

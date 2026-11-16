import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { greeting, nextInSection, problemOfTheDay, problemsOf, sectionView, tally } from "@/content/model";
import { SECTIONS, paths, sectionMeta } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ButtonLink, Card, Chip, CountUp, ProgressBar } from "@/components/ui";
import { cx } from "@/lib/cx";
import { SectionMini } from "@/components/SectionMini";
import { SectionPicture } from "@/components/SectionPicture";
import { problemRows, useLab, usePractice } from "@/content/practice";

import { lastInProgress, streakDays, useProgress } from "@/lib/progress";
import type { ArticleSummary } from "@/lib/api/types";
import s from "./pages.module.css";

// Home: what to read next, how far you are, today's problem, your week, and every section.

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export function HomePage() {
  usePageMeta("Home");
  const { site, articles } = useContent();
  const progress = useProgress();

  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const lastSlug = lastInProgress(progress);
  const resume: ArticleSummary | undefined = lastSlug ? bySlug.get(lastSlug) : undefined;
  const firstConcepts = nextInSection(sectionView(site, articles, "concepts"), progress);
  const next = resume ?? firstConcepts;
  const nextAccent = next ? sectionMeta(next.section)?.accent : undefined;

  const reading = articles.filter((a) => !a.tests);
  const problems = problemsOf(articles);
  const lessons = tally(reading, progress);
  const practice = usePractice();
  const lab = useLab();
  const chals = lab.status === "success" ? lab.data.challenges : [];
  const starsHave = chals.reduce((n, c) => n + Math.min(practice.stars[c.id] ?? 0, c.stars.length), 0);
  const starsMax = chals.reduce((n, c) => n + c.stars.length, 0);
  const rows = problemRows(problems, practice);
  const solvedN = rows.filter((r) => r.status === "solved").length;
  const solved = { done: solvedN, total: rows.length, pct: rows.length ? Math.round((solvedN / rows.length) * 100) : 0 };
  const today = problemOfTheDay(problems, progress);
  const streak = streakDays(progress);
  const weekday = (new Date().getDay() + 6) % 7; // Monday = 0

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1>{greeting(site)}</h1>
          <p>{streak > 0 ? `You're ${streak} ${streak === 1 ? "day" : "days"} into a streak. One more lesson keeps it going.` : site.dashboard.home.sub}</p>
        </div>
      </div>

      <div className={s.grid2}>
        {next && (
          <Card className={s.pad} tour="cont">
            <p className="mono">{resume ? "Continue where you left off" : "Start here"}</p>
            <div className={s.contIn} data-accent={nextAccent}>
              <SectionMini section={next.section} around={next.slug} className={s.contMini} />
              <div className={s.contText}>
                <Chip>{site.dashboard.sections.find(([id]) => id === next.section)?.[1]}</Chip>
                <h3>{next.title}</h3>
                {resume ? (
                  <>
                    <ProgressBar value={progress[next.slug]?.read ?? 0} label="Read so far" />
                    <small className={s.muted}>{Math.round((progress[next.slug]?.read ?? 0) * 100)}% read</small>
                  </>
                ) : (
                  <small className={s.muted}>{next.dek}</small>
                )}
              </div>
              <ButtonLink variant="primary" to={paths.article(next.section, next.slug)}>
                {resume ? "Resume →" : "Begin →"}
              </ButtonLink>
            </div>
          </Card>
        )}
        <Card className={s.pad} tour="prog">
          <p className="mono">Your progress</p>
          <div data-accent="concepts">
            <div className={s.stat}><span>Lessons read</span><b><CountUp to={lessons.done} /> of {lessons.total}</b></div>
            <ProgressBar value={lessons.total ? lessons.done / lessons.total : 0} label="Lessons read" />
          </div>
          <div data-accent="problems">
            <div className={s.stat}><span>Problems solved</span><b><CountUp to={solved.done} /> of {solved.total}</b></div>
            <ProgressBar value={solved.total ? solved.done / solved.total : 0} label="Problems solved" />
          </div>
          {lab.status === "success" && (
            <div data-accent="problems">
              <div className={s.stat}><span>Challenge stars</span><b><CountUp to={starsHave} /> of {starsMax}</b></div>
              <ProgressBar value={starsMax ? starsHave / starsMax : 0} label="Challenge stars" />
            </div>
          )}
          <small className={s.muted}>Kept in this browser, and in your account when you sign in.</small>
        </Card>
      </div>

      <div className={s.grid2}>
        {today && (
          <div className={s.pod} data-accent="problems">
            <div>
              <p className="mono">Problem of the day</p>
              <h3>{today.title}</h3>
              <p className={s.muted}>{today.group === "start" ? "Guide" : today.group[0]?.toUpperCase() + today.group.slice(1)}</p>
            </div>
            <ButtonLink variant="primary" to={paths.problem(today.slug)}>Open the canvas</ButtonLink>
          </div>
        )}
        <Card className={s.pad} tour="streak">
          <p className="mono">This week</p>
          <div className={s.days} aria-label={`Streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
            {WEEK.map((d, i) => (
              <span key={i} className={cx(i > weekday - streak && i <= weekday && s.on, i === weekday && s.today)}>
                <i />
                {d}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className={s.row}>
        <h2 className={s.h2}>{site.dashboard.home.explore}</h2>
        <Link className={s.link} to={paths.learn}>All sections →</Link>
      </div>
      <div className={s.tiles} data-tour="explore">
        {SECTIONS.map((meta) => {
          const own = articles.filter((a) => a.section === meta.id);
          const t = tally(own, progress);
          const title = site.dashboard.sections.find(([id]) => id === meta.id)?.[1] ?? meta.label;
          return (
            <Link key={meta.id} to={paths.section(meta.id)} className={`${s.tile} ${t.total || meta.id === "quick-notes" ? "" : s.soon}`} data-accent={meta.accent}>
              <SectionPicture sectionId={meta.id} className={s.tilePic} />
              <h3>{title} ▸</h3>
              <p>{t.total ? `${t.total} lessons` : meta.id === "quick-notes" && site.notes ? `${site.notes.items.length} notes · numbers worth knowing` : "Coming soon"}</p>
              <div className={s.tileFoot}>
                <ProgressBar value={t.total ? t.done / t.total : 0} label={`${title} progress`} />
                {t.pct}%
              </div>
            </Link>
          );
        })}
        <Link to={paths.problems} className={s.tile} data-accent="problems">
          <SectionPicture sectionId="problems" className={s.tilePic} />
          <h3>Problems ▸</h3>
          <p>{problems.length} problems with tests</p>
          <div className={s.tileFoot}>
            <ProgressBar value={solved.total ? solved.done / solved.total : 0} label="Problems progress" />
            {solved.pct}%
          </div>
        </Link>
      </div>
    </div>
  );
}

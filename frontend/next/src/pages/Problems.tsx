import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { problemsOf } from "@/content/model";
import { paths } from "@/content/sections";
import { problemRows, useBookmarks, useLab, usePractice, useProblemStats, type ProblemRow } from "@/content/practice";
import { dailyOf, planOf, toggleBookmark } from "@legacy/plan/plan.js";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Button, Card, Chip, CountUp, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { reducedMotion } from "@/lib/motion";
import { cx } from "@/lib/cx";
import s from "./problems.module.css";

// Problems: your numbers, difficulty filters, the list (a table on wide screens, cards on phones), Pick one for me,
// and the challenges with their stars. Each opens the workspace.

type Level = "all" | "easy" | "medium" | "hard";
const asLevel = (g: string): "easy" | "medium" | "hard" | undefined => (g === "easy" || g === "medium" || g === "hard" ? g : undefined);

export function ProblemsPage() {
  usePageMeta("Problems");
  const { articles } = useContent();
  const prog = usePractice();
  const lab = useLab();
  const toast = useToast();
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>("all");
  const [todo, setTodo] = useState(false);
  const [marked, setMarked] = useState(false);
  const marks = useBookmarks();
  const stats = useProblemStats();
  const accepted = (slug: string) => {
    const st = stats.status === "success" ? stats.data.problems[slug] : undefined;
    return st?.submissions ? `${Math.round((100 * st.accepted) / st.submissions)}%` : "—";
  };
  const [picked, setPicked] = useState<{ slug: string; n: number } | null>(null);
  const list = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => problemRows(problemsOf(articles), prog), [articles, prog]);
  const shown = rows.filter((r) => (level === "all" || r.a.group === level) && (!todo || r.status !== "solved") && (!marked || marks[r.a.slug]));
  // your plan (the current app's order and problem of the day, so both sites agree)
  const isSolved = (slug: string) => rows.find((r) => r.a.slug === slug)?.status === "solved";
  const daily = dailyOf(rows.map((r) => r.a), isSolved);
  const weeks = planOf(rows.map((r) => r.a));
  const nextInPlan = weeks.flatMap((w) => w.slugs).find((slug) => !isSolved(slug));
  const titleOf = (slug: string) => rows.find((r) => r.a.slug === slug)?.a.title ?? slug;
  const count = (l: Level) => rows.filter((r) => l === "all" || r.a.group === l).length;
  const solved = rows.filter((r) => r.status === "solved").length;
  const chals = lab.status === "success" ? lab.data.challenges : [];
  const starsHave = chals.reduce((n, c) => n + Math.min(prog.stars[c.id] ?? 0, c.stars.length), 0);
  const starsMax = chals.reduce((n, c) => n + c.stars.length, 0);

  const pick = () => {
    const open = shown.filter((r) => r.status !== "solved");
    const r = open[Math.floor(Math.random() * open.length)];
    if (!r) return toast("You've solved every one here.");
    setPicked((p) => ({ slug: r.a.slug, n: (p?.n ?? 0) + 1 }));
    toast(`Try this one: ${r.a.title}`);
    requestAnimationFrame(() => list.current?.querySelector(`[data-slug="${r.a.slug}"]`)?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }));
  };

  return (
    <div className={s.page} data-accent="problems">
      <header className={s.head}>
        <div>
          <p className="mono">Problems</p>
          <h1>Design it. Run it. Get judged.</h1>
          <p>Every problem has a test suite: traffic peaks, spikes, crashes and a budget. Your design passes when every test does.</p>
        </div>
        <div className={s.stats} data-tour="stats">
          <div><b><CountUp to={solved} />/{rows.length}</b><small>solved</small></div>
          <div><b><CountUp to={starsHave} />/{starsMax || "—"}</b><small>stars</small></div>
        </div>
      </header>

      <section className={s.plan} aria-labelledby="plan-h" data-tour="plan">
        <h2 id="plan-h" className={s.h2}>Your plan</h2>
        <div className={s.planCards}>
          {daily && (
            <Link to={paths.problem(daily.slug)} className={s.planCard}>
              <span className="mono">Problem of the day</span>
              <b>{daily.title}</b>
            </Link>
          )}
          {nextInPlan && (
            <Link to={paths.problem(nextInPlan)} className={s.planCard}>
              <span className="mono">Next in your plan · {solved} of {rows.length} done</span>
              <b>{titleOf(nextInPlan)}</b>
            </Link>
          )}
        </div>
        <details className={s.order}>
          <summary>The order to take them in</summary>
          <div className={s.weeks}>
            {weeks.map((w) => (
              <div key={w.name}>
                <p><b>{w.name}</b> <span>{w.slugs.filter(isSolved).length} of {w.slugs.length} · {w.why}</span></p>
                <div className={s.chips}>
                  {w.slugs.map((slug) => (
                    <Link key={slug} to={paths.problem(slug)} data-done={isSolved(slug) ? "" : undefined}>{titleOf(slug).replace(/^Design (a |an )?/, "")}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </section>

      <div className={s.filters}>
        <div className={s.f} role="group" aria-label="Filter by difficulty" data-tour="levels">
          {(["all", "easy", "medium", "hard"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? "All" : l[0]?.toUpperCase() + l.slice(1)} <span>{count(l)}</span>
            </button>
          ))}
          <button type="button" aria-pressed={todo} onClick={() => setTodo((t) => !t)}>Not done yet</button>
          <button type="button" aria-pressed={marked} onClick={() => setMarked((m) => !m)}>★ Bookmarked <span>{Object.keys(marks).length}</span></button>
        </div>
        <span data-tour="pick"><Button size="sm" onClick={pick}>⚄ Pick one for me</Button></span>
      </div>

      <div ref={list} key={`${level}${todo}`}>
        <Card className={s.tbl} tour="table">
          <table>
            <thead><tr><th><span className="sr-only">Status</span></th><th>#</th><th>Problem</th><th>Difficulty</th><th>Tests</th><th>Accepted</th><th>Best</th><th><span className="sr-only">Bookmark</span></th></tr></thead>
            <tbody>
              {shown.map((r, i) => (
                <Row key={r.a.slug} r={r} i={i} picked={picked?.slug === r.a.slug ? picked.n : 0} onOpen={() => navigate(paths.problem(r.a.slug))} accepted={accepted(r.a.slug)} marked={!!marks[r.a.slug]} />
              ))}
            </tbody>
          </table>
          {!shown.length && <p className={s.none}>All done here. Try them again, or come back for new ones.</p>}
        </Card>
        <ul className={s.cards}>
          {shown.map((r, i) => (
            <li key={r.a.slug} style={{ animationDelay: `${Math.min(i, 8) * 22}ms` }}>
              <Link to={paths.problem(r.a.slug)} data-slug={r.a.slug} key={picked?.slug === r.a.slug ? picked.n : 0} className={cx(s.pcard, picked?.slug === r.a.slug && s.picked)} data-status={r.status}>
                <span className={cx("mono", s.pn)}>{r.a.no.replace(/^\D+\/\/\s*/, "")}</span>
                <span className={s.pt}>{r.a.title}</span>
                <span className={s.pm}><Chip level={asLevel(r.a.group)}>{r.a.tag}</Chip>{r.tests ? <span>{r.tests} tests</span> : null}{r.best != null && <b>{r.best}</b>}</span>
                <span className={s.ps} aria-label={r.status === "new" ? "not started" : r.status}>{r.status === "solved" ? "✓" : r.status === "started" ? "◐" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <section>
        <h2 className={s.h2} id="challenges">Challenges</h2>
        <p className={s.sub}>Build a design and run an evening's traffic through it. Stars for staying up, not crashing and keeping to the budget.</p>
        {lab.status === "loading" && <div className={s.chals}>{[0, 1, 2, 3].map((k) => <Skeleton key={k} height={120} />)}</div>}
        {lab.status === "error" && <p className={s.none}>The challenges couldn't load. <button type="button" className={s.link} onClick={lab.retry}>Try again</button></p>}
        <div className={s.chals}>
          <Link to="/problems/sandbox" className={`${s.chal} ${s.sandbox}`}>
            <p className="mono">Sandbox</p>
            <h3>Design anything</h3>
            <span className={s.sub}>A free canvas: any parts, any traffic. No tests, no score.</span>
          </Link>
          {chals.map((c, i) => {
            const n = Math.min(prog.stars[c.id] ?? 0, c.stars.length);
            return (
              <Link key={c.id} to={`/problems/challenge/${c.id}`} className={s.chal} style={{ animationDelay: `${i * 40}ms` }}>
                <p className="mono">{lab.status === "success" ? (lab.data.levels?.[c.level] ?? c.level) : c.level}</p>
                <h3>{c.title}</h3>
                <span className={s.stars} aria-label={`${n} of ${c.stars.length} stars`}>{Array.from({ length: c.stars.length }, (_, k) => <i key={k} data-on={k < n ? "" : undefined}>★</i>)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Row({ r, i, picked, onOpen, accepted, marked }: { r: ProblemRow; i: number; picked: number; onOpen: () => void; accepted: string; marked: boolean }) {
  return (
    <tr key={picked} data-slug={r.a.slug} className={cx(s.row, picked > 0 && s.picked)} data-status={r.status} style={{ animationDelay: `${Math.min(i, 10) * (i < 4 ? 25 : 18)}ms` }} onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) onOpen(); }}>
      <td className={s.st} aria-label={r.status === "new" ? "not started" : r.status}>{r.status === "solved" ? "✓" : r.status === "started" ? "◐" : ""}</td>
      <td className="mono">{r.a.no.replace(/^\D+\/\/\s*/, "")}</td>
      <td className={s.tt}><Link to={paths.problem(r.a.slug)}>{r.a.title}</Link></td>
      <td><Chip level={asLevel(r.a.group)}>{r.a.tag}</Chip></td>
      <td>{r.tests || "—"}</td>
      <td className={s.muted}>{accepted}</td>
      <td className={r.best != null ? s.best : s.muted}>{r.best ?? "—"}</td>
      <td><button type="button" className={s.star} aria-pressed={marked} aria-label={marked ? `Remove the bookmark on ${r.a.title}` : `Bookmark ${r.a.title}`} onClick={(e) => { e.stopPropagation(); toggleBookmark(r.a.slug); }}>{marked ? "★" : "☆"}</button></td>
    </tr>
  );
}

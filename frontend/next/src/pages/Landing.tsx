import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { SECTIONS, paths, sectionMeta } from "@/content/sections";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Button, ButtonLink, ThemeSwitch } from "@/components/ui";
import { useInView } from "@/lib/useInView";
import { useSheetDrag } from "@/lib/gestures";
import { countUp, later, useOnce } from "@/lib/motion";
import { useSignIn } from "@/components/SignIn";
import { cx } from "@/lib/cx";
import { HeroFigure, Inside, LandingLab, Stats, Ticker } from "./LandingExtras";
import { SectionPicture } from "@/components/SectionPicture";
import s from "./Landing.module.css";

/** the build date, shown in the footer as tech.katta.cc does */
const BUILT = new Date(__BUILD_DATE__).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// The public landing page. All words come from the API (site.hero, site.topics, site.numbers, counts), so
// content edits reach it without a frontend release.

export function LandingPage() {
  usePageMeta("");
  const { site, articles } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const signIn = useSignIn();
  const hero = useRef<HTMLElement>(null);
  const heroSeen = useInView(hero, 0);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [titleStart, titleEnd] = splitTitle(site.hero.title);
  // the four hero cards: Concepts, Components, Interview Questions, Problems. The API's topic cards supply the
  // words where it has them (its "problems" card is the Interview Questions section); the rest fall back.
  const apiCard = (id: string) => site.topics.cards.find((c) => c.id === id);
  const cards = [
    { id: "concepts", accent: "concepts", to: paths.section("concepts"), card: apiCard("concepts") },
    { id: "components", accent: "components", to: paths.section("components"), card: apiCard("components") },
    { id: "interview-questions", accent: "interview", to: paths.section("interview-questions"), card: apiCard("problems") },
    { id: "problems", accent: "problems", to: paths.problems, card: undefined },
  ].map((c, i) => ({
    ...c,
    no: c.card?.no ?? `SECTION // 0${i + 1}`,
    title: c.card?.title ?? (c.id === "problems" ? "Problems" : (sectionMeta(c.id)?.label ?? c.id)),
    desc: c.card?.desc ?? (c.id === "problems" ? `Build it on a canvas. Peaks, crashes and a budget decide your score. ${site.counts.questions} problems.` : (sectionMeta(c.id)?.blurb ?? "")),
  }));

  return (
    <div className={s.landing}>
      <header className={`${s.nav} ${stuck ? s.stuck : ""}`}>
        <div className={s.wrap}>
          <Logo to={paths.landing} />
          <nav className={s.links} aria-label="Main">
            <LearnMenu />
            <Link to={paths.problems}>Problems</Link>
            <button type="button" onClick={() => scrollToId("how")}>How it works</button>
            <button type="button" onClick={() => scrollToId("teacher")}>About</button>
          </nav>
          <div className={s.navRight}>
            <button type="button" className={s.login} onClick={signIn.open}>Log in</button>
            <ButtonLink variant="primary" size="sm" to={paths.home}>Start free</ButtonLink>
            <button type="button" className={s.menuBtn} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}

      <section ref={hero} className={cx(s.hero, !heroSeen && s.off)}>
        {SHAPES.map((sh, n) => <i key={n} className={s.shape} style={{ ...sh, ["--n" as string]: n }} aria-hidden="true" />)}
        <div className={s.wrap}>
          <Link to={paths.problems} className={s.newchip}><i aria-hidden="true" />{site.hero.chip} · {site.hero.chipText}</Link>
          <h1>
            {titleStart.split(" ").map((w, i) => <span key={i}><span className={s.word} style={{ animationDelay: `${i * 110}ms` }}>{w}</span> </span>)}
            <em className={s.word} style={{ animationDelay: `${titleStart.split(" ").length * 95}ms` }}>{titleEnd}</em>
          </h1>
          <p className={s.lead}>{site.hero.description}</p>
          <div className={s.ctas}>
            <ButtonLink variant="primary" to={paths.home}>{site.hero.primary}, free</ButtonLink>
            <a className={s.ghostBtn} href="#ind-vs-pak" onClick={(e) => { e.preventDefault(); scrollToId("ind-vs-pak"); }}>{site.hero.secondary}</a>
          </div>
          <p className={s.note}>No card. Sign in with Google and everything opens.</p>
          <HeroCards cards={cards} />
        </div>
        <div className={s.arc} aria-hidden="true" />
      </section>
      <Ticker />

      <section className={s.figBand} aria-label="A figure from the lessons">
        <div className={s.wrap}>
          <HeroFigure />
          <Stats />
        </div>
      </section>

      <Reveal className={cx(s.band, s.plain)} id="how">
        <div className={s.wrap}>
          <p className="mono">In plain words</p>
          <p className={s.big}>Big apps run on hundreds of computers working together. Planning how they share the work, and what happens when one fails, is called system design.</p>
          <div className={s.steps}>
            {([["concepts", "Read", "Short notes with diagrams that move, one idea at a time."], ["interview", "Practise", "Real interview questions, answered the way interviewers expect."], ["problems", "Get judged", "Draw your design. A judge sends traffic through it and shows what broke."]] as const).map(([a, h, p]) => (
              <div key={h} className={s.step} data-accent={a}><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={cx(s.band, s.alt, s.inside)}>
        <div className={s.wrap}>
          <h2>Take a look inside</h2>
          <LookInside />
        </div>
      </Reveal>

      <Reveal className={s.band}>
        <div className={`${s.wrap} ${s.judge}`}>
          <div>
            <p className="mono">The judge</p>
            <h2>Your design, tested by an evening of real traffic.</h2>
            <p className={s.sub}>Run the example tests, then submit. Peaks, a crashed server and a monthly budget decide your score out of 100.</p>
            <ButtonLink variant="primary" to={paths.problem("url-shortener")} className={cx(s.mt)}>Solve your first problem</ButtonLink>
          </div>
          <JudgeCard />
        </div>
      </Reveal>

      <Reveal className={cx(s.band, s.alt)} id="teacher">
        <div className={cx(s.wrap, s.teacher)}>
          <div className={s.face} data-accent="components" aria-hidden="true">TK</div>
          <div>
            <p className="mono">Taught by</p>
            <p className={s.q}>Hi, I'm Yash. I build backend systems for a living, and I write these notes the way I wish someone had explained them to me.</p>
            <p>Every article uses one made-up app, Zotato, so the examples connect. Videos of me walking through each design are on the way.</p>
          </div>
        </div>
      </Reveal>

      <Reveal className={cx(s.band, s.alt)}>
        <div className={s.wrap}>
          <p className="mono">{site.numbers.eyebrow}</p>
          <h2>{site.numbers.title}</h2>
          <p className={s.sub}>{site.numbers.desc}</p>
          <dl className={s.numbers}>
            {site.numbers.items.slice(0, 6).map(([what, value]) => (
              <div key={what}><dt>{what}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      </Reveal>

      <Reveal className={cx(s.band, s.alt)}>
        <Inside />
      </Reveal>

      <LandingLab />

      <section className={s.final}>
        <div className={s.wrap}>
          <h2>Start with Networking essentials. It takes 12 minutes.</h2>
          <ButtonLink to={paths.article("concepts", "networking-essentials")} className={cx(s.finalBtn)}>Start learning, free</ButtonLink>
        </div>
      </section>
      <footer className={`${s.wrap} ${s.foot}`}>
        <Logo to={paths.landing} />
        <nav className={s.footLinks} aria-label="Footer">
          {SECTIONS.filter((m) => articles.some((a) => a.section === m.id)).map((m) => <Link key={m.id} to={paths.section(m.id)}>{m.label}</Link>)}
          <Link to={paths.problems}>Problems</Link>
        </nav>
        <div className={s.footRight}><ThemeSwitch /><span>{site.brand.footer} {site.brand.footerNote}</span>{site.footer && <small>{site.footer.updated}: {BUILT}</small>}</div>
      </footer>
    </div>
  );
}

/** "System design, explained." → ["System design,", "explained."]: the last word gets the serif accent. */
function splitTitle(title: string): [string, string] {
  const i = title.trimEnd().lastIndexOf(" ");
  return i < 0 ? ["", title] : [title.slice(0, i), title.slice(i + 1)];
}

function Reveal({ className, children, id }: { className: string | undefined; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  return <section ref={ref} id={id} className={cx(className, s.reveal, seen && s.in)}>{children}</section>;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

/** Coloured shapes behind the hero; they drift slowly while the hero is on screen. */
const SHAPES: CSSProperties[] = [
  { left: "9%", top: 90, width: 64, height: 64, background: "var(--a-components)", rotate: "18deg" },
  { right: "12%", top: 60, width: 70, height: 70, background: "var(--a-interview)", borderRadius: "30%", rotate: "14deg" },
  { right: "7%", top: 300, width: 58, height: 58, background: "var(--a-concepts)", borderRadius: "50%" },
  { left: "15%", top: 380, width: 58, height: 58, background: "var(--a-concepts)", borderRadius: "30%", rotate: "8deg" },
  { right: "22%", top: 420, width: 44, height: 44, background: "var(--a-real)", rotate: "-24deg" },
];

/** Each card's tilt and drop: the four fan out like a hand of cards and straighten under the mouse. */
const TILT = [["-4deg", "16px", 560], ["-1.5deg", "0px", 500], ["1.5deg", "0px", 540], ["4deg", "16px", 610]] as const;

interface HeroCard { id: string; accent: string; to: string; no: string; title: string; desc: string }

function HeroCards({ cards }: { cards: HeroCard[] }) {
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

/** A window onto the app: a section's lesson list beside an open lesson. */
function LookInside() {
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
function JudgeCard() {
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
    <div ref={ref} className={s.jcard} aria-label={j.label}>
      <div className={s.jrow}><b>{j.title}</b><span className={cx(s.stars, stars && s.starsGo)} style={{ visibility: stars ? undefined : "hidden" }} aria-label={`${j.stars} of 3 stars`}>{Array.from({ length: j.stars }, (_, i) => <i key={i}>★</i>)}</span></div>
      {j.rows.map(([test, result], i) => (
        <div key={test} className={s.jrow}><span>{test}</span><b className={cx(s.ts, i > done ? s.run : i === done && s.tsDone)}>{i > done ? "Running" : `${result} ✓`}</b></div>
      ))}
      <div className={s.jscore}><span>Score</span><b ref={score}>92 / 100</b></div>
    </div>
  );
}


/** "Learn" in the landing nav: a menu of the sections. Opens on hover with a mouse (80 ms in, 200 ms out), click or Enter otherwise. */
function LearnMenu() {
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

function MobileMenu({ onClose }: { onClose: () => void }) {
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

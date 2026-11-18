import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { SECTIONS, paths, sectionMeta } from "@/content/sections";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ButtonLink, ThemeSwitch } from "@/components/ui";
import { useInView } from "@/lib/useInView";
import { useSignIn } from "@/components/SignIn";
import { cx } from "@/lib/cx";
import { HeroFigure, Inside, LandingLab, Stats, Ticker } from "./landing/extras";
import s from "./Landing.module.css";
import { scrollToId, LearnMenu, MobileMenu } from "./landing/nav";
import { splitTitle, HeroCards } from "./landing/hero";
import { Reveal, LookInside, JudgeCard } from "./landing/bands";

/** The soft 3D look opens with the 3D scroll story (landing/Story3d.tsx, three.js). The condition is fixed at build
 *  time, so the other looks' bundles carry none of it. */
const Story3d = import.meta.env.VITE_STYLE === "soft-3d" ? lazy(() => import("./landing/Story3d")) : null;

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

      {Story3d ? (
        <Suspense fallback={<div className={s.storyWait} />}><Story3d /></Suspense>
      ) : (
        <>
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
        </>
      )}

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

/** Coloured shapes behind the hero; they drift slowly while the hero is on screen. */
const SHAPES: CSSProperties[] = [
  { left: "9%", top: 90, width: 64, height: 64, background: "var(--a-components)", rotate: "18deg" },
  { right: "12%", top: 60, width: 70, height: 70, background: "var(--a-interview)", borderRadius: "30%", rotate: "14deg" },
  { right: "7%", top: 300, width: 58, height: 58, background: "var(--a-concepts)", borderRadius: "50%" },
  { left: "15%", top: 380, width: 58, height: 58, background: "var(--a-concepts)", borderRadius: "30%", rotate: "8deg" },
  { right: "22%", top: 420, width: 44, height: 44, background: "var(--a-real)", rotate: "-24deg" },
];


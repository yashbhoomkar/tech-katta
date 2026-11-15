import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { fill } from "@/content/model";
import { SECTIONS, paths, sectionMeta } from "@/content/sections";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ButtonLink, ThemeSwitch } from "@/components/ui";
import { useInView } from "@/lib/useInView";
import { cx } from "@/lib/cx";
import s from "./Landing.module.css";

// The public landing page. All words come from the API (site.hero, site.topics, site.numbers, counts), so
// content edits reach it without a frontend release.

export function LandingPage() {
  usePageMeta("");
  const { site, articles } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

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
            {SECTIONS.filter((m) => articles.some((a) => a.section === m.id)).map((m) => (
              <Link key={m.id} to={paths.section(m.id)}>{site.dashboard.sections.find(([id]) => id === m.id)?.[1] ?? m.label}</Link>
            ))}
            <Link to={paths.problems}>Problems</Link>
          </nav>
          <div className={s.navRight}>
            <ButtonLink variant="primary" size="sm" to={paths.home}>Start free</ButtonLink>
            <button type="button" className={s.menuBtn} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}

      <section className={s.hero}>
        <div className={s.wrap}>
          <Link to={paths.problems} className={s.newchip}><i aria-hidden="true" />{site.hero.chip} · {site.hero.chipText}</Link>
          <h1>
            <span className={s.word} style={{ animationDelay: "0ms" }}>{titleStart}</span>{" "}
            <em className={s.word} style={{ animationDelay: "120ms" }}>{titleEnd}</em>
          </h1>
          <p className={s.lead}>{site.hero.description}</p>
          <div className={s.ctas}>
            <ButtonLink variant="primary" to={paths.home}>{site.hero.primary}, free</ButtonLink>
            <ButtonLink to={paths.problem("ind-vs-pak")}>{site.hero.secondary}</ButtonLink>
          </div>
          <div className={s.rise}>
            {cards.map((c, i) => (
              <Link key={c.id} to={c.to} className={s.rcard} data-accent={c.accent} style={{ ["--i" as string]: i }}>
                <span className="mono">{c.no}</span>
                <h3>{c.title} ▸</h3>
                <p>{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Reveal className={s.band}>
        <div className={`${s.wrap} ${s.judge}`}>
          <div>
            <p className="mono">The judge</p>
            <h2>Your design, tested by an evening of real traffic.</h2>
            <p className={s.sub}>Run the example tests, then submit. Peaks, a crashed server and a monthly budget decide your score out of 100.</p>
            <ButtonLink variant="primary" to={paths.problem("url-shortener")} className={cx(s.mt)}>Solve your first problem</ButtonLink>
          </div>
          <div className={s.jcard} aria-label={site.hero.judge.label}>
            <div className={s.jrow}><b>{site.hero.judge.title}</b><span className={s.stars} aria-label={`${site.hero.judge.stars} of 3 stars`}>{"★".repeat(site.hero.judge.stars)}</span></div>
            {site.hero.judge.rows.map(([test, result]) => (
              <div key={test} className={s.jrow}><span>{test}</span><b className={s.pass}>{result} ✓</b></div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className={`${s.band} ${s.alt}`}>
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

      <Reveal className={s.band}>
        <div className={`${s.wrap} ${s.counts}`}>
          {[
            [String(articles.length), "visual notes"],
            [String(site.counts.questions), "problems with tests"],
            [String(site.counts.challenges), `challenges, ${site.counts.challenges * 3} stars`],
            ["₹0", "free with sign-in"],
          ].map(([n, label]) => (
            <div key={label} className={s.count}><b>{n}</b><span>{fill(label ?? "", site, articles)}</span></div>
          ))}
        </div>
      </Reveal>

      <section className={s.final}>
        <div className={s.wrap}>
          <h2>Start with Networking essentials. It takes 12 minutes.</h2>
          <ButtonLink to={paths.article("concepts", "networking-essentials")} className={cx(s.finalBtn)}>Start learning, free</ButtonLink>
        </div>
      </section>
      <footer className={`${s.wrap} ${s.foot}`}>
        <Logo to={paths.landing} />
        <span>{site.brand.footerNote}</span>
        <ThemeSwitch />
      </footer>
    </div>
  );
}

/** "System design, explained." → ["System design,", "explained."]: the last word gets the serif accent. */
function splitTitle(title: string): [string, string] {
  const i = title.trimEnd().lastIndexOf(" ");
  return i < 0 ? ["", title] : [title.slice(0, i), title.slice(i + 1)];
}

function Reveal({ className, children }: { className: string | undefined; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  return <section ref={ref} className={cx(className, s.reveal, seen && s.in)}>{children}</section>;
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { site, articles } = useContent();
  const closeBtn = useRef<HTMLButtonElement>(null);
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
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Menu">
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
      </div>
    </div>
  );
}

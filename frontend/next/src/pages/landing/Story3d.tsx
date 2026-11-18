import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { paths } from "@/content/sections";
import { cx } from "@/lib/cx";
import { createScene3d, type Scene3d } from "./scene3d.js";
import s from "./Story3d.module.css";

// The soft 3D look's landing opening (owner, 2026-11-18: "create a new prototype with this design similar to
// rca.gg"): the scroll-3d prototype's story inside the app. One WebGL scene (scene3d.js, three.js) on a sticky stage;
// six chapters scroll over it and the camera glides between them. A URL shortener on IND vs PAK night loses its only
// cache, the database drowns, we find why and add a replica. Loaded only by the soft-3d build (Landing.tsx).
// Without WebGL the chapters read on their own; with reduced motion the camera jumps and nothing moves by itself.

const CHAPTERS = ["Start", "The spike", "It breaks", "Find the cause", "Fix it", "Your turn"];

export default function Story3d() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const segs = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current, cv = canvas.current, ov = overlay.current;
    if (!el || !cv || !ov) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: Scene3d | null = null;
    try { scene = createScene3d(cv, ov, { reduced }); } catch { scene = null; }
    el.classList.toggle(s.flat ?? "flat", !scene);
    const chapters = [...el.querySelectorAll<HTMLElement>("[data-chapter]")];

    const show = (n: number) => {
      scene?.setChapter(n);
      if (counter.current) counter.current.textContent = `${String(n).padStart(2, "0")} / 05`;
      if (name.current) name.current.textContent = (CHAPTERS[n] ?? "").toUpperCase();
      segs.current?.querySelectorAll("i").forEach((i, k) => i.classList.toggle(s.on ?? "on", k < n));
      el.dataset.chapter = String(n);
    };
    const seen = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) show(Number((e.target as HTMLElement).dataset.chapter)); }, { rootMargin: "-45% 0px -45% 0px" });
    const reveal = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add(s.seen ?? "seen"); reveal.unobserve(e.target); } }, { threshold: 0.2 });
    chapters.forEach((c) => { seen.observe(c); reveal.observe(c); });

    // the camera follows the scroll: a fractional chapter index from where each chapter's middle is
    const onScroll = () => {
      const mid = innerHeight / 2;
      const centres = chapters.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
      let f = 0;
      for (let i = 0; i < centres.length - 1; i++) {
        const a = centres[i] ?? 0, b = centres[i + 1] ?? a + 1;
        if (mid >= a) f = i + Math.min(1, (mid - a) / (b - a));
      }
      if (mid >= (centres[centres.length - 1] ?? Infinity)) f = centres.length - 1;
      scene?.setProgress(f);
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();

    // "break." is filled with log lines (a canvas pattern; the CSP allows data: images)
    const logFill = () => {
      const w = word.current;
      if (!w) return;
      const c = document.createElement("canvas"), W = 900, H = 380;
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      if (!g) return;
      g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6D3FE0";
      g.fillRect(0, 0, W, H);
      g.font = '600 15px "IBM Plex Mono", monospace';
      g.fillStyle = "rgba(255,255,255,.5)";
      const lines = ["cache ERROR node unreachable", "db WARN connections 500/500", "api ERROR upstream timeout 2000ms", "lb WARN 5xx rate 31%", "links.open 40,112/s expected=4,000/s", "db queries 37,600/s", "cache.hit 0% was=94%"];
      for (let y = 18, i = 0; y < H; y += 19, i++) g.fillText(`${lines[i % 7]} · ${lines[(i + 3) % 7]} · ${lines[(i + 5) % 7]}`, -((i * 37) % 160), y);
      w.style.backgroundImage = `url(${c.toDataURL()})`;
    };
    logFill();
    document.fonts?.ready.then(logFill);
    const themeObs = new MutationObserver(logFill);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      seen.disconnect(); reveal.disconnect(); themeObs.disconnect();
      removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll);
      scene?.destroy();
    };
  }, []);

  const go = (n: number) => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.current?.querySelector(`[data-chapter="${n}"]`)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section ref={root} className={s.story} aria-label="How a system breaks, and how you fix it" data-chapter="0">
      <div className={s.stageWrap} aria-hidden="true"><div className={s.stage}>
        <canvas ref={canvas} className={s.canvas} />
        <div ref={overlay} className={s.overlay} />
        <div className={s.progress}>
          <span ref={counter} className={s.mono}>00 / 05</span>
          <span ref={segs} className={s.segs}><i /><i /><i /><i /><i /></span>
          <span ref={name} className={s.mono}>START</span>
        </div>
      </div></div>

      <div className={cx(s.chapter, s.hero)} data-chapter="0">
        <h1 className={s.headline}>
          <span className={s.thin}>Systems <span ref={word} className={s.logword}>break.</span></span>
          <span className={cx(s.heavy, s.accent)}>Design ones that don't.</span>
        </h1>
        <p className={s.lead}>Practise system design on real problems. Watch your design run, fail and recover.</p>
        <div className={s.actions}>
          <Link className={cx(s.btn, s.dark)} to={paths.home}>Start practising<span className={s.chip} aria-hidden="true">→</span></Link>
          <button className={cx(s.btn, s.light)} type="button" onClick={() => go(1)}>See how it works<span className={cx(s.chip, s.violet)} aria-hidden="true">↓</span></button>
        </div>
      </div>

      <div className={s.chapter} data-chapter="1">
        <p className={s.kicker}><span>01</span><i />THE SPIKE</p>
        <h2 className={s.headline}><span className={s.thin}>IND vs PAK. 40,000 link opens a second.</span><span className={cx(s.heavy, s.accent)}>Everything is green.</span></h2>
        <p className={s.lead}>The promo SMS goes out to crores of fans. Every tap on a short link is one read: the cache answers most of them before the database ever hears.</p>
        <dl className={s.stats}>
          <div><dt>Traffic</dt><dd>40k /s</dd></div>
          <div><dt>Cache hit</dt><dd>94 %</dd></div>
          <div><dt>p99</dt><dd>38 ms</dd></div>
        </dl>
      </div>

      <div className={s.chapter} data-chapter="2">
        <p className={s.kicker}><span>02</span><i />IT BREAKS</p>
        <h2 className={s.headline}><span className={s.thin}>The cache goes down.</span><span className={cx(s.heavy, s.accent)}>The database takes it all.</span></h2>
        <p className={s.lead}>One cache node, no replica. When it dies, every open falls through to a single database built for a tenth of that.</p>
        <dl className={s.stats}>
          <div><dt>Errors</dt><dd className={s.alert}>31 %</dd></div>
          <div><dt>Since</dt><dd>20:14 IST</dd></div>
          <div><dt>Severity</dt><dd className={s.alert}>SEV-1</dd></div>
        </dl>
      </div>

      <div className={s.chapter} data-chapter="3">
        <p className={s.kicker}><span>03</span><i />FIND THE CAUSE</p>
        <h2 className={s.headline}><span className={s.thin}>One database.</span><span className={cx(s.heavy, s.accent)}>Forty thousand reads.</span></h2>
        <p className={s.lead}>The database isn't broken. It is doing exactly what it can, and that is about a tenth of what arrives.</p>
        <div className={s.compare}>
          <div><small>What one database serves</small><b>4,000<em>/s</em></b></div>
          <span className={s.neq} aria-label="is not">≠</span>
          <div className={s.right}><small>What arrived</small><b className={s.accent}>37,600<em>/s</em></b></div>
          <div className={s.bar} aria-hidden="true"><span className={s.fit} /><span className={s.over} /></div>
          <p className={s.barNote}>+33,600 /s with nowhere to go</p>
        </div>
      </div>

      <div className={s.chapter} data-chapter="4">
        <p className={s.kicker}><span>04</span><i />FIX IT</p>
        <h2 className={s.headline}><span className={s.thin}>Add a replica.</span><span className={cx(s.heavy, s.ok)}>Turn it green.</span></h2>
        <p className={s.lead}>Two cache nodes and a read replica. Run the same spike again, and the design holds.</p>
        <ol className={s.track}>
          <li className={s.done}><span className={s.dot} /><small>01</small><b>Root cause</b><span>cache had no replica</span></li>
          <li className={s.done}><span className={s.dot} /><small>02</small><b>Fix</b><span>cache nodes 2 · read replica 1</span></li>
          <li className={s.now}><span className={s.dot} /><small>03</small><b>Back to normal</b><span>p99 41 ms · errors 0 %</span></li>
        </ol>
      </div>

      <div className={cx(s.chapter, s.finale)} data-chapter="5">
        <p className={s.kicker}><span>05</span><i />YOUR TURN</p>
        <h2 className={s.headline}><span className={s.heavy}>Every outage</span><span className={cx(s.heavy, s.accent)}>makes you sharper.</span></h2>
        <p className={s.lead}>Design it, run it, break it, fix it. Learn the ideas first, then get judged on real problems.</p>
        <div className={s.actions}>
          <Link className={cx(s.btn, s.violetBtn)} to={paths.problems}>Open the problems<span className={s.chip} aria-hidden="true">→</span></Link>
          <Link className={cx(s.btn, s.light)} to={paths.learn}>Start learning</Link>
        </div>
      </div>
    </section>
  );
}

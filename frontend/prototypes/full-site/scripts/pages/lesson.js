// The lesson reader (focus layout). Left: the group's lessons (on phones a "Contents" button opens them);
// middle: the lesson, as full text or one card at a time; right: "On this page" and a canvas challenge.
// The top bar (topbar.js) carries breadcrumbs and previous / next.
import { $, $$, esc } from "../core/dom.js";
import { later, RM, replay, placeIndicator } from "../core/motion.js";
import { findLesson, completeLesson, progressOf } from "../data/sections.js";
import { toast } from "../components/toast.js";
import * as notFound from "./not-found.js";

const f = (ctx) => findLesson(ctx.params[0], ctx.params[1]);
const href = (sec, l) => `learn/${sec.id}/${l.slug}`;

export const title = (ctx) => f(ctx)?.lesson.title || "Page not found";
export const crumbs = (ctx) => { const x = f(ctx); return x ? [["Learn", "learn"], [x.sec.name, `learn/${x.sec.id}`], [x.lesson.group.title, `learn/${x.sec.id}`], [x.lesson.title, ""]] : []; };
export const up = (ctx) => { const x = f(ctx); return x ? [`learn/${x.sec.id}`, x.sec.name] : null; };
export const pager = (ctx) => { const x = f(ctx); return x ? { prev: x.prev && { href: href(x.sec, x.prev), title: x.prev.title }, next: x.next && { href: href(x.sec, x.next), title: x.next.title } } : null; };

const CACHING = `
  <div class="video player" style="aspect-ratio:16/8" id="player" data-card="0"><button class="pplay" type="button" aria-label="Play the video"><span class="vpill">▶ Watch Yash explain it · 6 min</span></button><div class="pcap" aria-live="polite"></div><div class="pbar"><button class="ptog" type="button" aria-label="Pause">❚❚</button><span class="pt">0:00</span><div class="ptrack"><i></i></div><span class="pt">6:00</span></div></div>
  <h2 id="s1" data-card="1">Caching in an interview</h2>
  <p class="body" data-card="1">Reading one user's profile from Postgres takes a few milliseconds. Do it 12,000 times a second and the database spends its day answering the same question. A cache in front keeps the answers in memory, so most reads never reach the database.</p>
  <div class="fig" id="fig1" data-card="2"><div class="flow"><div class="node hl"><b>App servers</b><span>12,000 reads/s</span></div><span class="wire"><i></i></span><div class="node"><b>Redis</b><span>95% hits · 0.2 ms</span></div><span class="wire"><i></i></span><div class="node"><b>Postgres</b><span>600 reads/s</span></div></div>
    <div class="cap"><span class="ct">Fig. 1 · Step 1. 12,000 reads a second arrive at the app servers.</span><span class="fctl"><span class="dots"><i class="on"></i><i></i><i></i></span><button class="btn sm" type="button" data-fs="-1" aria-label="Previous step">◀</button><button class="btn sm" type="button" data-fs="1" aria-label="Next step">▶</button></span></div></div>
  <div class="say" data-card="3"><p class="mono">Say this in the interview</p><p>"Reads outnumber writes about 100 to 1, so I'll put Redis in front with cache-aside and a 10-minute TTL."</p></div>
  <h2 id="s2" data-card="4">Where to cache</h2>
  <p class="body" data-card="4">On the device, at the edge, in a shared cache like Redis, or inside the server process. Each one is closer to the reader and harder to keep fresh than the one before.</p>`;

const GENERIC = (l) => `
  <h2 id="s1" data-card="0">What this lesson covers</h2>
  <p class="body" data-card="0">${esc(l.title)}, explained with one running example and diagrams that move. In the real site this is the full article; the prototype shows the Caching lesson in full.</p>
  <div class="say" data-card="1"><p class="mono">Say this in the interview</p><p>One sentence you can say out loud about ${esc(l.title.toLowerCase())}, with a number in it.</p></div>
  <h2 id="s2" data-card="2">Where it goes wrong</h2>
  <p class="body" data-card="2">Every idea here has a failure mode. The lesson ends with the two you are most likely to be asked about.</p>`;

export const render = (ctx) => {
  const x = f(ctx);
  if (!x) return notFound.render(ctx);
  const { sec, lesson, prev, next } = x, g = lesson.group, p = progressOf(sec), isCaching = lesson.slug === "caching";
  const gDone = g.lessons.filter((l) => l[3] === "done").length;
  return `
<div class="reader" data-sec="${sec.id}">
  <button class="contents-btn" type="button" id="contents-btn" aria-expanded="false" aria-controls="pcur">${esc(g.title)} · ${gDone} of ${g.lessons.length} done <span aria-hidden="true">▾</span></button>
  <aside class="pcur" id="pcur" aria-label="${esc(g.title)} lessons">
    <h3>${esc(g.title)}</h3><div class="bar"><i id="curbar" style="width:${Math.round(gDone / g.lessons.length * 100)}%"></i></div><small class="muted" id="curtxt">${gDone} of ${g.lessons.length} done</small>
    <nav id="curlist">${g.lessons.map(([slug, t, , st]) => `<a class="lrow ${st === "done" ? "done" : ""} ${slug === lesson.slug ? "cur-l" : ""}" href="#/learn/${sec.id}/${slug}" ${slug === lesson.slug ? 'aria-current="page"' : ""}><i class="st"></i>${esc(t)}</a>`).join("")}</nav>
    ${sec.groups.filter((o) => o !== g).map((o) => `<a class="more" href="#/learn/${sec.id}/${o.lessons[0][0]}"><span>${esc(o.title)} ▸</span><small class="muted">${o.lessons.filter((l) => l[3] === "done").length} of ${o.lessons.length}</small></a>`).join("")}
    <p class="muted small" style="margin-top:12px">${esc(sec.name)}: ${p.done} of ${p.total} done</p>
  </aside>
  <article class="art" id="art">
    <div class="skel" aria-hidden="true"><i style="width:30%"></i><i style="width:90%;height:30px"></i><i style="width:60%"></i><i style="width:100%;height:160px"></i><i style="width:95%"></i></div>
    <div class="row-gap"><span class="chip" style="background:var(--t)">${esc(sec.name)} · ${String(x.index + 1).padStart(2, "0")}</span>${isCaching ? '<span class="chip medium">Medium</span>' : ""}</div>
    <h1>${esc(lesson.title)}${isCaching ? ": when to add a cache, and how to explain it" : ""}</h1>
    <div class="by"><i></i>Yash Bhoomkar · Updated 9 Nov 2026 · ${lesson.min} min read</div>
    <div class="seg" role="group" aria-label="How to read this lesson"><span class="seg-i" aria-hidden="true"></span><button type="button" aria-pressed="false">Cards</button><button type="button" aria-pressed="true">Full text</button></div>
    ${isCaching ? CACHING : GENERIC(lesson)}
    <div class="deck"><button class="btn sm" type="button" data-dk="-1" aria-label="Previous card">←</button><span class="mono" id="dkn"></span><div class="dbar"><i></i></div><button class="btn primary sm" type="button" data-dk="1">Next →</button></div>
    <div class="card finish"><div><b>Finished this lesson?</b><small>${next ? `Next: ${esc(next.title)} · ${next.min} min` : `That's the last lesson in ${esc(sec.name)}.`}</small></div>
      <div class="tools wrap-row">${prev ? `<a class="btn sm" href="#/learn/${sec.id}/${prev.slug}">← ${esc(prev.title)}</a>` : ""}<button class="btn primary sm" type="button" id="complete">${lesson.state === "done" ? "Done ✓" : `Mark complete${next ? " &amp; next →" : ""}`}</button></div></div>
  </article>
  <aside class="prail" aria-label="On this page"><p class="mono">On this page</p><a class="on" href="#/${ctx.path}" data-to="s1">${isCaching ? "Caching in an interview" : "What this lesson covers"}</a><a href="#/${ctx.path}" data-to="s2">${isCaching ? "Where to cache" : "Where it goes wrong"}</a>
    <div class="tryit" data-sec="problems"><p class="mono">Try it on the canvas</p><b>The cache restarts at dinner: keep the database standing.</b><a href="#/problems/url-shortener">Open challenge →</a></div></aside>
</div>`;
};

export function mount(root, ctx, sc) {
  const x = f(ctx); if (!x) return;
  const art = $("#art", root);

  // brief skeleton while the "article loads"
  art.classList.add("loading"); sc.timer(later(() => art.classList.remove("loading"), 320));

  // contents on phones
  const cb = $("#contents-btn", root), pcur = $("#pcur", root);
  cb.addEventListener("click", () => { const o = pcur.classList.toggle("open"); cb.setAttribute("aria-expanded", String(o)); });

  // "On this page" links scroll, and the current section is marked as you read
  root.addEventListener("click", (e) => { const a = e.target.closest("[data-to]"); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.to)?.scrollIntoView({ behavior: RM.matches ? "auto" : "smooth", block: "start" }); });
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) $$(".prail [data-to]", root).forEach((a) => a.classList.toggle("on", a.dataset.to === en.target.id)); }), { rootMargin: "-20% 0px -70% 0px" });
  $$("h2[id]", art).forEach((h) => io.observe(h)); sc.add(() => io.disconnect());

  // Cards / Full text
  const seg = $(".seg", root), ind = $(".seg-i", seg);
  const place = () => placeIndicator(seg, ind, 'button[aria-pressed="true"]');
  const cards = [...new Set($$("[data-card]", art).map((n) => n.dataset.card))];
  const deck = $(".deck", art); let ci = 0;
  const show = (n, dir) => {
    ci = Math.max(0, Math.min(cards.length - 1, n));
    art.classList.toggle("back", dir < 0);
    $$("[data-card]", art).forEach((el) => el.classList.remove("cur")); void art.offsetWidth;
    $$(`[data-card="${cards[ci]}"]`, art).forEach((el) => el.classList.add("cur"));
    $("#dkn", deck).textContent = `${ci + 1} / ${cards.length}`;
    $(".dbar i", deck).style.transform = `scaleX(${(ci + 1) / cards.length})`;
    $('[data-dk="-1"]', deck).disabled = ci === 0;
    $('[data-dk="1"]', deck).textContent = ci === cards.length - 1 ? "Finish ✓" : "Next →";
  };
  $$("button", seg).forEach((b, i) => b.addEventListener("click", () => {
    $$("button", seg).forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    requestAnimationFrame(place);
    art.classList.toggle("cards", i === 0); if (i === 0) show(0, 1);
  }));
  $$("[data-dk]", deck).forEach((b) => b.addEventListener("click", () => {
    const d = +b.dataset.dk;
    if (d > 0 && ci === cards.length - 1) { $("#complete", root).scrollIntoView({ block: "center", behavior: RM.matches ? "auto" : "smooth" }); return; }
    show(ci + d, d);
  }));
  sc.listen(window, "keydown", (e) => { if (!art.classList.contains("cards") || /input|textarea/i.test(document.activeElement.tagName)) return; if (e.key === "ArrowRight") show(ci + 1, 1); if (e.key === "ArrowLeft") show(ci - 1, -1); });
  requestAnimationFrame(() => requestAnimationFrame(place)); document.fonts?.ready.then(place); sc.timer(setTimeout(place, 400)); sc.listen(window, "resize", place);

  // video (prototype: captions only)
  const pl = $("#player", root);
  if (pl) {
    let t = 0, timer = null;
    const CAPS = [[0, "Here is the problem: one database, 12,000 reads a second."], [9, "Most of those reads ask for the same few profiles."], [18, "So we keep the answers in memory, in front of the database."], [27, "That is a cache. Redis is the usual choice."], [36, "Now the database sees one read in twenty."]];
    const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
    const tick = () => { t += 0.5; if (t >= 360) t = 0; $(".ptrack i", pl).style.transform = `scaleX(${t / 360})`; $(".pt", pl).textContent = fmt(t); const c = CAPS.filter((k) => k[0] <= t % 45).pop(); $(".pcap", pl).textContent = c ? c[1] : ""; };
    const play = (on) => { clearInterval(timer); timer = on ? setInterval(tick, 500) : null; const b = $(".ptog", pl); b.textContent = on ? "❚❚" : "▶"; b.setAttribute("aria-label", on ? "Pause" : "Play"); };
    $(".pplay", pl).addEventListener("click", () => { pl.classList.add("on"); tick(); play(true); $(".ptog", pl).focus(); });
    $(".ptog", pl).addEventListener("click", () => play(!timer));
    sc.add(() => clearInterval(timer));
  }

  // figure stepper
  const fig = $("#fig1", root);
  if (fig) {
    const FS = ["Fig. 1 · Step 1. 12,000 reads a second arrive at the app servers.", "Fig. 1 · Step 2. The cache answers 95 of every 100 reads, in 0.2 ms.", "Fig. 1 · Step 3. Only the misses reach Postgres: 600 reads a second, one in twenty."];
    let s = 0; const nodes = $$(".node", fig), wires = $$(".wire", fig), dots = $$(".dots i", fig), ct = $(".ct", fig);
    const step = (n) => {
      s = Math.max(0, Math.min(2, n));
      nodes.forEach((el, i) => { el.classList.toggle("hl", i === s); el.style.opacity = i > s ? 0.45 : 1; });
      wires.forEach((w, i) => w.classList.toggle("on", i < s)); dots.forEach((d, i) => d.classList.toggle("on", i === s));
      ct.classList.add("swap"); sc.timer(later(() => { ct.textContent = FS[s]; ct.classList.remove("swap"); }, 160));
      $('[data-fs="-1"]', fig).disabled = s === 0; $('[data-fs="1"]', fig).disabled = s === 2;
    };
    $$("[data-fs]", fig).forEach((b) => b.addEventListener("click", () => step(s + +b.dataset.fs))); step(0);
  }

  // mark complete: tick, a burst in the section colours, the list moves on, then go to the next lesson
  const done = $("#complete", root);
  done.addEventListener("click", () => {
    if (done.classList.contains("ok") || x.lesson.state === "done") { if (x.next) ctx.go(`learn/${x.sec.id}/${x.next.slug}`); return; }
    const next = completeLesson(x.sec.id, x.lesson.slug);
    done.classList.add("ok"); done.innerHTML = '<span class="tick">✓</span> Done';
    if (!RM.matches) ["--a-concepts", "--a-components", "--a-interview", "--a-problems", "--a-real", "--a-notes", "--marigold", "--a-concepts", "--a-problems", "--a-interview"].forEach((c, i) => {
      const b = document.createElement("i"); b.className = "burst"; const a = (i / 10) * Math.PI * 2, d = 46 + (i % 3) * 14;
      b.style.cssText = `background:var(${c});--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--rot:${(i % 2 ? 1 : -1) * (90 + i * 20)}deg;animation-delay:${(i % 4) * 20}ms`;
      done.appendChild(b); setTimeout(() => b.remove(), 900);
    });
    const row = $(`#curlist a[href$="/${x.lesson.slug}"]`, root); row?.classList.add("done"); replay(row, "just");
    const g = x.lesson.group, d = g.lessons.filter((l) => l[3] === "done").length;
    $("#curbar", root).style.width = Math.round(d / g.lessons.length * 100) + "%"; $("#curtxt", root).textContent = `${d} of ${g.lessons.length} done`;
    toast(next ? `Done. Next: ${next.title}` : "Section finished");
    if (next) sc.timer(later(() => ctx.go(`learn/${x.sec.id}/${next.slug}`), 1300));
  });
}

// Landing page. Its nav is sticky and gains a hairline once you scroll; "Learn" opens a menu of the five
// sections (hover with a mouse, click or Enter otherwise); on phones a ☰ opens the same list as a sheet.
import { $, $$, esc } from "../core/dom.js";
import { once, countUp, later, closeWithExit } from "../core/motion.js";
import { SECTIONS } from "../data/sections.js";
import { switchHTML } from "../core/theme.js";
import { ICONS } from "../components/icons.js";
import { dragToClose } from "../components/swipe.js";

const NUMS = [["66", "visual notes"], ["22", "problems with tests"], ["8", "challenges, 24 stars"]];

export const title = () => "";

export const render = () => `
<header class="lnav" id="lnav"><div class="wrap lnav-in">
  <a class="logo" href="#/" aria-label="Tech Katta, home"><b>TK</b>Tech Katta</a>
  <nav class="lnav-links" aria-label="Main">
    <div class="mega-wrap"><button class="lnk" type="button" id="learn-btn" aria-expanded="false" aria-controls="mega">Learn ${ICONS.down}</button>
      <div class="mega" id="mega" hidden><div class="mega-grid">
        ${SECTIONS.map((s) => `<a class="mega-i" data-sec="${s.id}" href="#/learn/${s.id}"><i class="dot"></i><span><b>${esc(s.name)}</b><small>${esc(s.card)}</small></span></a>`).join("")}
        <a class="mega-i" data-sec="problems" href="#/problems"><i class="dot"></i><span><b>Problems</b><small>22 problems with a real judge.</small></span></a>
      </div></div></div>
    <a class="lnk" href="#/problems">Problems</a>
    <button class="lnk" type="button" data-scroll="how">How it works</button>
    <button class="lnk" type="button" data-scroll="teacher">About</button>
  </nav>
  <div class="lnav-r"><button class="lnk login" type="button" data-signin>Log in</button><a class="btn primary sm" href="#/home">Start free</a>
    <button class="btn icon ghost lnav-menu" type="button" id="lmenu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="lmenu">${ICONS.menu}</button></div>
</div></header>

<div class="sheet-scrim" id="lmenu" hidden><div class="sheet" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="sheet-h"><span class="mono">Learn</span><button class="btn icon ghost" type="button" data-sheet-close aria-label="Close menu">${ICONS.close}</button></div>
  <div class="sheet-list">${SECTIONS.map((s) => `<a class="mega-i" data-sec="${s.id}" href="#/learn/${s.id}"><i class="dot"></i><span><b>${esc(s.name)}</b><small>${esc(s.card)}</small></span></a>`).join("")}
    <a class="mega-i" data-sec="problems" href="#/problems"><i class="dot"></i><span><b>Problems</b><small>22 problems with a real judge.</small></span></a></div>
  <div class="sheet-f"><button class="btn" type="button" data-signin>Log in</button><a class="btn primary" href="#/home">Start free</a></div>
</div></div>

<div class="hero" id="top">
  <i class="shape" style="--n:0;left:9%;top:90px;width:64px;height:64px;background:var(--a-components);transform:rotate(18deg)" aria-hidden="true"></i>
  <i class="shape" style="--n:1;right:12%;top:60px;width:70px;height:70px;background:var(--a-interview);border-radius:30%;transform:rotate(14deg)" aria-hidden="true"></i>
  <i class="shape" style="--n:2;right:7%;top:300px;width:58px;height:58px;background:var(--a-concepts);border-radius:50%" aria-hidden="true"></i>
  <i class="shape" style="--n:3;left:15%;top:380px;width:58px;height:58px;background:var(--a-concepts);border-radius:30%;transform:rotate(8deg)" aria-hidden="true"></i>
  <i class="shape" style="--n:4;right:22%;top:420px;width:44px;height:44px;background:var(--a-real);transform:rotate(-24deg)" aria-hidden="true"></i>
  <div class="wrap">
    <span class="newchip m-in" style="--dl:0ms"><i></i>New · 22 design problems with a real judge</span>
    <h1><span class="w" style="--dl:0ms">System</span> <span class="w" style="--dl:110ms">design,</span> <em class="w" style="--dl:190ms">explained.</em></h1>
    <p class="lead m-in" style="--dl:320ms">Learn how apps like food delivery and live cricket streams serve crores of people at once. Then design one yourself, and let real traffic judge it.</p>
    <div class="ctas m-in" style="--dl:400ms"><a class="btn primary" href="#/home">Start learning, free</a><a class="btn" href="#/problems/ind-vs-pak">Try IND vs PAK</a></div>
    <p class="note m-in" style="--dl:440ms">No card. Sign in with Google and everything opens.</p>
    <div class="rise">
      <a class="rcard block" data-sec="concepts" href="#/learn/concepts" style="--r:-4deg;--y:16px;--dl:560ms"><h3>Concepts ▸</h3><p>Caching, sharding, queues: the ideas every design rests on.</p>
        <div class="pv pane"><div class="flow"><span>Client</span>→<span class="hl">Cache</span>→<span>DB</span></div><div class="row">Reads answered from memory<b class="ok">95%</b></div><div class="row">Load on the database<b class="ok">−80%</b></div></div></a>
      <a class="rcard block" data-sec="components" href="#/learn/components" style="--r:-1.5deg;--y:0px;--dl:500ms"><h3>Components ▸</h3><p>Redis, Kafka, Postgres: what each tool is good at, and where it breaks.</p>
        <div class="pv pane"><div class="tags"><span>Redis</span><span>Kafka</span><span>Postgres</span><span>Cassandra</span><span>DynamoDB</span><span>Flink</span></div></div></a>
      <a class="rcard block" data-sec="interview" href="#/learn/interview" style="--r:1.5deg;--y:0px;--dl:540ms"><h3>Interview Questions ▸</h3><p>22 real questions, answered from requirements to deep dives.</p>
        <div class="pv pane"><div class="row">Design a URL shortener<b class="ok">Easy</b></div><div class="row">Design a chat app<b class="wn">Medium</b></div><div class="row">Design payments<b class="bd">Hard</b></div></div></a>
      <a class="rcard block" data-sec="problems" href="#/problems" style="--r:4deg;--y:16px;--dl:610ms"><h3>Problems ▸</h3><p>Build it on a canvas. Peaks, crashes and a budget decide your score.</p>
        <div class="pv pane"><div class="row">Evening peak<b class="ok">Passed ✓</b></div><div class="row">A server dies<b class="ok">Passed ✓</b></div><div class="row">Inside budget<b class="wn">2 issues</b></div></div></a>
    </div>
    <div class="rise-dots" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
  </div>
  <div class="arc" aria-hidden="true"></div>
</div>

<section class="band plain reveal" id="how"><div class="wrap">
  <p class="mono">In plain words</p>
  <p class="big">Big apps run on hundreds of computers working together. Planning how they share the work, and what happens when one fails, is called system design.</p>
  <div class="steps">
    <div class="step" data-sec="concepts"><h3>Read</h3><p>Short notes with diagrams that move, one idea at a time.</p></div>
    <div class="step" data-sec="interview"><h3>Practise</h3><p>Real interview questions, answered the way interviewers expect.</p></div>
    <div class="step" data-sec="problems"><h3>Get judged</h3><p>Draw your design. A judge sends traffic through it and shows what broke.</p></div>
  </div>
</div></section>

<section class="band alt inside reveal"><div class="wrap">
  <h2>Take a look inside</h2>
  <div class="stage block" data-sec="problems"><div class="win">
    <div class="cur"><b style="font-size:17px">Core concepts</b><div class="bar" style="margin:8px 0 4px"><i style="width:33%"></i></div><small class="muted">3 of 9 done (33%)</small>
      <div class="lrow done"><i class="st"></i>Networking essentials</div><div class="lrow done"><i class="st"></i>API design</div><div class="lrow done"><i class="st"></i>Data modelling</div><div class="lrow cur-l"><i class="st"></i>Caching</div><div class="lrow"><i class="st"></i>Sharding</div><div class="lrow"><i class="st"></i>Consistent hashing</div><div class="lrow"><i class="st"></i>CAP theorem</div></div>
    <div class="win-main"><div class="row-between"><h3 style="font-size:22px">Caching: when to add a cache</h3><a class="btn primary sm" href="#/learn/concepts/caching">Open the lesson</a></div>
      <div class="video"><span class="vpill">▶ Watch Yash explain it · 6 min</span></div>
      <p class="ink-2">Reading one user's profile from Postgres takes a few milliseconds. Do it 12,000 times a second and the database is the bottleneck. A cache in front answers most reads from memory.</p></div>
  </div></div>
</div></section>

<section class="band reveal"><div class="wrap judge">
  <div><p class="mono">The judge</p><h2 style="margin-top:14px">Your design, tested by an evening of real traffic.</h2>
    <p>Run the example tests, then submit. Peaks, a crashed server and a monthly budget decide your score out of 100. Nothing is compared with a model answer.</p>
    <a class="btn primary" href="#/problems/url-shortener" style="margin-top:24px">Solve your first problem</a></div>
  <div class="card jcard" id="ljudge"><div class="jrow" style="border:0"><span style="font-weight:600">URL shortener · Submit</span><span class="stars" aria-label="3 of 3 stars"><i>★</i><i>★</i><i>★</i></span></div>
    <div class="jrow"><span>A quiet afternoon</span><b class="ts" data-ok="Passed ✓">Passed ✓</b></div><div class="jrow"><span>Evening peak, 30,000 taps a second</span><b class="ts" data-ok="Passed ✓">Passed ✓</b></div>
    <div class="jrow"><span>A server dies at peak</span><b class="ts" data-ok="Passed ✓">Passed ✓</b></div><div class="jrow"><span>Inside ₹1 lakh a month</span><b class="ts" data-ok="₹84,200 ✓">₹84,200 ✓</b></div>
    <div class="jscore"><span style="font-weight:500">Score</span><b id="ljscore">92 / 100</b></div></div>
</div></section>

<section class="band alt reveal" id="teacher"><div class="wrap teacher">
  <div class="face" data-sec="components">Your photo here</div>
  <div><p class="mono">Taught by</p><p class="q">Hi, I'm Yash. I build backend systems for a living, and I write these notes the way I wish someone had explained them to me.</p>
    <p>Every article uses one made-up app, Zotato, so the examples connect. Videos of me walking through each design are on the way.</p></div>
</div></section>

<section class="band reveal" style="padding-block:64px"><div class="wrap nums">
  ${NUMS.map(([n, l]) => `<div class="card"><b data-to="${n}">${n}</b><span>${l}</span></div>`).join("")}<div class="card"><b>₹0</b><span>free with sign-in</span></div>
</div></section>

<section class="final"><div class="wrap"><h2>Start with Networking essentials. It takes 12 minutes.</h2><a class="btn" href="#/learn/concepts/networking-essentials">Start learning, free</a></div></section>
<footer class="wrap foot">
  <a class="logo" href="#/"><b>TK</b>Tech Katta</a>
  <nav class="foot-links" aria-label="Footer">${SECTIONS.map((s) => `<a href="#/learn/${s.id}">${esc(s.name)}</a>`).join("")}<a href="#/problems">Problems</a></nav>
  <div class="foot-r">${switchHTML()}<span>Privacy · Terms · Written by one engineer. Corrections welcome.</span></div>
</footer>`;

export function mount(root, ctx, sc) {
  // sticky nav gains an edge after scrolling
  const nav = $("#lnav", root);
  const onScroll = () => nav.classList.toggle("stuck", scrollY > 8);
  sc.listen(window, "scroll", onScroll, { passive: true }); onScroll();

  // Learn menu: hover intent with a mouse (open after 80 ms, close after 200 ms), click / Enter otherwise
  const btn = $("#learn-btn", root), mega = $("#mega", root), wrap = btn.parentElement;
  let t;
  const setMega = (o) => { mega.hidden = !o; btn.setAttribute("aria-expanded", String(o)); };
  btn.addEventListener("click", () => setMega(mega.hidden));
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    wrap.addEventListener("pointerenter", () => { clearTimeout(t); t = setTimeout(() => setMega(true), 80); });
    wrap.addEventListener("pointerleave", () => { clearTimeout(t); t = setTimeout(() => setMega(false), 200); });
  }
  sc.listen(document, "click", (e) => { if (!wrap.contains(e.target)) setMega(false); });
  sc.listen(window, "keydown", (e) => { if (e.key === "Escape" && !mega.hidden) { setMega(false); btn.focus(); } });
  sc.add(() => clearTimeout(t));

  // phone menu sheet
  const sheet = $("#lmenu", root), mb = $("#lmenu-btn", root);
  const closeSheet = (now) => { mb.setAttribute("aria-expanded", "false"); if (now === true) sheet.hidden = true; else closeWithExit(sheet, 240); };
  sc.add(dragToClose($(".sheet", sheet), closeSheet));
  mb.addEventListener("click", () => { sheet.hidden = false; mb.setAttribute("aria-expanded", "true"); $("[data-sheet-close]", sheet).focus(); });
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-sheet-close], a, [data-signin]")) closeSheet(); });
  sc.listen(window, "keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

  // in-page links scroll instead of changing the route
  root.addEventListener("click", (e) => { const b = e.target.closest("[data-scroll]"); if (b) $("#" + b.dataset.scroll, root)?.scrollIntoView({ behavior: "smooth", block: "start" }); });

  // phone: the four section cards are a swipeable row; dots follow the scroll
  const rise = $(".rise", root), dots = $$(".rise-dots i", root);
  rise.addEventListener("scroll", () => { const i = Math.round(rise.scrollLeft / (rise.scrollWidth / 4)); dots.forEach((d, j) => d.classList.toggle("on", i === j)); }, { passive: true });

  // arrivals
  $$(".reveal", root).forEach((el) => sc.add(once(el, (x) => x.classList.add("in"))));
  const hero = $(".hero", root);
  const io = new IntersectionObserver((es) => es.forEach((e) => hero.classList.toggle("off", !e.isIntersecting)));
  io.observe(hero); sc.add(() => io.disconnect());

  // the judge card runs its tests the first time it is seen
  sc.add(once($("#ljudge", root), (card) => {
    const ts = $$(".ts", card), st = $(".stars", card), score = $("#ljscore", card);
    st.style.visibility = "hidden"; score.textContent = "— / 100";
    ts.forEach((x) => { x.classList.add("run"); x.textContent = "Running"; });
    ts.forEach((x, i) => sc.timer(later(() => { x.classList.remove("run"); x.classList.add("done"); x.textContent = x.dataset.ok; }, 500 + i * 380 + (i === 2 ? 160 : 0))));
    sc.timer(later(() => { countUp(score, 92, 800, (v) => v + " / 100"); sc.timer(later(() => { st.style.visibility = ""; st.classList.add("go"); }, 700)); }, 500 + 4 * 380 + 200));
  }, 0.5));
  $$(".nums [data-to]", root).forEach((el) => sc.add(once(el, (x) => countUp(x, +x.dataset.to, 1000), 0.6)));
}

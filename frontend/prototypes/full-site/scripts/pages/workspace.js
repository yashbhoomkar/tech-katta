// The problem workspace: brief and notes on the left, the canvas on the right, results along the bottom.
// Full height, its own toolbar; the sidebar is a drawer (☰ or [). Only the URL shortener has its full brief.
import { $, $$, esc } from "../core/dom.js";
import { later, RM, countUp, closeWithExit, placeIndicator } from "../core/motion.js";
import { problemBySlug, levelName, HINTS, INTERVIEWER } from "../data/problems.js";
import { toast } from "../components/toast.js";
import { ICONS } from "../components/icons.js";
import * as notFound from "./not-found.js";
import { dragToClose } from "../components/swipe.js";

const p = (ctx) => problemBySlug(ctx.params[0]);
export const title = (ctx) => p(ctx)?.title || "Page not found";

const NODES = [[30, 180, 120, "Clients", "30k req/s", "surface"], [240, 180, 126, "Load balancer", "2 zones", "surface"], [450, 100, 126, "Server ×4", "c6g.large", "surface", "srvA"], [450, 260, 126, "Server ×4", "c6g.large", "surface"], [644, 70, 104, "Redis", "95% hits", "t-problems"], [644, 290, 104, "Postgres", "links table", "t-problems"]];
const EDGES = ["M150 210 H236", "M366 196 L446 132", "M366 224 L446 288", "M576 120 L640 100", "M576 140 L640 300", "M576 280 L640 120", "M576 300 L640 318"];
const PALETTE = [["Edge", "concepts", [["Clients", "web + app"], ["CDN", "edge cache"], ["Load balancer", "L7"]]], ["Compute", "components", [["Server", "c6g.large"], ["Scheduler", "cron"]]], ["Data", "problems", [["Database", "Postgres"], ["Cache", "Redis"]]], ["Messaging", "interview", [["Queue", "Kafka"]]]];

export const render = (ctx) => {
  const pr = p(ctx);
  if (!pr) return notFound.render(ctx);
  const full = pr.slug === "url-shortener";
  return `
<div class="ws">
  <div class="wtop">
    <div class="l"><button class="btn icon ghost" type="button" data-drawer-open aria-label="Open menu" title="Menu  [">${ICONS.menu}</button><a class="btn sm" href="#/problems">← Problems</a><span class="t">${esc(pr.title)}</span><span class="chip ${pr.level}">${levelName(pr.level)}</span></div>
    <div class="r"><button class="btn sm timer" type="button" id="timer" aria-label="Time left; press to pause"><span class="tdot"></span><span id="tleft">24:10</span></button><button class="btn sm" type="button" id="run">▶ Run</button><button class="btn primary sm" type="button" id="submit"><span class="sp" aria-hidden="true"></span><span class="lb">Submit</span></button><button class="btn sm accent" type="button" id="askbtn" aria-expanded="false" aria-controls="ask">Ask<span class="long"> the interviewer</span></button></div>
  </div>
  <div class="panes" role="tablist" aria-label="Show" data-on="brief"><button type="button" role="tab" aria-selected="true" data-pane="brief">Brief</button><button type="button" role="tab" aria-selected="false" data-pane="canvas">Canvas</button></div>
  <div class="wbody" data-pane="brief">
    <div class="wleft"><div class="tabs" role="tablist"><span class="tab-ul" aria-hidden="true"></span>${["Description", "Your answer", "Hints (7)", "Solution", "Submissions"].map((t, i) => `<button role="tab" type="button" aria-selected="${i === 0}" id="tab${i}">${t}</button>`).join("")}</div>
      <div class="wdesc panel" data-panel="0" role="tabpanel" aria-labelledby="tab0"><p class="mono">Problem ${pr.n} · ${levelName(pr.level)}</p><h2>${esc(pr.title)}</h2>
        ${full ? `<p>Zotato sends crores of promo SMS, and every link in them is a short one like zot.to/2Bi. Turn long URLs into short codes, send people to the right page in milliseconds, and never hand out the same code twice.</p>` : `<p>The full brief for this problem is in the real site. The prototype keeps the URL shortener's canvas so you can try the tools.</p>`}
        <div class="how">Add parts from the left and join them with arrows. Give each database its engine and tables. Run checks your design against the example tests; Submit runs every test.</div>
        ${full ? `<h3 class="h4">Requirements</h3><ul><li>A marketing tool turns a long URL into a short one, with an optional custom name and an expiry date.</li><li>Anyone who opens the short link is sent to the long URL.</li><li>Out of scope: accounts, a dashboard, analytics beyond counting clicks.</li></ul>` : ""}</div>
      <div class="wdesc panel" data-panel="1" role="tabpanel" aria-labelledby="tab1" hidden><p class="mono">Your answer</p><h2>Notes for the interviewer</h2><p>Write what you'd say out loud: the numbers, the trade-offs, what you'd do next. The judge doesn't read this; a mock interviewer does.</p>
        <textarea id="notes" rows="9" placeholder="Reads outnumber writes about 100 to 1, so…" aria-label="Your notes"></textarea><div class="nmeta"><span id="nwords">0 words</span><span id="nsaved">Saved</span></div></div>
      <div class="wdesc panel" data-panel="2" role="tabpanel" aria-labelledby="tab2" hidden><p class="mono" id="hcount">Hints · 0 of 7 shown</p><h2>Stuck? One hint at a time.</h2><p>Each hint gives away a little more. Open as few as you need.</p><div id="hints"></div><button class="btn sm" type="button" id="nexthint" style="align-self:flex-start">Show hint 1</button></div>
      <div class="wdesc panel" data-panel="3" role="tabpanel" aria-labelledby="tab3" hidden><p class="mono">Solution</p><div class="lock" id="sol"><b>🔒 Opens after your first submit</b><p>Submit once so the judge can score your own design first. Then compare it with ours, part by part.</p></div></div>
      <div class="wdesc panel" data-panel="4" role="tabpanel" aria-labelledby="tab4" hidden><p class="mono">Submissions</p><h2>Your attempts</h2><div id="subs"><p class="muted">Nothing submitted yet. Press Submit to run every test.</p></div></div>
    </div>
    <div class="canvas">
      <div class="palette" aria-label="Parts to add">${PALETTE.map(([g, sec, items]) => `<p class="mono">${g}</p>${items.map(([n, s]) => `<button class="p" type="button" data-sec="${sec}" data-add="${n}|${s}"><i class="dot"></i>${n}</button>`).join("")}`).join("")}</div>
      <div class="cv"><svg viewBox="0 0 760 420" role="img" aria-label="A design: clients to a load balancer to two servers, each reading a Redis cache and a Postgres database">
        <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--link)"/></marker></defs>
        <g fill="none" stroke="var(--link)" stroke-width="1.6" marker-end="url(#ah)" id="edges">${EDGES.map((d) => `<path d="${d}"/>`).join("")}</g>
        <g class="nodes">${NODES.map(([x, y, w, t, s, fill, id]) => `<rect ${id ? `id="${id}" ` : ""}x="${x}" y="${y}" width="${w}" height="60" rx="12" fill="var(--${fill})" stroke="var(--line-strong)"/><text x="${x + 16}" y="${y + 27}" class="nt">${t}</text><text x="${x + 16}" y="${y + 46}" class="ns">${s}</text>`).join("")}</g>
        <g id="pkts"></g></svg></div>
    </div>
  </div>
  <div class="results" id="results" aria-live="polite"><b>Results</b><span class="muted">Press Run to check your design against the example tests.</span></div>
  <aside class="ask" id="ask" aria-label="Ask the interviewer" hidden><div class="ahead"><div><b>Mock interviewer</b><small>Answers like an interviewer would: short, and only what you ask.</small></div><button class="btn icon ghost" type="button" data-aclose aria-label="Close">${ICONS.close}</button></div>
    <div class="alog" id="alog" aria-live="polite"><div class="msg them">Hi Riya. You have 24 minutes. What would you like to know about the ${esc(pr.title.replace(/^Design an? /, ""))}?</div></div>
    <div class="asugg" id="asugg">${["How many links a day?", "Read to write ratio?", "Do links expire?", "Is this design OK?"].map((q) => `<button type="button">${q}</button>`).join("")}</div>
    <form class="ain" id="aform"><input id="aq" placeholder="Ask a question" autocomplete="off" aria-label="Your question"><button class="btn primary sm">Send</button></form></aside>
</div>`;
};

export function mount(root, ctx, sc) {
  if (!p(ctx)) return;
  const results = $("#results", root), sub = $("#submit", root);

  // tabs: sliding underline + panels; arrow keys move between tabs
  const tabs = $(".tabs", root), ul = $(".tab-ul", tabs), tbs = $$('[role="tab"]', tabs);
  const place = () => placeIndicator(tabs, ul, '[aria-selected="true"]', "line");
  const pick = (i) => { tbs.forEach((b, j) => { b.setAttribute("aria-selected", String(i === j)); b.tabIndex = i === j ? 0 : -1; }); $$(".panel", root).forEach((pn) => (pn.hidden = +pn.dataset.panel !== i)); requestAnimationFrame(place); };
  tbs.forEach((b, i) => { b.addEventListener("click", () => pick(i)); b.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = (i + (e.key === "ArrowRight" ? 1 : -1) + tbs.length) % tbs.length; pick(n); tbs[n].focus(); } }); });
  pick(0); document.fonts?.ready.then(place); sc.listen(window, "resize", place);

  // phone: brief and canvas take turns on the full screen; Run and Submit jump to the canvas so the requests can be seen
  const body = $(".wbody", root), panes = $(".panes", root);
  const showPane = (p) => { body.dataset.pane = p; $$("[data-pane]", panes).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.pane === p))); panes.dataset.on = p; };
  $$("button[data-pane]", panes).forEach((b) => b.addEventListener("click", () => showPane(b.dataset.pane)));
  ["#run", "#submit"].forEach((id) => $(id, root).addEventListener("click", () => showPane("canvas"), true));

  // notes
  const notes = $("#notes", root); let nt;
  notes.addEventListener("input", () => { const w = notes.value.trim() ? notes.value.trim().split(/\s+/).length : 0; $("#nwords", root).textContent = w + (w === 1 ? " word" : " words"); $("#nsaved", root).textContent = "Saving…"; clearTimeout(nt); nt = setTimeout(() => ($("#nsaved", root).textContent = "Saved"), 700); });
  sc.add(() => clearTimeout(nt));

  // hints, one at a time
  let hn = 0;
  $("#nexthint", root).addEventListener("click", (e) => {
    if (hn >= HINTS.length) return;
    const d = document.createElement("div"); d.className = "hint"; d.innerHTML = `<div><p><b>Hint ${hn + 1}</b>${HINTS[hn]}</p></div>`;
    $("#hints", root).appendChild(d); requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("open"))); hn++;
    $("#hcount", root).textContent = `Hints · ${hn} of 7 shown`; e.target.textContent = hn < HINTS.length ? `Show hint ${hn + 1}` : "All hints shown"; e.target.disabled = hn >= HINTS.length;
  });

  // timer
  let left = 24 * 60 + 10, running = true; const tm = $("#timer", root);
  const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  sc.timer(setInterval(() => { if (!running || left <= 0) return; left--; $("#tleft", root).textContent = fmt(left); tm.classList.toggle("low", left < 300); }, 1000));
  tm.addEventListener("click", () => { running = !running; tm.classList.toggle("paused", !running); tm.setAttribute("aria-label", running ? "Time left; press to pause" : "Paused; press to resume"); toast(running ? "Timer running" : "Timer paused"); });

  // requests travel the drawn edges
  const pk = $("#pkts", root);
  const packets = () => {
    if (RM.matches) return;
    $$("#edges path", root).forEach((path, i) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "5"); c.setAttribute("fill", "var(--pass)"); c.setAttribute("class", "pkt");
      c.style.offsetPath = `path("${path.getAttribute("d")}")`; c.style.animationDelay = (i < 1 ? 0 : i < 3 ? 380 : 760) + "ms";
      pk.appendChild(c); setTimeout(() => c.remove(), 1800);
    });
    sc.timer(later(() => $("#srvA", root)?.classList.add("hot"), 500)); sc.timer(later(() => $("#srvA", root)?.classList.remove("hot"), 1400));
  };

  $("#run", root).addEventListener("click", () => {
    packets();
    results.innerHTML = '<b>Example tests</b>' + ["A quiet afternoon", "Evening peak", "GET /2Bi"].map((t) => `<span class="r">${t} <span class="ts run">Running</span></span>`).join("");
    const ok = ["Passed ✓", "Passed ✓", "302 in 4 ms ✓"];
    $$(".ts", results).forEach((t, i) => sc.timer(later(() => { t.className = "ok ts done"; t.textContent = ok[i]; }, 700 + i * 300)));
  });

  let subN = 0;
  sub.addEventListener("click", () => {
    if (sub.classList.contains("busy")) return;
    sub.classList.add("busy"); $(".lb", sub).textContent = "Judging"; packets();
    sc.timer(later(() => {
      sub.classList.remove("busy"); $(".lb", sub).textContent = "Submit";
      results.innerHTML = '<b>Submitted · <span id="wsc">0</span> / 100</b><span class="r">8 of 8 tests <span class="ok">Passed ✓</span></span><span class="r">Bill <span class="ok">₹84,200 / month</span></span><span class="r"><span class="stars"><i>★</i><i>★</i><i>★</i></span></span>';
      countUp($("#wsc", root), 92, 800); sc.timer(later(() => $(".stars", results)?.classList.add("go"), 600)); sc.timer(later(() => toast("Design saved · 92 / 100"), 900));
      subN++; const list = $("#subs", root); if (subN === 1) list.innerHTML = "";
      const d = document.createElement("div"); d.className = "sub"; d.innerHTML = `<div><b>Attempt ${subN} · 92 / 100</b><br><small class="muted">8 of 8 tests passed · ₹84,200 a month · just now</small></div><span class="stars">★★★</span>`; list.prepend(d);
      const sol = $("#sol", root);
      if (!sol.classList.contains("open")) { sol.classList.add("open"); sol.innerHTML = '<b>Solution unlocked</b><p>Ours uses the same shape as yours: a load balancer in two zones, servers that take blocks of IDs, Redis for opens and Postgres for links. Where yours differs: we put a CDN in front for the 50 most-opened links.</p><a class="btn sm" href="#/learn/interview/url-shortener" style="align-self:flex-start">Read the full write-up →</a>'; tbs[3].textContent = "Solution ✓"; requestAnimationFrame(place); }
    }, 1500));
  });

  // palette: click to drop a part, then drag it
  const svg = $(".cv svg", root), NS = "http://www.w3.org/2000/svg"; let added = 0, dg = null;
  $$(".palette [data-add]", root).forEach((b) => b.addEventListener("click", () => {
    const [name, s] = b.dataset.add.split("|"); const g = document.createElementNS(NS, "g"); g.setAttribute("class", "newn");
    g.setAttribute("transform", `translate(${60 + (added % 4) * 150} ${20 + (Math.floor(added / 4) % 2) * 330})`); added++;
    g.innerHTML = `<rect width="120" height="56" rx="12" fill="var(--surface)" stroke="var(--line-strong)" style="transform-origin:60px 28px"/><text x="16" y="25" class="nt">${esc(name)}</text><text x="16" y="43" class="ns">${esc(s)}</text>`;
    svg.appendChild(g); toast(name + " added. Drag it into place");
  }));
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest(".newn"); if (!g) return;
    const m = svg.getScreenCTM().inverse(), pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    const [, tx, ty] = g.getAttribute("transform").match(/translate\(([-\d.]+) ([-\d.]+)\)/).map(Number);
    dg = { g, dx: pt.x - tx, dy: pt.y - ty, m }; g.classList.add("drag"); g.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => { if (!dg) return; const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(dg.m); dg.g.setAttribute("transform", `translate(${Math.max(0, Math.min(640, pt.x - dg.dx))} ${Math.max(0, Math.min(364, pt.y - dg.dy))})`); });
  svg.addEventListener("pointerup", () => { if (dg) { dg.g.classList.remove("drag"); dg = null; } });

  // the interviewer drawer
  const ask = $("#ask", root), alog = $("#alog", root), ab = $("#askbtn", root);
  const openAsk = () => { ask.hidden = false; ab.setAttribute("aria-expanded", "true"); $("#aq", root).focus({ preventScroll: true }); };
  const closeAsk = (now) => { ab.setAttribute("aria-expanded", "false"); if (now === true) ask.hidden = true; else closeWithExit(ask, 220); };
  if (matchMedia("(max-width: 640px)").matches) sc.add(dragToClose(ask, closeAsk));
  ab.addEventListener("click", () => (ask.hidden ? openAsk() : closeAsk()));
  $("[data-aclose]", ask).addEventListener("click", closeAsk);
  sc.listen(window, "keydown", (e) => { if (e.key === "Escape" && !ask.hidden) closeAsk(); });
  const askQ = (q) => {
    if (!q.trim()) return;
    const m = document.createElement("div"); m.className = "msg me"; m.textContent = q; alog.appendChild(m);
    const t = document.createElement("div"); t.className = "msg them"; t.innerHTML = '<span class="typing" aria-label="typing"><i></i><i></i><i></i></span>'; alog.appendChild(t); alog.scrollTop = alog.scrollHeight;
    sc.timer(later(() => { t.textContent = INTERVIEWER[q.trim().toLowerCase()] || "Good question. In a real interview I’d answer briefly; here, try one of the suggested questions."; alog.scrollTop = alog.scrollHeight; }, 900));
  };
  $$("#asugg button", root).forEach((b) => b.addEventListener("click", () => { askQ(b.textContent); b.remove(); }));
  $("#aform", root).addEventListener("submit", (e) => { e.preventDefault(); askQ($("#aq", root).value); $("#aq", root).value = ""; });
}

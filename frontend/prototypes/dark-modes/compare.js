// Builds one column per palette from the same pieces of the site. On phones one column shows at a time:
// the A / B / C tabs or a sideways swipe change it.
const P = [
  ["now", "Now", "The current dark"],
  ["a", "A · Pastels on ink", "Neutral black, pastel blocks, dark text on colour"],
  ["b", "B · Tinted glass", "Charcoal, a wash of colour, bright edges and titles"],
  ["c", "C · Midnight", "Deep navy, near-full pastels, marigold glows"],
];
const SEC = [["concepts", "Concepts", "21 lessons", 14], ["components", "Components", "10 lessons", 10], ["interview", "Interview Questions", "8 lessons", 13], ["problems", "Problems", "22 problems", 14], ["notes", "Quick Notes", "4 lessons", 0], ["real", "Real Systems", "6 lessons", 0]];

const column = ([id, name, sub]) => `
<section class="col pal-${id}" data-p="${id}" aria-label="${name}">
  <div class="colhead"><div><h2>${name}</h2><p>${sub}</p></div><a class="open" href="/p/full-site/?theme=dark&amp;dark=${id}#/home">Open on the full site →</a></div>
  <div class="screen">
    <div class="nav"><span class="logo"><b>TK</b>Tech Katta</span><span class="pill">Start free</span></div>
    <h3 class="hero">System design, <em>explained.</em></h3>
    <p class="ink2">Learn how apps like food delivery serve crores of people at once.</p>
    <div class="row"><span class="btn primary">Start learning, free</span><span class="btn">Try IND vs PAK</span></div>

    <div class="tiles">${SEC.map(([s, n, c, pct]) => `<div class="tile block" data-sec="${s}"><b>${n} ▸</b><small>${c}</small><div class="pb"><i style="width:${pct}%"></i></div></div>`).join("")}</div>

    <div class="rcard block" data-sec="concepts"><b>Concepts ▸</b><small>Caching, sharding, queues.</small>
      <div class="pane"><div class="flow"><span>Client</span>→<span class="hl">Cache</span>→<span>DB</span></div><div class="rowb">Reads from memory<em class="ok">95%</em></div></div></div>

    <div class="split">
      <div class="side">${["Home", "Concepts", "Components", "Interview", "Problems"].map((n, i) => `<div class="ni${i === 1 ? " on" : ""}" ${i ? `data-sec="${["", "concepts", "components", "interview", "problems"][i]}"` : ""}><i class="dot"></i>${n}<small>${["", "3/21", "1/10", "1/8", "3/22"][i]}</small></div>`).join("")}</div>
      <div class="card"><p class="mono">Your progress</p>
        <div class="l"><span>Lessons</span><b>12 of 66</b></div><div class="bar" data-sec="concepts"><i style="width:18%"></i></div>
        <div class="l"><span>Problems solved</span><b>3 of 22</b></div><div class="bar" data-sec="problems"><i style="width:14%"></i></div>
        <div class="row"><span class="chip easy">Easy</span><span class="chip medium">Medium</span><span class="chip hard">Hard</span><span class="stars">★★☆</span></div></div>
    </div>

    <div class="sechead block" data-sec="problems"><p class="mono">Problems</p><b>Design it. Run it. Get judged.</b><div class="pstats"><span class="pane"><b>3/22</b>solved</span><span class="pane"><b>5/24</b>stars</span></div></div>

    <div class="reader">
      <h4>Caching in an interview</h4>
      <p class="ink2">Reading one profile from Postgres takes a few milliseconds. Do it 12,000 times a second and the database spends its day on the same question.</p>
      <div class="fig" data-sec="concepts"><span class="node hl">App servers</span><span class="wire"></span><span class="node">Redis</span><span class="wire"></span><span class="node">Postgres</span></div>
      <div class="say"><p class="mono">Say this in the interview</p>"Reads outnumber writes 100 to 1, so Redis goes in front."</div>
      <p class="muted">Muted text · <a href="#">a link</a> · <span class="ok">Passed ✓</span> · <span class="bad">Failed</span></p>
    </div>
    <div class="final"><b>Start with Networking essentials.</b><span class="btn mari">Start learning, free</span></div>
  </div>
</section>`;

const cols = document.getElementById("cols");
cols.innerHTML = P.map(column).join("");
const tabs = [...document.querySelectorAll(".picker [data-p]")];
const show = (id) => { cols.dataset.show = id; tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.p === id))); };
tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.p)));
show("a");
// phone: swipe between palettes
let x0 = null;
cols.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
cols.addEventListener("touchend", (e) => {
  if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 60) return;
  const i = P.findIndex((p) => p[0] === cols.dataset.show); show(P[(i + (dx < 0 ? 1 : P.length - 1)) % P.length][0]);
}, { passive: true });

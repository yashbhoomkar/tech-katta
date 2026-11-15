// One column per dark candidate, built from the same pieces. On phones one column shows at a time:
// the tabs or a sideways swipe change it.
const P = [
  ["b", "B · Chalkboard", "Slate tones, chalk lines, coloured chalk"],
  ["d", "D · Inverted blocks", "Dark cards, thick coloured outlines"],
  ["e", "E · Dim paper", "Lamp-lit, black ink kept"],
  ["now", "Now", "The current dark, for reference"],
];
const SEC = [["concepts", "Concepts", "21 lessons", 14], ["components", "Components", "10 lessons", 10], ["interview", "Interview Questions", "8 lessons", 13], ["problems", "Problems", "22 problems", 14], ["notes", "Quick Notes", "4 lessons", 0], ["real", "Real Systems", "6 lessons", 0]];

const column = ([id, name, sub]) => `
<section class="col pal-${id}" data-p="${id}" aria-label="${name}">
  <div class="colhead"><div><h2>${name}</h2><p>${sub}</p></div><a class="open" href="/p/neo-brutalism/?theme=dark&amp;nbdark=${id}#/home">Open the whole prototype →</a></div>
  <div class="screen">
    <div class="nav"><span class="logo"><b>TK</b>Tech Katta</span><span class="key">Start free</span></div>
    <h3 class="hero">System design, <em>explained.</em></h3>
    <div class="row"><span class="key">Start learning, free</span><span class="btn">Try IND vs PAK</span></div>

    <div class="rcard block big" data-sec="concepts"><b>Concepts ▸</b><small>Caching, sharding, queues.</small>
      <div class="pane"><div class="flow"><span>Client</span>→<span class="hl">Cache</span>→<span>DB</span></div><div class="rowb">Reads from memory<em class="ok">95%</em></div></div></div>

    <div class="sticker">Continue where you left off</div>
    <div class="card"><b>Caching: when to add a cache</b><div class="bar"><i style="width:40%"></i></div><small class="muted">40% read · 13 min left</small><div class="row"><span class="key">Resume →</span></div></div>

    <div class="tiles">${SEC.map(([s, n, c, pct]) => `<div class="tile block" data-sec="${s}"><b>${n} ▸</b><small>${c}</small><div class="pb"><i style="width:${pct}%"></i></div></div>`).join("")}</div>

    <div class="sechead block big" data-sec="problems"><span class="mono">Problems</span><b>Design it. Run it. Get judged.</b></div>

    <div class="rows card flat"><div class="lr"><i class="st done"></i>Networking essentials<small>12 min</small></div><div class="lr"><i class="st done"></i>API design<small>14 min</small></div><div class="lr now" data-sec="concepts"><i class="st"></i>Caching<small>22 min</small></div><div class="lr"><i class="st"></i>Sharding<small>16 min</small></div></div>

    <div class="reader">
      <h4>Caching in an interview</h4>
      <p class="ink2">Reading one profile from Postgres takes a few milliseconds. Do it 12,000 times a second and the database spends its day on the same question.</p>
      <div class="fig" data-sec="concepts"><span class="node hl">App servers</span><span class="wire"></span><span class="node">Redis</span><span class="wire"></span><span class="node">Postgres</span></div>
      <div class="say"><span class="sticker small">Say this in the interview</span>"Reads outnumber writes 100 to 1, so Redis goes in front."</div>
    </div>

    <div class="ws"><span class="btn">▶ Run</span><span class="key">Submit</span><span class="btn blue">Ask the interviewer</span></div>
    <div class="canvas"><span class="cnode">Clients</span><i class="arrow"></i><span class="cnode">Load balancer</span><i class="arrow"></i><span class="cnode data" data-sec="problems">Postgres</span></div>
    <div class="row"><span class="stars">★★★</span><span class="ok">Passed ✓</span><span class="chip easy">Easy</span><span class="chip hard">Hard</span><span class="toast">Design saved · 92 / 100</span></div>
  </div>
</section>`;

const cols = document.getElementById("cols");
cols.innerHTML = P.map(column).join("");
const tabs = [...document.querySelectorAll(".picker [data-p]")];
const show = (id) => { cols.dataset.show = id; tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.p === id))); };
tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.p)));
show("b");
let x0 = null;
cols.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
cols.addEventListener("touchend", (e) => {
  if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 60) return;
  const order = ["now", "b", "d", "e"], i = order.indexOf(cols.dataset.show); show(order[(i + (dx < 0 ? 1 : order.length - 1)) % order.length]);
}, { passive: true });

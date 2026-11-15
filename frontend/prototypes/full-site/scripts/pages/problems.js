// Problems: header with your numbers, difficulty filters, the table (whole row opens), challenges.
import { $, $$, esc } from "../core/dom.js";
import { RM } from "../core/motion.js";
import { PROBLEMS, CHALLENGES, levelName, starsText } from "../data/problems.js";
import { toast } from "../components/toast.js";

let filter = "all";
export const title = () => "Problems";

const count = (l) => PROBLEMS.filter((p) => p.level === l).length;
const rows = () => PROBLEMS.filter((p) => filter === "all" || p.level === filter).map((p) => `
  <tr class="${p.status === "solved" ? "solved" : ""}" data-slug="${p.slug}">
    <td aria-label="${p.status || "not started"}" class="${p.status === "started" ? "started" : ""}">${p.status === "solved" ? "✓" : p.status === "started" ? "◐" : ""}</td>
    <td class="mono" style="font-size:12px">${p.n}</td>
    <td class="tt"><a href="#/problems/${p.slug}">${esc(p.title)}</a></td>
    <td><span class="chip ${p.level}">${levelName(p.level)}</span></td>
    <td>${p.accepted}</td>
    <td class="${p.best ? "best" : "muted"}">${p.best ?? "—"}</td>
    <td><span class="stars" aria-label="${p.stars} of 3 stars">${starsText(p.stars)}</span></td>
  </tr>`).join("");

// phones get cards instead of a wide table: title, difficulty, stars and acceptance stay visible
const cards = () => PROBLEMS.filter((p) => filter === "all" || p.level === filter).map((p) => `
  <li><a class="pcard ${p.status}" href="#/problems/${p.slug}"><span class="pn mono">${p.n}</span><span class="pt">${esc(p.title)}</span>
    <span class="pm"><span class="chip ${p.level}">${levelName(p.level)}</span><span class="muted">${p.accepted} accepted</span>${p.best ? `<b>${p.best}</b>` : ""}<span class="stars">${starsText(p.stars)}</span></span>
    <span class="ps" aria-label="${p.status || "not started"}">${p.status === "solved" ? "✓" : p.status === "started" ? "◐" : ""}</span></a></li>`).join("");

export const render = () => {
  const solved = PROBLEMS.filter((p) => p.status === "solved").length;
  return `
<div class="content">
  <div class="sechead block" data-sec="problems">
    <div><p class="mono">Problems</p><h1>Design it. Run it. Get judged.</h1><p>Every problem has a test suite: traffic peaks, spikes, crashes and a budget. Your design passes when every test does.</p></div>
    <div class="pstats"><div class="pane"><b>${solved}/${PROBLEMS.length}</b><small>solved</small></div><div class="pane"><b>5/24</b><small>stars</small></div><div class="pane"><b>5</b><small>day streak</small></div></div>
  </div>
  <div class="filters"><div class="f" role="group" aria-label="Filter by difficulty">
    ${[["all", `All ${PROBLEMS.length}`], ["easy", `Easy ${count("easy")}`], ["medium", `Medium ${count("medium")}`], ["hard", `Hard ${count("hard")}`]].map(([f, l]) => `<button class="fbtn" type="button" data-f="${f}" aria-pressed="${filter === f}">${l}</button>`).join("")}</div>
    <button class="btn sm" type="button" id="pick">⚄ Pick one for me</button></div>
  <ul class="plist" id="plist">${cards()}</ul>
  <div class="card tbl"><table><thead><tr><th><span class="sr-only">Status</span></th><th>#</th><th>Problem</th><th>Difficulty</th><th>Accepted</th><th>Best</th><th>Challenge</th></tr></thead><tbody id="ptable">${rows()}</tbody></table></div>
  <h2 class="h2" id="challenges">Challenges</h2>
  <div class="chals">${CHALLENGES.map((c) => `<div class="card"><p class="mono">${c.level}</p><h3>${esc(c.title)}</h3><span class="stars">${starsText(c.stars)}</span></div>`).join("")}</div>
</div>`;
};

export function mount(root, ctx) {
  const tb = $("#ptable", root);
  tb.addEventListener("click", (e) => { const tr = e.target.closest("tr"); if (tr && !e.target.closest("a")) ctx.go(`problems/${tr.dataset.slug}`); });
  $$(".fbtn", root).forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.f; $$(".fbtn", root).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    tb.innerHTML = rows(); $("#plist", root).innerHTML = cards(); $$("#plist li", root).forEach((li, i) => { li.classList.add("in"); li.style.animationDelay = Math.min(i, 8) * 22 + "ms"; }); $$("tr", tb).forEach((tr, i) => { tr.classList.add("in"); tr.style.animationDelay = Math.min(i, 10) * (i < 4 ? 25 : 18) + "ms"; });
  }));
  $("#pick", root).addEventListener("click", () => {
    if (matchMedia("(max-width: 980px)").matches) {
      const open = $$("#plist .pcard:not(.solved)", root); const a = open[Math.floor(Math.random() * open.length)];
      $$("#plist .picked", root).forEach((x) => x.classList.remove("picked")); void a.offsetWidth; a.classList.add("picked");
      a.scrollIntoView({ block: "center", behavior: RM.matches ? "auto" : "smooth" }); toast("Try this one: " + $(".pt", a).textContent); return;
    }
    const open = $$("tr:not(.solved)", tb); if (!open.length) return;
    $$("tr.picked", tb).forEach((x) => x.classList.remove("picked"));
    const tr = open[Math.floor(Math.random() * open.length)]; void tr.offsetWidth; tr.classList.add("picked");
    tr.scrollIntoView({ block: "center", behavior: RM.matches ? "auto" : "smooth" });
    toast("Try this one: " + $(".tt", tr).textContent);
  });
}

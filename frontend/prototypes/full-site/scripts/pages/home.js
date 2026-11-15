// Home (signed-in dashboard): continue, progress, problem of the day, streak, then every section.
import { $, $$, esc } from "../core/dom.js";
import { countUp, later } from "../core/motion.js";
import { SECTIONS, progressOf } from "../data/sections.js";
import { PROBLEMS } from "../data/problems.js";
import { startTour } from "../components/tour.js";

let streakShown = false;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export const title = () => "Home";

export const render = () => {
  const lessons = SECTIONS.reduce((n, s) => n + progressOf(s).done, 0), total = SECTIONS.reduce((n, s) => n + progressOf(s).total, 0);
  const solved = PROBLEMS.filter((p) => p.status === "solved").length;
  return `
<div class="content">
  <div class="topline"><div><h1>${greeting()}, Riya</h1><p>You're <span id="sdays">4</span> days into a streak. One more lesson keeps it going.</p></div>
    <div class="tools"><button class="btn sm" type="button" id="tourbtn">Take the tour</button></div></div>
  <div class="grid-2">
    <div class="card cont" data-tour-id="cont"><p class="mono">Continue where you left off</p><div class="in"><div class="thumb block" data-sec="concepts">Client → Cache → DB</div>
      <div class="txt"><span class="chip" data-sec="concepts" style="background:var(--t);align-self:flex-start">Concepts · Core concepts</span><h3>Caching: when to add a cache, and how to explain it</h3><div class="bar" data-sec="concepts"><i style="width:40%;background:var(--a)"></i></div><small class="muted">40% read · 13 min left</small></div>
      <a class="btn primary" href="#/learn/concepts/caching">Resume →</a></div></div>
    <div class="card prog" data-tour-id="prog"><p class="mono">Your progress</p>
      <div><div class="l"><span>Lessons</span><b><span data-to="${lessons}">${lessons}</span> of ${total}</b></div><div class="bar" data-sec="concepts" style="margin-top:6px"><i style="width:${Math.round(lessons / total * 100)}%;background:var(--a)"></i></div></div>
      <div><div class="l"><span>Problems solved</span><b><span data-to="${solved}">${solved}</span> of ${PROBLEMS.length}</b></div><div class="bar" data-sec="problems" style="margin-top:6px"><i style="width:${Math.round(solved / PROBLEMS.length * 100)}%;background:var(--a)"></i></div></div>
      <div><div class="l"><span>Challenge stars</span><b><span data-to="5">5</span> of 24</b></div><div class="bar" style="margin-top:6px"><i style="width:21%;background:var(--star)"></i></div></div></div>
  </div>
  <div class="grid-2">
    <div class="pod" data-sec="problems"><div><p class="mono">Problem of the day</p><h3>Design a notification service</h3><div class="row-gap"><span class="chip easy">Easy</span><small class="muted">~35 min · 6 tests</small></div></div><a class="btn primary" href="#/problems/notifications">Open the canvas</a></div>
    <div class="card streak" data-tour-id="streak"><p class="mono">Streak</p><div class="days">${["M", "T", "W", "T"].map((d) => `<span class="on"><i></i>${d}</span>`).join("")}<span id="today"><i></i>F</span><span><i></i>S</span><span><i></i>S</span></div></div>
  </div>
  <div class="row-between"><h2 class="h2">Explore</h2><a class="link" href="#/learn">All sections →</a></div>
  <div class="explore">
    ${SECTIONS.map((s) => { const p = progressOf(s); return `<a class="ecard block" data-sec="${s.id}" href="#/learn/${s.id}"><h3>${esc(s.name)} ▸</h3><p>${p.total} lessons</p><div class="pb"><div class="bar"><i style="width:${p.pct}%"></i></div>${p.pct}%</div></a>`; }).join("")}
    <a class="ecard block" data-sec="problems" href="#/problems"><h3>Problems ▸</h3><p>22 problems · 8 challenges</p><div class="pb"><div class="bar"><i style="width:${Math.round(solved / 22 * 100)}%"></i></div>${Math.round(solved / 22 * 100)}%</div></a>
  </div>
</div>`;
};

export function mount(root, ctx, sc) {
  $$("[data-to]", root).forEach((el) => countUp(el, +el.dataset.to, 800));
  if (!streakShown) { streakShown = true; $("#today", root).classList.add("pop", "on"); sc.timer(later(() => countUp($("#sdays", root), 5, 300), 900)); }
  else { $("#today", root).classList.add("on"); $("#sdays", root).textContent = "5"; }
  $("#tourbtn", root).addEventListener("click", startTour);
}

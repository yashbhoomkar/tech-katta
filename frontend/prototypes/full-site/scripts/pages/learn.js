// Learn hub: every section on one page, with progress. The phone "Learn" tab opens this.
import { esc } from "../core/dom.js";
import { SECTIONS, progressOf, lessonsOf } from "../data/sections.js";

export const title = () => "Learn";

export const render = () => `
<div class="content">
  <div class="topline"><div><h1>Learn</h1><p>Five sections. Start with Concepts if you are new; jump anywhere if you have an interview soon.</p></div></div>
  <div class="hub">
    ${SECTIONS.map((s) => {
      const p = progressOf(s), next = lessonsOf(s).find((l) => l.state === "now") || lessonsOf(s).find((l) => !l.state);
      return `<article class="hub-card block" data-sec="${s.id}">
        <a class="hub-main" href="#/learn/${s.id}"><p class="mono">${p.total} lessons</p><h2>${esc(s.name)}</h2><p>${esc(s.card)}</p></a>
        <div class="hub-foot pane"><div class="bar"><i style="width:${p.pct}%;background:var(--a)"></i></div><small>${p.done} of ${p.total} done</small>
          ${next ? `<a class="btn sm" href="#/learn/${s.id}/${next.slug}">${next.state === "now" ? "Continue" : "Start"}: ${esc(next.title)} →</a>` : ""}</div>
      </article>`;
    }).join("")}
  </div>
</div>`;

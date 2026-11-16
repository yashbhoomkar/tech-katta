// One section (Concepts, Components …): a coloured header with progress and "continue", then its groups.
import { esc } from "../core/dom.js";
import { sectionById, progressOf, lessonsOf } from "../data/sections.js";
import * as notFound from "./not-found.js";

const sec = (ctx) => sectionById(ctx.params[0]);

export const title = (ctx) => sec(ctx)?.name || "Page not found";
export const crumbs = (ctx) => sec(ctx) ? [["Learn", "learn"], [sec(ctx).name, ""]] : [];
export const up = (ctx) => sec(ctx) ? ["learn", "Learn"] : null;

export const render = (ctx) => {
  const s = sec(ctx);
  if (!s) return notFound.render(ctx);
  const p = progressOf(s), all = lessonsOf(s), next = all.find((l) => l.state === "now") || all.find((l) => !l.state);
  return `
<div class="content">
  <div class="sechead block" data-sec="${s.id}">
    <div><p class="mono">${esc(s.name)}</p><h1>${esc(s.title)}</h1><p>${esc(s.blurb)}</p></div>
    <div class="cprog pane"><b style="font-size:18px">${p.done} of ${p.total} done</b><div class="bar"><i style="width:${p.pct}%"></i></div>
      ${next ? `<small>Next up: ${esc(next.title)}${next.min ? ` · ${next.min} min` : ""}</small><a class="btn primary" href="#/learn/${s.id}/${next.slug}" style="align-self:flex-start">${next.state === "now" ? "Continue" : "Start"} →</a>` : "<small>All done.</small>"}</div>
  </div>
  ${s.groups.length > 1 ? `<nav class="jump" aria-label="Groups in ${esc(s.name)}">${s.groups.map((g) => `<a href="#/learn/${s.id}" data-jump="g-${g.id}">${esc(g.title)}</a>`).join("")}</nav>` : ""}
  ${s.groups.map((g) => { const done = g.lessons.filter((l) => l[3] === "done").length; return `
  <section class="card module" id="g-${g.id}" data-sec="${s.id}"><div class="mhead"><div><h3>${esc(g.title)}</h3><p>${esc(g.desc)}</p></div><span class="chip">${done} of ${g.lessons.length} done</span></div>
    ${g.lessons.map(([slug, t, min, st], i) => `<a class="lesson ${st}" href="#/learn/${s.id}/${slug}"><i class="st"></i><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t">${esc(t)}${st === "now" ? ' <span class="chip now-chip">In progress · 40%</span>' : ""}</span><span class="m">${min} min</span></a>`).join("")}
  </section>`; }).join("")}
</div>`;
};

export function mount(root) {
  // group links scroll within the page (they must not change the route)
  root.addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" }); });
}

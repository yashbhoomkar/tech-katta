// Desktop navigation. Three states:
//   full  (264 px) - default on app pages
//   rail  (72 px)  - icons and colour dots only; [ toggles it; remembered per viewer
//   drawer         - on reading and canvas pages the sidebar steps aside; the ☰ in the top bar slides it in
// Sections show their progress so the sidebar doubles as a "where am I in the course" summary.
import { SECTIONS, progressOf } from "../data/sections.js";
import { PROBLEMS } from "../data/problems.js";
import { ICONS } from "./icons.js";
import { switchHTML } from "../core/theme.js";
import { $, $$, esc, isTyping } from "../core/dom.js";
import { set } from "../core/store.js";
import { closeWithExit } from "../core/motion.js";

const solved = () => PROBLEMS.filter((p) => p.status === "solved").length;

export const sidebarHTML = () => `
  <div class="side-top">
    <a class="logo" href="#/home" title="Tech Katta: your home"><b>TK</b><span class="lbl">Tech Katta</span></a>
    <button class="btn icon ghost rail-btn" type="button" data-rail aria-label="Collapse sidebar" title="Collapse sidebar  [">${ICONS.rail}</button>
    <button class="btn icon ghost drawer-x" type="button" data-drawer-close aria-label="Close menu">${ICONS.close}</button>
  </div>
  <button class="search" type="button" data-cmdk aria-label="Search lessons and problems" title="Search  ⌘K">${ICONS.search}<span class="lbl">Search</span><kbd class="lbl">⌘K</kbd></button>
  <nav class="side-nav" aria-label="Main">
    <a class="nav-i" data-nav="home" href="#/home" title="Home">${ICONS.home}<span class="lbl">Home</span></a>
    <p class="nav-h lbl">Learn</p>
    ${SECTIONS.map((s) => { const p = progressOf(s); return `<a class="nav-i" data-nav="${s.id}" data-sec="${s.id}" href="#/learn/${s.id}" title="${esc(s.name)}"><span class="ic-dot"><i class="dot"></i></span><span class="lbl">${esc(s.name)}</span><small class="lbl">${p.done}/${p.total}</small></a>`; }).join("")}
    <p class="nav-h lbl">Practise</p>
    <a class="nav-i" data-nav="problems" data-sec="problems" href="#/problems" title="Problems">${ICONS.problems}<span class="lbl">Problems</span><small class="lbl">${solved()}/${PROBLEMS.length}</small></a>
  </nav>
  <div class="side-foot">
    <div class="lbl theme-row"><span>Theme</span>${switchHTML()}</div>
    <a class="me" data-nav="me" href="#/me" title="You and settings"><i class="avatar" aria-hidden="true">R</i><span class="lbl">Riya Sharma<small>Settings, theme, sign out</small></span></a>
  </div>`;

export function initSidebar() {
  const side = $("#side"), root = document.documentElement;
  side.innerHTML = sidebarHTML();
  const scrim = $("#side-scrim");

  const setRail = (on) => { root.classList.toggle("rail", on); set("side", on ? "rail" : "full"); const b = $("[data-rail]", side); b.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar"); b.title = (on ? "Expand" : "Collapse") + " sidebar  ["; };
  setRail(root.classList.contains("rail"));
  $("[data-rail]", side).addEventListener("click", () => setRail(!root.classList.contains("rail")));

  // drawer (reading and canvas pages)
  const open = () => { side.classList.add("open"); scrim.hidden = false; $(".nav-i[aria-current]", side)?.focus({ preventScroll: true }); };
  const close = () => { if (!side.classList.contains("open")) return; side.classList.remove("open"); closeWithExit(scrim, 200); };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-drawer-open]")) open(); if (e.target.closest("[data-drawer-close]") || e.target === scrim) close(); });
  side.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "[" && !isTyping() && !e.metaKey && !e.ctrlKey) {
      if (document.body.dataset.layout === "app") setRail(!root.classList.contains("rail")); else side.classList.contains("open") ? close() : open();
    }
  });
  document.addEventListener("routechange", close);

  return {
    setActive(nav) {
      $$(".nav-i, .me", side).forEach((a) => { const on = a.dataset.nav === nav; a.toggleAttribute("aria-current", on); if (on) a.setAttribute("aria-current", "page"); });
    },
  };
}

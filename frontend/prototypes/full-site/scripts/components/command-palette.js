// Search everything: ⌘K / Ctrl+K, "/", the sidebar box, the top-bar icon or the Search tab.
// Opened from the keyboard many times a day, so it appears almost at once (no scale, 120 ms fade).
// Empty query shows "Jump back in" (recent pages) and the main pages.
import { $, esc, isTyping } from "../core/dom.js";
import { SECTIONS, lessonsOf } from "../data/sections.js";
import { PROBLEMS, levelName } from "../data/problems.js";
import { go } from "../core/router.js";

const INDEX = [
  ...SECTIONS.flatMap((s) => lessonsOf(s).map((l) => ({ g: "Lessons", t: l.title, s: `${s.name} · ${l.group.title}`, h: `learn/${s.id}/${l.slug}`, sec: s.id }))),
  ...PROBLEMS.map((p) => ({ g: "Problems", t: p.title, s: levelName(p.level) + (p.status === "solved" ? " · solved" : ""), h: `problems/${p.slug}`, sec: "problems" })),
  ...SECTIONS.map((s) => ({ g: "Sections", t: s.name, s: s.title, h: `learn/${s.id}`, sec: s.id })),
  ...[["Home", "home"], ["Learn", "learn"], ["Problems", "problems"], ["You and settings", "me"], ["Landing page", ""]].map(([t, h]) => ({ g: "Pages", t, s: "", h, sec: "" })),
];

export function initCommandPalette() {
  const box = $("#cmdk"), q = $("#cq"), res = $("#cres");
  const recent = [];
  let sel = 0, hits = [], opener = null;

  document.addEventListener("routechange", (e) => {
    const p = e.detail.path; const item = INDEX.find((x) => x.h === p);
    if (!item) return;
    const i = recent.findIndex((x) => x.h === p); if (i >= 0) recent.splice(i, 1);
    recent.unshift({ ...item, g: "Jump back in" }); recent.length = Math.min(recent.length, 4);
  });

  const mark = (t, s) => { const i = t.toLowerCase().indexOf(s); return i < 0 || !s ? esc(t) : esc(t.slice(0, i)) + "<mark>" + esc(t.slice(i, i + s.length)) + "</mark>" + esc(t.slice(i + s.length)); };
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    hits = s ? INDEX.filter((x) => x.t.toLowerCase().includes(s) || x.s.toLowerCase().includes(s)).slice(0, 14)
             : [...recent, ...INDEX.filter((x) => x.g === "Pages" || x.g === "Sections").slice(0, 8)];
    sel = Math.min(sel, Math.max(0, hits.length - 1));
    if (!hits.length) { res.innerHTML = `<p class="none">Nothing called “${esc(q.value)}”. Try “cache”, “chat” or “kafka”.</p>`; q.removeAttribute("aria-activedescendant"); return; }
    let g = "";
    res.innerHTML = hits.map((x, i) => (x.g !== g ? `<h4>${esc((g = x.g))}</h4>` : "") +
      `<a href="#/${x.h}" role="option" id="co${i}" aria-selected="${i === sel}" ${x.sec ? `data-sec="${x.sec}"` : ""}><i class="dot"${x.sec ? "" : ' style="background:var(--line-strong)"'}></i><span>${mark(x.t, s)}</span><small>${esc(x.s)}</small></a>`).join("");
    q.setAttribute("aria-activedescendant", "co" + sel);
    $("#co" + sel)?.scrollIntoView({ block: "nearest" });
  };
  const open = () => { if (!box.hidden) return; opener = document.activeElement; box.hidden = false; q.value = ""; sel = 0; draw(); q.focus(); };
  const close = () => { if (box.hidden) return; box.hidden = true; opener?.focus?.({ preventScroll: true }); };

  document.addEventListener("click", (e) => { if (e.target.closest("[data-cmdk]")) { e.preventDefault(); open(); } });
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "k") { e.preventDefault(); box.hidden ? open() : close(); }
    else if (k === "/" && box.hidden && !isTyping()) { e.preventDefault(); open(); }
  });
  q.addEventListener("input", () => { sel = 0; draw(); });
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % Math.max(1, hits.length); draw(); }
    else if (e.key === "Enter" && hits[sel]) { e.preventDefault(); const h = hits[sel].h; close(); go(h); }
    else if (e.key === "Escape") { e.stopPropagation(); close(); }
  });
  box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".cres a")) close(); });
  return { open, close };
}

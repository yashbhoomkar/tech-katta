// "?" lists the keyboard shortcuts. g then h / l / p / m jumps to Home, Learn, Problems, You.
import { $, isTyping } from "../core/dom.js";
import { closeWithExit } from "../core/motion.js";
import { go } from "../core/router.js";

export const SHORTCUTS = [
  [["⌘", "K"], "Search everything (also /)"],
  [["["], "Fold the sidebar, or open it on reading pages"],
  [["g", "h"], "Go to Home"], [["g", "l"], "Go to Learn"], [["g", "p"], "Go to Problems"], [["g", "m"], "Go to You and settings"],
  [["←", "→"], "Previous / next card in Cards mode"],
  [["?"], "Show this list"], [["Esc"], "Close whatever is open"],
];

export const shortcutsHTML = () => `<dl class="keys">${SHORTCUTS.map(([k, d]) => `<div><dt>${k.map((x) => `<kbd>${x}</kbd>`).join(" ")}</dt><dd>${d}</dd></div>`).join("")}</dl>`;

export function initShortcuts() {
  const dlg = $("#keys");
  $("#keys-body").innerHTML = shortcutsHTML();
  const close = () => closeWithExit(dlg, 200);
  let g = 0;
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !dlg.hidden) return close();
    if (isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "?") { dlg.hidden ? (dlg.hidden = false) : close(); return; }
    if (e.key === "g") { g = Date.now(); return; }
    if (Date.now() - g < 900) { const to = { h: "home", l: "learn", p: "problems", m: "me" }[e.key]; if (to !== undefined) { g = 0; go(to); } }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) close(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-keys]")) dlg.hidden = false; });
}

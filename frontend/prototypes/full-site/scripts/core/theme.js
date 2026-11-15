// Light / dark. The viewer picks System, Light or Dark; System follows the device and changes live.
// boot-theme.js sets the first value before the page paints (no white flash at night); this module keeps
// it in step afterwards. Every theme switch on the page (sidebar, You page, landing footer) is a
// .theme-sw group and stays in sync through the "themechange" event.
import { get, set } from "./store.js";
import { RM } from "./motion.js";
import { ICONS } from "../components/icons.js";

const dark = matchMedia("(prefers-color-scheme: dark)");
export const pref = () => get("theme", "system");
export const resolved = (p = pref()) => (p === "system" ? (dark.matches ? "dark" : "light") : p);

const apply = () => {
  const t = resolved();
  document.documentElement.setAttribute("data-theme", t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
  document.dispatchEvent(new CustomEvent("themechange", { detail: { pref: pref(), theme: t } }));
};

export const setPref = (p) => {
  const before = resolved();
  set("theme", p);
  // cross-fade only when the colours actually change
  if (resolved() !== before && document.startViewTransition && !RM.matches) document.startViewTransition(apply);
  else apply();
};

export const OPTIONS = [["system", "System", "Match this device"], ["light", "Light", "Light"], ["dark", "Dark", "Dark"]];

export const switchHTML = (label = "Theme") =>
  `<div class="theme-sw" role="group" aria-label="${label}">${OPTIONS.map(([v, icon, name]) => `<button type="button" data-theme-set="${v}" aria-pressed="${pref() === v}" title="${name}" aria-label="${name}">${ICONS[v]}</button>`).join("")}</div>`;

const sync = () => document.querySelectorAll("[data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.themeSet === pref())));

export const initTheme = () => {
  apply();
  dark.addEventListener("change", () => { if (pref() === "system") apply(); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-theme-set]"); if (b) setPref(b.dataset.themeSet); });
  document.addEventListener("themechange", sync);
};

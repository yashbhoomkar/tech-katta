// Prototype only (not part of the design): a small "Screens" button that opens a list of every screen,
// so reviewers can jump around. Folded by default so it never covers the page.
import { $, $$ } from "../core/dom.js";

const SCREENS = [["", "Landing"], ["home", "Home (dashboard)"], ["learn", "Learn hub"], ["learn/concepts", "Section: Concepts"],
  ["learn/concepts/caching", "Lesson: Caching"], ["problems", "Problems"], ["problems/url-shortener", "Workspace"], ["me", "You and settings"], ["nowhere", "Page not found"]];

export function initSwitcher() {
  const el = $("#switcher");
  el.innerHTML = `<button class="sw-btn" type="button" aria-expanded="false" aria-controls="sw-list">Screens</button>
    <div class="sw-list" id="sw-list" hidden><p class="mono">Prototype screens</p>${SCREENS.map(([h, n]) => `<a href="#/${h}" data-sw="${h}">${n}</a>`).join("")}
      <button type="button" data-signin>Sign-in dialog</button><button type="button" data-keys>Keyboard shortcuts</button>
      <p class="mono" style="margin-top:8px">Dark palette</p><div class="sw-dark">${[["now", "Now"], ["a", "A"], ["f", "F"], ["d", "D"]].map(([v, n]) => `<button type="button" data-dark-set="${v}" title="${n === "Now" ? "Current dark" : "Candidate " + n}">${n}</button>`).join("")}</div></div>`;
  const cur = () => document.documentElement.getAttribute("data-dark") || "now";
  const syncDark = () => $$("[data-dark-set]", el).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.darkSet === cur())));
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dark-set]"); if (!b) return; e.stopPropagation();
    const v = b.dataset.darkSet; try { localStorage.setItem("tk-proto-dark", v); } catch { /* ignore */ }
    const apply = () => { if (v === "now") document.documentElement.removeAttribute("data-dark"); else document.documentElement.setAttribute("data-dark", v); syncDark(); };
    document.startViewTransition ? document.startViewTransition(apply) : apply();
  });
  syncDark();
  const btn = $(".sw-btn", el), list = $(".sw-list", el);
  const set = (o) => { list.hidden = !o; btn.setAttribute("aria-expanded", String(o)); };
  btn.addEventListener("click", () => set(list.hidden));
  list.addEventListener("click", (e) => { if (e.target.closest("a,button") && !e.target.closest("[data-dark-set]")) set(false); });
  document.addEventListener("click", (e) => { if (!el.contains(e.target)) set(false); });
  document.addEventListener("routechange", (e) => $$("[data-sw]", el).forEach((a) => a.toggleAttribute("aria-current", a.dataset.sw === e.detail.path)));
}

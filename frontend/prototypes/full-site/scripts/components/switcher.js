// Prototype only (not part of the design): a small "Screens" button that opens a list of every screen,
// so reviewers can jump around. Folded by default so it never covers the page.
import { $, $$ } from "../core/dom.js";

const SCREENS = [["", "Landing"], ["home", "Home (dashboard)"], ["learn", "Learn hub"], ["learn/concepts", "Section: Concepts"],
  ["learn/concepts/caching", "Lesson: Caching"], ["problems", "Problems"], ["problems/url-shortener", "Workspace"], ["me", "You and settings"], ["nowhere", "Page not found"]];

export function initSwitcher() {
  const el = $("#switcher");
  el.innerHTML = `<button class="sw-btn" type="button" aria-expanded="false" aria-controls="sw-list">Screens</button>
    <div class="sw-list" id="sw-list" hidden><p class="mono">Prototype screens</p>${SCREENS.map(([h, n]) => `<a href="#/${h}" data-sw="${h}">${n}</a>`).join("")}
      <button type="button" data-signin>Sign-in dialog</button><button type="button" data-keys>Keyboard shortcuts</button></div>`;
  const btn = $(".sw-btn", el), list = $(".sw-list", el);
  const set = (o) => { list.hidden = !o; btn.setAttribute("aria-expanded", String(o)); };
  btn.addEventListener("click", () => set(list.hidden));
  list.addEventListener("click", (e) => { if (e.target.closest("a,button")) set(false); });
  document.addEventListener("click", (e) => { if (!el.contains(e.target)) set(false); });
  document.addEventListener("routechange", (e) => $$("[data-sw]", el).forEach((a) => a.toggleAttribute("aria-current", a.dataset.sw === e.detail.path)));
}

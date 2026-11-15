// Phone navigation: five tabs within thumb reach. Search is a tab because on a phone there is no ⌘K.
// Hidden on the landing page and the canvas (which needs the whole screen); on reading pages it slides away
// while you scroll down, with the top bar.
import { $, $$ } from "../core/dom.js";
import { ICONS } from "./icons.js";

const TABS = [["home", "Home", "#/home"], ["learn", "Learn", "#/learn"], ["problems", "Problems", "#/problems"], ["search", "Search", null], ["me", "You", "#/me"]];

export function initTabbar() {
  const bar = $("#tabbar");
  bar.innerHTML = TABS.map(([id, label, href]) => href
    ? `<a class="tab" data-tab="${id}" href="${href}">${ICONS[id]}<span>${label}</span></a>`
    : `<button class="tab" type="button" data-tab="${id}" data-cmdk>${ICONS[id]}<span>${label}</span></button>`).join("");
  return {
    setActive(tab) { $$(".tab", bar).forEach((t) => { const on = t.dataset.tab === tab; t.toggleAttribute("aria-current", on); if (on) t.setAttribute("aria-current", "page"); }); },
  };
}

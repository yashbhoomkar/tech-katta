// The bar at the top of app pages on phones, and of reading pages everywhere.
//   phone, top-level page:  logo ............ search
//   phone, deeper page:     ‹ back  Title ..... search
//   reading (any width):    ☰  Learn › Concepts › Core concepts › Caching ..... ‹ prev  next ›  share
// "Back" goes up one level (the page's parent), not browser history, so it is predictable from a shared link.
// On reading pages the bar hides while you scroll down and returns when you scroll up.
import { $, esc } from "../core/dom.js";
import { ICONS } from "./icons.js";

export function initTopbar() {
  const bar = $("#topbar");
  let lastY = 0;
  addEventListener("scroll", () => {
    const y = scrollY, layout = document.body.dataset.layout;
    if (layout === "focus" || layout === "app") {
      const hide = y > 120 && y > lastY + 4 && !document.querySelector(".side.open");
      if (y < lastY - 4 || y < 120) document.body.classList.remove("bars-away");
      else if (hide) document.body.classList.add("bars-away");
    }
    lastY = y;
    const rp = $("#readbar");
    if (rp && layout === "focus") { const h = document.documentElement.scrollHeight - innerHeight; rp.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`; }
  }, { passive: true });

  return {
    update(ctx, page) {
      document.body.classList.remove("bars-away");
      const crumbs = page.crumbs?.(ctx) || [];
      const up = page.up?.(ctx);
      const title = page.title?.(ctx) || "Tech Katta";
      const pager = page.pager?.(ctx);
      const focus = ctx.layout === "focus";
      bar.innerHTML = `
        <div class="tb-l">
          ${focus ? `<button class="btn icon ghost tb-menu" type="button" data-drawer-open aria-label="Open menu" title="Menu  [">${ICONS.menu}</button>` : ""}
          ${up ? `<a class="btn icon ghost tb-back" href="#/${up[0]}" aria-label="Back to ${esc(up[1])}" title="Back to ${esc(up[1])}">${ICONS.back}</a>` : `<a class="logo tb-logo" href="#/home"><b>TK</b><span>Tech Katta</span></a>`}
          ${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([label, href], i) => `<li>${i === crumbs.length - 1 ? `<span aria-current="page">${esc(label)}</span>` : `<a href="#/${href}">${esc(label)}</a>`}</li>`).join("")}</ol></nav>` : ""}
          ${up ? `<b class="tb-title">${esc(title)}</b>` : ""}
        </div>
        <div class="tb-r">
          ${pager ? `<span class="pager">
              ${pager.prev ? `<a class="btn icon" href="#/${pager.prev.href}" aria-label="Previous: ${esc(pager.prev.title)}" title="Previous: ${esc(pager.prev.title)}">${ICONS.back}</a>` : `<span class="btn icon" aria-disabled="true">${ICONS.back}</span>`}
              ${pager.next ? `<a class="btn icon" href="#/${pager.next.href}" aria-label="Next: ${esc(pager.next.title)}" title="Next: ${esc(pager.next.title)}">${ICONS.next}</a>` : `<span class="btn icon" aria-disabled="true">${ICONS.next}</span>`}
            </span>` : ""}
          ${focus ? `<button class="btn sm tb-share" type="button" data-share>${ICONS.share}<span>Share</span></button>` : ""}
          <button class="btn icon ghost tb-search" type="button" data-cmdk aria-label="Search">${ICONS.search}</button>
        </div>
        ${focus ? `<div class="readbar"><i id="readbar"></i></div>` : ""}`;
    },
  };
}

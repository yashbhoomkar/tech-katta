// Hash router: #/learn/concepts/caching. (The real app uses paths, /dashboard/concepts/caching/; a hash keeps
// this prototype a set of static files.) Each route names a page module and a layout:
//   landing   - marketing page, its own top nav, no app chrome
//   app       - sidebar on desktop; top bar + bottom tabs on phones
//   focus     - reading: no sidebar (it opens as a drawer), a top bar with breadcrumbs and prev / next
//   workspace - the canvas: full height, its own toolbar, no bottom tabs
// Scroll: a link opens a page at the top; Back and Forward return to where you were.
import { $, scope } from "./dom.js";

const ROUTES = [
  { re: /^$/, page: "landing", layout: "landing" },
  { re: /^home$/, page: "home", layout: "app", nav: () => "home", tab: "home" },
  { re: /^learn$/, page: "learn", layout: "app", nav: () => "learn", tab: "learn" },
  { re: /^learn\/([\w-]+)$/, page: "section", layout: "app", nav: (m) => m[1], tab: "learn" },
  { re: /^learn\/([\w-]+)\/([\w-]+)$/, page: "lesson", layout: "focus", nav: (m) => m[1], tab: "learn" },
  { re: /^problems$/, page: "problems", layout: "app", nav: () => "problems", tab: "problems" },
  { re: /^problems\/([\w-]+)$/, page: "workspace", layout: "workspace", nav: () => "problems", tab: "problems" },
  { re: /^me$/, page: "me", layout: "app", nav: () => "me", tab: "me" },
];
const NOT_FOUND = { page: "notFound", layout: "app", nav: () => "", tab: "" };

// links from the first prototype (#dashboard, #lesson …) still land somewhere sensible
const LEGACY = { home: "", dashboard: "home", concepts: "learn/concepts", lesson: "learn/concepts/caching", problems: "problems", workspace: "problems/url-shortener" };

export const pathOf = () => decodeURIComponent(location.hash.replace(/^#\/?/, "")).replace(/\/+$/, "");
export const go = (path) => { location.hash = "#/" + path.replace(/^\/+/, ""); };

export const match = (path) => {
  for (const r of ROUTES) { const m = path.match(r.re); if (m) return { ...r, params: m.slice(1), path, nav: r.nav ? r.nav(m) : "" }; }
  return { ...NOT_FOUND, params: [], path, nav: "" };
};

export function startRouter({ pages, chrome }) {
  const main = $("#main");
  const scroll = new Map();
  let current = null, fresh = true, sc = scope();

  // a click on an in-app link is a fresh visit (open at the top); anything else is Back / Forward
  document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#/"], a[href="#/"]'); if (a && !e.defaultPrevented) fresh = true; }, true);

  const render = () => {
    const raw = location.hash.replace(/^#\/?/, "");
    if (location.hash && !location.hash.startsWith("#/") && raw in LEGACY) { history.replaceState(null, "", "#/" + LEGACY[raw]); }
    const path = pathOf();
    if (current) scroll.set(current.path, scrollY);
    const r = match(path);
    const page = pages[r.page] || pages.notFound;
    const ctx = { ...r, go };
    sc.dispose(); sc = scope();

    chrome.update(ctx, page);                       // layout, sidebar highlight, top bar, tabs, title
    main.innerHTML = page.render(ctx);
    main.classList.remove("enter"); void main.offsetWidth; main.classList.add("enter");
    page.mount?.(main, ctx, sc);

    const y = fresh ? 0 : scroll.get(path) || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
    // move focus to the page so a screen reader announces it; keep the scroll where we put it
    if (current) main.focus({ preventScroll: true });
    fresh = false;
    current = ctx;
    document.dispatchEvent(new CustomEvent("routechange", { detail: ctx }));
  };

  addEventListener("hashchange", render);
  render();
  return { current: () => current };
}

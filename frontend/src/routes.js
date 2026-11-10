// Article URLs. Every page of the dashboard has a real address, /dashboard/<section>/<slug>/, so an
// article can be shared, indexed by search engines and given its own title and preview (the build writes
// one small HTML page per article, see seo.js). Links inside the app still use #<section>/<slug>; the
// address bar is then rewritten to the path form, and old #links keep working.
export const BASE = "/dashboard/";

const clean = (s) => s.replace(/^\/+|\/+$/g, "");
const decode = (s) => { try { return decodeURIComponent(s) } catch { return "" } };

// "concepts/caches" for /dashboard/concepts/caches/, /dashboard/#concepts/caches and
// /dashboard/concepts/caches/#concepts/caches alike. A hash, when there is one (even a bare "#"), wins:
// it is how in-app links navigate.
export function routeKey(loc) {
  const href = loc.href || "";
  const i = href.indexOf("#");
  if (i >= 0) return clean(decode(href.slice(i + 1)));
  const p = loc.pathname || "";
  if (!p.startsWith(BASE)) return "";
  return clean(decode(p.slice(BASE.length)));
}

// The path form of a route key: "" → /dashboard/, "concepts/caches" → /dashboard/concepts/caches/
export const pathFor = (key) => {
  const parts = clean(key || "").split("/").filter(Boolean);
  return BASE + (parts.length ? parts.map(encodeURIComponent).join("/") + "/" : "");
};

// Old Lab addresses (the Lab tab was removed on 2026-11-10): "lab" → "problems", "lab/<id>" → the challenge's canvas,
// "problems/challenge/<id>", except a challenge that became a problem (IND vs PAK), which opens as that problem.
// `problems`: the slugs of the problems (articles with tests).
export const fromLab = (key, problems = []) => {
  const [sec, id] = key.split("/");
  if (sec !== "lab") return key;
  return !id ? "problems" : problems.includes(id) ? `problems/${id}` : `problems/challenge/${id}`;
};

import { fromLab } from "@legacy/routes.js";

// tech.katta.cc's addresses, so the new frontend can take over the site without breaking a link, bookmark or search
// result. The current app addresses every page as /dashboard/<key>/ (or /dashboard/#<key>, an in-app link; a hash
// wins), where <key> is "", a section, "section/lesson", "problems[/…]", "practice[/slug]", "privacy", "terms", or an
// old "lab/…" address (frontend/src/routes.js). legacyKey reads the key; legacyTarget gives the new path.

const clean = (s: string) => s.replace(/^\/+|\/+$/g, "");
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return ""; } };

/** The current app's route key for a /dashboard address (`pathname` as the router sees it, `hash` with its "#"). */
export function legacyKey(pathname: string, hash: string): string {
  if (hash.length > 0) return clean(decode(hash.slice(1)));
  const m = pathname.match(/^\/dashboard(?:\/(.*))?$/);
  return m ? clean(decode(m[1] ?? "")) : "";
}

/** The new frontend's path for a current-app route key. `problems`: the slugs of problems (articles with tests);
 *  `sections`: the section ids. Unknown keys go Home, as the current app does. */
export function legacyTarget(key: string, problems: string[], sections: string[]): string {
  const k = fromLab(clean(key), problems);
  const [sec = "", slug, more, ...rest] = k.split("/").filter(Boolean);
  const seg = (s: string) => encodeURIComponent(s);
  if (!sec) return "/home";
  if (sec === "privacy" || sec === "terms") return `/${sec}`;
  if (sec === "practice") return slug ? `/practice/${seg(slug)}` : "/practice";
  if (sec === "problems") {
    if (!slug) return "/problems";
    if (slug === "sandbox") return "/problems/sandbox";
    if (slug === "challenge") return more ? `/problems/challenge/${seg(more)}` : "/problems";
    // a shared design keeps its data in the hash, as the current app's share links do
    if (slug === "shared") return more ? `/problems/shared#problems/shared/${[more, ...rest].join("/")}` : "/problems";
    return problems.includes(slug) ? `/problems/${seg(slug)}` : "/problems";
  }
  if (sections.includes(sec)) {
    // section/lesson; a section's sub-list ("section/group") opens the section
    if (slug && slug !== "all" && !more) return `/learn/${seg(sec)}/${seg(slug)}`;
    return `/learn/${seg(sec)}`;
  }
  return "/home";
}

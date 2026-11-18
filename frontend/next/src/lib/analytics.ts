import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { readArticle, referrer, track } from "@legacy/analytics.js";

// Usage analytics through the current app's pipeline (our API's /v1/events, same rules: no cookies, nothing from
// browsers that ask not to be tracked or from automated ones). Page views from this app carry section
// "next:<page>", so the beta's traffic can be told apart from the current app's while both run.

/** "/learn/concepts/caching" → { section: "next:concepts", slug: "caching" }; "/problems" → { section: "next:problems", slug: "" } */
export function pageOf(pathname: string): { section: string; slug: string } {
  const [a = "", b = "", c = ""] = pathname.split("/").filter(Boolean);
  if (!a) return { section: "next:landing", slug: "" };
  if (a === "learn") return b ? { section: `next:${b}`, slug: c } : { section: "next:learn", slug: "" };
  if (a === "problems" && b === "challenge") return { section: "next:challenge", slug: c };
  return { section: `next:${a}`, slug: b };
}

/** One page_view per route change; the first one also says where the visitor came from. */
export function usePageViews(): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    const ref = first.current ? referrer() : "";
    first.current = false;
    track("page_view", { ...pageOf(pathname), ref });
  }, [pathname]);
}

/** Reading time and depth for one lesson, the same measure the current app reports. */
export function useReadArticle(section: string, slug: string, ready: boolean): void {
  useEffect(() => (ready ? readArticle(section, slug) : undefined), [section, slug, ready]);
}

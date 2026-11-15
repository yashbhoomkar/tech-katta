import { createContext, useContext, useMemo, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import type { ArticleSummary, SiteResponse } from "@/lib/api/types";
import { useResource, type ResourceState } from "@/lib/resource";

// The site text and the article list are needed on almost every page, so they load once at the top and are
// shared through context. Pages read them with useContent(); the loading and error states are shown by
// <ContentGate> around each page, so a page component only ever sees ready data.

export interface Content {
  site: SiteResponse;
  articles: ArticleSummary[];
}

type State = ResourceState<Content> & { retry: () => void };

const ContentContext = createContext<State | null>(null);

const fetchSite = (s: AbortSignal) => api.site(s);
const fetchArticles = (s: AbortSignal) => api.articles(s).then((r) => r.articles);

export function ContentProvider({ children }: { children: ReactNode }) {
  const site = useResource("site", fetchSite);
  const articles = useResource("articles", fetchArticles);
  const value = useMemo<State>(() => {
    const retry = () => {
      if (site.status === "error") site.retry();
      if (articles.status === "error") articles.retry();
    };
    if (site.status === "error") return { status: "error", error: site.error, retry };
    if (articles.status === "error") return { status: "error", error: articles.error, retry };
    if (site.status === "success" && articles.status === "success") return { status: "success", data: { site: site.data, articles: articles.data }, retry };
    return { status: "loading", retry };
  }, [site, articles]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContentState(): State {
  const v = useContext(ContentContext);
  if (!v) throw new Error("useContentState must be used inside <ContentProvider>");
  return v;
}

/** Ready content. Only call inside <ContentGate>. */
export function useContent(): Content {
  const s = useContentState();
  if (s.status !== "success") throw new Error("useContent called before content loaded; wrap the page in <ContentGate>");
  return s.data;
}

import { useMemo } from "react";
import { setSite } from "@legacy/dashboard/site.js";
import { useContent } from "@/content/ContentProvider";

/** The current app's components read its site bindings (copy, articles, example): fill them from this app's
 *  content (a copy, because setSite edits it). Call before rendering any of them. */
export function useLegacySite() {
  const { site, articles } = useContent();
  return useMemo(() => {
    setSite(structuredClone(site), { articles: structuredClone(articles) });
    return site as typeof site & { problems?: { solve?: unknown } };
  }, [site, articles]);
}

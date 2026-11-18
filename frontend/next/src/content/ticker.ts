import type { ArticleSummary, SiteResponse } from "@/lib/api/types";

/** The neo-brutalism landing ticker's items, all from live content: how many problems, notes and challenges there
 *  are, and the section names. Upper case, as printed on a running strip. */
export function tickerItems(site: Pick<SiteResponse, "counts" | "topics">, articles: Pick<ArticleSummary, "tests">[]): string[] {
  const problems = articles.filter((a) => a.tests).length;
  const notes = articles.length - problems;
  const items = [
    problems ? `${problems} design problems` : "",
    "a real judge",
    notes ? `${notes} visual notes` : "",
    site.counts.challenges ? `${site.counts.challenges} challenges · ${site.counts.challenges * 3} stars` : "",
    ...site.topics.cards.map((c) => c.title),
    "free with sign-in",
  ];
  return items.filter(Boolean).map((t) => t.toUpperCase());
}

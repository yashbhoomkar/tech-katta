import type { ArticleSummary, SectionId, SiteResponse } from "@/lib/api/types";
import type { Progress } from "@/lib/progress";
import { SECTIONS, paths } from "./sections";
import type { SearchItem } from "@/lib/search";

// Pure functions from API data (+ local progress) to what the pages show. No React here, so all of it is
// unit-tested (model.test.ts).

export interface Group {
  id: string;
  title: string;
  desc: string;
  articles: ArticleSummary[];
}

export interface SectionView {
  id: SectionId;
  title: string;
  groups: Group[];
  total: number;
}

export interface Tally {
  done: number;
  total: number;
  pct: number;
}

export function sectionTitle(site: SiteResponse, id: SectionId): string {
  return site.dashboard.sections.find(([sid]) => sid === id)?.[1] ?? id;
}

/** A section's articles in the API's order, grouped by the section's groups (unknown groups go last, as "More"). */
export function sectionView(site: SiteResponse, articles: ArticleSummary[], id: SectionId): SectionView {
  const own = articles.filter((a) => a.section === id);
  const defs = site.dashboard.groups[id] ?? [];
  const groups: Group[] = defs.map(([gid, title, desc]) => ({ id: gid, title, desc, articles: own.filter((a) => a.group === gid) }));
  const known = new Set(defs.map(([gid]) => gid));
  const rest = own.filter((a) => !known.has(a.group));
  if (rest.length) groups.push({ id: "more", title: "More", desc: "", articles: rest });
  return { id, title: sectionTitle(site, id), groups: groups.filter((g) => g.articles.length > 0), total: own.length };
}

export function tally(articles: ArticleSummary[], progress: Progress): Tally {
  const done = articles.filter((a) => progress[a.slug]?.done).length;
  const total = articles.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export const problemsOf = (articles: ArticleSummary[]): ArticleSummary[] => articles.filter((a) => a.tests !== undefined);

/** The next article to read in a section: the one in progress, else the first not done. */
export function nextInSection(view: SectionView, progress: Progress): ArticleSummary | undefined {
  const all = view.groups.flatMap((g) => g.articles);
  return all.find((a) => progress[a.slug] && !progress[a.slug]?.done) ?? all.find((a) => !progress[a.slug]?.done);
}

/** The same problem all day for everyone (by date), skipping solved ones where possible. */
export function problemOfTheDay(problems: ArticleSummary[], progress: Progress, date = new Date()): ArticleSummary | undefined {
  const open = problems.filter((p) => !progress[p.slug]?.done);
  const pool = open.length ? open : problems;
  if (!pool.length) return undefined;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return pool[day % pool.length];
}

export function greeting(site: SiteResponse, date = new Date()): string {
  const [morning, afternoon, evening] = site.dashboard.home.greet;
  const h = date.getHours();
  return h < 12 ? morning : h < 17 ? afternoon : evening;
}

/** Fills the API's "{questions}"-style placeholders from its counts. */
export function fill(text: string, site: SiteResponse, articles: ArticleSummary[]): string {
  const values: Record<string, number> = { ...site.counts, articles: articles.length, stars: site.counts.challenges * 3 };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

export function searchItems(site: SiteResponse, articles: ArticleSummary[]): SearchItem[] {
  const lessons: SearchItem[] = articles.map((a) => ({
    id: `a:${a.slug}`,
    group: "Lessons",
    title: a.title,
    detail: `${sectionTitle(site, a.section)} · ${a.dek}`,
    href: paths.article(a.section, a.slug),
    section: a.section,
  }));
  const problems: SearchItem[] = problemsOf(articles).map((a) => ({
    id: `p:${a.slug}`,
    group: "Problems",
    title: a.title,
    detail: `Problem · ${a.group}`,
    href: paths.problem(a.slug),
    section: "problems",
  }));
  const sections: SearchItem[] = SECTIONS.map((s) => ({ id: `s:${s.id}`, group: "Sections", title: sectionTitle(site, s.id), detail: s.blurb, href: paths.section(s.id), section: s.id }));
  const pages: SearchItem[] = [
    { id: "pg:home", group: "Pages", title: "Home", detail: "Your progress and what to read next", href: paths.home },
    { id: "pg:learn", group: "Pages", title: "Learn", detail: "Every section", href: paths.learn },
    { id: "pg:problems", group: "Pages", title: "Problems", detail: "Design problems with a judge", href: paths.problems },
    { id: "pg:me", group: "Pages", title: "You and settings", detail: "Theme, account", href: paths.me },
  ];
  return [...lessons, ...problems, ...sections, ...pages];
}

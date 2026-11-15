import { describe, expect, it } from "vitest";
import { articles, site } from "@/test/fixtures";
import { fill, greeting, nextInSection, problemOfTheDay, problemsOf, searchItems, sectionView, tally } from "./model";

describe("sectionView", () => {
  it("groups a section's articles by the API's groups, in order, dropping empty groups", () => {
    const v = sectionView(site, articles, "concepts");
    expect(v.title).toBe("Concepts");
    expect(v.groups.map((g) => [g.id, g.articles.map((a) => a.slug)])).toEqual([
      ["core", ["networking-essentials", "caching"]],
      ["patterns", ["real-time-updates"]],
    ]);
    expect(v.total).toBe(3);
  });
  it("puts articles of unknown groups under More", () => {
    const [first] = articles;
    if (!first) throw new Error("fixture");
    const extra = [...articles, { ...first, slug: "x", group: "new-group" }];
    expect(sectionView(site, extra, "concepts").groups.at(-1)).toMatchObject({ id: "more", title: "More" });
  });
  it("is empty for a section with no articles", () => {
    expect(sectionView(site, articles, "quick-notes")).toMatchObject({ total: 0, groups: [] });
  });
});

describe("progress-derived views", () => {
  const progress = { "networking-essentials": { read: 1, at: 1, done: true }, caching: { read: 0.4, at: 2, done: false } };
  it("tally counts done articles", () => {
    expect(tally(articles.filter((a) => a.section === "concepts"), progress)).toEqual({ done: 1, total: 3, pct: 33 });
  });
  it("next in section is the one in progress, else the first not done", () => {
    const v = sectionView(site, articles, "concepts");
    expect(nextInSection(v, progress)?.slug).toBe("caching");
    expect(nextInSection(v, {})?.slug).toBe("networking-essentials");
  });
  it("problem of the day is stable for a date and skips solved problems", () => {
    const problems = problemsOf(articles);
    const day = new Date(2026, 10, 15);
    expect(problemOfTheDay(problems, {}, day)).toBe(problemOfTheDay(problems, {}, day));
    const solved = { "url-shortener": { read: 1, at: 1, done: true } };
    expect(problemOfTheDay(problems, solved, day)?.slug).toBe("chat-app");
  });
});

describe("text helpers", () => {
  it("greets by time of day", () => {
    expect(greeting(site, new Date(2026, 0, 1, 9))).toBe("Good morning");
    expect(greeting(site, new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greeting(site, new Date(2026, 0, 1, 20))).toBe("Good evening");
  });
  it("fills placeholders from counts and leaves unknown ones", () => {
    expect(fill("{questions} problems, {stars} stars, {articles} notes, {nope}", site, articles)).toBe("22 problems, 24 stars, 6 notes, {nope}");
  });
  it("search items cover lessons, problems, sections and pages", () => {
    const groups = new Set(searchItems(site, articles).map((i) => i.group));
    expect([...groups]).toEqual(["Lessons", "Problems", "Sections", "Pages"]);
  });
});

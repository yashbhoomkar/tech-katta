import type { ArticleSummary, SiteResponse, ArticleResponse } from "@/lib/api/types";

// Small, realistic fixtures in the API's shape (trimmed copies of tech-api.katta.cc/v1 answers).

const article = (section: ArticleSummary["section"], slug: string, group: string, title: string, extra: Partial<ArticleSummary> = {}): ArticleSummary => ({
  section, slug, group, title, no: "CONCEPT // 01", tag: "FOUNDATIONS", access: "paid", date: "9 Nov 2026", dek: `About ${title}.`, ...extra,
});

export const articles: ArticleSummary[] = [
  article("concepts", "networking-essentials", "core", "Networking essentials"),
  article("concepts", "caching", "core", "Caching: when to add a cache"),
  article("concepts", "real-time-updates", "patterns", "Real-time updates"),
  article("components", "kafka", "tools", "Kafka"),
  article("interview-questions", "url-shortener", "easy", "Design a URL shortener", { tests: {} }),
  article("interview-questions", "chat-app", "medium", "Design a chat app", { tests: {} }),
];

export const site: SiteResponse = {
  brand: { name: "TECH KATTA", descriptor: "SYSTEMS KNOWLEDGE", footer: "", footerNote: "Written by one engineer." },
  hero: {
    title: "System design, explained.",
    description: "Design it on a canvas.",
    primary: "Start learning",
    secondary: "Try IND vs PAK",
    chip: "New",
    chipText: "8 challenges",
    judge: { title: "THE JUDGE", rows: [["Evening peak", "Passed"]], stars: 3, label: "Example run" },
  },
  topics: { eyebrow: "LIBRARY", title: "Library", cards: [{ id: "concepts", no: "SECTION // 01", kind: "PARADIGMS", title: "Concepts", desc: "The ideas.", link: "Explore" }] },
  numbers: { eyebrow: "NUMBERS", title: "Numbers", desc: "Rough.", items: [["Read from memory", "100 ns", 100, "Fast."]] },
  dashboard: {
    home: { greet: ["Good morning", "Good afternoon", "Good evening"], sub: "Pick up where you left off.", explore: "Explore" },
    sections: [["concepts", "Concepts", "concepts"], ["components", "Components", "components"], ["interview-questions", "Interview Questions", "problems"], ["quick-notes", "Quick Notes", null], ["real-systems", "Real systems", null]],
    groups: {
      concepts: [["core", "Core concepts", "The core."], ["patterns", "Recurring patterns", "Patterns."]],
      components: [["tools", "Tools by name", "Tools."]],
      "interview-questions": [["easy", "Easy", ""], ["medium", "Medium", ""]],
    },
  },
  counts: { questions: 22, concepts: 21, components: 10, challenges: 8 },
};

/** A lesson body with one block of every kind (figure ids are real: the figures are the current app's). */
export const lesson: ArticleResponse = {
  ...(articles[1] as ArticleSummary),
  example: { name: "Zotato", kind: "FOOD DELIVERY APP", text: "One made-up system.", parts: [["Apps", "Customer app"]] },
  body: [
    { t: "example" },
    { t: "h2", x: "Why cache" },
    { t: "p", x: "Reads hit `Redis` first." },
    { t: "list", items: ["one", "two"] },
    { t: "analogy", x: "Like a fridge." },
    { t: "h2", x: "Kinds of cache" },
    { t: "type", name: "Cache-aside", kind: "THE USUAL CHOICE", what: "App reads the cache.", use: "Most reads.", avoid: "Writes.", ex: "Menus.", more: ["It costs a miss."] },
    { t: "table", label: "Compare", head: ["Kind", "Speed"], rows: [["Memory", "fast"]] },
    { t: "code", label: "GET", x: "GET /menu", say: "a request" },
    { t: "more", label: "Eviction", body: [{ t: "p", x: "LRU drops the oldest." }] },
    { t: "lab", x: "Add a cache.", to: "problems/challenge/read-heavy", go: "Open the lab" },
  ],
};

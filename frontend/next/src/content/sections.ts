import type { SectionId } from "@/lib/api/types";

// What the app needs to know about each section beyond what the API sends: its colour role and URL.
// The order is the order of the sidebar and the Learn page. Titles and group names come from the API.

export type Accent = "concepts" | "components" | "interview" | "problems" | "real" | "notes";

export interface SectionMeta {
  id: SectionId;
  accent: Accent;
  /** shown until the API's title has loaded */
  label: string;
  /** one line for cards, used until the API sends one */
  blurb: string;
}

export const SECTIONS: readonly SectionMeta[] = [
  { id: "concepts", accent: "concepts", label: "Concepts", blurb: "Caching, sharding, queues: the ideas every design rests on." },
  { id: "components", accent: "components", label: "Components", blurb: "Redis, Kafka, Postgres: what each tool is good at, and where it breaks." },
  { id: "interview-questions", accent: "interview", label: "Interview Questions", blurb: "Real questions, answered from requirements to deep dives." },
  { id: "real-systems", accent: "real", label: "Real Systems", blurb: "Hard problems real teams solved in production, retold in plain words." },
  { id: "quick-notes", accent: "notes", label: "Quick Notes", blurb: "Short notes on one system each: how it works and where it breaks." },
];

export const sectionMeta = (id: string): SectionMeta | undefined => SECTIONS.find((s) => s.id === id);

export const isSectionId = (id: string | undefined): id is SectionId => !!id && SECTIONS.some((s) => s.id === id);

export const paths = {
  landing: "/",
  home: "/home",
  learn: "/learn",
  section: (id: string) => `/learn/${id}`,
  article: (section: string, slug: string) => `/learn/${section}/${slug}`,
  problems: "/problems",
  problem: (slug: string) => `/problems/${slug}`,
  me: "/me",
} as const;

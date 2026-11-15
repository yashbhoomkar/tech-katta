// Shapes of the public content API (tech-api.katta.cc/v1). Only the fields the app reads are typed;
// the API may send more. Kept in one place so a backend change shows up as a type error, not a blank page.

export type SectionId = "concepts" | "components" | "interview-questions" | "real-systems" | "quick-notes";

export interface ArticleSummary {
  section: SectionId;
  slug: string;
  group: string;
  /** e.g. "CONCEPT // 01" */
  no: string;
  tag: string;
  access: "free" | "paid";
  date: string;
  title: string;
  dek: string;
  /** present on articles that are design problems with a test suite */
  tests?: unknown;
  lab?: string;
  fig?: string;
}

export interface ArticlesResponse {
  articles: ArticleSummary[];
}

/** [id, title, description] */
export type GroupTuple = [string, string, string];
/** [id, label, kind] */
export type SectionTuple = [SectionId, string, string | null];

export interface SiteResponse {
  brand: { name: string; descriptor: string; footer: string; footerNote: string };
  hero: {
    title: string;
    description: string;
    primary: string;
    secondary: string;
    chip: string;
    chipText: string;
    judge: { title: string; rows: [string, string][]; stars: number; label: string };
  };
  topics: {
    eyebrow: string;
    title: string;
    cards: { id: string; no: string; kind: string; title: string; desc: string; link: string }[];
  };
  numbers: { eyebrow: string; title: string; desc: string; items: [string, string, number, string][] };
  dashboard: {
    home: { greet: [string, string, string]; sub: string; explore: string };
    sections: SectionTuple[];
    groups: Partial<Record<SectionId, GroupTuple[]>>;
  };
  counts: { questions: number; concepts: number; components: number; challenges: number };
}

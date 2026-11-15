// Search over lessons, problems and pages. Words are stemmed lightly so "cache" finds "Caching" and
// "queues" finds "Queue" (the prototype matched substrings only, which missed both). Every query word must
// match the start of some word in the title (strong) or the description (weak).

export interface SearchItem {
  id: string;
  group: "Recent" | "Lessons" | "Problems" | "Sections" | "Pages";
  title: string;
  detail: string;
  href: string;
  section?: string;
}

export interface SearchHit extends SearchItem {
  score: number;
}

const SUFFIXES = ["ings", "ing", "ies", "es", "ed", "s", "e"];

export function stem(word: string): string {
  const w = word.toLowerCase();
  for (const s of SUFFIXES) {
    if (w.length - s.length >= 3 && w.endsWith(s)) return s === "ies" ? `${w.slice(0, -3)}y` : w.slice(0, -s.length);
  }
  return w;
}

export function words(text: string): string[] {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}

interface Indexed {
  item: SearchItem;
  title: string[];
  detail: string[];
}

export function buildIndex(items: SearchItem[]): Indexed[] {
  return items.map((item) => ({ item, title: words(item.title).map(stem), detail: words(item.detail).map(stem) }));
}

export function search(index: Indexed[], query: string, limit = 14): SearchHit[] {
  const q = words(query).map(stem);
  if (q.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const { item, title, detail } of index) {
    let score = 0;
    let matched = true;
    for (const term of q) {
      if (title.some((w) => w === term)) score += 6;
      else if (title.some((w) => w.startsWith(term))) score += 4;
      else if (detail.some((w) => w.startsWith(term))) score += 1;
      else {
        matched = false;
        break;
      }
    }
    if (matched) hits.push({ ...item, score: score + (item.group === "Pages" || item.group === "Sections" ? 0.5 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

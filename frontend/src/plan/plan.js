// Coming back (context 36, step 10): a study plan, a problem of the day, bookmarks and a private note per problem.
// Kept in this browser (tk-marks-v1); the plan's order is the one the Questions guide recommends.

export const PLAN = [
  { name: 'Week 1: the method', why: 'One main problem each.', slugs: ['url-shortener', 'file-sync', 'restaurants-near-me', 'grocery-delivery'] },
  { name: 'Week 2: contention, reads, real time', why: 'The patterns most questions lean on.', slugs: ['ticket-booking', 'news-feed', 'chat-app'] },
  { name: 'Week 3: many steps, long jobs, heavy writes', why: 'Money, schedules and counting.', slugs: ['payments', 'job-scheduler', 'ad-clicks'] },
];

// The rest, in the site's order, as the plan's last part.
export function planOf(qs) {
  const named = new Set(PLAN.flatMap((w) => w.slugs)), have = new Set(qs.map((q) => q.slug));
  return [...PLAN.map((w) => ({ ...w, slugs: w.slugs.filter((s) => have.has(s)) })), { name: 'Then the rest, in any order', why: 'Redo your weakest a week later.', slugs: qs.map((q) => q.slug).filter((s) => !named.has(s)) }].filter((w) => w.slugs.length);
}

// The problem of the day: the same for everyone on a date, chosen among the problems this visitor hasn't solved
// (all of them once everything is solved).
export function dailyOf(qs, solved, date = new Date()) {
  if (!qs.length) return null;
  const left = qs.filter((q) => !solved(q.slug)), from = left.length ? left : qs;
  const d = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  let h = 2166136261; for (const c of d) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return from[h % from.length];
}

const KEY = 'tk-marks-v1';
export function readMarks() { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return { bookmarks: v && typeof v.bookmarks === 'object' && v.bookmarks ? v.bookmarks : {}, notes: v && typeof v.notes === 'object' && v.notes ? v.notes : {} }; } catch { return { bookmarks: {}, notes: {} }; } }
function writeMarks(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); dispatchEvent(new Event('tk-marks')); } catch {} }
export function toggleBookmark(slug) { const m = readMarks(); if (m.bookmarks[slug]) delete m.bookmarks[slug]; else m.bookmarks[slug] = Date.now(); writeMarks(m); return !!m.bookmarks[slug]; }
export function setProblemNote(slug, text) { const m = readMarks(), t = String(text || '').slice(0, 2000); if (t.trim()) m.notes[slug] = t; else delete m.notes[slug]; writeMarks(m); }

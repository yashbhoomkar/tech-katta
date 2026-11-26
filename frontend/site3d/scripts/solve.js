// What the canvas has recorded in this browser (frontend/src/progress.js and practice.js), read by the Solve list
// (pages/problems.js) and the sidebar (shell.js): solved and started marks in tk-progress-v1 ("solved:<slug>", "practice:<slug>",
// a challenge's stars), submissions in tk-subs-v1 (the best score, ignoring copied solutions). Nothing here writes to them.
import { apiFetch } from './articles.js';

import { readJson, record } from './solving.js'; // the record itself is solving.js's (shared with Home and the article pages)
export { readJson, record };
/** the canvas problems of the article list (the interview questions that are not the "Start here" guides) */
export const problemsOf = (list) => list.filter((a) => a.section === 'interview-questions' && a.group !== 'start');
let labCache = null;
export const labNow = () => labCache;
/** the challenges (GET /v1/lab), fetched once; null while offline */
export async function lab() {
  if (labCache) return labCache;
  try { const r = await apiFetch('/v1/lab', { headers: { accept: 'application/json' } }); if (r.ok) labCache = await r.json(); } catch { /* offline: no challenges */ }
  return labCache;
}
/** stars earned in the challenges, read and total (null until the list has loaded) */
export function challengeTally() {
  const cs = labCache?.challenges; if (!cs) return null;
  const stars = readJson('tk-progress-v1').stars || {};
  return { done: cs.filter((c) => (c.stars || []).length && (stars[c.id] ?? 0) >= c.stars.length).length, total: cs.length };
}

// What the canvas has recorded in this browser (frontend/src/progress.js and practice.js), read by the Solve list
// (pages/problems.js) and the sidebar (shell.js): solved and started marks in tk-progress-v1 ("solved:<slug>", "practice:<slug>",
// a challenge's stars), submissions in tk-subs-v1 (the best score, ignoring copied solutions). Nothing here writes to them.
import { apiFetch } from './articles.js';

export const readJson = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
/** the canvas problems of the article list (the interview questions that are not the "Start here" guides) */
export const problemsOf = (list) => list.filter((a) => a.section === 'interview-questions' && a.group !== 'start');
/** the canvas's record for one problem: solved, started, best score */
export function record(slug, prog, subs) {
  const list = Array.isArray(subs[slug]) ? subs[slug].filter((x) => x && typeof x.score === 'number') : [];
  const own = list.filter((x) => !x.copied);
  const steps = prog.steps && typeof prog.steps === 'object' ? prog.steps : {};
  return { solved: steps[`solved:${slug}`] === true, started: steps[`practice:${slug}`] === true || list.length > 0, best: own.length ? Math.max(...own.map((x) => x.score)) : null };
}
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

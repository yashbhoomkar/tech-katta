// Progress kept in this browser (localStorage "tk-progress-v1"): flags such as "this tour was
// seen" (steps) and the best stars per Lab challenge with the goals that run met. What is read
// back is checked first (like lab/store.js), and every change is announced with a "tk-progress"
// event so open pages can update.
export const PROGRESS_KEY = "tk-progress-v1";
const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const dict = () => Object.create(null);
export function cleanProgress(raw) {
  let s; try { s = JSON.parse(raw) } catch { s = null }
  const out = { version: 1, steps: dict(), stars: dict(), goals: dict() };
  if (!obj(s)) return out;
  if (obj(s.steps)) for (const [k, v] of Object.entries(s.steps)) if (v === true && k.length < 120) out.steps[k] = true;
  if (obj(s.goals)) for (const [k, v] of Object.entries(s.goals)) if (Array.isArray(v) && v.length <= 3 && v.every((x) => typeof x === "boolean") && k.length < 120) out.goals[k] = v;
  if (obj(s.stars)) for (const [k, v] of Object.entries(s.stars)) if (Number.isInteger(v) && v >= 0 && v <= 3 && k.length < 120) out.stars[k] = v;
  return out;
}
export function readProgress() { let raw = null; try { raw = localStorage.getItem(PROGRESS_KEY) } catch {} return cleanProgress(raw) }
function save(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, steps: { ...p.steps }, stars: { ...p.stars }, goals: { ...p.goals } })) } catch {}
  try { dispatchEvent(new Event("tk-progress")) } catch {}
  return p;
}
export const markStep = (id) => { const p = readProgress(); if (p.steps[id]) return p; p.steps[id] = true; return save(p) };
// Keeps the best result: a worse run never takes stars away.
// `goals` (which goals that run met) is kept with the best result, so the panel ticks the right ones.
export const recordStars = (id, n, goals) => { const p = readProgress(); if ((p.stars[id] ?? -1) > n || ((p.stars[id] ?? -1) === n && p.goals[id])) return p; p.stars[id] = n; if (goals) p.goals[id] = goals; return save(p) };

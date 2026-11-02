// The learner's progress, kept in this browser (localStorage "tk-progress-v1"): the level they
// picked, the learning-path steps they have done and the best stars per Lab challenge. What is read
// back is checked first (like lab/store.js), and every change is announced with a "tk-progress"
// event so open pages can update.
export const PROGRESS_KEY = "tk-progress-v1";
const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const dict = () => Object.create(null);
export function cleanProgress(raw) {
  let s; try { s = JSON.parse(raw) } catch { s = null }
  const out = { version: 1, level: null, steps: dict(), stars: dict() };
  if (!obj(s)) return out;
  if (typeof s.level === "string" && s.level.length < 40) out.level = s.level;
  if (obj(s.steps)) for (const [k, v] of Object.entries(s.steps)) if (v === true && k.length < 120) out.steps[k] = true;
  if (obj(s.stars)) for (const [k, v] of Object.entries(s.stars)) if (Number.isInteger(v) && v >= 0 && v <= 3 && k.length < 120) out.stars[k] = v;
  return out;
}
export function readProgress() { let raw = null; try { raw = localStorage.getItem(PROGRESS_KEY) } catch {} return cleanProgress(raw) }
function save(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 1, level: p.level, steps: { ...p.steps }, stars: { ...p.stars } })) } catch {}
  try { dispatchEvent(new Event("tk-progress")) } catch {}
  return p;
}
export const markStep = (id) => { const p = readProgress(); if (p.steps[id]) return p; p.steps[id] = true; return save(p) };
export const setLevel = (level) => { const p = readProgress(); p.level = level; return save(p) };
// Keeps the best result: a worse run never takes stars away.
export const recordStars = (id, n) => { const p = readProgress(); if ((p.stars[id] ?? -1) >= n) return p; p.stars[id] = n; return save(p) };

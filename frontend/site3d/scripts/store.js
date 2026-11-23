// Progress on this device only (localStorage; works without it, just forgets).
const KEY = 'tk-r3d-progress';
let mem = { read: {}, best: {} };
try { mem = { ...mem, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
// The retired React app kept finished articles under tk-progress-v1, one record per slug ({ read, at, done }). Articles finished there still
// count here (syncFrom, once the article list is known); nothing writes that shape any more (the canvas's own record under the same key has another shape).
const REACT_KEY = 'tk-progress-v1';
const isRec = (v) => !!v && typeof v === 'object' && typeof v.read === 'number' && typeof v.at === 'number' && typeof v.done === 'boolean';
function reactProgress() {
  try { const v = JSON.parse(localStorage.getItem(REACT_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(isRec) ? v : null; } catch { return null; }
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* storage blocked */ } dispatchEvent(new Event('tk-progress')); };
export const store = {
  get: () => mem,
  markRead(id) { if (!mem.read[id] || mem.read[id] === true) { mem.read[id] = Date.now(); save(); }  },
  /** count articles finished in the React app as read here; `list` is the article list ({ section, slug }) */
  syncFrom(list) {
    const r = reactProgress(); if (!r) return; let changed = false;
    for (const a of list) { const p = r[a.slug], id = `${a.section}/${a.slug}`; if (p?.done && !mem.read[id]) { mem.read[id] = p.at || Date.now(); changed = true; } }
    if (changed) save();
  },
  /** ids read, newest first */
  recent: () => Object.entries(mem.read).filter(([, v]) => v).sort((a, b) => (+b[1] || 0) - (+a[1] || 0)).map(([id]) => id),
  saveRun(id, result, design) {
    const old = mem.best[id];
    if (!old || result.score > old.score || (result.passed && !old.passed)) mem.best[id] = { score: result.score, passed: result.passed, design, at: Date.now() };
    save();
  },
  reset() { mem = { read: {}, best: {} }; save(); },
};

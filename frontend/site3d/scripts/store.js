// Progress on this device only (localStorage; works without it, just forgets).
const KEY = 'tk-r3d-progress';
let mem = { read: {}, best: {} };
try { mem = { ...mem, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* storage blocked */ } dispatchEvent(new Event('tk-progress')); };
export const store = {
  get: () => mem,
  markRead(id) { if (!mem.read[id] || mem.read[id] === true) { mem.read[id] = Date.now(); save(); } },
  /** ids read, newest first */
  recent: () => Object.entries(mem.read).filter(([, v]) => v).sort((a, b) => (+b[1] || 0) - (+a[1] || 0)).map(([id]) => id),
  saveRun(id, result, design) {
    const old = mem.best[id];
    if (!old || result.score > old.score || (result.passed && !old.passed)) mem.best[id] = { score: result.score, passed: result.passed, design, at: Date.now() };
    save();
  },
  reset() { mem = { read: {}, best: {} }; save(); },
};

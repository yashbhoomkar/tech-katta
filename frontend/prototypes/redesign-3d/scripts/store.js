// Progress on this device only (localStorage; works without it, just forgets).
const KEY = 'tk-r3d-progress';
let mem = { read: {}, best: {} };
try { mem = { ...mem, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* storage blocked */ } };
export const store = {
  get: () => mem,
  markRead(id) { mem.read[id] = true; save(); },
  saveRun(id, result, design) {
    const old = mem.best[id];
    if (!old || result.score > old.score || (result.passed && !old.passed)) mem.best[id] = { score: result.score, passed: result.passed, design, at: Date.now() };
    save();
  },
  reset() { mem = { read: {}, best: {} }; save(); },
};

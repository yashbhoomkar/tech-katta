// Per-viewer settings (theme, collapsed sidebar). Storage can be blocked (private mode): never throw.
const P = "tk-proto-";
export const get = (k, d = null) => { try { const v = localStorage.getItem(P + k); return v === null ? d : v; } catch { return d; } };
export const set = (k, v) => { try { localStorage.setItem(P + k, v); } catch { /* ignore */ } };

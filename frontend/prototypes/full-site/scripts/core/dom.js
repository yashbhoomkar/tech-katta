// Small DOM helpers. Pages build HTML with template strings and escape every value with esc().
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// on(root, "click", "[data-x]", (e, el) => …): one listener for every matching child, now and later
export const on = (root, type, sel, fn, opts) => {
  const h = (e) => { const el = e.target.closest?.(sel); if (el && root.contains(el)) fn(e, el); };
  root.addEventListener(type, h, opts);
  return () => root.removeEventListener(type, h, opts);
};

export const isTyping = () => /^(input|textarea|select)$/i.test(document.activeElement?.tagName || "") || document.activeElement?.isContentEditable;

// collects clean-up functions for a mounted page, so leaving a route removes its listeners and timers
export const scope = () => {
  const fns = [];
  return {
    add: (f) => { fns.push(f); return f; },
    listen: (t, type, fn, o) => { t.addEventListener(type, fn, o); fns.push(() => t.removeEventListener(type, fn, o)); },
    timer: (id) => { fns.push(() => { clearTimeout(id); clearInterval(id); }); return id; },
    dispose: () => { while (fns.length) { try { fns.pop()(); } catch { /* ignore */ } } },
  };
};

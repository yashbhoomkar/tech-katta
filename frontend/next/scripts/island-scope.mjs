// A PostCSS plugin for the islands build (vite.islands.config.ts): the React app's base CSS (tokens.css, global.css, the
// look's theme.css) is written for a page of its own: it sets tokens on :root and rules on html, body and *. An island
// sits inside a 3D page, so none of that may reach the page around it. Here those files are rewritten to apply only
// under .tk-island, and every other file's `:root[data-style="3d"]` (the look's blocks in the CSS modules) becomes
// .tk-island too. The theme stays shared: data-theme on <html> is read by both apps.
const BASE = /[\\/]src[\\/]styles[\\/](?:tokens\.css|global\.css|looks[\\/]3d[\\/](?:theme|motion)\.css)$/;
const ISLAND = ".tk-island";

/** `:root[data-style="3d"][data-theme="dark"] X` → `:root[data-theme="dark"] .tk-island X`; `:root[data-style="3d"] X` → `.tk-island X` */
export function lookSelector(sel) {
  return sel
    .replace(/:root\[data-style="3d"\]\[data-theme="(dark|light)"\]/g, `:root[data-theme="$1"] ${ISLAND}`)
    .replace(/:root\[data-style="3d"\]/g, ISLAND);
}
/** a selector of a base file, scoped */
export function scopeSelector(sel) {
  sel = sel.trim();
  if (sel.includes(ISLAND)) return sel;
  if (/^:root\[data-theme="(dark|light)"\]/.test(sel)) return sel.replace(/^(:root\[data-theme="(?:dark|light)"\])\s*/, `$1 ${ISLAND} `).trim();
  if (/^(?:html|body|:root)$/.test(sel)) return ISLAND;
  if (/^(?:html|body|:root)\b/.test(sel)) return sel.replace(/^(?:html|body|:root)/, ISLAND);
  return `${ISLAND} ${sel}`;
}

export function islandScope() {
  return {
    postcssPlugin: "tk-island-scope",
    Rule(rule) {
      if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
      const file = rule.source?.input?.file ?? "";
      if (BASE.test(file)) {
        // view-transition rules style the whole document: not an island's business
        if (/::view-transition/.test(rule.selector)) { rule.remove(); return; }
        rule.selectors = rule.selectors.map((s) => scopeSelector(lookSelector(s)));
      } else if (rule.selector.includes("data-style=\"3d\"")) {
        rule.selector = lookSelector(rule.selector);
      }
    },
  };
}
islandScope.postcss = true;

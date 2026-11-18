// The looks the new frontend can be built in (VITE_STYLE). "" is the default look. Each look names the colour of
// its page, which becomes the browser's theme colour before the app starts.
export const LOOKS = { "": null, "neo-brutalism": "#F8F2E5" };

/** Throws on an unknown look, so a typo cannot ship the default look by mistake. */
export function checkLook(style) {
  if (!(style in LOOKS)) throw new Error(`VITE_STYLE: unknown look "${style}" (known: ${Object.keys(LOOKS).filter(Boolean).join(", ")})`);
  return style;
}

/** index.html in a look: data-style on <html> (set before first paint) and the look's theme colour. */
export function lookHtml(html, style) {
  if (!style) return html;
  return html
    .replace('<html lang="en">', `<html lang="en" data-style="${style}">`)
    .replace(/(<meta name="theme-color" content=")[^"]*/, `$1${LOOKS[style]}`);
}

/** A PostCSS plugin for vite.config.ts: drops the selectors written for another look (`[data-style="<other>"]`), so a
 *  build carries only its own look's rules. A rule left with no selector goes; an at-rule left empty goes too. */
export function onlyLook(style) {
  const other = Object.keys(LOOKS).filter((l) => l && l !== style);
  const foreign = (sel) => other.some((l) => sel.includes(`data-style="${l}"`));
  return {
    postcssPlugin: "tk-only-look",
    Rule(rule) {
      if (!other.length || !rule.selector.includes("data-style")) return;
      const keep = rule.selectors.filter((s) => !foreign(s));
      if (keep.length === rule.selectors.length) return;
      const parent = rule.parent;
      if (keep.length) rule.selectors = keep;
      else rule.remove();
      while (parent && parent.type === "atrule" && !parent.nodes?.length) {
        const up = parent.parent;
        parent.remove();
        if (!up || up.type !== "atrule") break;
      }
    },
  };
}

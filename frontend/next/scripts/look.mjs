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

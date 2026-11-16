// The new frontend's copies on prototype.katta.cc: /p/<name>/ → the look it is built in (VITE_STYLE; "" = default).
export const COPIES = { next: "", "neo-brutalism": "neo-brutalism" };

/** Why next/dist cannot be copied to /p/<name>/, or null when it can: it must be built for that address
 *  (BASE_PATH=/p/<name>/) and in that copy's look. */
export function copyProblem(html, name) {
  if (!(name in COPIES)) return `unknown copy "${name}" (known: ${Object.keys(COPIES).join(", ")})`;
  if (!html.includes(`/p/${name}/assets/`)) return `next/dist was not built with BASE_PATH=/p/${name}/`;
  const look = COPIES[name];
  if (look ? !html.includes(`data-style="${look}"`) : html.includes("data-style=")) return `next/dist was built with the wrong VITE_STYLE for /p/${name}/`;
  return null;
}

/** Route pages to add beside each copy's folders: Cloudflare (html_handling auto-trailing-slash) serves
 *  `learn/caching.html` at /learn/caching with no redirect, while `learn/caching/index.html` alone answers /learn/caching
 *  with a redirect to /learn/caching/ (Lighthouse: about 0.8 s on a phone). Given the folder paths that hold an
 *  index.html (relative, "" for the copy's root), returns [from, to] pairs; the root keeps its own index.html. */
export function siblingPages(dirs) {
  return dirs.filter((d) => d !== "").map((d) => [`${d}/index.html`, `${d}.html`]);
}

/** prototype.katta.cc only: Cloudflare injects its Web Analytics beacon into every page of this zone, and the site's
 *  CSP blocked it, so every page logged an error. Allow that one script and its endpoint here; tech.katta.cc (Vercel)
 *  has no such injection and keeps its CSP unchanged. */
export function allowCloudflareBeacon(headers) {
  return headers
    .replace(/script-src ([^;]*)/g, (m, v) => (v.includes("static.cloudflareinsights.com") ? m : `script-src ${v} https://static.cloudflareinsights.com`))
    .replace(/connect-src ([^;]*)/g, (m, v) => (v.includes("cloudflareinsights.com") ? m : `connect-src ${v} https://cloudflareinsights.com`));
}

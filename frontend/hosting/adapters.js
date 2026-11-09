// Turns hosting/routes.json (the site's routing and headers, written once) into each host's own files.
// One function per host. Adding a host means adding a function here and a target in emit.mjs (HOSTING.md).
// A '*' may only end a path ("/dashboard/*"), and ':splat' in a target puts the matched part back.

const star = (p) => {
  if (typeof p !== "string" || !p.startsWith("/")) throw new Error(`hosting: a path must start with "/": ${p}`);
  if (p.includes("*") && !p.endsWith("/*")) throw new Error(`hosting: '*' may only end a path, after "/": ${p}`);
  return p.endsWith("/*");
};
const check = (routes) => {
  for (const r of routes.rewrites) { star(r.from); if (r.to.includes("*")) throw new Error(`hosting: a rewrite target has no '*': ${r.to}`); }
  for (const r of routes.redirects) star(r.from);
  for (const h of routes.headers) star(h.path);
  return routes;
};

// Vercel: frontend/vercel.json. Vercel serves a file when one exists and only then applies rewrites, which
// is what routes.json means by a rewrite. Permanent redirects are 308, others 307 (Vercel's own codes).
export function vercelConfig(routes) {
  check(routes);
  const path = (p) => (star(p) ? p.slice(0, -1) + "(.*)" : p);
  const to = (t) => t.replace(":splat", "$1");
  return {
    rewrites: routes.rewrites.map((r) => ({ source: path(r.from), destination: to(r.to) })),
    headers: routes.headers.map((h) => ({ source: path(h.path), headers: Object.entries(h.headers).map(([key, value]) => ({ key, value })) })),
    redirects: routes.redirects.map((r) => ({ source: path(r.from), ...(r.host ? { has: [{ type: "host", value: r.host }] } : {}), destination: to(r.to), permanent: !!r.permanent })),
  };
}
export const vercelJson = (routes) => JSON.stringify(vercelConfig(routes), null, 2) + "\n";

// Cloudflare (Workers static assets, or Pages): _redirects and _headers in the build folder, plus 404 pages.
// Three differences from Vercel, all handled here (checked against Cloudflare's runtime with wrangler dev):
//   - Cloudflare already serves an address from its own page ("/health" from health.html; "/dashboard" goes to
//     "/dashboard/"), and a "/health → /health.html" rule would loop with that, so such rewrites get no rule.
//     Any other exact rewrite is refused, so a new one gets a deliberate decision rather than a silent loop.
//   - Cloudflare applies _redirects rules even when a file exists, so a "/dashboard/* → index.html" rule would
//     hide the article pages the build writes. A folder-wide rewrite instead becomes that folder's 404.html (a
//     copy of the target page): Cloudflare serves the nearest 404.html for a path with no file, so the article
//     pages keep their own titles, and unknown addresses still open the app (with status 404).
//   - _redirects can't match on the domain, so a rule with 'host' is returned in `manual` for the dashboard
//     (a Cloudflare Redirect Rule) instead of being written.
// Returns { redirects, headers, copies: [[from, to]], manual: [text] }.
export function cloudflareFiles(routes) {
  check(routes);
  const redirects = [], copies = [], manual = [];
  for (const r of routes.redirects) {
    const code = r.permanent ? 308 : 307;
    if (r.host) manual.push(`Redirect https://${r.host}${r.from} to ${r.to} (${code}): add a Cloudflare Redirect Rule for that domain.`);
    else redirects.push(`${r.from} ${r.to} ${code}`);
  }
  for (const r of routes.rewrites) {
    if (star(r.from)) {
      const dir = r.from.slice(0, -1);
      if (r.to !== dir + "index.html") throw new Error(`hosting: Cloudflare can only fall back to the folder's own index.html: ${r.from} → ${r.to}`);
      copies.push([r.to.slice(1), dir.slice(1) + "404.html"]);
    } else if (![r.from.replace(/\/$/, "") + ".html", r.from.replace(/\/?$/, "/") + "index.html"].includes(r.to)) {
      throw new Error(`hosting: Cloudflare serves an address from its own page only: ${r.from} → ${r.to}`);
    }
  }
  // Cloudflare asks for exact rules before ones with '*'
  redirects.sort((a, b) => a.includes("*") - b.includes("*"));
  const headers = routes.headers.flatMap((h) => [h.path, ...Object.entries(h.headers).map(([k, v]) => `  ${k}: ${v}`)]);
  return { redirects: redirects.join("\n") + "\n", headers: headers.join("\n") + "\n", copies, manual };
}

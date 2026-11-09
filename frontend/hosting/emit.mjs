// Writes a host's configuration from hosting/routes.json (HOSTING.md at the repository root).
//   node hosting/emit.mjs vercel               rewrite frontend/vercel.json (commit it; a test checks it matches)
//   node hosting/emit.mjs cloudflare [dist]    add _redirects, _headers and 404 pages to a finished build
// Run from frontend/. Vercel reads vercel.json from the repository before building, so that file is committed;
// the Cloudflare files are written into the build folder by `npm run build:cloudflare`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vercelJson, cloudflareFiles } from "./adapters.js";

const here = path.dirname(fileURLToPath(import.meta.url)), frontend = path.dirname(here);
const routes = JSON.parse(fs.readFileSync(path.join(here, "routes.json"), "utf8"));
const [target, out = "dist"] = process.argv.slice(2);

// The site-wide "not found" page for a host that serves 404.html (only written when the build has none).
const NOT_FOUND = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Tech Katta</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;color:#1c2733;background:#fff}main{max-width:420px;padding:24px;text-align:center}a{color:#2855d9}</style></head>
<body><main><h1>Page not found</h1><p>This page doesn't exist, or it has moved.</p><p><a href="/">Go to Tech Katta</a> · <a href="/dashboard/">Open the dashboard</a></p></main></body></html>
`;

if (target === "vercel") {
  fs.writeFileSync(path.join(frontend, "vercel.json"), vercelJson(routes));
  console.log("hosting: wrote vercel.json");
} else if (target === "cloudflare") {
  const dist = path.resolve(frontend, out);
  if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error(`hosting: ${dist} is not a finished build (run vite build first)`);
  const files = cloudflareFiles(routes);
  fs.writeFileSync(path.join(dist, "_redirects"), files.redirects);
  fs.writeFileSync(path.join(dist, "_headers"), files.headers);
  for (const [from, to] of files.copies) fs.copyFileSync(path.join(dist, from), path.join(dist, to));
  if (!fs.existsSync(path.join(dist, "404.html"))) fs.writeFileSync(path.join(dist, "404.html"), NOT_FOUND);
  console.log(`hosting: wrote _redirects, _headers, 404.html and ${files.copies.map(([, to]) => to).join(", ")} into ${path.relative(frontend, dist) || "."}`);
  for (const step of files.manual) console.log(`hosting: set up by hand: ${step}`);
} else {
  console.error("usage: node hosting/emit.mjs vercel | cloudflare [dist]");
  process.exit(2);
}

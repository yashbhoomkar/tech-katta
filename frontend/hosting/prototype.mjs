// prototype.katta.cc: the frontend of the prototype branch plus design prototypes (owner, 2026-11-15).
// Run after `vite build` (npm run build:prototype[:cloudflare]). The app reads live content from
// tech-api.katta.cc (owner, 2026-11-15: "use the actual tech-api.katta.cc from now on"); the API accepts
// sign-in only from tech.katta.cc, so here every page opens signed out. This script adds:
//   dist/p/<name>/   each prototype in frontend/prototypes/ (a .html file or a folder with index.html),
//                    plus dist/p/index.html listing them by type
//   dist/robots.txt  keep the prototype out of search engines
// How to add a prototype: tech-katta-context/ui-prototypes/README.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), frontend = path.dirname(here);
const dist = path.join(frontend, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("prototype: run vite build first");

// standalone HTML prototypes
const protoDir = path.join(frontend, "prototypes"), out = path.join(dist, "p");
// a prototype is either one file (prototypes/<name>.html) or a folder with an index.html (prototypes/<name>/),
// which is copied as it is: a small structured frontend (styles/, scripts/ with ES modules) served at /p/<name>/
const isDir = (f) => fs.statSync(path.join(protoDir, f)).isDirectory();
const pages = fs.existsSync(protoDir) ? fs.readdirSync(protoDir).filter((f) => f.endsWith(".html") || (isDir(f) && fs.existsSync(path.join(protoDir, f, "index.html")))).sort() : [];
const srcOf = (f) => (isDir(f) ? path.join(protoDir, f, "index.html") : path.join(protoDir, f));
fs.mkdirSync(out, { recursive: true });
// The site's Content-Security-Policy (routes.json) allows only script files from this site, not script written in
// the page, so each prototype's inline <script> is moved into its own file next to it (p/<name>/page-N.js).
for (const f of pages) {
  const d = path.join(out, f.replace(/\.html$/, ""));
  if (isDir(f)) { fs.cpSync(path.join(protoDir, f), d, { recursive: true, filter: (src) => !/README\.md$/.test(src) }); continue; }
  fs.mkdirSync(d, { recursive: true });
  let k = 0;
  const html = fs.readFileSync(path.join(protoDir, f), "utf8").replace(/<script>([\s\S]*?)<\/script>/g, (_, js) => { const name = `page-${++k}.js`; fs.writeFileSync(path.join(d, name), js); return `<script src="${name}"></script>`; });
  fs.writeFileSync(path.join(d, "index.html"), html);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// each prototype names itself: <title>, <meta name="prototype:type"> and <meta name="prototype:summary">
const meta = (html, name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1] || "";
const items = pages.map((f) => { const h = fs.readFileSync(srcOf(f), "utf8");
  return { slug: f.replace(/\.html$/, ""), title: (h.match(/<title>([^<]*)<\/title>/) || [])[1] || f, type: meta(h, "prototype:type") || "Other", summary: meta(h, "prototype:summary") }; });
const types = [...new Set(items.map((i) => i.type))];
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Prototypes · Tech Katta</title>
<style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#F6F5F1;color:#17161A}main{max-width:760px;margin:0 auto;padding:48px 20px}h1{letter-spacing:-.02em}h2{margin-top:32px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6B6963}a.card{display:block;background:#fff;border:1px solid #E4E2DC;border-radius:16px;padding:16px 18px;margin:10px 0;color:inherit;text-decoration:none}a.card:hover{border-color:#17161A}a.card b{font-size:18px}a.card span{display:block;color:#4A4844;font-size:14.5px;margin-top:4px}code{background:#EEEDE8;border-radius:4px;padding:1px 5px}</style></head>
<body><main><h1>Prototypes</h1><p>The app itself, built from the <code>prototype</code> branch, reading live content from tech-api.katta.cc, signed out: <a href="/">landing</a> · <a href="/dashboard/">dashboard</a>. The new frontend (the production beta's code): <a href="/p/next/">/p/next/</a>. Below, design ideas before they are built into the app.</p>
${types.map((t) => `<h2>${esc(t)}</h2>` + items.filter((i) => i.type === t).map((i) => `<a class="card" href="/p/${esc(i.slug)}/"><b>${esc(i.title)}</b><span>${esc(i.summary)}</span></a>`).join("")).join("") || "<p>None yet.</p>"}
</main></body></html>`);
fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
// The new frontend is copied to dist/p/next by prototype-next.mjs (run before this script).
// Cloudflare: old prototype addresses keep working
if (process.argv.includes("--cloudflare")) {
  const r = path.join(dist, "_redirects"), old = fs.existsSync(r) ? fs.readFileSync(r, "utf8") : "";
  fs.writeFileSync(r, "/next /p/next/ 301\n/next/* /p/next/:splat 301\n/p/revamp-2026-11-15/ /p/full-site/ 301\n/p/revamp-2026-11-15 /p/full-site/ 301\n/p/dark-modes/ /p/full-site/ 301\n/p/dark-modes /p/full-site/ 301\n/p/nb-dark/ /p/neo-brutalism/ 301\n/p/nb-dark /p/neo-brutalism/ 301\n" + old);
}
console.log(`prototype: ${pages.length} design prototype(s) written into dist`);

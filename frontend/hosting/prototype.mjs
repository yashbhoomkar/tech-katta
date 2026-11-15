// prototype.katta.cc: the frontend with no backend (owner, 2026-11-15: "Can we have prototype.katta.cc. Only the frontend").
// Run after `vite build` with VITE_API_BASE=/proto-api (npm run build:prototype). It writes into the finished build:
//   dist/proto-api/v1/...json   every content answer the API would give (site, lab, article list, each article and
//                               its solution), built by the backend's own loader from ../content, so the pages read
//                               the same JSON; a rewrite in routes.json serves /proto-api/<path> from <path>.json
//   auth/config.json            sign-in off, so every page opens without an account
//   problems/stats.json         no acceptance numbers yet
//   dist/p/<name>/index.html    each standalone HTML prototype in frontend/prototypes/ (design ideas before they
//                               are built into the app), plus dist/p/index.html listing them
//   dist/robots.txt             keep the prototype out of search engines
// Production never runs this; there /proto-api has no files and tech-api.katta.cc answers as before.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, buildBodies } from "../../backend/src/content/store.js";

const here = path.dirname(fileURLToPath(import.meta.url)), frontend = path.dirname(here);
const dist = path.join(frontend, "dist"), api = path.join(dist, "proto-api", "v1");
if (!fs.existsSync(path.join(dist, "index.html"))) throw new Error("prototype: run vite build first");
const written = [];
const write = (rel, data) => { written.push(rel); const f = path.join(api, rel + ".json"); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data)); };

const content = await loadContent(path.join(frontend, "..", "content"));
const bodies = buildBodies(content);
write("site", bodies.site);
write("lab", bodies.lab);
write("articles", bodies.list(""));
let n = 0;
for (const a of content.articles) {
  write(`articles/${a.slug}`, bodies.article(a.slug)); n++;
  const s = bodies.solution(a.slug); if (s) write(`articles/${a.slug}/solution`, s);
}
write("auth/config", { enabled: false });
write("problems/stats", { problems: {} });

// standalone HTML prototypes
const protoDir = path.join(frontend, "prototypes"), out = path.join(dist, "p");
const pages = fs.existsSync(protoDir) ? fs.readdirSync(protoDir).filter((f) => f.endsWith(".html")).sort() : [];
fs.mkdirSync(out, { recursive: true });
// The site's Content-Security-Policy (routes.json) allows only script files from this site, not script written in
// the page, so each prototype's inline <script> is moved into its own file next to it (p/<name>/page-N.js).
for (const f of pages) {
  const d = path.join(out, f.replace(/\.html$/, "")); fs.mkdirSync(d, { recursive: true });
  let k = 0;
  const html = fs.readFileSync(path.join(protoDir, f), "utf8").replace(/<script>([\s\S]*?)<\/script>/g, (_, js) => { const name = `page-${++k}.js`; fs.writeFileSync(path.join(d, name), js); return `<script src="${name}"></script>`; });
  fs.writeFileSync(path.join(d, "index.html"), html);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// each prototype names itself: <title>, <meta name="prototype:type"> and <meta name="prototype:summary">
const meta = (html, name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`)) || [])[1] || "";
const items = pages.map((f) => { const h = fs.readFileSync(path.join(protoDir, f), "utf8");
  return { slug: f.replace(/\.html$/, ""), title: (h.match(/<title>([^<]*)<\/title>/) || [])[1] || f, type: meta(h, "prototype:type") || "Other", summary: meta(h, "prototype:summary") }; });
const types = [...new Set(items.map((i) => i.type))];
fs.writeFileSync(path.join(out, "index.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Prototypes · Tech Katta</title>
<style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#F6F5F1;color:#17161A}main{max-width:760px;margin:0 auto;padding:48px 20px}h1{letter-spacing:-.02em}h2{margin-top:32px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6B6963}a.card{display:block;background:#fff;border:1px solid #E4E2DC;border-radius:16px;padding:16px 18px;margin:10px 0;color:inherit;text-decoration:none}a.card:hover{border-color:#17161A}a.card b{font-size:18px}a.card span{display:block;color:#4A4844;font-size:14.5px;margin-top:4px}code{background:#EEEDE8;border-radius:4px;padding:1px 5px}</style></head>
<body><main><h1>Prototypes</h1><p>The app itself, built from the <code>prototype</code> branch with content bundled in and sign-in off: <a href="/">landing</a> · <a href="/dashboard/">dashboard</a>. Below, design ideas before they are built into the app.</p>
${types.map((t) => `<h2>${esc(t)}</h2>` + items.filter((i) => i.type === t).map((i) => `<a class="card" href="/p/${esc(i.slug)}/"><b>${esc(i.title)}</b><span>${esc(i.summary)}</span></a>`).join("")).join("") || "<p>None yet.</p>"}
</main></body></html>`);
fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
// Cloudflare: the same /proto-api rewrite as vercel.json, one exact 200 (served in place) rule per file at the top of
// _redirects. A single "/proto-api/*" rule would be a dynamic rule, and the site's own file already uses all 100 the
// free plan allows; exact rules have a limit of 2,000.
if (process.argv.includes("--cloudflare")) {
  const r = path.join(dist, "_redirects"), old = fs.existsSync(r) ? fs.readFileSync(r, "utf8") : "";
  fs.writeFileSync(r, "/p/revamp-2026-11-15/ /p/full-site/ 301\n/p/revamp-2026-11-15 /p/full-site/ 301\n" + written.map((w) => `/proto-api/v1/${w} /proto-api/v1/${w}.json 200`).join("\n") + "\n" + old);
}
console.log(`prototype: ${n} articles, ${pages.length} design prototype(s) written into dist`);

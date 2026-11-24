// Puts the site together (tech-katta-context 48, 49, 50). Runs after the builds (npm run build does them): `vite build` (the old app: still built, because the
// owner's analytics page and the health page come from it), `build:site3d` (the account and usage-event modules for the 3D pages) and `build:islands` (the
// React canvas, judge and practice, next/). The whole site is the 3D site (site3d/):
//
// 1. The old app's pages go: its landing (index.html) and the dashboard shell with its article pages (dashboard/).
// 2. The 3D site's files go to dist/3d/ (scripts, styles, the legacy bridge, the islands). Its page shell (site3d/index.html) is written at every address:
//    - every lesson, section, problem list and the home page, with what the old article pages had for search engines (seo.js): title, description,
//      canonical address, link-preview tags, JSON-LD and a crawlable preview of the text inside <div id="root"> (the 3D router replaces it);
//    - the workspace pages, You, Quick Notes and the policies (hosting/pages.mjs for titles), and /learn, /home and /simulator;
//    - 404.html, which the host serves with status 404 for any other address: the router draws "Nothing runs at this address".
// 3. sitemap.xml and llms.txt list the addresses. /dashboard/… addresses redirect to them (hosting/routes.json); /dashboard/ itself (and /dashboard/#key
//    links) opens the shell, whose router sends each old address to its new home (site3d/scripts/legacy.js).
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pagesOf, renderHome, render, sitemap, llmsTxt, useAddresses, nextPath, SITE, OG_IMAGE } from "../seo.js";
import { workspacePages } from "./pages.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, "..");
const dist = path.join(frontend, "dist");
const contentDir = path.resolve(frontend, "..", "content");
const site3d = path.join(frontend, "site3d");

for (const [file, hint] of [[path.join(dist, "analytics", "index.html"), "vite build"], [path.join(frontend, "site3d-dist", "legacy.js"), "npm run build:site3d"], [path.join(frontend, "next", "dist-islands", "islands.js"), "npm run build:islands"]]) {
  if (!existsSync(file)) { console.error(`switch: ${path.relative(frontend, file)} is missing: run ${hint} first`); process.exit(1); }
}

// 1. the old app's pages
for (const p of ["index.html", "dashboard", "next", "llms.txt", "sitemap.xml"]) rmSync(path.join(dist, p), { recursive: true, force: true });
// The old app's lazy chunks (its article pages, figures, Lab) are no longer reached by any page, but they were still public files holding the
// text of its figures. Only what the analytics and health pages load is kept (tech-katta-context 52: the locked text is not in any file a
// signed-out browser can fetch).
{
  const assets = path.join(dist, "assets");
  if (existsSync(assets)) {
    const names = new Set(readdirSync(assets));
    const keep = new Set(), todo = [];
    const scan = (text) => { for (const m of text.matchAll(/[A-Za-z0-9_.-]+\.(?:js|css|woff2|png|svg|webp|ico)/g)) if (names.has(m[0]) && !keep.has(m[0])) { keep.add(m[0]); todo.push(m[0]); } };
    for (const html of [path.join(dist, "analytics", "index.html"), path.join(dist, "health.html")]) if (existsSync(html)) scan(readFileSync(html, "utf8"));
    for (const js of readdirSync(dist).filter((f) => /^health.*\.js$/.test(f))) scan(readFileSync(path.join(dist, js), "utf8"));
    while (todo.length) { const n = todo.pop(); if (/\.(?:js|css)$/.test(n)) scan(readFileSync(path.join(assets, n), "utf8")); }
    let removed = 0;
    for (const n of names) if (!keep.has(n)) { rmSync(path.join(assets, n), { force: true }); removed += 1; }
    console.log(`switch: kept ${keep.size} old-app asset files for analytics and health, removed ${removed} unused ones`);
  }
}

// 2. the 3D site's files, and its page shell
rmSync(path.join(dist, "3d"), { recursive: true, force: true });
for (const d of ["scripts", "styles"]) cpSync(path.join(site3d, d), path.join(dist, "3d", d), { recursive: true });
cpSync(path.join(frontend, "site3d-dist"), path.join(dist, "3d", "legacy"), { recursive: true });
cpSync(path.join(frontend, "next", "dist-islands"), path.join(dist, "3d", "islands"), { recursive: true });
const preview = `<meta property="og:site_name" content="Tech Katta"/><meta property="og:type" content="website"/><meta property="og:image" content="${OG_IMAGE}"/><meta name="twitter:card" content="summary_large_image"/>`;
const shell3d = readFileSync(path.join(site3d, "index.html"), "utf8").replace("</head>", `${preview}</head>`);
const NOINDEX = '<meta name="robots" content="noindex"/>';
/** the shell with this title (and description, canonical address, noindex) */
const shellFor = (title, { desc, canon, noindex } = {}) => {
  const esc = (x) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let html = shell3d.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · Tech Katta</title>`);
  if (desc) html = html.replace(/<meta name="description"[^>]*>/, "").replace("</head>", `<meta name="description" content="${esc(desc)}"/></head>`);
  if (canon !== undefined) html = html.replace("</head>", `<link rel="canonical" href="${SITE}/${canon}"/></head>`);
  if (noindex) html = html.replace("</head>", `${NOINDEX}</head>`);
  return html;
};
const put = (route, html) => { const dir = path.join(dist, ...route.split("/").filter(Boolean)); mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, "index.html"), html); };

// the workspace pages, You, Quick Notes and the policies: the shell with each page's title and description. A shared design (data in the #fragment)
// and the base pages that /problems/challenge/<id> and /practice/<slug> are rewritten to (hosting/routes.json) are not indexed.
let workspace = 0;
for (const [route, [title, desc]] of await workspacePages()) { put(route, shellFor(title, { desc, canon: route, noindex: route === "problems/shared" })); workspace += 1; }
put("problems/challenge", shellFor("Challenge · Problems", { noindex: true }));
// an address nothing answers: the host serves this with status 404
writeFileSync(path.join(dist, "404.html"), shellFor("Not found", { noindex: true }));
// /dashboard/ (and /dashboard/#key links): the shell, which sends each old address to its new home
put("dashboard", shellFor("Tech Katta", { noindex: true }));

// 3. search-engine pages, from the content folder (the build sees the whole repository)
const read = (...p) => JSON.parse(readFileSync(path.join(contentDir, ...p), "utf8"));
const site = read("site.json");
const articles = read("articles", "index.json").articles.map((ref) => read("articles", `${ref}.json`));
useAddresses("next");
const pages = pagesOf(site, articles);
let written = 0;
for (const p of pages) {
  const file = path.join(dist, ...nextPath(p.key).split("/").filter(Boolean), "index.html");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, render(shell3d, p));
  written += 1;
}
writeFileSync(path.join(dist, "index.html"), renderHome(shell3d, site, articles).replace("</head>", `<link rel="canonical" href="${SITE}/"/></head>`));

// the 3D pages with no search-engine page of their own: /learn (it opens Concepts), the simulator (/simulator/<id> is a rewrite to this file,
// hosting/routes.json) and the Dashboard (/home)
for (const [dir, title, canon] of [["learn", "Learn", "learn/concepts"], ["simulator", "Simulator", "simulator"], ["home", "Dashboard", "home"]]) put(dir, shellFor(title, { canon }));

// 4. the sitemap and the content map for AI assistants
writeFileSync(path.join(dist, "sitemap.xml"), sitemap(pages.map((p) => ({ key: p.key, date: p.date }))));
writeFileSync(path.join(dist, "llms.txt"), llmsTxt(site, pages));
console.log(`switch: the 3D site answers every address; ${written} search-engine pages, ${workspace} workspace and static pages, the home page, sitemap.xml and llms.txt`);

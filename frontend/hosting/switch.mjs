// The new frontend replaces the old app at tech.katta.cc (2026-11-18, tech-katta-context 47-NEO-BRUTALISM-PRODUCTION.md).
// Runs after both builds (npm run build does): `vite build` (the old app: still built, because the owner's analytics
// page and the health page come from it) and next/ built at the site root in the neo-brutalism look (build:next).
//
// 1. The old app's pages go: the landing (index.html) and the dashboard shell with its article pages (dashboard/).
// 2. next/dist is copied over dist/, so the new app answers at / and at every route it prerendered.
// 3. Every article, section and policy page gets what the old article pages had for search engines (seo.js): its
//    title and description, canonical address, link-preview tags, JSON-LD and a crawlable preview of the text inside
//    <div id="root"> (the app replaces it when it starts). The landing gets the site's JSON-LD and home summary.
// 5. The 3D site (site3d/, 2026-11-23, tech-katta-context 48) takes the landing, /home, the four Learn sections and
//    their articles, and /simulator: its files go to dist/3d/, and its page shell replaces the React page at each of
//    those addresses, carrying the same search-engine text in <div id="root"> (the 3D app replaces it when it
//    starts). The React app keeps the problems, /practice, /me, Quick Notes and the policies, and with VITE_SITE3D=1
//    reloads the 3D addresses as whole pages (next/src/app/router.tsx).
// 4. sitemap.xml and llms.txt list the new addresses. /dashboard/… addresses redirect to them (hosting/routes.json);
//    /dashboard/ itself (and /dashboard/#key links) opens the app, whose /dashboard route sends each to its new home.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pagesOf, renderHome, render, sitemap, llmsTxt, useAddresses, nextPath, SITE, OG_IMAGE } from "../seo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "..", "dist");
const next = path.resolve(here, "..", "next", "dist");
const contentDir = path.resolve(here, "..", "..", "content");
const site3d = path.resolve(here, "..", "site3d");
// the addresses the 3D site answers: every page (keep in step with site3d/scripts/app.js OWN); the workspace pages
// (a problem, challenge, sandbox, shared design, practice) are the canvas island inside a 3D page (site3d/scripts/pages/workspace.js)
const OWNED_BY_3D = /^\/(?!(?:analytics|health|3d|_vercel)(?:\/|$))(?!.*\.[A-Za-z0-9]+$).*$/;

if (!existsSync(path.join(next, "index.html"))) {
  console.error("switch: next/dist is missing: build the new frontend first (npm run build:next)");
  process.exit(1);
}
if (!existsSync(path.join(dist, "analytics", "index.html"))) {
  console.error("switch: dist/analytics is missing: run vite build first");
  process.exit(1);
}

// 1. the old app's pages
for (const p of ["index.html", "dashboard", "next", "llms.txt", "sitemap.xml"]) rmSync(path.join(dist, p), { recursive: true, force: true });

// 2. the new app, at the root
cpSync(next, dist, { recursive: true });

// every page of the new app: indexable now, with the link-preview image the old pages had
const htmlFiles = [];
const walk = (dir) => { for (const n of readdirSync(dir)) { const f = path.join(dir, n); if (statSync(f).isDirectory()) { if (f !== path.join(dist, "analytics")) walk(f); } else if (n.endsWith(".html") && n !== "health.html") htmlFiles.push(f); } };
walk(dist);
const preview = `<meta property="og:site_name" content="Tech Katta"/><meta property="og:type" content="website"/><meta property="og:image" content="${OG_IMAGE}"/><meta name="twitter:card" content="summary_large_image"/>`;
for (const f of htmlFiles) {
  let html = readFileSync(f, "utf8").replace(/\s*<meta name="robots" content="noindex" \/>/, "");
  if (!html.includes('property="og:image"')) html = html.replace("</head>", `${preview}</head>`);
  writeFileSync(f, html);
}

// the 3D site's files, and its page shell
rmSync(path.join(dist, "3d"), { recursive: true, force: true });
for (const d of ["scripts", "styles"]) cpSync(path.join(site3d, d), path.join(dist, "3d", d), { recursive: true });
// sign-in, account sync and usage events: the current app's modules built as one file for the 3D pages (npm run build:site3d)
if (!existsSync(path.join(here, "..", "site3d-dist", "legacy.js"))) { console.error("switch: site3d-dist/legacy.js is missing: run npm run build:site3d first"); process.exit(1); }
cpSync(path.join(here, "..", "site3d-dist"), path.join(dist, "3d", "legacy"), { recursive: true });
// the islands (the canvas, judge and practice, React): next/dist-islands, built by npm run build:islands
if (!existsSync(path.join(next, "..", "dist-islands", "islands.js"))) { console.error("switch: next/dist-islands is missing: run npm run build:islands first"); process.exit(1); }
cpSync(path.join(next, "..", "dist-islands"), path.join(dist, "3d", "islands"), { recursive: true });
const shell3d = readFileSync(path.join(site3d, "index.html"), "utf8").replace("</head>", `${preview}</head>`);

// every page the new frontend prerendered (a problem, the sandbox, a shared design, a challenge, a practice problem, You, the policies, Quick Notes,
// the dashboard shell): the 3D shell, with the title and description prerendered for each (next/scripts/postbuild.mjs)
for (const f of htmlFiles) {
  if (path.basename(f) === "404.html") continue;
  const old = readFileSync(f, "utf8"), title = old.match(/<title>[^<]*<\/title>/)?.[0], desc = old.match(/<meta name="description"[^>]*>/)?.[0];
  let html = shell3d;
  if (title) html = html.replace(/<title>[^<]*<\/title>/, title);
  if (desc) html = html.replace(/<meta name="description"[^>]*>/, "").replace("</head>", `${desc}</head>`);
  writeFileSync(f, html);
}
// an address nothing answers: the host serves this with status 404, and the 3D router draws "Nothing runs at this address"
writeFileSync(path.join(dist, "404.html"), shell3d.replace(/<title>[^<]*<\/title>/, "<title>Not found · Tech Katta</title>").replace("</head>", '<meta name="robots" content="noindex"/></head>'));

// 3. search-engine pages, from the content folder (the build sees the whole repository)
const read = (...p) => JSON.parse(readFileSync(path.join(contentDir, ...p), "utf8"));
const site = read("site.json");
const articles = read("articles", "index.json").articles.map((ref) => read("articles", `${ref}.json`));
useAddresses("next");
const pages = pagesOf(site, articles);
const shell = readFileSync(path.join(dist, "404.html"), "utf8");
let written = 0;
for (const p of pages) {
  const file = path.join(dist, ...nextPath(p.key).split("/").filter(Boolean), "index.html");
  // start from the page the app prerendered (it may carry a preload for the lesson's data), else the plain shell
  const base = OWNED_BY_3D.test(nextPath(p.key)) ? shell3d : existsSync(file) ? readFileSync(file, "utf8") : shell;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, render(base, p));
  written += 1;
}
const home = path.join(dist, "index.html");
writeFileSync(home, renderHome(shell3d, site, articles).replace("</head>", `<link rel="canonical" href="${SITE}/"/></head>`));

// the 3D pages with no search-engine page of their own: /learn (it opens Concepts) and the simulator (/simulator/<id>
// is a rewrite to this file, hosting/routes.json)
// and the Dashboard (/home), which is not a search-engine page
for (const [dir, title, canon] of [["learn", "Learn · Tech Katta", "learn/concepts"], ["simulator", "Simulator · Tech Katta", "simulator"], ["home", "Dashboard · Tech Katta", "home"]]) {
  mkdirSync(path.join(dist, dir), { recursive: true });
  writeFileSync(path.join(dist, dir, "index.html"), shell3d.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace("</head>", `<link rel="canonical" href="${SITE}/${canon}"/></head>`));
}

// the base pages the rewrites for /problems/challenge/<id> and /practice/<slug> serve: a plain 3D shell, not indexed
for (const [dir, title] of [["problems/challenge", "Challenge · Problems · Tech Katta"], ["practice", "Practice · Tech Katta"]]) {
  const f = path.join(dist, dir, "index.html");
  if (existsSync(f)) continue;
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, shell3d.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace("</head>", '<meta name="robots" content="noindex"/></head>'));
}

// /dashboard/ (and /dashboard/#key links): the app, which sends each old address to its new home
mkdirSync(path.join(dist, "dashboard"), { recursive: true });
writeFileSync(path.join(dist, "dashboard", "index.html"), shell3d.replace(/<title>[^<]*<\/title>/, "<title>Tech Katta</title>").replace("</head>", '<meta name="robots" content="noindex"/></head>'));

// 4. the sitemap and the content map for AI assistants
writeFileSync(path.join(dist, "sitemap.xml"), sitemap(pages.map((p) => ({ key: p.key, date: p.date }))));
writeFileSync(path.join(dist, "llms.txt"), llmsTxt(site, pages));
console.log(`switch: the 3D site answers at /, /home, Learn and /simulator; the new frontend at the rest; ${written} search-engine pages, the home page, sitemap.xml and llms.txt for the new addresses`);

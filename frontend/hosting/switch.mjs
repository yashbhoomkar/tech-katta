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
import { execSync } from "node:child_process";
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
for (const d of ["scripts", "styles", "posters"]) cpSync(path.join(site3d, d), path.join(dist, "3d", d), { recursive: true });
cpSync(path.join(frontend, "site3d-dist"), path.join(dist, "3d", "legacy"), { recursive: true });
cpSync(path.join(frontend, "next", "dist-islands"), path.join(dist, "3d", "islands"), { recursive: true });
// the Report button on the two pages the shell does not draw (it is on every other page through the shell's app.js)
for (const html of [path.join(dist, "health.html"), path.join(dist, "analytics", "index.html")]) {
  const text = readFileSync(html, "utf8");
  if (!text.includes("feedback-boot.js")) writeFileSync(html, text.replace("</body>", '<script type="module" src="/3d/scripts/feedback-boot.js"></script></body>'));
}
const preview = `<meta property="og:site_name" content="Tech Katta"/><meta property="og:type" content="website"/><meta property="og:image" content="${OG_IMAGE}"/><meta name="twitter:card" content="summary_large_image"/>`;
// which build this is, for the Report popup's "Version" line (the commit the host built, else this checkout's)
const buildId = (() => {
  let sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "").slice(0, 7);
  if (!sha) { try { sha = execSync("git rev-parse --short HEAD", { cwd: frontend, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { sha = "local"; } }
  return `${new Date().toISOString().slice(0, 10)}-${sha}`;
})();
// The pages are ES modules that import each other: the browser learns of each level only when the one above has arrived, so on a slow phone the first page waits for
// seven or eight round trips of 150 ms. Every module app.js loads statically is named in the shell's head instead (modulepreload): one round trip, all at once.
const staticGraph = (entry) => {
  const seen = new Set(), walk = (rel) => {
    if (seen.has(rel)) return; seen.add(rel);
    let src; try { src = readFileSync(path.join(dist, "3d", rel), "utf8"); } catch { return; }
    for (const m of src.matchAll(/^\s*(?:import|export)\b[^'"`;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|^\s*import\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) walk(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1] || m[2])));
  };
  walk(entry); return [...seen];
};
const base = staticGraph("scripts/app.js");
const preloads = base.filter((f) => f !== "scripts/app.js").map((f) => `<link rel="modulepreload" href="/3d/${f}"/>`).join("");
// the pages load when their address opens (app.js); the files of the page this address opens are named by a few lines at the end of boot-theme.js (the host's CSP allows no inline script), so
// they are fetched with app.js and not one round trip after it
const PAGE_AT = [["^/$", "landing"], ["^/home/?$", "me"], ["^/learn/(?:concepts|components|interview-questions|real-systems)/[\\w-]+/?$", "article"], ["^/learn(?:/|$)", "learn"], ["^/problems/?$", "problems"], ["^/simulator/", "sim"], ["^/(?:problems|practice)(?:/|$)", "workspace"]];
const pageFiles = PAGE_AT.map(([re, name]) => [re, staticGraph(`scripts/pages/${name}.js`).filter((f) => !base.includes(f))]);
// a problem's page opens the React workspace (islands/): its first chunk names the others it needs (vite's dependency list), and the chain is four requests deep, so the
// whole set is named here too and arrives in one round trip. Only the chunks the problem's workspace needs (impl-*.js, whose list is the set), not the challenges' or practice's.
const islandFiles = (() => {
  const dir = path.join(dist, "3d", "islands"), assets = path.join(dir, "assets");
  try {
    const impl = readdirSync(assets).find((f) => /^impl-.+\.js$/.test(f));
    if (!impl) return [];
    const deps = [...readFileSync(path.join(assets, impl), "utf8").matchAll(/"(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]).filter((d) => !/^assets\/(?:Lab|practice|Sandbox|SharedDesign)-/.test(d)); // the challenges, practice and sandbox are other pages'
    const css = readdirSync(assets).find((f) => /^impl-.+\.css$/.test(f));
    const index = readdirSync(assets).find((f) => /^index-.+\.js$/.test(f));
    return ["islands/islands.js", ...(index ? [`islands/assets/${index}`] : []), `islands/assets/${impl}`, ...(css ? [`islands/assets/${css}`] : []), ...deps.map((d) => `islands/${d}`)].filter((f, i, a) => a.indexOf(f) === i);
  } catch { return []; }
})();
// (not preloaded with the page: a signed-out visitor never loads the workspace. workspace.js names these when the gate says open: window.__tkIsland)
const islandSet = islandFiles;
const bootPath = path.join(dist, "3d", "scripts", "boot-theme.js");
writeFileSync(bootPath, `${readFileSync(bootPath, "utf8")}\n// (added by hosting/switch.mjs) the files of this address's page, fetched together with app.js\n(function(){var p=location.pathname,M=${JSON.stringify(pageFiles)};window.__tkIsland=${JSON.stringify(islandSet.filter((f) => !base.includes(f)))};for(var i=0;i<M.length;i++){if(new RegExp(M[i][0]).test(p)){M[i][1].forEach(function(f){var l=document.createElement("link"),c=/\\.css$/.test(f);l.rel=c?"preload":"modulepreload";if(c)l.as="style";l.href="/3d/"+f;document.head.appendChild(l);});break;}}})();\n`);
const shell3d = readFileSync(path.join(site3d, "index.html"), "utf8").replace("</head>", `${preview}<meta name="tk-build" content="${buildId}"/>${preloads}</head>`);
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
for (const [dir, title, canon] of [["learn", "Learn", "learn/concepts"], ["simulator", "Warm-ups", "simulator"], ["home", "Home", "home"]]) put(dir, shellFor(title, { canon }));
// Start here (the three learning paths) and What's new: public pages with their own title and description
for (const [dir, title, desc] of [["start", "Not sure where to start?", "Three learning paths for system design interviews by experience (0-2, 2-5 and 5+ years), each a short list of lessons that ends with a problem to solve."], ["changelog", "What's new", "Every change a learner can notice on Tech Katta, newest first."], ["free", "Free while in beta", "Everything on Tech Katta is free during the beta. These lessons and the URL shortener problem open in full without signing in."]]) put(dir, shellFor(title, { desc, canon: dir }));

// 4. the sitemap and the content map for AI assistants
writeFileSync(path.join(dist, "sitemap.xml"), sitemap(pages.map((p) => ({ key: p.key, date: p.date, free: p.free }))).replace("</urlset>", `  <url><loc>${SITE}/start</loc></url>\n  <url><loc>${SITE}/changelog</loc></url>\n  <url><loc>${SITE}/free</loc></url>\n</urlset>`));
writeFileSync(path.join(dist, "llms.txt"), llmsTxt(site, pages));
console.log(`switch: the 3D site answers every address; ${written} search-engine pages, ${workspace} workspace and static pages, the home page, sitemap.xml and llms.txt`);

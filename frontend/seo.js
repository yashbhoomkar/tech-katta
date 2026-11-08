// Build step: one small HTML page per article and per section, so each has its own address
// (/dashboard/<section>/<slug>/), title, description and link preview, plus a sitemap listing them all.
// Each page is the built dashboard page with its head filled in; the app then reads the address
// (src/routes.js). Only what /v1/site and /v1/articles already serve publicly goes in: titles and
// one-line summaries, never article bodies.
import fs from "node:fs";
import path from "node:path";

export const SITE = "https://tech.katta.cc";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Pages to write: [{key, title, description}], from site.json and the article summaries (section, slug,
// title, dek), the same data the API serves at /v1/site and /v1/articles.
export function pagesOf(site, articles) {
  const cards = Object.fromEntries((site.topics?.cards || []).map((c) => [c.id, c]));
  const sections = [...(site.dashboard?.sections || [])];
  if (site.problems && !sections.some((s) => s[0] === "problems")) sections.push(["problems", site.problems.label, null]);
  const pages = sections.map(([id, label, card]) => ({
    key: id,
    title: `${label} | Tech Katta`,
    description: cards[card]?.desc || `${label} on Tech Katta, the system design library.`,
  }));
  for (const id of ["privacy", "terms"]) if (site[id]?.title) pages.push({ key: id, title: `${site[id].title} | Tech Katta`, description: `${site[id].title} for Tech Katta.` });
  for (const a of articles) {
    if (!a.section || !a.slug || !a.title) continue;
    pages.push({ key: `${a.section}/${a.slug}`, title: `${a.title} | Tech Katta`, description: a.dek || a.title });
  }
  return pages;
}

// From the repository's content folder.
export function pagesFrom(contentDir) {
  const read = (...p) => JSON.parse(fs.readFileSync(path.join(contentDir, ...p), "utf8"));
  return pagesOf(read("site.json"), read("articles", "index.json").articles.map((ref) => read("articles", ref + ".json")));
}

// From the live API, when the build cannot see the content folder.
export async function pagesFromApi(api) {
  const get = async (p) => { const r = await fetch(api + p); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() };
  const [site, list] = await Promise.all([get("/v1/site"), get("/v1/articles")]);
  return pagesOf(site, list.articles);
}

const setMeta = (html, attr, name, value) => {
  const re = new RegExp(`<meta ${attr}="${name}" content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${name}" content="${esc(value)}"/>`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", tag + "</head>");
};

// The dashboard page with this page's title, description, preview and canonical address.
export function render(html, { key, title, description }) {
  const url = SITE + "/dashboard/" + (key ? key + "/" : "");
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (description != null) {
    out = setMeta(out, "name", "description", description);
    out = setMeta(out, "property", "og:title", title.replace(/ \| Tech Katta$/, ""));
    out = setMeta(out, "property", "og:description", description);
  }
  out = setMeta(out, "property", "og:url", url);
  if (key.includes("/")) out = setMeta(out, "property", "og:type", "article");
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, "");
  return out.replace("</head>", `<link rel="canonical" href="${esc(url)}"/></head>`);
}

export function sitemap(keys) {
  const urls = [SITE + "/", SITE + "/dashboard/", ...keys.map((k) => `${SITE}/dashboard/${k}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join("\n")}\n</urlset>\n`;
}

// Vite plugin. It reads the content folder when the build can see it (a build from the whole repository),
// else the live API. If neither works it says so and writes nothing: the addresses still open through the
// /dashboard/* rewrite in vercel.json, just without their own titles.
export default function articlePages(contentDir, api = "https://tech-api.katta.cc") {
  let outDir = "dist";
  return {
    name: "article-pages",
    apply: "build",
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir) },
    async closeBundle() {
      let pages, from;
      try {
        if (fs.existsSync(path.join(contentDir, "articles", "index.json"))) { pages = pagesFrom(contentDir); from = "content folder" }
        else { pages = await pagesFromApi(api); from = api }
      } catch (e) { console.warn(`article-pages: skipped (${e.message})`); return }
      const base = fs.readFileSync(path.join(outDir, "dashboard", "index.html"), "utf8");
      for (const p of pages) {
        const dir = path.join(outDir, "dashboard", ...p.key.split("/"));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), render(base, p));
      }
      fs.writeFileSync(path.join(outDir, "dashboard", "index.html"), render(base, { key: "", title: "Dashboard | Tech Katta", description: null }));
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap(pages.map((p) => p.key)));
      console.log(`article-pages: ${pages.length} pages and sitemap.xml, from the ${from}`);
    },
  };
}

// Build step: one small HTML page per article and per section, so each has its own address
// (/dashboard/<section>/<slug>/), title, description and link preview, plus a sitemap listing them all.
// Each page is the built dashboard page with its head filled in; the app then reads the address
// (src/routes.js).
// For search engines (owner, 2026-11-13: "Preview only", like fanout.sh) each page's <div id="root"> also
// holds plain HTML the app replaces when it starts: an article's title, summary and public preview (the same
// cut signed-out readers see, src/preview.js), the list of its sections, links to its neighbours and to every
// section; a section's list of articles; on the home page every section and article. Never the locked text.
// Plus structured data (JSON-LD): the site, breadcrumbs and, for an article, Article marked as not free with
// the locked part named (.tk-locked), Google's markup for content behind a sign-in.
import fs from "node:fs";
import path from "node:path";
import { previewCut } from "./src/preview.js";

export const SITE = "https://tech.katta.cc";
export const OG_IMAGE = SITE + "/og-2026-11.png";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// inline text: `code` as in the app (src/dashboard/text.jsx)
const inl = (s) => String(s || "").split(/`([^`]+)`/).map((t, i) => (i % 2 ? `<code>${esc(t)}</code>` : esc(t))).join("");
const urlOf = (key) => SITE + "/dashboard/" + (key ? key + "/" : "");

// Section titles as people search for them ("system design interview questions"), for the <title> only.
const SECTION_TITLES = {
  concepts: "System Design Concepts",
  components: "System Design Components: Redis, Kafka, DynamoDB and more",
  "interview-questions": "System Design Interview Questions, with Worked Answers",
  problems: "System Design Practice Problems",
  "real-systems": "Real Systems: How Companies Design at Scale",
  "quick-notes": "System Design Quick Notes",
};

// "9 Nov 2026" -> "2026-11-09" (null when it isn't a date)
export function isoDate(s) {
  const t = Date.parse(String(s || "") + " UTC");
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

// The opening of an article as HTML: the blocks before previewCut, figures and widgets left out.
export function previewHtml(body) {
  const out = [];
  for (const b of body.slice(0, previewCut(body))) {
    if (b.t === "h2") out.push(`<h2>${inl(b.x)}</h2>`);
    else if (b.t === "h3") out.push(`<h3>${inl(b.x)}</h3>`);
    else if (b.t === "p" || b.t === "analogy") out.push(`<p>${inl(b.x)}</p>`);
    else if (b.t === "list") out.push(`<ul>${b.items.map((x) => `<li>${inl(x)}</li>`).join("")}</ul>`);
    else if (b.t === "code") out.push(`<pre><code>${esc(b.x)}</code></pre>`);
    else if (b.t === "table") out.push(`<table>${b.label ? `<caption>${inl(b.label)}</caption>` : ""}<tr>${b.head.map((h) => `<th>${inl(h)}</th>`).join("")}</tr>${b.rows.map((r) => `<tr>${r.map((x) => `<td>${inl(x)}</td>`).join("")}</tr>`).join("")}</table>`);
    else if (b.t === "type") out.push(`<p><b>${inl(b.name)}</b>${b.kind ? ` (${inl(b.kind)})` : ""}: ${inl(b.what)}</p>`);
    else if (b.t === "fig" && b.cap) out.push(`<p><i>${inl(b.cap)}</i></p>`);
  }
  return out.join("");
}

const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
const ORG = { "@type": "Organization", "@id": SITE + "/#org", name: "Tech Katta", url: SITE + "/", logo: SITE + "/favicon.svg" };
const WEBSITE = { "@type": "WebSite", "@id": SITE + "/#website", name: "Tech Katta", alternateName: "Tech Katta: System design, explained", url: SITE + "/", inLanguage: "en", publisher: { "@id": SITE + "/#org" } };
const crumbs = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) });

// Pages to write: [{key, title, description, body?, ld?, date?}] from site.json and the articles (with their
// bodies when given; the API's list has none, see pagesFromApi).
export function pagesOf(site, articles) {
  const cards = Object.fromEntries((site.topics?.cards || []).map((c) => [c.id, c]));
  const sections = [...(site.dashboard?.sections || [])];
  if (site.problems && !sections.some((s) => s[0] === "problems")) sections.push(["problems", site.problems.label, null]);
  const labels = Object.fromEntries(sections.map(([id, label]) => [id, label]));
  const ok = articles.filter((a) => a.section && a.slug && a.title);
  const link = (a) => `<a href="${esc(urlOf(a.section + "/" + a.slug))}">${esc(a.title)}</a>`;
  const nav = `<nav aria-label="Sections"><h2>Tech Katta</h2><ul><li><a href="${SITE}/">Home</a></li>${sections.map(([id, label]) => `<li><a href="${esc(urlOf(id))}">${esc(label)}</a></li>`).join("")}</ul></nav>`;
  const listOf = (id) => {
    const inSec = ok.filter((a) => a.section === (id === "problems" ? "interview-questions" : id));
    const groups = site.dashboard?.groups?.[id === "problems" ? "interview-questions" : id] || [];
    const blocks = groups.length ? groups.map(([g, name, desc]) => [name, desc, inSec.filter((a) => a.group === g)]) : [[null, null, inSec]];
    return blocks.filter((b) => b[2].length).map(([name, desc, list]) => `${name ? `<h2>${esc(name)}</h2>` : ""}${desc ? `<p>${esc(desc)}</p>` : ""}<ul>${list.map((a) => `<li>${link(a)}${a.dek ? ` — ${esc(a.dek)}` : ""}</li>`).join("")}</ul>`).join("");
  };

  const pages = sections.map(([id, label, card]) => {
    const description = cards[card]?.desc || site.dashboard?.heads?.[id]?.desc || `${label} on Tech Katta, the system design library.`;
    return {
      key: id,
      title: `${SECTION_TITLES[id] || label} | Tech Katta`,
      description,
      body: `<main><nav aria-label="Breadcrumb"><a href="${SITE}/">Tech Katta</a> / ${esc(label)}</nav><h1>${esc(label)}</h1><p>${esc(description)}</p>${listOf(id)}</main>${nav}`,
      ld: [{ "@context": "https://schema.org", "@graph": [ORG, WEBSITE, { "@type": "CollectionPage", "@id": urlOf(id) + "#webpage", url: urlOf(id), name: `${label} | Tech Katta`, description, isPartOf: { "@id": SITE + "/#website" } }, crumbs([["Tech Katta", SITE + "/"], [label, urlOf(id)]])] }],
    };
  });
  for (const id of ["privacy", "terms"]) if (site[id]?.title) pages.push({ key: id, title: `${site[id].title} | Tech Katta`, description: `${site[id].title} for Tech Katta.` });
  for (const a of ok) {
    const key = `${a.section}/${a.slug}`, label = labels[a.section] || a.section, url = urlOf(key), date = isoDate(a.date);
    const description = a.dek || a.title;
    const title = a.section === "interview-questions" && /^Design /.test(a.title) ? `${a.title}: System Design Interview | Tech Katta` : `${a.title} | Tech Katta`;
    const page = { key, title, description, date };
    if (a.body) {
      const heads = a.body.filter((b) => b.t === "h2").map((b) => b.x);
      const sib = ok.filter((x) => x.section === a.section && x.slug !== a.slug && x.group === a.group).slice(0, 12);
      page.body = `<main><nav aria-label="Breadcrumb"><a href="${SITE}/">Tech Katta</a> / <a href="${esc(urlOf(a.section))}">${esc(label)}</a></nav>`
        + `<article><p>${esc(a.no || "")}${a.tag ? ` · ${esc(a.tag)}` : ""}</p><h1>${esc(a.title)}</h1><p>${esc(description)}</p>${a.date ? `<p><time datetime="${date || ""}">${esc(a.date)}</time></p>` : ""}`
        + previewHtml(a.body)
        + `<div class="tk-locked"><p><b>Continue reading.</b> The rest of this article, its diagrams and read-aloud are free with a Google account: <a href="${esc(url)}">sign in to read it</a>.</p></div>`
        + (heads.length ? `<h2>In this article</h2><ol>${heads.map((h) => `<li>${inl(h)}</li>`).join("")}</ol>` : "")
        + `</article>${sib.length ? `<nav aria-label="More in ${esc(label)}"><h2>More in ${esc(label)}</h2><ul>${sib.map((x) => `<li>${link(x)}</li>`).join("")}</ul></nav>` : ""}</main>${nav}`;
      page.ld = [{ "@context": "https://schema.org", "@graph": [ORG, WEBSITE,
        { "@type": a.section === "interview-questions" || a.section === "concepts" || a.section === "components" ? "TechArticle" : "Article", "@id": url + "#article", headline: a.title.slice(0, 110), description, url, mainEntityOfPage: url, image: OG_IMAGE, inLanguage: "en", ...(date ? { datePublished: date, dateModified: date } : {}), author: { "@id": SITE + "/#org" }, publisher: { "@id": SITE + "/#org" }, isPartOf: { "@id": SITE + "/#website" }, articleSection: label, isAccessibleForFree: false, hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".tk-locked" } },
        crumbs([["Tech Katta", SITE + "/"], [label, urlOf(a.section)], [a.title, url]])] }];
    }
    pages.push(page);
  }
  return pages;
}

// The home page's HTML for search engines: what the site is, every section and every article.
export function homeOf(site, articles) {
  const pages = pagesOf(site, articles);
  const secs = pages.filter((p) => p.ld && !p.key.includes("/"));
  const h = site.hero || {};
  return `<main><p>${esc(h.eyebrow || "")}</p><h1>${esc(h.title || "System design, explained.")}</h1><p>${esc(h.description || "")}</p>`
    + `<p><a href="${SITE}/dashboard/concepts/">Start with the concepts</a> · <a href="${SITE}/dashboard/interview-questions/">System design interview questions</a> · <a href="${SITE}/dashboard/problems/">Practice problems</a></p>`
    + secs.map((s) => { const list = pages.filter((p) => p.key.startsWith(s.key + "/") && p.body); return list.length ? `<section><h2><a href="${esc(urlOf(s.key))}">${esc(s.title.replace(/ \| Tech Katta$/, ""))}</a></h2><p>${esc(s.description)}</p><ul>${list.map((p) => `<li><a href="${esc(urlOf(p.key))}">${esc(p.title.replace(/(: System Design Interview)? \| Tech Katta$/, ""))}</a></li>`).join("")}</ul></section>` : ""; }).join("")
    + `</main>`;
}

const readContent = (contentDir) => {
  const read = (...p) => JSON.parse(fs.readFileSync(path.join(contentDir, ...p), "utf8"));
  return { site: read("site.json"), articles: read("articles", "index.json").articles.map((ref) => read("articles", ref + ".json")) };
};

// From the repository's content folder.
export function pagesFrom(contentDir) {
  const { site, articles } = readContent(contentDir);
  return pagesOf(site, articles);
}

// From the live API, when the build cannot see the content folder (bodies fetched one by one, as the app does).
export async function contentFromApi(api) {
  const get = async (p) => { const r = await fetch(api + p); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() };
  const [site, list] = await Promise.all([get("/v1/site"), get("/v1/articles")]);
  const articles = await Promise.all(list.articles.map((a) => get(`/v1/articles/${a.slug}`).then((full) => ({ ...a, ...full }), () => a)));
  return { site, articles };
}
export async function pagesFromApi(api) {
  const { site, articles } = await contentFromApi(api);
  return pagesOf(site, articles);
}

const setMeta = (html, attr, name, value) => {
  const re = new RegExp(`<meta ${attr}="${name}" content="[^"]*"\\s*/?>`);
  const tag = `<meta ${attr}="${name}" content="${esc(value)}"/>`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", tag + "</head>");
};

// The static HTML inside <div id="root"> (the app replaces it when it starts). Styled just enough to read.
const STATIC_CSS = `<style>.tk-static{max-width:720px;margin:0 auto;padding:32px 16px 64px;font:16px/1.7 system-ui,sans-serif;color:#1d1b16}.tk-static h1{font-size:30px;line-height:1.2}.tk-static a{color:#94600a}.tk-static table{border-collapse:collapse;font-size:14px}.tk-static td,.tk-static th{border:1px solid #e6e0d1;padding:4px 8px}.tk-static pre{overflow:auto;background:#f3efe5;padding:12px}html[data-theme=dark] .tk-static{color:#ece7da}</style>`;
export function withBody(html, body) {
  if (!body) return html;
  return html.replace(/<div id="root">(?:<p[^>]*>[^<]*<\/p>)?<\/div>/, `<div id="root"><div class="tk-static">${body}</div></div>`).replace("</head>", STATIC_CSS + "</head>");
}

// The dashboard page with this page's title, description, preview, canonical address, body and JSON-LD.
export function render(html, { key, title, description, body, ld: data, date }) {
  const url = urlOf(key);
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (description != null) {
    out = setMeta(out, "name", "description", description);
    out = setMeta(out, "property", "og:title", title.replace(/ \| Tech Katta$/, ""));
    out = setMeta(out, "property", "og:description", description);
    out = setMeta(out, "name", "twitter:title", title.replace(/ \| Tech Katta$/, ""));
    out = setMeta(out, "name", "twitter:description", description);
  }
  out = setMeta(out, "property", "og:url", url);
  if (key.includes("/")) out = setMeta(out, "property", "og:type", "article");
  if (date) out = setMeta(out, "property", "article:published_time", date);
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, "");
  out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
  out = out.replace("</head>", `<link rel="canonical" href="${esc(url)}"/>${(data || []).map(ld).join("")}</head>`);
  return withBody(out, body);
}

// The home page: its static HTML and the site's JSON-LD.
export function renderHome(html, site, articles) {
  const data = { "@context": "https://schema.org", "@graph": [ORG, WEBSITE, { "@type": "WebPage", "@id": SITE + "/#webpage", url: SITE + "/", name: html.match(/<title>([^<]*)<\/title>/)?.[1] || "Tech Katta", isPartOf: { "@id": SITE + "/#website" }, about: "System design interview preparation" }] };
  return withBody(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "").replace("</head>", ld(data) + "</head>"), homeOf(site, articles));
}

// pages: keys, or [{key, date}] for a <lastmod>
export function sitemap(pages) {
  const list = [{ key: null }, { key: "" }, ...pages.map((p) => (typeof p === "string" ? { key: p } : p))];
  const loc = (k) => (k === null ? SITE + "/" : urlOf(k));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((p) => `  <url><loc>${esc(loc(p.key))}</loc>${p.date ? `<lastmod>${p.date}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
}

// For AI assistants and their crawlers (llmstxt.org): what the site is and its public pages, like fanout.sh.
export function llmsTxt(site, pages) {
  const secs = pages.filter((p) => p.ld && !p.key.includes("/"));
  return `# Tech Katta\n\n> ${site.hero?.title || "System design, explained."} ${site.hero?.description || ""}\n\nArticles show a public preview; the full text is free after signing in with Google.\n\n`
    + secs.map((s) => `## ${s.title.replace(/ \| Tech Katta$/, "")}\n\n- [${s.title.replace(/ \| Tech Katta$/, "")}](${urlOf(s.key)}): ${s.description}\n${pages.filter((p) => p.key.startsWith(s.key + "/") && p.body).map((p) => `- [${p.title.replace(/ \| Tech Katta$/, "")}](${urlOf(p.key)}): ${p.description}`).join("\n")}\n`).join("\n");
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
      let content, from;
      try {
        if (fs.existsSync(path.join(contentDir, "articles", "index.json"))) { content = readContent(contentDir); from = "content folder" }
        else { content = await contentFromApi(api); from = api }
      } catch (e) { console.warn(`article-pages: skipped (${e.message})`); return }
      const pages = pagesOf(content.site, content.articles);
      const base = fs.readFileSync(path.join(outDir, "dashboard", "index.html"), "utf8");
      for (const p of pages) {
        const dir = path.join(outDir, "dashboard", ...p.key.split("/"));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), render(base, p));
      }
      fs.writeFileSync(path.join(outDir, "dashboard", "index.html"), render(base, { key: "", title: "Dashboard | Tech Katta", description: null }));
      const home = path.join(outDir, "index.html");
      fs.writeFileSync(home, renderHome(fs.readFileSync(home, "utf8"), content.site, content.articles));
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap(pages.map((p) => ({ key: p.key, date: p.date }))));
      fs.writeFileSync(path.join(outDir, "llms.txt"), llmsTxt(content.site, pages));
      console.log(`article-pages: ${pages.length} pages, the home page, sitemap.xml and llms.txt, from the ${from}`);
    },
  };
}

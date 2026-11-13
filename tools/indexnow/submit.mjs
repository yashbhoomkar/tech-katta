// IndexNow: tell Bing, Yandex, Seznam, Naver and the other IndexNow engines which pages changed, so they
// crawl them within minutes instead of waiting for the sitemap. Google does not use IndexNow (it reads the
// sitemap and Search Console). The key is public by design: the engines check it at
// https://tech.katta.cc/<key>.txt (frontend/public), which proves we own the site.
//   node tools/indexnow/submit.mjs            pages whose <lastmod> is within the last 3 days, plus the home,
//                                             dashboard and section pages
//   node tools/indexnow/submit.mjs --all      every page in the sitemap
//   node tools/indexnow/submit.mjs URL ...    just these
const SITE = "https://tech.katta.cc", HOST = "tech.katta.cc", KEY = "f07a54b9877482a11ce534d4d3cde740";
const args = process.argv.slice(2);

async function sitemapUrls() {
  const r = await fetch(SITE + "/sitemap.xml");
  if (!r.ok) throw new Error("sitemap.xml: " + r.status);
  const xml = await r.text();
  return [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)].map((m) => ({ loc: m[1], lastmod: m[2] || null }));
}

export function pick(list, { all = false, now = Date.now(), days = 3 } = {}) {
  if (all) return list.map((u) => u.loc);
  const since = now - days * 86400000;
  // pages without a date (home, dashboard, sections) list articles, so they change whenever one does
  return list.filter((u) => !u.lastmod || Date.parse(u.lastmod) >= since).map((u) => u.loc);
}

async function main() {
  const urls = args.length && !args[0].startsWith("--") ? args : pick(await sitemapUrls(), { all: args.includes("--all") });
  if (!urls.length) { console.log("IndexNow: nothing to submit"); return; }
  const key = await fetch(`${SITE}/${KEY}.txt`).then((r) => (r.ok ? r.text() : ""));
  if (key.trim() !== KEY) throw new Error("the key file is not live yet: " + SITE + "/" + KEY + ".txt");
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
  });
  // 200 OK, 202 Accepted (key being checked); 403 key not valid, 422 URLs not on this host, 429 too often
  console.log(`IndexNow: ${urls.length} URL(s), HTTP ${r.status}`);
  if (r.status >= 300) { console.log(await r.text()); process.exit(1); }
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });

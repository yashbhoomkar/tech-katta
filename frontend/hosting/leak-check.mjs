// Leak check (tech-katta-context 52): what a signed-out browser or a search engine receives must not contain the locked text.
// Takes a sentence from deep in every article's body, every problem's hints and reference lines, and every challenge's hint, then
// looks for them in the built site (every file under dist/ : HTML, JS, CSS, JSON) and, with --api <url>, in what the API serves
// without a session. Exit 1 on any hit. Usage: node hosting/leak-check.mjs [dist] [--api http://127.0.0.1:5000]
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "..", "..", "content");
const args = process.argv.slice(2);
const apiAt = args.includes("--api") ? args[args.indexOf("--api") + 1] : null;
const dist = path.resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--api") || path.join(here, "..", "dist"));
const read = (...p) => JSON.parse(readFileSync(path.join(content, ...p), "utf8"));

/** the text that is public anyway: the site copy (landing, Numbers worth knowing, ...), every article's title, subtitle and section names, the first 2 paragraphs of each article, every problem's title */
function publicBlob() {
  const parts = [JSON.stringify(read("site.json")).replace(/\\"/g, '"')];
  for (const ref of read("articles", "index.json").articles) {
    const a = read("articles", `${ref}.json`), ps = (a.body || []).filter((b) => b.t === "p").slice(0, 2).map((b) => b.x);
    parts.push(a.title, a.dek || "", ...ps, ...(a.body || []).filter((b) => b.t === "h2").map((b) => b.x), a.practice?.brief || "");
  }
  for (const c of read("lab.json").challenges) parts.push(c.title, c.brief || "");
  return parts.join("\n").replace(/\s+/g, " ");
}

/** probe lines: [label, text] where text is 40-70 characters taken from the middle of a long sentence (not one that is public anyway) */
export function probes() {
  const out = [], pub = publicBlob();
  const take = (label, s) => { const t = String(s || "").replace(/\s+/g, " ").trim(); if (t.length < 90) return; const probe = t.slice(30, 85); if (!pub.includes(probe)) out.push([label, probe]); };
  const index = read("articles", "index.json").articles;
  for (const ref of index) {
    const a = read("articles", `${ref}.json`);
    const body = a.body || [];
    // deep text: paragraphs after the 2nd and the lists and tables after it, so the public part is never a probe
    let seen = 0;
    for (const b of body) {
      if (b.t === "p") { seen += 1; if (seen > 2) take(`${a.slug} p${seen}`, b.x); }
      else if (b.t === "list" && seen >= 2) for (const x of b.items.slice(0, 3)) take(`${a.slug} list`, x);
      else if (b.t === "table" && seen >= 2) for (const r of b.rows.slice(0, 2)) take(`${a.slug} table`, r.join(" "));
    }
    for (const h of a.practice?.hints || []) take(`${a.slug} hint`, typeof h === "string" ? h : h.text || h.x || JSON.stringify(h));
  }
  for (const f of readdirSync(path.join(content, "problems2")).filter((n) => /^\d+-.*\.json$/.test(n))) {
    const p = read("problems2", f);
    for (const h of p.hints || []) take(`${p.slug} hint`, typeof h === "string" ? h : h.text || JSON.stringify(h));
    take(`${p.slug} editorial`, p.editorial);
  }
  for (const c of read("lab.json").challenges) { take(`${c.id} hint`, c.hint); }
  return out;
}

function* files(dir) {
  for (const n of readdirSync(dir)) {
    const f = path.join(dir, n), s = statSync(f);
    if (s.isDirectory()) yield* files(f); else if (/\.(html|js|mjs|json|css|txt|xml|map)$/.test(n)) yield f;
  }
}

const list = probes();
let hits = 0, scanned = 0;
const report = (where, label) => { hits += 1; console.log(`LEAK  ${label}  in  ${where}`); };
console.log(`leak-check: ${list.length} probe lines`);
for (const f of files(dist)) {
  const text = readFileSync(f, "utf8"); scanned += 1;
  for (const [label, probe] of list) if (text.includes(probe) || text.includes(JSON.stringify(probe).slice(1, -1))) report(path.relative(dist, f), label);
}
console.log(`  scanned ${scanned} files under ${dist}`);
if (apiAt) {
  const urls = ["/v1/site", "/v1/lab", "/v1/articles", "/v1/practice/problems"];
  for (const ref of read("articles", "index.json").articles) urls.push(`/v1/articles/${ref.split("/")[1]}`);
  for (const f of readdirSync(path.join(content, "problems2")).filter((n) => /^\d+-.*\.json$/.test(n))) urls.push(`/v1/practice/problems/${read("problems2", f).slug}`);
  let n = 0;
  for (const u of urls) {
    let t = ""; try { t = await (await fetch(apiAt + u)).text(); } catch (e) { console.log(`  ${u}: ${e.message}`); continue; }
    n += 1;
    for (const [label, probe] of list) if (t.includes(probe) || t.includes(JSON.stringify(probe).slice(1, -1))) report(u, label);
  }
  console.log(`  asked the API for ${n} addresses without a session`);
}
console.log(hits ? `FAIL: ${hits} leak(s)` : "OK: no locked text found");
process.exit(hits ? 1 : 0);

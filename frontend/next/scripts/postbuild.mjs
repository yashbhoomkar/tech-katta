// After `vite build`: give every known route its own copy of index.html, so a deep link (or a refresh) is served
// with status 200 by a static host, with that page's own <title> and description (link previews, the tab before the
// app starts). Anything else falls back to 404.html (the same app, which shows its not-found page).
// Routes come from the same section list the app uses; lesson, problem and challenge routes are added from the live
// API when it is reachable (if not, they still work through the host's fallback).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const API = process.env.VITE_API_BASE ?? "https://tech-api.katta.cc";
const SECTIONS = { concepts: "Concepts", components: "Components", "interview-questions": "Interview Questions", "real-systems": "Real Systems", "quick-notes": "Quick Notes" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** index.html with this page's title and description */
function page(title, description) {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · Tech Katta</title>`);
  if (description) out = out.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(description)}" />`);
  return out;
}

/** route → [title, description?] */
const routes = new Map([
  ["home", ["Home"]],
  ["learn", ["Learn"]],
  ["problems", ["Problems", "Design problems with a test suite: traffic peaks, crashes and a budget decide your score."]],
  ["problems/sandbox", ["Sandbox", "A free canvas: any parts, any traffic."]],
  ["privacy", ["Privacy"]],
  ["terms", ["Terms and conditions"]],
  ["me", ["You"]],
  ...Object.entries(SECTIONS).map(([id, name]) => [`learn/${id}`, [name]]),
]);

async function get(p) {
  const res = await fetch(`${API}${p}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${p} answered ${res.status}`);
  return res.json();
}
try {
  const { articles } = await get("/v1/articles");
  for (const a of articles) {
    routes.set(`learn/${a.section}/${a.slug}`, [a.title, a.dek]);
    if (a.tests) routes.set(`problems/${a.slug}`, [a.title, a.dek]);
  }
} catch (err) {
  console.warn(`postbuild: lesson and problem routes skipped (${err.message})`);
}
try {
  const { challenges } = await get("/v1/lab");
  for (const c of challenges) routes.set(`problems/challenge/${c.id}`, [c.title, c.brief]);
} catch (err) {
  console.warn(`postbuild: challenge routes skipped (${err.message})`);
}

for (const [r, [title, description]] of routes) {
  const dir = path.join(dist, r);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(title, description));
}
fs.writeFileSync(path.join(dist, "404.html"), html);
console.log(`postbuild: ${routes.size} route pages + 404.html`);

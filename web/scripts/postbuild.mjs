// After `vite build`: give every known route its own copy of index.html, so a deep link (or a refresh) is served
// with status 200 by a static host; anything else falls back to 404.html (same app, which shows its not-found page).
// Routes come from the same section list the app uses; article routes are added from the live API when reachable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const API = process.env.VITE_API_BASE ?? "https://tech-api.katta.cc";
const SECTIONS = ["concepts", "components", "interview-questions", "real-systems", "quick-notes"];

const routes = new Set(["home", "learn", "problems", "me", ...SECTIONS.map((s) => `learn/${s}`)]);
try {
  const res = await fetch(`${API}/v1/articles`, { signal: AbortSignal.timeout(10_000) });
  if (res.ok) {
    const { articles } = await res.json();
    for (const a of articles) {
      routes.add(`learn/${a.section}/${a.slug}`);
      if (a.tests) routes.add(`problems/${a.slug}`);
    }
  }
} catch (err) {
  console.warn(`postbuild: article routes skipped (${err.message}); they still work through 404.html`);
}

for (const r of routes) {
  const dir = path.join(dist, r);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}
fs.writeFileSync(path.join(dist, "404.html"), html);
console.log(`postbuild: ${routes.size} route pages + 404.html`);

// prototype.katta.cc: the new frontend (next/, the code of the production beta) is served beside the other
// prototypes, once per look:
//   node hosting/prototype-next.mjs                 next/dist (built with BASE_PATH=/p/next/) → dist/p/next
//   node hosting/prototype-next.mjs neo-brutalism   next/dist (built with BASE_PATH=/p/neo-brutalism/ and
//                                                   VITE_STYLE=neo-brutalism) → dist/p/neo-brutalism
// Each build overwrites next/dist, so run this right after each one (npm run build:prototype does). The default run
// also leaves at dist/next/ a small page that sends the old /next/ address on (prototype.mjs adds a 301 for /next
// and /next/; deeper /next/... paths get this page as their 404 page from emit.mjs, since Cloudflare allows only
// 100 wildcard redirects). Deep links inside each copy are served by its own route pages and 404.html. Run before
// emit.mjs.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { copyProblem } from "./prototype-copies.mjs";

const name = process.argv[2] ?? "next";
const src = new URL("../next/dist/", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
if (!existsSync(new URL("index.html", src))) {
  console.error(`next/dist is missing: build it with BASE_PATH=/p/${name}/ npm run build:next`);
  process.exit(1);
}
// refuse a build made for another address or look (prototype-copies.mjs, tested in hosting.test.js)
const problem = copyProblem(readFileSync(new URL("index.html", src), "utf8"), name);
if (problem) {
  console.error(`prototype-next: ${problem}`);
  process.exit(1);
}
const out = new URL(`p/${name}/`, dist);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL("p/", dist), { recursive: true });
cpSync(src, out, { recursive: true });
if (name === "next") {
  rmSync(new URL("next/", dist), { recursive: true, force: true });
  mkdirSync(new URL("next/", dist), { recursive: true });
  writeFileSync(new URL("next/index.html", dist), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/p/next/"><title>Moved to /p/next/</title></head><body><p>The new design is now at <a href="/p/next/">/p/next/</a>.</p></body></html>\n`);
}
console.log(`prototype-next: next/dist copied to dist/p/${name}${name === "next" ? "; /next/ now points to /p/next/" : ""}`);

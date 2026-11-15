// prototype.katta.cc: the new frontend (next/, the code of the production beta) is served at /p/next/, beside the
// other prototypes. Build it with BASE_PATH=/p/next/ first (npm run build:prototype does). This copies next/dist to
// dist/p/next and leaves at dist/next/ a small page that sends the old /next/ address on (prototype.mjs also adds
// a 301 for every /next/ path on Cloudflare). Run before emit.mjs, which gives /next/ its 404 page from it.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const src = new URL("../next/dist/", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
if (!existsSync(new URL("index.html", src))) {
  console.error("next/dist is missing: build it with BASE_PATH=/p/next/ npm run build:next");
  process.exit(1);
}
const out = new URL("p/next/", dist);
rmSync(out, { recursive: true, force: true });
mkdirSync(new URL("p/", dist), { recursive: true });
cpSync(src, out, { recursive: true });
rmSync(new URL("next/", dist), { recursive: true, force: true });
mkdirSync(new URL("next/", dist), { recursive: true });
writeFileSync(new URL("next/index.html", dist), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/p/next/"><title>Moved to /p/next/</title></head><body><p>The new design is now at <a href="/p/next/">/p/next/</a>.</p></body></html>\n`);
console.log("prototype-next: next/dist copied to dist/p/next; /next/ now points to /p/next/");

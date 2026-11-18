// Puts the new frontend (next/, React + TypeScript, served at /next/ during its beta) into this build:
// copies next/dist to dist/next. Run after both are built (npm run build does).
import { cpSync, existsSync, rmSync } from "node:fs";

const src = new URL("../next/dist/", import.meta.url);
const out = new URL("../dist/next/", import.meta.url);
if (!existsSync(new URL("index.html", src))) {
  console.error("next/dist is missing: build the new frontend first (npm run build:next)");
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
console.log("next: copied next/dist to dist/next");

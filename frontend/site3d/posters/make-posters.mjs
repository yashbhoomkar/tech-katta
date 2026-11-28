// Makes the posters (an image of the 3D scene, shown until the engine has loaded: scripts/world-lazy.js). Run against a built, served site:
//   cd frontend && npm run build && node hosting/serve-local.mjs dist 4173 hosting/routes.json &   then   node site3d/posters/make-posters.mjs
// (the API at 127.0.0.1:5000 is needed for Home; Playwright comes from next/). One image per page × theme × size: landing-dark-wide.webp, home-light-phone.webp, ...
// Needs python3 with Pillow to write the WebP (alpha kept: the posters sit on the page's own colour).
import { createRequire } from "node:module"; import { execFileSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(path.join(here, "../../next/package.json"));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:4173", API = process.env.API || "http://127.0.0.1:5000";
const PAGES = [["landing", "/", ".stage canvas"], ["home", "/home", ".dash-stage canvas"]];
const SIZES = { wide: { viewport: { width: 1366, height: 900 }, dpr: 1, out: [1280, 720] }, phone: { viewport: { width: 390, height: 844 }, dpr: 2, out: [450, 975] } }; // the landing's phone stage is the whole screen; Home's is a band (out is only a ceiling)
const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, url, sel] of PAGES) for (const theme of ["dark", "light"]) for (const [size, cfg] of Object.entries(SIZES)) {
  const ctx = await b.newContext({ viewport: cfg.viewport, deviceScaleFactor: cfg.dpr, isMobile: size === "phone", hasTouch: size === "phone" });
  const page = await ctx.newPage();
  await page.route("https://tech-api.katta.cc/v1/**", async (r) => { const u = new URL(r.request().url()); const x = await fetch(API + u.pathname + u.search); await r.fulfill({ status: x.status, body: await x.text(), headers: { "content-type": "application/json", "access-control-allow-origin": BASE, "access-control-allow-credentials": "true" } }); });
  await page.addInitScript((t) => { try { localStorage.setItem("tk-theme", t); sessionStorage.setItem("tk-3d-played", "1"); localStorage.setItem("tk-tour-done", "1"); } catch {} }, theme);
  await page.goto(BASE + url);
  await page.locator(`[data-three="on"]`).first().waitFor({ timeout: 40000 });
  await page.waitForTimeout(4500); // the parts have risen
  await page.addStyleTag({ content: `html,body,.stage-wrap,.stage,.dash-stage{background:transparent!important} body *{visibility:hidden!important} .stage::before,.stage::after,.overlay,.tk-report,.play3d{display:none!important} ${sel}{visibility:visible!important;-webkit-mask-image:none!important;mask-image:none!important;opacity:1!important;filter:none!important;animation:none!important}` });
  const tmp = path.join(here, `.tmp-${name}-${theme}-${size}.png`);
  await page.locator(sel).first().screenshot({ path: tmp, omitBackground: true });
  execFileSync("python3", ["-I", "-c", "import sys;from PIL import Image;i=Image.open(sys.argv[1]).convert('RGBA');r,g,b,a=i.split();i=Image.merge('RGBA',(r,g,b,a.point(lambda v:0 if v<10 else v)));i.thumbnail((int(sys.argv[3]),int(sys.argv[4])));i.save(sys.argv[2],'WEBP',quality=36,method=6,alpha_quality=30)", tmp, path.join(here, `${name}-${theme}-${size}.webp`), String(cfg.out[0]), String(cfg.out[1])]);
  fs.unlinkSync(tmp); await ctx.close(); console.log("made", name, theme, size);
}
await b.close();

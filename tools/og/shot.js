// The link preview image (Open Graph): the live landing page at 1200 x 630, without the buttons that make
// no sense in a picture (sign in, theme, tap to zoom). Run after a redesign with a NEW file name, then use
// that name in frontend/index.html, frontend/dashboard/index.html and OG_IMAGE in frontend/seo.js, so
// WhatsApp, Instagram and LinkedIn fetch it again: they cache a preview image by its address, often for
// weeks. (og.png is kept, with the same picture, for old shares.)
//   node tools/og/shot.js [url] [out]   (needs Playwright with Chromium)
const { chromium } = require("playwright");
const url = process.argv[2] || "https://tech.katta.cc/";
const out = process.argv[3] || "frontend/public/og-2026-11.png";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
  await p.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await p.addStyleTag({ content: ".acct-signin-link,.theme-btn,.zoom-btn,.skip{visibility:hidden!important}*{animation-play-state:paused!important}" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out });
  await b.close();
  console.log("wrote", out);
})().catch((e) => { console.error(e); process.exit(1); });

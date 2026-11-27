import { expect, test, type Browser, type Page } from "@playwright/test";
import { localApi } from "./api";

// How fast the Report popup's picture is there, on a slow phone: 320×579 at 3.375x, touch, the CPU slowed 4x (CDP Emulation.setCPUThrottlingRate), the pages that were
// slowest: /problems, /home (long lists) and /problems/sandbox (a 3D canvas). The time is from the tap on the Visual tab to the picture being in the popup, both read
// inside the page (no round trip to the test in it). Three runs each (a new browser context every time), the median is held to the budget:
//   warm: Report is pressed, one second passes, then Visual is pressed: the picture is there within 500 ms (it was taken while the popup opened)
//   cold: Report is pressed and Visual in the same task in which the popup appears (an in-page click: the quickest anyone could be): within 1500 ms
// A busy shared runner gets 1.5x more (process.env.CI), never a laptop. The numbers are printed ("REPORT SPEED ...") and kept as annotations.
const API = "https://tech-api.katta.cc";
const BUDGET = { warm: 500, cold: 1500 }, SLACK = process.env.CI ? 1.5 : 1, RUNS = 3, RATE = Number(process.env.PERF_RATE || 4); // PERF_RATE=6 or 1 to see another rate: then nothing is asserted
const PAGES = ["/problems", "/home", "/problems/sandbox"];

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function setupPage(page: Page) {
  await page.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };

/** one fresh phone: the page loaded and idle (the Report code and the fonts are ready), then the CPU slowed; returns the cold and the warm time in ms */
async function run(browser: Browser, path: string, steps: string[]) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });
  try {
    await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    const page = await ctx.newPage();
    await setupPage(page);
    await page.goto(`${path}?feedback=on`);
    await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
    if (path.endsWith("/sandbox")) { await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 }); await page.waitForTimeout(2000); }
    // the popup's code and the fonts are loaded when the browser is idle after the page; the mark says it happened (a person takes longer than this to reach for Report)
    await page.waitForFunction(() => performance.getEntriesByName("tk-report:ready").length > 0, undefined, { timeout: 45_000 });
    await page.evaluate(() => {
      const w = window as unknown as { __t0: number; __t1: number };
      document.addEventListener("pointerdown", (e) => { if ((e.target as Element).closest("[data-tab=visual]")) { w.__t0 = performance.now(); w.__t1 = 0; } }, true);
      new MutationObserver(() => { if (!w.__t1 && w.__t0 && document.querySelector(".tk-mk-stage canvas")) w.__t1 = performance.now(); }).observe(document.body, { childList: true, subtree: true });
    });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
    const once = async (wait: number) => {
      await page.evaluate((instant) => {
        const w = window as unknown as { __t0: number; __t1: number };
        try { localStorage.setItem("tk-report-tab", "quick"); } catch { /* blocked */ }
        w.__t0 = 0; w.__t1 = 0;
        // cold: Visual is pressed in the very task in which the popup appears (the quickest a person could possibly be)
        if (instant) { const mo = new MutationObserver(() => { const t = document.querySelector("[data-tab=visual]") as HTMLElement | null; if (t) { mo.disconnect(); w.__t0 = performance.now(); t.click(); } }); mo.observe(document.body, { childList: true, subtree: true }); }
      }, wait === 0);
      await page.locator(".tk-report").tap();
      if (wait) { await expect(page.locator("[data-tab=visual]")).toBeVisible(); await page.waitForTimeout(wait); await page.locator("[data-tab=visual]").tap(); }
      await page.waitForFunction(() => (window as unknown as { __t1: number }).__t1 > 0, undefined, { timeout: 60_000, polling: 50 });
      const ms = await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0; });
      if (!wait) steps.push(await page.evaluate(() => JSON.stringify((window as unknown as { __tkReportPerf: unknown }).__tkReportPerf)));
      await page.locator(".tk-rp-x").tap();
      await expect(page.locator(".tk-report-pop")).toHaveCount(0);
      await page.waitForTimeout(300);
      return Math.round(ms);
    };
    const cold = await once(0), warm = await once(1000);
    return { cold, warm };
  } finally { await ctx.close(); }
}

for (const path of PAGES) {
  test(`the Report picture is fast on a slow phone: ${path} (warm ${BUDGET.warm} ms, cold ${BUDGET.cold} ms, CPU ${RATE}x)`, async ({ browser }) => {
    test.setTimeout(420_000);
    const cold: number[] = [], warm: number[] = [], steps: string[] = []; // steps: where the time of each cold capture went (ms), for when a budget is missed
    for (let i = 0; i < RUNS; i++) { const r = await run(browser, path, steps); cold.push(r.cold); warm.push(r.warm); }
    const line = `REPORT SPEED ${path} at ${RATE}x: cold ${cold.join("/")} median ${median(cold)} ms (budget ${BUDGET.cold * SLACK}), warm ${warm.join("/")} median ${median(warm)} ms (budget ${BUDGET.warm * SLACK}); capture steps of the cold runs ${steps.join(" ")}`;
    console.log(line); test.info().annotations.push({ type: "speed", description: line });
    if (RATE === 4) { expect(median(warm), line).toBeLessThanOrEqual(BUDGET.warm * SLACK); expect(median(cold), line).toBeLessThanOrEqual(BUDGET.cold * SLACK); }
  });
}

// the fonts are read once per page load and never again by a capture
test("the fonts' CSS is made once per page: Latin files only, fetched once, and a capture fetches no font", async ({ page }) => {
  await setupPage(page);
  const hits: string[] = [];
  const FONT = Buffer.from("wOF2fakefontbytes");
  await page.route("https://fonts.test/**", (r) => { hits.push(new URL(r.request().url()).pathname); return r.fulfill({ body: FONT, headers: { "content-type": "font/woff2", "access-control-allow-origin": "*" } }); });
  await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
    const st = document.createElement("style");
    st.textContent = `@font-face{font-family:"Probe Sans";src:url(https://fonts.test/latin.woff2) format("woff2");unicode-range:U+0000-00FF,U+0131}
      @font-face{font-family:"Probe Sans";src:url(https://fonts.test/ext.woff2) format("woff2");unicode-range:U+0100-02BA}
      @font-face{font-family:"Probe Sans";font-weight:700;src:url(https://fonts.test/latin.woff2) format("woff2");unicode-range:U+0000-00FF}`;
    document.head.appendChild(st);
  }));
  await page.goto("/privacy");
  await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
  const r = await page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /\/feedback\.js(\?|$)/.test(n)) as string;
    const m = await import(url.replace("feedback.js", "feedback-capture.js"));
    const blocks = await m.warmFonts(), again = await m.warmFonts(), css = blocks.join("\n");
    return { same: blocks === again || blocks.join("\n") === again.join("\n"), faces: (css.match(/Probe Sans/g) ?? []).length, all: (css.match(/@font-face/g) ?? []).length, inlined: css.includes("data:font/woff2;base64,") || css.includes("data:application/font-woff2;base64,") || css.includes("base64,"), remote: css.includes("fonts.test") };
  });
  expect(r.same).toBe(true);
  expect(r.faces, "the Latin faces only").toBe(2);
  expect(r.inlined && !r.remote, "the file is inside the CSS").toBe(true);
  expect(hits.sort(), "one fetch for the one Latin file").toEqual(["/latin.woff2"]);
  const before = hits.length;
  await page.locator(".tk-report").click();
  await page.locator("[data-tab=visual]").click();
  await expect(page.locator(".tk-mk-stage canvas")).toBeVisible({ timeout: 60_000 });
  expect(hits.length, "the capture fetched no font").toBe(before);
});

// The same, the way a person really does it: the page has been open for 7 s (not waited on for "ready" or calm frames), then real touch taps with the CPU slowed. The time is
// from the moment the browser received the Visual tap (the pointerdown's own timeStamp, which is the input's time, not when the page got round to it) to the picture being in the
// popup, both read in the page: a page too busy to take the tap is caught (this is what found /home taking 1.3 s to answer a tap while its 3D scene went on drawing behind the
// popup). The driver's own clock is checked too, with wider budgets. Budgets in the page: cold 600 ms, warm 150 ms (CI 1.5x).
test(`the Report picture is fast for real taps after 7 s on the page: /home (warm 150 ms, cold 600 ms, CPU ${RATE}x)`, async ({ browser }) => {
  test.setTimeout(420_000);
  const one = async (wait: number) => {
    const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });
    try {
      const page = await ctx.newPage();
      await setupPage(page);
      await page.goto("/home?feedback=on");
      await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(7000);
      await page.evaluate(() => {
        const w = window as unknown as { __in: number; __t1: number };
        w.__in = 0; w.__t1 = 0;
        document.addEventListener("pointerdown", (e) => { if ((e.target as Element).closest("[data-tab=visual]")) w.__in = e.timeStamp; }, true);
        new MutationObserver(() => { if (!w.__t1 && w.__in && document.querySelector(".tk-mk-stage canvas")) w.__t1 = performance.now(); }).observe(document.body, { childList: true, subtree: true });
      });
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
      await page.locator(".tk-report").tap();
      if (wait) await page.waitForTimeout(wait);
      const t0 = Date.now();
      await page.locator("[data-tab=visual]").tap();
      await page.waitForFunction(() => (window as unknown as { __t1: number }).__t1 > 0, undefined, { timeout: 60_000, polling: 50 });
      const driver = Date.now() - t0; // the same, on the test's clock: the driver's own waiting for the page to take the tap is in it
      return { inPage: Math.round(await page.evaluate(() => { const w = window as unknown as { __in: number; __t1: number }; return w.__t1 - w.__in; })), driver };
    } finally { await ctx.close(); }
  };
  const cold: number[] = [], warm: number[] = [], dCold: number[] = [], dWarm: number[] = [];
  for (let i = 0; i < RUNS; i++) { const c = await one(0), w = await one(1000); cold.push(c.inPage); dCold.push(c.driver); warm.push(w.inPage); dWarm.push(w.driver); }
  const line = `REPORT SPEED real taps /home at ${RATE}x: in the page cold ${cold.join("/")} median ${median(cold)} ms (budget ${600 * SLACK}), warm ${warm.join("/")} median ${median(warm)} ms (budget ${150 * SLACK}); on the driver's clock cold ${dCold.join("/")} median ${median(dCold)} (budget ${1100 * SLACK}), warm ${dWarm.join("/")} median ${median(dWarm)} (budget ${400 * SLACK})`;
  console.log(line); test.info().annotations.push({ type: "speed", description: line });
  if (RATE === 4) { expect(median(warm), line).toBeLessThanOrEqual(150 * SLACK); expect(median(cold), line).toBeLessThanOrEqual(600 * SLACK);
    // the driver's clock has its own waiting in it (frames of a throttled page), so its budgets are wider; a page that keeps drawing behind the popup is far over them (1.0 and 1.25 s)
    expect(median(dWarm), line).toBeLessThanOrEqual(400 * SLACK); expect(median(dCold), line).toBeLessThanOrEqual(1100 * SLACK); }
});

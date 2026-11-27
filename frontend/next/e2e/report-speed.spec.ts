import { expect, test, type Browser } from "@playwright/test";
import { localApi } from "./api";

// How fast the Report popup's picture is there, on a slow phone: 320×579 at 3.375x, touch, the CPU slowed 4x (CDP Emulation.setCPUThrottlingRate), the pages that were
// slowest: /problems, /home (long lists) and /problems/sandbox (a 3D canvas). The time is from the tap on the Visual tab to the picture being in the popup, both read
// inside the page (no round trip to the test in it). Three runs each (a new browser context every time), the median is held to the budget:
//   warm: Report is pressed, one second passes, then Visual is pressed: the picture is there within 500 ms (it was taken while the popup opened)
//   cold: Report is pressed and Visual straight after (the moment the popup is up): within 1500 ms
// A busy shared runner gets 1.5x more (process.env.CI), never a laptop. The numbers are printed ("REPORT SPEED ...") and kept as annotations.
const API = "https://tech-api.katta.cc";
const BUDGET = { warm: 500, cold: 1500 }, SLACK = process.env.CI ? 1.5 : 1, RUNS = 3, RATE = 4;
const PAGES = ["/problems", "/home", "/problems/sandbox"];

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

/** one fresh phone: the page loaded and idle (the Report code and the fonts are ready), then the CPU slowed; returns the cold and the warm time in ms */
async function run(browser: Browser, path: string) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });
  try {
    await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    const page = await ctx.newPage();
    await localApi(page, true);
    const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
    await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
    await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
    await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
    await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
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
      await page.evaluate(() => { try { localStorage.setItem("tk-report-tab", "quick"); } catch { /* blocked */ } (window as unknown as { __t0: number }).__t0 = 0; });
      await page.locator(".tk-report").tap();
      const tab = page.locator("[data-tab=visual]");
      await expect(tab).toBeVisible();
      if (wait) await page.waitForTimeout(wait);
      await tab.tap();
      await page.waitForFunction(() => (window as unknown as { __t1: number }).__t1 > 0, undefined, { timeout: 60_000, polling: 50 });
      const ms = await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0; });
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
    const cold: number[] = [], warm: number[] = [];
    for (let i = 0; i < RUNS; i++) { const r = await run(browser, path); cold.push(r.cold); warm.push(r.warm); }
    const line = `REPORT SPEED ${path} at ${RATE}x: cold ${cold.join("/")} median ${median(cold)} ms (budget ${BUDGET.cold * SLACK}), warm ${warm.join("/")} median ${median(warm)} ms (budget ${BUDGET.warm * SLACK})`;
    console.log(line); test.info().annotations.push({ type: "speed", description: line });
    expect(median(warm), line).toBeLessThanOrEqual(BUDGET.warm * SLACK);
    expect(median(cold), line).toBeLessThanOrEqual(BUDGET.cold * SLACK);
  });
}

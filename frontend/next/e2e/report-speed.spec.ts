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
async function run(browser: Browser, path: string) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });
  try {
    await ctx.addInitScript(() => Object.defineProperty(navigator, "webdriver", { get: () => false }));
    const page = await ctx.newPage();
    await setupPage(page);
    if (process.env.PERF_DEBUG) await page.addInitScript(() => { (window as any).__ev = []; const lg = (k: string, v: unknown) => (window as any).__ev.push([Math.round(performance.now()), k, String(v).slice(0, 60)]);
      const T = HTMLCanvasElement.prototype.toDataURL; HTMLCanvasElement.prototype.toDataURL = function (...a: any[]) { const t = performance.now(); const r = (T as any).apply(this, a); lg("TDU-native", `${this.width}x${this.height} ${Math.round(performance.now() - t)}ms top=${Math.round(this.getBoundingClientRect().left)} len=${r.length}`); return r; };
      const f = window.fetch; window.fetch = function (u: any, ...a: any[]) { lg("fetch", u); return (f as any).call(this, u, ...a).finally(() => lg("fetch-done", u)); };
      const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")!; Object.defineProperty(HTMLImageElement.prototype, "src", { get() { return d.get!.call(this); }, set(v) { lg("img-src", String(v).slice(0, 25)); this.addEventListener("load", () => lg("img-load", "")); return d.set!.call(this, v); } }); });
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
      if (process.env.PERF_DEBUG && !wait) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 300 }); await cdp.send("Profiler.start"); }
      await page.locator(".tk-report").tap();
      if (wait) { await expect(page.locator("[data-tab=visual]")).toBeVisible(); await page.waitForTimeout(wait); await page.locator("[data-tab=visual]").tap(); }
      await page.waitForFunction(() => (window as unknown as { __t1: number }).__t1 > 0, undefined, { timeout: 60_000, polling: 50 });
      const ms = await page.evaluate(() => { const w = window as unknown as { __t0: number; __t1: number }; return w.__t1 - w.__t0; });
      await page.locator(".tk-rp-x").tap();
      await expect(page.locator(".tk-report-pop")).toHaveCount(0);
      await page.waitForTimeout(300);
      if (process.env.PERF_DEBUG && !wait) { const { profile } = await cdp.send("Profiler.stop") as any; const by = new Map<string, number>(), nodes = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n])); profile.samples.forEach((id: number, i: number) => { const n = nodes.get(id); const k = `${n.callFrame.functionName || "(anon)"} ${String(n.callFrame.url).split("/").pop()}:${n.callFrame.lineNumber}`; by.set(k, (by.get(k) || 0) + profile.timeDeltas[i] / 1000); }); const par = new Map<number, number>(); profile.nodes.forEach((n: any) => (n.children || []).forEach((c: number) => par.set(c, n.id))); const chain = (id: number) => { const o: string[] = []; for (let i = 0; i < 4 && id; i++) { const n = nodes.get(id); o.push(`${n.callFrame.functionName || "anon"}:${String(n.callFrame.url).split("/").pop()}:${n.callFrame.lineNumber}`); id = par.get(id) as number; } return o.join(" < "); }; const tdu: Record<string, number> = {}; profile.samples.forEach((id: number, i: number) => { if (nodes.get(id).callFrame.functionName === "toDataURL") { const k = chain(par.get(id) as number); tdu[k] = (tdu[k] || 0) + profile.timeDeltas[i] / 1000; } }); console.log("TDU", JSON.stringify(tdu)); console.log("PROFILE", [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${Math.round(v)}ms ${k}`).join(" | ")); }
      if (process.env.PERF_DEBUG) console.log("DEBUG", path, wait ? "warm" : "cold", Math.round(ms), JSON.stringify(await page.evaluate(() => ({ ev: (window as any).__ev.filter((e: any) => e[0] > performance.getEntriesByName("tk-report:tap").slice(-1)[0].startTime - 50), ...(window as any).__tkReportPerf, m: Object.fromEntries(performance.getEntriesByType("mark").filter((x) => x.name.startsWith("tk-report")).map((x) => [x.name.slice(10), Math.round(x.startTime)])) }))));
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

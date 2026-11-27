import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// How fast the Report screenshot is on a slow phone: 320×579 at 3.375x with the CPU 4x slower (CDP Emulation.setCPUThrottlingRate; PERF_RATE=6 to see 6x, nothing is
// asserted then). Two budgets, each the median of three runs on a freshly loaded page, both measured inside the page (performance.now) so the test's own waiting adds nothing:
//  (a) Report pressed, a second passes, Visual pressed: the preview is on the screen within 500 ms of the Visual press;
//  (b) Visual pressed the moment the popup is up (nothing done in advance): the preview is on the screen within 1500 ms of the Report press.
// CI's shared runner is noisier than a laptop: there (CI is set) the budgets are 1.5x. Local runs get no slack.
const RATE = Number(process.env.PERF_RATE || 4), SLACK = process.env.CI ? 1.5 : 1, RUNS = 3;
const API = "https://tech-api.katta.cc", CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
test.use({ viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });

async function prepare(page: Page) {
  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); try { localStorage.setItem("tk-theme", "dark"); } catch { /* blocked */ } });
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
/** the page is loaded and idle work (the popup, the picture library, the fonts) is done: what a person has by the time they press Report */
async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /\/feedback\.js(\?|$)/.test(n));
    if (url) { const m = await import(url.replace("feedback.js", "feedback-capture.js")); await m.warmCapture(); await import(url.replace("feedback.js", "feedback-ui.js")); }
  });
  // the page has finished starting up: twenty frames in a row under 50 ms (a person presses Report after looking at the page, not in its first second)
  await page.evaluate(() => new Promise<void>((ok) => { let n = 0, last = performance.now(); const f = () => { const t = performance.now(); n = t - last > 50 ? 0 : n + 1; last = t; if (n >= 20) ok(); else requestAnimationFrame(f); }; f(); }));
}
type How = "after-a-second" | "at-once";
async function once(page: Page, path: string, how: How): Promise<number> {
  await ready(page, path);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  try {
    return await page.evaluate(async (h) => {
      const until = (q: string, ms: number) => new Promise<void>((ok, no) => { const t0 = performance.now(), tick = () => { if (document.querySelector(q)) ok(); else if (performance.now() - t0 > ms) no(new Error(`${q} never came`)); else requestAnimationFrame(tick); }; tick(); });
      const t0 = performance.now();
      (document.querySelector(".tk-report") as HTMLElement).click();
      await until("[data-tab=visual]", 20_000);
      if (h === "after-a-second") await new Promise((r) => setTimeout(r, 1000));
      const t1 = performance.now();
      (document.querySelector("[data-tab=visual]") as HTMLElement).click();
      await until(".tk-mk-stage canvas", 60_000);
      const t2 = performance.now();
      return h === "after-a-second" ? t2 - t1 : t2 - t0;
    }, how);
  } finally { await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 }); }
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

for (const [label, path] of [["/problems", "/problems"], ["/home", "/home"], ["the sandbox", "/problems/sandbox"]] as const) {
  for (const how of ["after-a-second", "at-once"] as const) {
    test(`Visual feedback at ${RATE}x CPU on ${label}, ${how === "at-once" ? "Visual pressed at once (preview within 1500 ms of Report)" : "Visual pressed a second after Report (preview within 500 ms)"} @phone`, async ({ page }) => {
      test.setTimeout(240_000);
      await prepare(page);
      const runs: number[] = [];
      for (let i = 0; i < RUNS; i++) runs.push(Math.round(await once(page, path, how)));
      const m = median(runs), budget = (how === "at-once" ? 1500 : 500) * SLACK;
      console.log(`PERF ${RATE}x ${path} ${how}: ${runs.join(", ")} ms, median ${m} ms (budget ${budget} ms)`);
      test.info().annotations.push({ type: "perf", description: `${runs.join(", ")} ms, median ${m}` });
      if (RATE === 4) expect(m, `median of ${runs.join(", ")} ms`).toBeLessThanOrEqual(budget);
    });
  }
}

// the fonts are read once per page load and never again by a capture
test("the fonts' CSS is made once per page: Latin files only, fetched once, and a capture fetches no font @phone", async ({ page }) => {
  await prepare(page);
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
    const css = await m.warmFonts(), again = await m.warmFonts();
    return { same: css === again, faces: (css.match(/Probe Sans/g) ?? []).length, all: (css.match(/@font-face/g) ?? []).length, inlined: css.includes("data:font/woff2;base64,") || css.includes("data:application/font-woff2;base64,") || css.includes("base64,"), remote: css.includes("fonts.test") };
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

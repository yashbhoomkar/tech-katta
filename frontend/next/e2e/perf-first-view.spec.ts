import { expect, test, type Browser, type Page } from "@playwright/test";
import { localApi } from "./api";

// The first view on a budget Android phone (task C): 360×740 at 3x, touch, the CPU slowed 4x (CDP), the network 1.6 Mbps down / 750 kbps up / 150 ms latency, the cache off.
// LCP and the long tasks come from PerformanceObserver (blocking = the sum of each long task's time over 50 ms), over the first 6 s after the page has loaded.
// Targets (median of 3): / and /home: LCP <= 2.5 s, blocking <= 300 ms; an article: LCP <= 2.5 s; a tap on a link in the first seconds navigates within 300 ms.
// A busy shared runner gets 1.5x (process.env.CI), never a laptop. The numbers are printed ("FIRST VIEW ...") and kept as annotations.
const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
const SLACK = process.env.CI ? 1.5 : 1, RUNS = 3, WINDOW_MS = 6000;
const TARGET = { lcp: 2500 * SLACK, blocking: 300 * SLACK, tap: 300 * SLACK };
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

/** the page counts the WebGL contexts it is asked for (any canvas) */
const countGl = () => {
  const w = window as unknown as { __gl: number };
  w.__gl = 0;
  const get = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, t: string, ...a: unknown[]) => unknown;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, t: string, ...a: unknown[]) { if (/webgl/.test(t)) w.__gl++; return get.call(this, t, ...a); } as typeof HTMLCanvasElement.prototype.getContext;
};
async function visitor(page: Page) {
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha", email: "asha@example.com" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
  // the fonts come from Google: not part of what is measured (and not reachable from every runner)
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
}

async function phone(browser: Browser) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await visitor(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6e6) / 8, uploadThroughput: 750e3 / 8 });
  await page.addInitScript(countGl);
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __tbt: number; __push: number[]; __down: number[] };
    w.__lcp = 0; w.__tbt = 0; w.__push = []; w.__down = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__tbt += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
    // a tap: from the finger going down to the page changing its address
    addEventListener("pointerdown", () => { w.__down.push(performance.now()); }, true);
    const push = history.pushState.bind(history);
    history.pushState = (...a: Parameters<History["pushState"]>) => { w.__push.push(performance.now()); return push(...a); };
  });
  return { ctx, page };
}
const read = (page: Page) => page.evaluate(() => { const w = window as unknown as { __lcp: number; __tbt: number; __gl: number }; return { lcp: w.__lcp, tbt: w.__tbt, gl: w.__gl }; });

for (const [path, withBlocking] of [["/", true], ["/home", true], ["/learn/concepts/caching", false]] as const) {
  test(`first view on a budget phone: ${path} (LCP ${TARGET.lcp} ms${withBlocking ? `, blocking ${TARGET.blocking} ms` : ""}, CPU 4x)`, async ({ browser }) => {
    test.setTimeout(240_000);
    const lcp: number[] = [], tbt: number[] = [], gl: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const { ctx, page } = await phone(browser);
      try {
        await page.goto(path, { waitUntil: "load" });
        await page.waitForTimeout(WINDOW_MS);
        const m = await read(page);
        lcp.push(Math.round(m.lcp)); tbt.push(Math.round(m.tbt)); gl.push(m.gl);
      } finally { await ctx.close(); }
    }
    const line = `FIRST VIEW ${path}: LCP ${lcp.join("/")} median ${median(lcp)} ms (target ${TARGET.lcp}), blocking ${tbt.join("/")} median ${median(tbt)} ms (target ${withBlocking ? TARGET.blocking : "-"}), WebGL contexts in the window ${gl.join("/")}`;
    console.log(line); test.info().annotations.push({ type: "first-view", description: line });
    expect(median(lcp), line).toBeLessThanOrEqual(TARGET.lcp);
    if (withBlocking) expect(median(tbt), line).toBeLessThanOrEqual(TARGET.blocking);
  });
}

// A problem's page (task H): the brief is drawn from the shell while the workspace's code (some 230 KB) is still on the way, the workspace's files are fetched while the
// gate is being asked, and the page reads each API address once (the article, the list, the site text and the Lab were each asked for two or three times).
test("a problem's page on a budget phone: LCP <= 4 s, the brief first, each API address asked for once", async ({ browser }) => {
  test.setTimeout(240_000);
  const lcp: number[] = [];
  const lcpEl: string[] = [];
  let asked: Record<string, number> = {};
  for (let i = 0; i < RUNS; i++) {
    const { ctx, page } = await phone(browser);
    const seen: Record<string, number> = {};
    page.on("request", (r) => { if (r.url().startsWith(API) && r.method() === "GET") { const p = new URL(r.url()).pathname; seen[p] = (seen[p] || 0) + 1; } });
    await page.addInitScript(() => {
      new PerformanceObserver((l) => { const e = l.getEntries().at(-1) as PerformanceEntry & { element?: Element }; (window as unknown as { __el: string }).__el = e.element ? `${e.element.tagName.toLowerCase()}.${e.element.className}` : ""; }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    try {
      await page.goto("/problems/url-shortener", { waitUntil: "load" });
      await page.waitForTimeout(WINDOW_MS);
      const m = await read(page);
      lcp.push(Math.round(m.lcp)); lcpEl.push(await page.evaluate(() => (window as unknown as { __el: string }).__el));
      asked = seen;
      await expect(page.locator(".solve")).toBeVisible(); // the workspace did arrive, and the brief is gone from under it
      await expect(page.locator(".ws-brief")).toHaveCount(0);
    } finally { await ctx.close(); }
  }
  const line = `FIRST VIEW /problems/url-shortener: LCP ${lcp.join("/")} median ${median(lcp)} ms (target ${4000 * SLACK}), element ${lcpEl[0]}`;
  console.log(line); test.info().annotations.push({ type: "first-view", description: line });
  expect(median(lcp), line).toBeLessThanOrEqual(4000 * SLACK);
  for (const p of ["/v1/articles/url-shortener", "/v1/articles", "/v1/site", "/v1/lab", "/v1/auth/config", "/v1/me"]) expect(asked[p] ?? 0, `${p} asked for ${asked[p]} times: ${JSON.stringify(asked)}`).toBeLessThanOrEqual(1);
});

test("a tap on a link in the first seconds navigates within 300 ms (the landing, CPU 4x)", async ({ browser }) => {
  test.setTimeout(120_000);
  const ms: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const { ctx, page } = await phone(browser);
    try {
      await page.goto("/", { waitUntil: "load" });
      await page.waitForTimeout(1500);
      await page.locator(".hero .actions a[href='/home']").tap();
      await page.waitForFunction(() => (window as unknown as { __push: number[] }).__push.length > 0, undefined, { timeout: 10_000 });
      ms.push(Math.round(await page.evaluate(() => { const w = window as unknown as { __push: number[]; __down: number[] }; return w.__push[0] - w.__down[w.__down.length - 1]; })));
    } finally { await ctx.close(); }
  }
  const line = `TAP TO NAVIGATE: ${ms.join("/")} median ${median(ms)} ms (target ${TARGET.tap})`;
  console.log(line); test.info().annotations.push({ type: "tap", description: line });
  expect(median(ms), line).toBeLessThanOrEqual(TARGET.tap);
});

// ---- 3D is asked for, not started: reduced motion, weak devices ----
async function gl(page: Page) { return page.evaluate(() => (window as unknown as { __gl: number }).__gl); }

test("reduced motion: no WebGL context on the landing, Home or an article until it is asked for; the poster shows and Play in 3D starts it", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 1366, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await visitor(page);
  await page.addInitScript(countGl);
  try {
    await page.goto("/");
    await expect(page.locator("img.poster")).toBeVisible();
    await expect(page.locator(".stage .play3d")).toBeVisible();
    await page.waitForTimeout(8000); // longer than the time after which the engine would start by itself
    expect(await gl(page), "landing: nothing started by itself").toBe(0);
    expect(await page.evaluate(() => performance.getEntriesByType("resource").some((r) => /three\.module/.test(r.name))), "three.js was not even fetched").toBe(false);
    await page.goto("/home");
    await expect(page.locator(".dash-stage .play3d")).toBeVisible();
    await page.waitForTimeout(7000);
    expect(await gl(page), "Home: nothing started by itself").toBe(0);
    await page.goto("/learn/concepts/caching");
    await expect(page.locator(".reader")).toBeVisible(); // reduced motion opens the text, not the story
    await expect(page.locator(".stage canvas")).toHaveCount(0);
    await page.waitForTimeout(7000);
    expect(await gl(page), "article: nothing started by itself").toBe(0);
    // on demand it works
    await page.goto("/");
    await page.locator(".stage .play3d").click();
    await expect(page.locator(".stage[data-three='on']")).toBeVisible({ timeout: 30_000 });
    expect(await gl(page), "Play in 3D draws").toBeGreaterThan(0);
  } finally { await ctx.close(); }
});

test("a weak phone (4 cores) keeps the poster and offers Play in 3D, on the landing and Home @phone", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await visitor(page);
  await page.addInitScript(() => Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 }));
  await page.addInitScript(countGl);
  try {
    await page.goto("/");
    await expect(page.locator(".stage .play3d")).toBeVisible();
    await expect(page.locator("img.poster")).toBeVisible();
    await page.waitForTimeout(8000);
    expect(await gl(page)).toBe(0);
    await page.goto("/home");
    await expect(page.locator(".dash-stage .play3d")).toBeVisible();
    await page.locator(".dash-stage .play3d").click();
    await expect(page.locator(".dash-stage[data-three='on']")).toBeVisible({ timeout: 30_000 });
  } finally { await ctx.close(); }
});

test("a strong device starts the 3D by itself after the first view, and the poster gives way to the canvas", async ({ page }) => {
  test.setTimeout(90_000);
  await visitor(page);
  await page.addInitScript(countGl);
  await page.goto("/");
  await expect(page.locator("img.poster")).toBeVisible();
  expect(await gl(page), "the first view draws no 3D").toBe(0);
  await expect(page.locator(".stage[data-three='on']")).toBeVisible({ timeout: 40_000 });
  expect(await gl(page)).toBeGreaterThan(0);
});

// ---- Reading: Story | Text ----
test.describe("Reading: Story | Text", () => {
  test("wide screens open the text, with a still diagram and no WebGL; the choice is remembered", async ({ page }) => {
    await visitor(page);
    await page.addInitScript(countGl);
    await page.goto("/learn/concepts/caching");
    await expect(page.locator(".reader")).toBeVisible();
    await expect(page.locator(".stage")).toHaveCount(0);
    await expect(page.locator(".reading [data-reading=text]")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator(".fig-card .fig-svg svg")).toBeVisible(); // a still diagram beside the text
    await page.waitForTimeout(1500);
    expect(await gl(page), "Text mode: no WebGL").toBe(0);
    // the other mode, and it sticks across a reload
    await page.locator(".reading [data-reading=story]").click();
    await expect(page.locator(".stage")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("tk-reading"))).toBe("story");
    await page.reload();
    await expect(page.locator(".stage")).toBeVisible();
    await expect(page.locator(".reading [data-reading=story]")).toHaveAttribute("aria-checked", "true");
    await page.locator(".reading [data-reading=text]").click();
    await expect(page.locator(".stage")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("tk-reading"))).toBe("text");
  });

  test("phones open the story, until the reader chooses Text @phone", async ({ page }) => {
    await visitor(page);
    await page.goto("/learn/concepts/caching");
    await expect(page.locator(".stage")).toBeVisible();
    await expect(page.locator(".reading [data-reading=story]")).toHaveAttribute("aria-checked", "true");
    await page.locator(".reading [data-reading=text]").click();
    await expect(page.locator(".stage")).toHaveCount(0);
    await expect(page.locator(".reader")).toBeVisible();
    await page.goto("/learn/concepts/sharding");
    await expect(page.locator(".stage")).toHaveCount(0); // remembered for every article
  });

  test("with storage blocked the control still works for the page", async ({ page }) => {
    await visitor(page);
    await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get: () => { throw new Error("blocked"); } }); });
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/learn/concepts/caching");
    await expect(page.locator(".reader")).toBeVisible();
    await page.locator(".reading [data-reading=story]").click();
    await expect(page.locator(".stage")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

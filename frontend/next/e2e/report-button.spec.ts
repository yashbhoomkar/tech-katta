import { devices, expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The Report button (site3d/scripts/feedback.js): ours, on every page, and it does not depend on BugDrop's script to appear. Automated browsers are skipped
// by the button (navigator.webdriver), so these tests say they are not one.
const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function visit(page: Page) {
  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); try { localStorage.setItem("tk-design-view", "2d"); } catch { /* blocked */ } });
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
/** the button is on the screen, and it (not something drawn over it) is what a finger at its centre reaches */
async function reachable(page: Page, what: string) {
  const r = await page.evaluate(() => {
    const b = document.querySelector(".tk-report") as HTMLElement | null;
    if (!b) return null;
    const box = b.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2, hit = document.elementFromPoint(x, y);
    return { inside: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, w: box.width, h: box.height, hit: !!hit && b.contains(hit), over: hit ? `${hit.tagName}.${String(hit.className).slice(0, 40)}` : "" };
  });
  expect(r, `${what}: the Report button is drawn`).not.toBeNull();
  expect(r?.inside, `${what}: inside the screen`).toBe(true);
  expect(r?.hit, `${what}: not covered (something else is at its centre: ${r?.over})`).toBe(true);
  expect(r?.w, `${what}: wide enough to press`).toBeGreaterThanOrEqual(28);
  expect(r?.h, `${what}: tall enough to press`).toBeGreaterThanOrEqual(44);
}

const PAGES: [string, string][] = [
  ["the landing page", "/"], ["Home", "/home"], ["a Learn list", "/learn/concepts"], ["an article", "/learn/concepts/caching"], ["Solve", "/problems"],
  ["a problem", "/problems/url-shortener"], ["a challenge", "/problems/challenge/one-server"], ["the sandbox", "/problems/sandbox"], ["a shared design", "/problems/shared"], ["a practice problem", "/practice"],
  ["a warm-up", "/simulator/ind-vs-pak"], ["You", "/me"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Quick Notes", "/learn/quick-notes"], ["a page that is not there", "/no-such-page"],
  ["/health", "/health"], ["/analytics", "/analytics"],
];
for (const [label, path] of PAGES) {
  test(`on ${label} the Report button is there and nothing covers it @phone`, async ({ page }) => {
    await visit(page);
    await page.goto(path);
    await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
    await reachable(page, path);
  });
}
// the same on a wide screen (the desktop project has no @phone tag), for one page of each kind: the phone run above has all eighteen, and every extra WebGL page
// makes the shared CI runner's browser more likely to crash in the two slow 3D tests
const WIDE = new Set(["/", "/home", "/problems", "/problems/url-shortener", "/problems/sandbox", "/problems/challenge/one-server", "/simulator/ind-vs-pak", "/privacy", "/no-such-page", "/health", "/analytics"]);
for (const [label, path] of PAGES.filter(([, p]) => WIDE.has(p))) {
  test(`on ${label} the Report button is there and nothing covers it`, async ({ page }) => {
    await visit(page);
    await page.goto(path);
    await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
    await reachable(page, path);
  });
}

test("?feedback=off hides it in this browser and ?feedback=on brings it back", async ({ page }) => {
  await visit(page);
  await page.goto("/home?feedback=off");
  await expect(page.locator(".tk-report")).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.locator(".tk-report")).toHaveCount(0);
  await page.goto("/home?feedback=on");
  await expect(page.locator(".tk-report")).toBeVisible();
});

const WORKER = "https://bugdrop.neonwatty.workers.dev/api/feedback";
type Sent = { repo: string; title: string; description: string; category: string; screenshot: string | null; attachments: unknown[]; metadata: { url: string; userAgent: string; viewport: { width: number; height: number }; timestamp: string; appVersion: string; devicePixelRatio: number; language: string } };
/** the worker, mocked: no real issue is made in CI; every request it gets is kept */
async function worker(page: Page, status = 200) {
  const got: Sent[] = [];
  await page.route(WORKER, async (r) => {
    const body = JSON.parse(r.request().postData() ?? "{}"); got.push(body);
    // like the real worker: a screenshot must be a PNG data URL (it answers 400 INVALID_SCREENSHOT to anything else)
    if (body.screenshot != null && !String(body.screenshot).startsWith("data:image/png;base64,")) { await r.fulfill({ status: 400, json: { error: "Invalid screenshot format. Expected a PNG data URL.", code: "INVALID_SCREENSHOT" } }); return; }
    await (status === 200 ? r.fulfill({ json: { success: true, issueNumber: 9, issueUrl: "https://github.com/x/y/issues/9" } }) : r.fulfill({ status, json: { error: "no" } }));
  });
  return got;
}
const setup = async (page: Page, theme: "dark" | "light", view: "2d" | "3d" = "2d") => {
  await visit(page);
  await page.addInitScript(([t, v]) => { try { localStorage.setItem("tk-theme", t); localStorage.setItem("tk-design-view", v); } catch { /* blocked */ } }, [theme, view]);
};
/** the picture in the preview: its size, how many different colours it has, and how many in the part where the page's canvas was (from `rect`, in page pixels) */
async function analyse(page: Page, rect: { x: number; y: number; w: number; h: number } | null) {
  return page.evaluate(async (r) => {
    const img = document.querySelector(".tk-rp-shot img") as HTMLImageElement | null;
    if (!img) return null;
    await img.decode();
    const k = img.naturalWidth / innerWidth, c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(img, 0, 0);
    const count = (x: number, y: number, w: number, h: number) => { const d = g.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))).data, seen = new Set<string>(); for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`); return seen.size; };
    return { w: img.naturalWidth, h: img.naturalHeight, src: img.src.split(",")[0], bytes: Math.floor(((img.src.split(",")[1] ?? "").length * 3) / 4), all: count(0, 0, c.width, c.height), region: r ? count(r.x * k, r.y * k, r.w * k, r.h * k) : -1 };
  }, rect);
}
const popup = (page: Page) => page.locator(".tk-report-pop");

for (const theme of ["dark", "light"] as const) {
  test(`Quick feedback, ${theme}: Bug by default, text only, the title is the first line, the address has no query, then "Sent, thank you" @phone`, async ({ page }) => {
    await setup(page, theme);
    const got = await worker(page);
    await page.goto("/home?x=secret&feedback=on#frag");
    await page.locator(".tk-report").click();
    await expect(popup(page)).toBeVisible();
    await expect(page.locator(".tk-rp-tabs [role=tab]")).toHaveText(["Quick feedback", "Visual feedback"]);
    await expect(page.locator(".tk-rp-tabs [aria-selected=true]")).toHaveText("Quick feedback");
    await expect(page.locator("[data-chip=bug]")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("[data-send]")).toBeDisabled();
    await page.locator("[data-msg]").fill("The Home page card does not open\nI tapped Start twice and nothing happened.");
    await page.locator("[data-send]").click();
    await expect(page.locator(".tk-rp-done")).toContainText("Sent, thank you");
    expect(got).toHaveLength(1);
    expect(got[0].repo).toBe("yashbhoomkar/tech-katta-feedback");
    expect(got[0].title).toBe("The Home page card does not open");
    expect(got[0].category).toBe("bug");
    expect(got[0].screenshot).toBeNull();
    expect(got[0].description).toContain("I tapped Start twice");
    expect(got[0].metadata.url).toMatch(/\/home$/);
    expect(got[0].metadata.viewport.width).toBeGreaterThan(0);
    expect(got[0].metadata.appVersion).not.toBe("");
    await page.locator(".tk-rp-x").click();
    await expect(popup(page)).toHaveCount(0);
  });
  test(`Quick feedback, ${theme}, on a wide screen: an Idea is a feature, Esc closes it`, async ({ page }) => {
    await setup(page, theme);
    const got = await worker(page);
    await page.goto("/privacy");
    await page.locator(".tk-report").click();
    await page.locator("[data-chip=idea]").click();
    await page.locator("[data-msg]").fill("x".repeat(200));
    await page.locator("[data-send]").click();
    await expect(page.locator(".tk-rp-done")).toBeVisible();
    expect(got[0].category).toBe("feature");
    expect(got[0].title).toHaveLength(80);
    await page.keyboard.press("Escape");
    await expect(popup(page)).toHaveCount(0);
  });
}

test("the tab you used last is the one that opens, BugDrop's script is never loaded, and Back closes the popup @phone", async ({ page }) => {
  await setup(page, "dark");
  await worker(page);
  const asked: string[] = [];
  page.on("request", (r) => { if (r.url().includes("bugdrop") && r.url().endsWith(".js")) asked.push(r.url()); });
  await page.goto("/privacy");
  await page.locator(".tk-report").click();
  await page.locator("[data-tab=visual]").click();
  await expect(page.locator(".tk-rp-shot img, .tk-rp-shot.fail")).toBeVisible({ timeout: 60_000 });
  await page.locator(".tk-rp-x").click();
  await page.locator(".tk-report").click();
  await expect(page.locator(".tk-rp-tabs [aria-selected=true]")).toHaveText("Visual feedback");
  const url = page.url();
  await page.goBack();
  await expect(popup(page)).toHaveCount(0);
  expect(page.url()).toBe(url);
  expect(asked, "BugDrop's script is not loaded").toEqual([]);
});

test("a swipe down on the handle closes the sheet @phone", async ({ page }) => {
  await setup(page, "dark");
  await page.goto("/privacy");
  await page.locator(".tk-report").click();
  await expect(popup(page)).toBeVisible();
  const g = await page.locator(".tk-rp-grab").boundingBox();
  if (!g) throw new Error("no handle");
  const cdp = await page.context().newCDPSession(page);
  const send = (type: "touchStart" | "touchMove" | "touchEnd", y: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: g.x + g.width / 2, y, id: 0 }] });
  await send("touchStart", g.y + 10);
  for (let i = 1; i <= 8; i++) { await send("touchMove", g.y + 10 + i * 25); await page.waitForTimeout(16); }
  await send("touchEnd", 0);
  await expect(popup(page)).toHaveCount(0);
});

for (const theme of ["dark", "light"] as const) {
  test(`Visual feedback, ${theme}: the page is photographed when the tab opens, with its 3D canvas, and sent with the note`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, theme, "3d");
    const got = await worker(page);
    await page.goto("/problems/sandbox?feedback=on");
    await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500); // the part is drawn
    const rect = await page.evaluate(() => { const r = (document.querySelector(".d3 canvas") as HTMLElement).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.locator(".tk-report").click();
    await page.locator("[data-tab=visual]").click();
    await expect(page.locator(".tk-rp-shot img")).toBeVisible({ timeout: 60_000 });
    // the popup and the button are back, and so is the canvas
    await expect(popup(page)).toBeVisible();
    await expect(page.locator(".tk-report")).toBeVisible();
    const a = await analyse(page, rect);
    expect(a?.src).toBe("data:image/png;base64");
    expect(Math.max(a?.w ?? 0, a?.h ?? 0)).toBeLessThanOrEqual(1600);
    expect(a?.bytes ?? 0).toBeLessThan(4_000_000);
    expect(a?.all ?? 0, "the picture is not blank").toBeGreaterThan(12);
    expect(a?.region ?? 0, "the canvas area of the picture is not blank (a DOM-only capture draws a WebGL canvas empty)").toBeGreaterThan(5);
    await page.locator("[data-note]").fill("The part looks wrong");
    await page.locator("[data-send]").click();
    await expect(page.locator(".tk-rp-done")).toContainText("Sent, thank you");
    expect(got[0].screenshot?.startsWith("data:image/png;base64,")).toBe(true);
    expect(got[0].title).toBe("The part looks wrong");
    expect(got[0].description).toContain("The part looks wrong");
    expect(got[0].description).not.toContain("capture failed");
  });
}

test("the 3D renderer does not keep its drawing buffer for the screenshot: one frame is drawn again and read when it is taken", async ({ page }) => {
  test.setTimeout(120_000);
  await setup(page, "dark", "3d");
  await worker(page);
  await page.goto("/problems/sandbox");
  await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  const kept = await page.evaluate(() => { const c = document.querySelector(".d3 canvas") as HTMLCanvasElement, gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null; return gl ? gl.getContextAttributes()?.preserveDrawingBuffer : "no context"; });
  expect(kept, "preserveDrawingBuffer is off").toBe(false);
  await page.locator(".tk-report").click();
  await page.locator("[data-tab=visual]").click();
  await expect(page.locator(".tk-rp-shot img")).toBeVisible({ timeout: 60_000 });
  const a = await analyse(page, await page.evaluate(() => { const r = (document.querySelector(".d3 canvas") as HTMLElement).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
  expect(a?.region ?? 0, "the canvas area of the picture is not blank").toBeGreaterThan(5);
});

test.describe("a low-end phone: 320×579 at 3.375x", () => {
  test.use({ viewport: { width: 320, height: 579 }, deviceScaleFactor: 3.375, isMobile: true, hasTouch: true });
  test("Visual feedback takes a picture there, inside 1600 px, with the canvas @phone", async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, "dark", "3d");
    const got = await worker(page);
    await page.goto("/problems/sandbox");
    await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    const rect = await page.evaluate(() => { const r = (document.querySelector(".d3 canvas") as HTMLElement).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    await page.locator(".tk-report").click();
    await page.locator("[data-tab=visual]").click();
    await expect(page.locator(".tk-rp-shot img")).toBeVisible({ timeout: 60_000 });
    const a = await analyse(page, rect);
    expect(a?.w).toBe(640); // a pixel ratio of 2, not 3.375
    expect(Math.max(a?.w ?? 0, a?.h ?? 0)).toBeLessThanOrEqual(1600);
    expect(a?.all ?? 0).toBeGreaterThan(12);
    expect(a?.region ?? 0).toBeGreaterThan(5);
    await bigEnoughButtons(page);
    await page.locator("[data-send]").click();
    await expect(page.locator(".tk-rp-done")).toBeVisible();
    expect(got[0].metadata.devicePixelRatio).toBeCloseTo(3.375, 2);
    expect(got[0].metadata.viewport).toEqual({ width: 320, height: 579 });
  });
});
async function bigEnoughButtons(page: Page) {
  // Retake and Send are on the screen of a small phone (the sheet scrolls, the actions stay at its foot)
  const r = await page.evaluate(() => ["[data-retake]", "[data-send]"].map((q) => { const b = (document.querySelector(q) as HTMLElement).getBoundingClientRect(); return [b.top >= 0 && b.bottom <= innerHeight, b.height]; }));
  for (const [inside, h] of r) { expect(inside, "the action is on the screen").toBe(true); expect(h).toBeGreaterThanOrEqual(44); }
}

test("Visual feedback when the picture cannot be taken: it says so, the note still goes, and the issue says why @phone", async ({ page }) => {
  await setup(page, "dark");
  const got = await worker(page);
  await page.route("**/vendor/html-to-image.esm.js", (r) => r.abort());
  await page.goto("/privacy");
  await page.locator(".tk-report").click();
  await page.locator("[data-tab=visual]").click();
  await expect(page.locator(".tk-rp-shot.fail")).toContainText("Couldn't take the screenshot");
  await page.locator("[data-note]").fill("Still want to tell you");
  await page.locator("[data-send]").click();
  await expect(page.locator(".tk-rp-done")).toBeVisible();
  expect(got[0].screenshot).toBeNull();
  expect(got[0].description).toMatch(/Screenshot: capture failed \(.+\)/);
});

test("when the worker refuses or cannot be reached: a prefilled GitHub issue and Copy details; the report is kept @phone", async ({ page, context }) => {
  await setup(page, "dark");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  await worker(page, 500);
  await page.goto("/privacy");
  await page.locator(".tk-report").click();
  await page.locator("[data-msg]").fill("It broke on the policy page");
  await page.locator("[data-send]").click();
  const fall = page.locator(".tk-rp-done");
  await expect(fall).toContainText("We could not send your report from here.");
  const href = (await fall.locator("a.main").getAttribute("href")) ?? "";
  expect(href).toContain("https://github.com/yashbhoomkar/tech-katta-feedback/issues/new");
  const u = new URL(href);
  expect(u.searchParams.get("title")).toBe("It broke on the policy page");
  expect(u.searchParams.get("body")).toContain("/privacy");
  await fall.getByRole("button", { name: "Copy details" }).click();
  await expect(fall.locator(".tk-rp-note")).toContainText("Copied");
  await fall.getByRole("button", { name: "Back to my report" }).click();
  await expect(page.locator("[data-msg]")).toHaveValue("It broke on the policy page");
  // the service blocked altogether (an ad blocker): the same way out
  await page.unroute(WORKER);
  await page.route(WORKER, (r) => r.abort());
  await page.locator("[data-send]").click();
  await expect(page.locator(".tk-rp-done")).toContainText("We could not send your report from here.");
});

test("one report per 30 seconds, and a bot that fills the hidden field is told it worked without anything being sent", async ({ page }) => {
  await setup(page, "dark");
  const got = await worker(page);
  await page.goto("/privacy");
  await page.locator(".tk-report").click();
  await page.locator("[data-msg]").fill("first");
  await page.locator("[data-send]").click();
  await expect(page.locator(".tk-rp-done")).toContainText("Sent, thank you");
  await page.locator(".tk-rp-x").click();
  await page.locator(".tk-report").click();
  await page.locator("[data-msg]").fill("second, right away");
  await page.locator("[data-send]").click();
  await expect(page.locator("[data-status]")).toContainText(/Please wait \d+ s/);
  expect(got).toHaveLength(1);
  await page.evaluate(() => localStorage.removeItem("tk-report-at"));
  await page.locator(".tk-rp-hp").evaluate((e) => { (e as HTMLInputElement).value = "http://spam"; });
  await page.locator("[data-send]").click();
  await expect(page.locator(".tk-rp-done")).toContainText("Sent, thank you");
  expect(got).toHaveLength(1);
});

// the phone workspace: the tab stays clear of the header, Run, the switch and the corner buttons, and stays reachable over a sheet and in a replay
for (const landscape of [false, true]) {
  test.describe(`the phone workspace, ${landscape ? "landscape" : "portrait"}`, () => {
    const d = { ...devices["Pixel 7"] } as Partial<(typeof devices)[string]>;
    delete d.defaultBrowserType;
    const vp = devices["Pixel 7"].viewport;
    test.use({ ...(d as Omit<(typeof devices)[string], "defaultBrowserType">), viewport: landscape ? { width: vp.height, height: vp.width } : vp });
    test(`the Report button is clear of the controls, over the sheets and in a replay @phone`, async ({ page }) => {
      test.setTimeout(120_000);
      await visit(page);
      await page.goto("/problems/url-shortener");
      await page.locator(".ph-start button").click();
      await expect(page.locator(".solve.ph.pv-design")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1200);
      const clear = async (when: string) => {
        const hits = await page.evaluate(() => {
          const b = document.querySelector(".tk-report")?.getBoundingClientRect();
          if (!b) return ["no button"];
          return [".ph-head", ".ph-run", ".ph-sw", ".ph-add", ".ph-corner", ".ph-rx"].filter((q) => Array.from(document.querySelectorAll(q)).some((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom); }));
        });
        expect(hits, `${when}: the button covers none of these`).toEqual([]);
      };
      await reachable(page, "design"); await clear("design");
      await page.locator(".ph-add").click();
      await expect(page.locator(".ph-sheet")).toBeVisible();
      await reachable(page, "over the parts sheet");
      await page.goBack();
      await expect(page.locator(".ph-sheet")).toHaveCount(0);
      await page.locator(".ph-run").click();
      await expect(page.locator(".solve.ph.pv-results .sv-console")).toBeVisible({ timeout: 60_000 });
      await reachable(page, "results"); await clear("results");
      await expect(page.locator(".sv-results > li").first()).toBeAttached();
      await page.evaluate(() => document.querySelectorAll(".sv-results details").forEach((x) => ((x as HTMLDetailsElement).open = true)));
      const replay = page.locator(".sv-watch", { hasText: "Replay" }).first();
      await expect(replay, "the run has a load test to replay").toBeVisible({ timeout: 15_000 });
      await replay.click({ timeout: 15_000 });
      await expect(page.locator(".solve.ph.pv-replay")).toBeVisible();
      await page.waitForTimeout(800);
      await reachable(page, "replay"); await clear("replay");
    });
  });
}

import { devices, expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The Report button (site3d/scripts/feedback.js): ours, on every page, and it does not depend on BugDrop's script to appear. Automated browsers are skipped
// by the button (navigator.webdriver), so these tests say they are not one.
const API = "https://tech-api.katta.cc", BUGDROP = "https://bugdrop.neonwatty.workers.dev/**";
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
// the same pages on a wide screen (the desktop project has no @phone tag)
for (const [label, path] of PAGES) {
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

test("blocked: the button still shows, BugDrop is asked for only when it is pressed, and a sheet offers an issue and the details", async ({ page, context }) => {
  await visit(page);
  const asked: string[] = [];
  await page.route(BUGDROP, (r) => { asked.push(r.request().url()); return r.abort(); });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
  expect(asked, "nothing is sent to BugDrop before the button is pressed").toEqual([]);
  await page.locator(".tk-report").click();
  const sheet = page.locator(".tk-report-sheet");
  await expect(sheet).toBeVisible({ timeout: 10_000 });
  await expect(sheet).toContainText("Your browser blocked the report form.");
  expect(asked.length).toBeGreaterThan(0);
  const href = (await sheet.locator("a.main").getAttribute("href")) ?? "";
  expect(href).toContain("https://github.com/yashbhoomkar/tech-katta-feedback/issues/new");
  const body = new URL(href).searchParams.get("body") ?? "";
  expect(body).toContain("/problems/url-shortener");
  expect(body).toMatch(/Window: \d+×\d+/);
  await sheet.getByRole("button", { name: "Copy details" }).click();
  await expect(sheet.locator(".tk-report-note")).toContainText("Copied");
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toHaveCount(0);
  // pressed again: it tries again
  const before = asked.length;
  await page.locator(".tk-report").click();
  await expect(sheet).toBeVisible({ timeout: 10_000 });
  expect(asked.length).toBeGreaterThan(before);
});

test("not blocked: BugDrop is loaded with its own button off and opened through its API", async ({ page }) => {
  await visit(page);
  // a stand-in for the widget: what matters here is how it is loaded and that window.BugDrop.open() is what the button calls
  await page.route(BUGDROP, (r) => r.fulfill({ contentType: "text/javascript", body: "window.BugDrop={open:()=>{document.body.dataset.bugdrop='open'}};" }));
  await page.goto("/home");
  await expect(page.locator(".tk-report")).toBeVisible();
  await expect(page.locator("script[data-tk-feedback]")).toHaveCount(0);
  await page.locator(".tk-report").click();
  await expect(page.locator("body")).toHaveAttribute("data-bugdrop", "open");
  await expect(page.locator("script[data-tk-feedback]")).toHaveAttribute("data-button", "false");
  await expect(page.locator(".tk-report-sheet")).toHaveCount(0);
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

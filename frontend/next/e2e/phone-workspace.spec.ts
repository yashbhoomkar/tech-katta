import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import { localApi } from "./api";
import { lite3d } from "./lite3d";

// The phone workspace (tech-katta-context 53 §5, phase 3): one header, Problem · Design · Results, a parts sheet, a bar for the selected part, settings as a
// sheet. Touch is real here: Input.dispatchTouchEvent over CDP (touchStart, touchMove steps, touchEnd), because clicks and synthetic scrolls missed two
// bugs a real Android phone showed (a settings sheet that could not be closed, a parts row that could not be swiped).
const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function signedIn(page: Page, theme: "dark" | "light", view: "2d" | "3d") {
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.addInitScript(([t, v]) => { try { localStorage.setItem("tk-theme", t); localStorage.setItem("tk-design-view", v); } catch { /* blocked */ } }, [theme, view]);
}
async function touch(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  // the events carry their own times: a phone that is busy when the press arrives has not held it longer (a long press is 450 ms and more)
  let clock = Date.now() / 1000;
  const send = (type: "touchStart" | "touchMove" | "touchEnd", pts: { x: number; y: number }[], after = 0.016) => { clock += after; return cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: 0 })), timestamp: clock }); };
  return {
    tap: async (x: number, y: number) => { clock = Math.max(clock, Date.now() / 1000); await send("touchStart", [{ x, y }], 0); await send("touchEnd", [], 0.06); },
    swipe: async (x1: number, y1: number, x2: number, y2: number, steps = 10) => {
      clock = Math.max(clock, Date.now() / 1000);
      await send("touchStart", [{ x: x1, y: y1 }]);
      for (let i = 1; i <= steps; i++) { await send("touchMove", [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }]); await page.waitForTimeout(16); }
      await send("touchEnd", []);
      // a tap during the fling that follows only stops it: wait until nothing scrolls any more
      let last = "", still = 0;
      for (let i = 0; i < 60 && still < 4; i++) { await page.waitForTimeout(120); const now = await page.evaluate(() => Array.from(document.querySelectorAll(".sv-q, .ph-sh-body")).map((e) => e.scrollTop).join(",")); still = now === last ? still + 1 : 0; last = now; }
    },
  };
}
type Touch = Awaited<ReturnType<typeof touch>>;
const box = async (l: Locator) => { const b = await l.boundingBox(); if (!b) throw new Error("not on screen"); return b; };
const mid = async (l: Locator) => { await l.scrollIntoViewIfNeeded(); const b = await l.boundingBox(); if (!b) throw new Error("not on screen"); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const tapOn = async (t: Touch, l: Locator) => { const p = await mid(l); await t.tap(p.x, p.y); };
const count = (page: Page, sel: string) => page.locator(sel).count();
async function settled(page: Page, sel: string) {
  let last = await count(page, sel), since = Date.now();
  for (let i = 0; i < 120; i++) { await page.waitForTimeout(250); const now = await count(page, sel); if (now !== last) { last = now; since = Date.now(); } else if (Date.now() - since >= 1500) return now; }
  return last;
}
const ratio = (page: Page) => page.evaluate(() => (document.querySelector(".lab-canvas") as HTMLElement).getBoundingClientRect().height / innerHeight);
/** every control the visitor presses is at least 44 by 44 */
async function bigEnough(page: Page, sel: string) {
  const sizes = await page.locator(sel).evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).map((e) => { const r = e.getBoundingClientRect(); return [(e as HTMLElement).innerText.trim().slice(0, 20) || e.getAttribute("aria-label") || e.className, Math.round(r.width), Math.round(r.height)]; }));
  expect(sizes.length, `${sel} has controls`).toBeGreaterThan(0);
  for (const [name, w, h] of sizes) { expect(w, `${name} wide`).toBeGreaterThanOrEqual(44); expect(h, `${name} tall`).toBeGreaterThanOrEqual(44); }
}
const phone = (name: "iPhone 13" | "Pixel 7") => { const d = { ...devices[name] } as Partial<(typeof devices)[string]>; delete d.defaultBrowserType; return d as Omit<(typeof devices)[string], "defaultBrowserType">; };

/** the challenge and the sandbox use the same focus screen: the 5.6 checks on one of each profile and theme (the problem has all eight) */
for (const [name, landscape, theme, path, first] of [
  ["Pixel 7", false, "dark", "/problems/challenge/one-server", true], ["iPhone 13", false, "light", "/problems/challenge/one-server", true], ["Pixel 7", true, "light", "/problems/challenge/one-server", true], ["iPhone 13", true, "dark", "/problems/challenge/one-server", true],
  ["Pixel 7", false, "light", "/problems/sandbox", false], ["iPhone 13", false, "dark", "/problems/sandbox", false], ["Pixel 7", true, "dark", "/problems/sandbox", false], ["iPhone 13", true, "light", "/problems/sandbox", false],
] as const) {
  test.describe(`${path} on ${name} ${landscape ? "landscape" : "portrait"} ${theme}`, () => {
    const d = phone(name);
    test.use({ ...d, viewport: landscape ? { width: d.viewport.height, height: d.viewport.width } : d.viewport });
    test("layout: bars step aside, the canvas gets the screen, nothing is wider than it @phone", async ({ page }) => {
      await signedIn(page, theme, "2d");
      await page.goto(path);
      await expect(page.locator(".solve.ph")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#top")).toBeHidden(); await expect(page.locator(".tabbar")).toBeHidden();
      const t = await touch(page);
      // a challenge opens on its brief, the sandbox on its canvas; the sandbox has no Problem view
      if (first) { await expect(page.locator(".solve.ph.pv-problem")).toBeVisible(); await tapOn(t, page.locator(".ph-start button")); }
      await expect(page.locator(".solve.ph.pv-design")).toBeVisible();
      await expect(page.locator(".lab-canvas")).toBeVisible({ timeout: 30_000 });
      await expect(page.locator(".ph-sw button")).toHaveText(first ? ["Problem", "Design", "Results"] : ["Design", "Results"]);
      expect(await ratio(page), "canvas share of the screen").toBeGreaterThanOrEqual(landscape ? 0.75 : 0.7);
      expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth), "no sideways scroll").toBe(true);
      const wide = await page.evaluate(() => Array.from(document.querySelectorAll(".ph-head, .ph-head *, .ph-sw, .ph-sw *")).filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.className));
      expect(wide).toEqual([]);
      await bigEnough(page, ".ph-head :is(a, button), .ph-sw button, .ph-add, .ph-corner button");
      for (const gone of [".lab-name", ".lab-view", ".d3-tools", ".lab-status", ".lab-top"]) await expect(page.locator(gone).first(), gone).toBeHidden();
      await tapOn(t, page.locator(".ph-back-btn"));
      await expect(page).toHaveURL(/\/problems(#challenges)?$/);
      await expect(page.locator(".tabbar")).toBeVisible();
    });
  });
}

for (const [name, landscape] of [["Pixel 7", false], ["iPhone 13", false], ["Pixel 7", true], ["iPhone 13", true]] as const) {
  for (const theme of ["dark", "light"] as const) {
    test.describe(`${name} ${landscape ? "landscape" : "portrait"} ${theme}`, () => {
      const d = phone(name);
      test.use({ ...d, viewport: landscape ? { width: d.viewport.height, height: d.viewport.width } : d.viewport });
      test(`layout: bars step aside, the canvas gets the screen, nothing is wider than it @phone`, async ({ page }) => {
        await signedIn(page, theme, "2d"); // the layout does not need WebGL; the 3D canvas has its own test below (a shared runner crashed its browser with eight 3D pages at once)
        await page.goto("/problems/url-shortener");
        await expect(page.locator(".solve.ph.pv-problem")).toBeVisible({ timeout: 30_000 });
        // the site's bars are gone on the workspace and back on the list
        await expect(page.locator("#top")).toBeHidden(); await expect(page.locator(".tabbar")).toBeHidden();
        // the first visit opens on the Problem with Start designing; it opens the Design
        const t = await touch(page);
        await tapOn(t, page.locator(".ph-start button"));
        await expect(page.locator(".solve.ph.pv-design")).toBeVisible();
        await expect(page.locator(".lab-canvas")).toBeVisible({ timeout: 30_000 });
        expect(await ratio(page), "canvas share of the screen").toBeGreaterThanOrEqual(landscape ? 0.75 : 0.7);
        expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth), "no sideways scroll").toBe(true);
        const wide = await page.evaluate(() => Array.from(document.querySelectorAll(".ph-head, .ph-head *, .ph-sw, .ph-sw *")).filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.className));
        expect(wide, "nothing in the header or the switch is wider than the screen").toEqual([]);
        await bigEnough(page, ".ph-head :is(a, button), .ph-sw button, .ph-add, .ph-corner button");
        // the other site chrome is not on the screen at once: no title input, no 3D/2D toggle, no Connect/Fit row, no fix banner, no drag hint
        for (const gone of [".lab-name", ".lab-view", ".d3-tools", ".lab-status", ".d3-hint", ".lab-top"]) await expect(page.locator(gone).first(), gone).toBeHidden();
        // the three views, with a sideways swipe on the header
        await t.swipe(300, 26, 80, 26);
        await expect(page.locator(".solve.ph.pv-results")).toBeVisible();
        await tapOn(t, page.locator(".ph-sw button", { hasText: "Problem" }));
        await expect(page.locator(".solve.ph.pv-problem")).toBeVisible();
        // back on the list the bars return
        await tapOn(t, page.locator(".ph-back-btn"));
        await expect(page).toHaveURL(/\/problems$/);
        await expect(page.locator(".tabbar")).toBeVisible();
      });
    });
  }
}

test.describe("touch flow on a Pixel 7", () => {
  const d = phone("Pixel 7");
  test.use({ ...d });
  test("scroll the problem, add a part from the sheet, select it, open and close its settings, connect, run @phone", async ({ page }) => {
    await signedIn(page, "dark", "2d");
    await page.goto("/problems/url-shortener");
    await expect(page.locator(".solve.ph.pv-problem")).toBeVisible({ timeout: 30_000 });
    const t = await touch(page);
    // the problem scrolls under a real swipe
    const q = page.locator(".sv-q");
    const b = await box(q);
    await t.swipe(b.x + b.width / 2, b.y + b.height * 0.7, b.x + b.width / 2, b.y + 60);
    await expect.poll(() => q.evaluate((e) => e.scrollTop)).toBeGreaterThan(40);
    const examples = await page.locator(".sv-test").count();
    await tapOn(t, page.locator(".ph-start button"));
    await expect(page.locator(".solve.ph.pv-design")).toBeVisible();
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 30_000 });
    const n0 = await settled(page, ".react-flow__node");
    // + Part opens the sheet; it scrolls under a swipe; a tap on CDN adds a part and closes it, with no settings open
    await tapOn(t, page.locator(".ph-add"));
    const sheet = page.locator(".ph-sheet");
    await expect(sheet).toBeVisible();
    await bigEnough(page, ".ph-sheet .ph-part, .ph-sheet .ph-x");
    const body = page.locator(".ph-sh-body"), bb = await box(body);
    await t.swipe(bb.x + bb.width / 2, bb.y + bb.height - 30, bb.x + bb.width / 2, bb.y + 40);
    await expect.poll(() => body.evaluate((e) => e.scrollTop), "the parts sheet scrolls").toBeGreaterThan(20);
    await body.evaluate((e) => { e.scrollTop = 0; });
    await tapOn(t, page.locator('.ph-part[aria-label="CDN"]'));
    await expect(sheet).toHaveCount(0);
    await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 1);
    await expect(page.locator(".ph-sheet")).toHaveCount(0);
    expect(await ratio(page)).toBeGreaterThanOrEqual(0.7);
    // select it: a bar with Connect, Settings, Delete
    await tapOn(t, page.locator(".ph-fab-sm[aria-label^='Fit']"));
    await page.waitForTimeout(500);
    await tapOn(t, page.locator(".react-flow__node", { hasText: "CDN" }).last());
    const bar = page.locator(".ph-selbar");
    await expect(bar).toBeVisible();
    await bigEnough(page, ".ph-selbar button");
    await tapOn(t, bar.getByRole("button", { name: "Settings" }));
    await expect(sheet).toBeVisible();
    await expect(sheet.locator(".lab-ins, [class*='lab-ins']").first()).toBeVisible();
    // ✕ closes it
    await tapOn(t, page.locator(".ph-x"));
    await expect(sheet).toHaveCount(0);
    // and Back closes it too, and stays on the page
    const url = page.url();
    await tapOn(t, bar.getByRole("button", { name: "Settings" }));
    await expect(sheet).toBeVisible();
    await page.goBack();
    await expect(sheet).toHaveCount(0);
    expect(page.url()).toBe(url);
    // a part's settings sheet can be dragged down to close it
    await tapOn(t, bar.getByRole("button", { name: "Settings" }));
    await expect(sheet).toBeVisible();
    const g = await box(page.locator(".ph-grab"));
    await t.swipe(g.x + g.width / 2, g.y + 10, g.x + g.width / 2, g.y + 300);
    await expect(sheet).toHaveCount(0);
    await page.waitForTimeout(800); // the browser still counts that touch as a drag for a moment: a tap straight after it is not a tap
    // Connect: a Load Balancer to a Server, by taps
    for (const part of ["Load Balancer", "Server"]) { await tapOn(t, page.locator(".ph-add")); await tapOn(t, page.locator(`.ph-part[aria-label="${part}"]`)); await expect(sheet).toHaveCount(0); }
    await tapOn(t, page.locator(".ph-fab-sm[aria-label^='Fit']"));
    await page.waitForTimeout(600);
    const e0 = await settled(page, ".react-flow__edge");
    await tapOn(t, page.locator(".react-flow__node", { hasText: "Load Balancer" }).last());
    await tapOn(t, page.locator(".ph-selbar").getByRole("button", { name: "Connect" }));
    await expect(page.locator(".ph-conn")).toContainText("Tap the part");
    await tapOn(t, page.locator(".react-flow__node", { hasText: /^Server/ }).last());
    await expect.poll(() => count(page, ".react-flow__edge")).toBe(e0 + 1);
    await expect(page.locator(".ph-conn")).toHaveCount(0);
    // Run: the results are the one layer on screen, one row per example test, nothing else open
    await tapOn(t, page.locator(".ph-run"));
    await expect(page.locator(".solve.ph.pv-results .sv-console")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator(".sv-results > li")).toHaveCount(examples);
    await expect(page.locator(".ph-sheet")).toHaveCount(0);
    const covered = await page.evaluate(() => { const r = (document.querySelector(".sv-console") as HTMLElement).getBoundingClientRect(); const pts = [[.5, .15], [.2, .4], [.8, .4], [.5, .65], [.5, .85]]; return pts.map(([fx, fy]) => !!document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy)?.closest(".sv-console, .ph-sub")); });
    expect(covered, "five points in the results all hit the results").toEqual([true, true, true, true, true]);
    await bigEnough(page, ".ph-sw button");
  });
});

test.describe("3D canvas on a Pixel 7", () => {
  test.use({ ...phone("Pixel 7") });
  test("+ Part in 3D adds a part with no settings open; a touch on it shows the bar @phone @3d", async ({ page }) => {
    test.slow();
    await signedIn(page, "dark", "3d");
    await lite3d(page);
    await page.goto("/problems/url-shortener");
    const t = await touch(page);
    await tapOn(t, page.locator(".ph-start button"));
    await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
    const n0 = await settled(page, ".react-flow__node");
    await tapOn(t, page.locator(".ph-add"));
    await tapOn(t, page.locator('.ph-part[aria-label="CDN"]'));
    await expect(page.locator(".ph-sheet")).toHaveCount(0);
    await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 1);
    await expect(page.locator(".ph-selbar")).toHaveCount(0);
    // the part sits under its label: a touch there selects it. The label glides to its place, so wait until it has not moved for five frames (a real readiness signal, not a sleep)
    const at = await page.evaluate(() => new Promise<{ x: number; y: number } | null>((resolve) => {
      const read = () => { const p = Array.from(document.querySelectorAll(".d3 .p3")).find((e) => (e as HTMLElement).innerText.trim().startsWith("CDN")); if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 28 }; };
      let last = read(), still = 0; const t0 = performance.now();
      const tick = () => { const now = read(); still = now && last && Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5 ? still + 1 : 0; last = now; if (still >= 5 || performance.now() - t0 > 15_000) return resolve(now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    expect(at, "the CDN's label is drawn").not.toBeNull();
    if (at) await t.tap(at.x, at.y);
    await expect(page.locator(".ph-selbar")).toBeVisible();
    expect(await ratio(page)).toBeGreaterThanOrEqual(0.7);
  });
});

test.describe("challenge and sandbox on a Pixel 7", () => {
  test.use({ ...phone("Pixel 7") });
  test("a challenge: brief, design, score, stars in Results with the goals @phone", async ({ page }) => {
    await signedIn(page, "dark", "2d");
    await page.goto("/problems/challenge/one-server");
    const t = await touch(page);
    await expect(page.locator(".ph-prob .lab-goals li")).toHaveCount(3);
    await tapOn(t, page.locator(".ph-start button"));
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 30_000 });
    await tapOn(t, page.locator(".ph-run"));
    await expect(page.locator(".solve.ph.pv-results .ph-resv")).toBeVisible();
    await expect(page.locator(".ph-resv .lab-score-stars")).toBeVisible();
    await expect(page.locator(".ph-resv .lab-goals li")).toHaveCount(3);
    await expect(page.locator(".lab-score-back")).toHaveCount(0); // the dialog is the Results view here
    await bigEnough(page, ".ph-resv .ph-acts :is(button, a), .ph-sw button");
    await tapOn(t, page.getByRole("button", { name: "Keep improving" }));
    await expect(page.locator(".solve.ph.pv-design")).toBeVisible();
    // ⋯ opens a sheet with a ✕, and Back closes it
    await tapOn(t, page.locator(".ph-more"));
    await expect(page.locator(".ph-sheet")).toBeVisible();
    await page.goBack();
    await expect(page.locator(".ph-sheet")).toHaveCount(0);
  });
  test("the sandbox: Run lands on Results, the traffic settings are a sheet @phone", async ({ page }) => {
    await signedIn(page, "dark", "2d");
    await page.goto("/problems/sandbox");
    const t = await touch(page);
    await expect(page.locator(".solve.ph.pv-design")).toBeVisible({ timeout: 30_000 });
    await tapOn(t, page.locator(".ph-run"));
    await expect(page.locator(".solve.ph.pv-results .ph-resv")).toBeVisible();
    await expect(page.locator(".ph-resv .sv-console, .ph-resv .ph-empty").first()).toBeVisible();
    await tapOn(t, page.locator(".ph-more"));
    await tapOn(t, page.getByRole("button", { name: /Traffic and failures/ }));
    await expect(page.locator(".ph-sheet .sb-side")).toBeVisible();
    await bigEnough(page, ".ph-sheet .ph-x");
    await tapOn(t, page.locator(".ph-x"));
    await expect(page.locator(".ph-sheet")).toHaveCount(0);
  });
});

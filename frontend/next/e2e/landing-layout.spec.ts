import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The landing screen and the Report tab on every phone width (owner, tech-katta-feedback#11: "The button on the right most is half visible"):
//  - nothing in the top bar runs past the screen, at any width from 320 to 1440;
//  - the Report tab covers no text and no control (it is 24 px wide and sits in the page margin);
//  - the hint under the hero buttons is a solid pill, and nothing of the 3D scene shows through or over it;
//  - the first-visit tour offer, when it is shown, has both buttons whole, clear of the tab bar, and they work.
const API = "https://tech-api.katta.cc", CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
const SIZES: [number, number][] = [[320, 579], [360, 740], [390, 844], [402, 714], [430, 932], [768, 1024], [1366, 900]];

async function open(page: Page, path: string, theme: string) {
  await page.addInitScript((t) => { Object.defineProperty(navigator, "webdriver", { get: () => false }); try { localStorage.setItem("tk-theme", t); localStorage.removeItem("tk-tour-seen"); } catch { /* blocked */ } }, theme);
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ status: 401, json: {}, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.goto(path);
  await expect(page.locator(".tk-report")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2800);
}

/** every top-bar element is inside the screen */
async function topBarInside(page: Page, what: string) {
  const r = await page.evaluate(() => {
    const bar = document.querySelector(".top") as HTMLElement | null; if (!bar) return { none: true as const };
    const bad: string[] = [];
    bar.querySelectorAll("*").forEach((e) => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); if (cs.display === "none" || cs.visibility === "hidden" || (b.width === 0 && b.height === 0)) return; if (b.right > innerWidth + 0.5 || b.left < -0.5) bad.push(`${e.tagName}.${String(e.className).slice(0, 20)} ${Math.round(b.left)}-${Math.round(b.right)}`); });
    return { none: false as const, bad, over: bar.scrollWidth - bar.clientWidth, doc: document.documentElement.scrollWidth - innerWidth };
  });
  if (r.none) return;
  expect(r.bad, `${what}: top-bar elements past the screen`).toEqual([]);
  expect(r.over, `${what}: the top bar scrolls sideways`).toBeLessThanOrEqual(0);
}

/** the Report tab overlaps no text and no control */
async function tabCoversNothing(page: Page, what: string) {
  const hits = await page.evaluate(() => {
    const tab = document.querySelector(".tk-report") as HTMLElement, t = tab.getBoundingClientRect(), out: string[] = [];
    const hit = (b: DOMRect) => b.width > 0 && b.height > 0 && b.left < t.right && b.right > t.left && b.top < t.bottom && b.bottom > t.top;
    const shown = (e: Element) => { for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false; } return true; };
    const skip = (e: Element) => !!e.closest(".tk-report, .tk-report-pop, canvas, script, style");
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement; if (!p || !n.textContent?.trim() || skip(p) || !shown(p)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of Array.from(rg.getClientRects())) if (hit(b)) { out.push(`text "${n.textContent.trim().slice(0, 24)}" at ${Math.round(b.left)},${Math.round(b.top)}`); break; }
    }
    document.querySelectorAll("a, button, input, textarea, select, [role=button], [tabindex]:not([tabindex=\"-1\"])").forEach((e) => { if (skip(e) || !shown(e)) return; if (hit(e.getBoundingClientRect())) out.push(`${e.tagName.toLowerCase()} ${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24)}`); });
    return out;
  });
  expect(hits, `${what}: the Report tab covers`).toEqual([]);
}

for (const [w, h] of SIZES) {
  for (const theme of ["dark", "light"]) {
    test.describe(`${w}x${h} ${theme}`, () => {
      test.use({ viewport: { width: w, height: h }, deviceScaleFactor: w < 800 ? 3 : 1, isMobile: w < 760, hasTouch: w < 1000 });
      test(`the landing screen: top bar inside the screen, the Report tab covers nothing, a solid hint, a tour offer clear of the tab bar`, async ({ page }) => {
        test.setTimeout(120_000);
        await open(page, "/", theme);
        await topBarInside(page, "/");
        await tabCoversNothing(page, "/");
        // the hint pill is solid and nothing is drawn over it
        const hint = await page.evaluate(() => {
          const el = document.querySelector(".explore-hint") as HTMLElement | null; if (!el) return null;
          const r = el.getBoundingClientRect(), a = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
          const pts = [0.2, 0.4, 0.5, 0.6, 0.8].map((k) => { const e = document.elementFromPoint(r.left + r.width * k, r.bottom - 3); return !!e && el.contains(e); });
          return { alpha: a.length > 3 ? a[3] : 1, covered: pts.some((x) => !x), onScreen: r.bottom > 0 && r.top < innerHeight };
        });
        if (hint?.onScreen) { expect(hint.alpha, "the hint pill is solid").toBe(1); expect(hint.covered, "nothing is drawn over the hint's lower edge").toBe(false); }
        // the tour offer: when it is there, both buttons are whole, clear of the tab bar, and tapping one works
        const offer = page.locator(".tour-offer");
        if (await offer.count()) {
          const geo = await page.evaluate(() => {
            const rs = Array.from(document.querySelectorAll(".tour-offer [data-o]")).filter((b) => b.textContent?.trim()).map((b) => { const r = b.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
            const bar = document.querySelector(".tabbar") as HTMLElement | null, bs = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect() : null;
            return { rs, bar: bs ? [bs.left, bs.top, bs.right, bs.bottom] : null };
          });
          expect(geo.rs.length, "both buttons").toBeGreaterThanOrEqual(2);
          for (const [l, t, r, b] of geo.rs) {
            expect(l >= 0 && r <= w && t >= 0 && b <= h, `a tour button is whole on the screen (${[l, t, r, b].map(Math.round)})`).toBe(true);
            if (geo.bar) { const [bl, bt, br, bb] = geo.bar; expect(!(l < br && r > bl && t < bb && b > bt), `a tour button is under the tab bar (${[l, t, r, b].map(Math.round)} / ${geo.bar.map(Math.round)})`).toBe(true); }
          }
          await offer.locator('[data-o="no"]').last().tap();
          await expect(offer).toHaveCount(0);
        }
        // the Report tab opens by a real tap (a click on a wide screen)
        await (w < 1000 ? page.locator(".tk-report").tap() : page.locator(".tk-report").click());
        await expect(page.locator(".tk-report-pop")).toBeVisible();
      });
    });
  }
}

// a phone tall enough for it does get the offer (it is not hidden everywhere)
test.describe("430x932 the tour offer is there", () => {
  test.use({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  test("the first-visit offer is shown, whole, above the tab bar", async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, "/", "dark");
    await expect(page.locator(".tour-offer")).toBeVisible();
  });
});

// the top bar and the Report tab on other pages, at the narrowest and a middle width
for (const path of ["/home", "/learn", "/learn/concepts/caching", "/problems", "/privacy"]) {
  test.describe(`${path} at 320 and 768`, () => {
    for (const [w, h] of [[320, 579], [768, 1024]] as [number, number][]) {
      test(`${path} ${w}: top bar inside the screen, the Report tab covers nothing`, async ({ browser }) => {
        test.setTimeout(120_000);
        const ctx = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 760, hasTouch: true });
        try { const page = await ctx.newPage(); await open(page, path, "dark"); await topBarInside(page, path); await tabCoversNothing(page, path); } finally { await ctx.close(); }
      });
    }
  });
}

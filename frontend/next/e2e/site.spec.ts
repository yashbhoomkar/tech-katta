import { expect, test, type Page } from "@playwright/test";

// The real site, end to end: every address opens the right page, the workspace runs, the lock holds, search, theme, phones.

const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
/** the visitor: sign-in off (nothing locked), signed out with sign-in on (the lock), or signed in */
async function visitor(page: Page, who: "off" | "out" | "in") {
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: who !== "off", clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => (who === "in" ? r.fulfill({ json: { user: { name: "Asha", email: "asha@example.com" } }, headers: CORS }) : r.fulfill({ status: 401, json: {}, headers: CORS })));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
const errors = (page: Page) => {
  const list: string[] = [];
  page.on("pageerror", (e) => list.push(String(e)));
  return list;
};

const PAGES: [string, RegExp][] = [
  ["/", /./], ["/home", /Dashboard/], ["/learn/concepts", /Concepts/], ["/learn/concepts/caching", /Caching/], ["/problems", /Problems/], ["/simulator", /Simulator|Practice/],
  ["/simulator/ind-vs-pak", /./], ["/me", /You/], ["/privacy", /./], ["/terms", /Terms/], ["/learn/quick-notes", /Quick Notes/], ["/problems/sandbox", /Sandbox/], ["/practice", /Practice/],
];
for (const [path, h] of PAGES) {
  test(`${path} is a 3D page`, async ({ page }) => {
    await visitor(page, "in");
    const errs = errors(page);
    await page.goto(path);
    await expect(page.locator("#view")).toBeAttached();
    await expect(page).toHaveTitle(h);
    expect(await page.locator("[class*='AppShell'], [class*='layout_']").count(), "no React frame").toBe(0);
    expect(errs).toEqual([]);
  });
}

test("an unknown address is the 3D not-found page, with status 404", async ({ page }) => {
  await visitor(page, "in");
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Nothing runs")).toBeVisible();
});

test("old /dashboard links land on their pages", async ({ page }) => {
  await visitor(page, "in");
  await page.goto("/dashboard/concepts/caching/");
  await expect(page).toHaveURL(/\/learn\/concepts\/caching$/);
  await page.goto("/dashboard/#problems/url-shortener");
  await expect(page).toHaveURL(/\/problems\/url-shortener$/);
});

test("signed out: an article shows its opening and the sign-in card, a list and /home stay open", async ({ page }) => {
  await visitor(page, "out");
  await page.goto("/learn/concepts/caching");
  await expect(page.locator(".gate-card")).toBeVisible();
  await page.goto("/learn/concepts");
  await expect(page.locator(".gate-card")).toHaveCount(0);
  await page.goto("/home");
  await expect(page.locator(".gate-card")).toHaveCount(0);
});

test("signed out: the workspace is locked and loads no island", async ({ page }) => {
  await visitor(page, "out");
  const asked: string[] = [];
  page.on("request", (r) => asked.push(r.url()));
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".gate-card")).toBeVisible();
  expect(asked.some((u) => u.includes("/3d/islands/"))).toBe(false);
  await page.locator(".gate-card [data-signin]").click();
  await expect(page.locator(".signin")).toBeVisible();
});

test("a problem: run, submit, replay in 2D and 3D, and back", async ({ page }) => {
  await visitor(page, "in");
  const errs = errors(page);
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".ws-host .solve")).toBeVisible({ timeout: 40_000 });
  await page.getByRole("button", { name: /Submit/ }).first().click();
  await expect(page.locator(".sv-console")).toContainText(/tests passed|Wrong design|Accepted/, { timeout: 30_000 });
  await page.locator(".sv-console summary", { hasText: "Test 7" }).first().click();
  await page.locator(".sv-console details[open]").getByText(/Replay this test/).first().click();
  await expect(page.locator(".sv-player")).toBeVisible();
  await page.locator(".sv-seg button", { hasText: "3D" }).click();
  await expect(page.locator(".sv-3d canvas")).toBeVisible();
  await page.locator(".sv-seg button", { hasText: "2D" }).click();
  await expect(page.locator(".sv-3d")).toHaveCount(0);
  await page.goto("/problems");
  await page.goBack();
  await expect(page.locator(".ws-host .solve")).toBeVisible({ timeout: 40_000 });
  expect(errs).toEqual([]);
});

test("search finds a problem (Ctrl K)", async ({ page }) => {
  await visitor(page, "in");
  await page.goto("/home");
  await page.keyboard.press("Control+k");
  await page.keyboard.type("url short");
  await expect(page.locator(".search li").first()).toContainText(/URL/i);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/url-shortener/);
});

test("the theme switch persists across pages", async ({ page }) => {
  await visitor(page, "in");
  await page.goto("/me");
  await page.locator("[data-theme-pref='light']").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/home");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("phone: the workspace brief, no sideways scroll on the main pages @phone", async ({ page }) => {
  await visitor(page, "in");
  for (const path of ["/home", "/learn/concepts", "/problems", "/me"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${path} scrolls sideways`).toBe(false);
  }
  await page.goto("/problems/menu-search");
  await expect(page.locator(".sv-pbrief")).toBeVisible();
  await page.locator(".sv-pbrief .sv-submit").click();
  await expect(page.locator(".sv-pbar")).toBeVisible();
});

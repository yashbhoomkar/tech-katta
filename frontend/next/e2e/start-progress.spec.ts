import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// Learning paths (/start), the progress panel on Home, "Updated" on articles and the changelog: all from content and this browser's own record.

const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function visitor(page: Page) {
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha", email: "asha@example.com" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
const seed = (page: Page, data: Record<string, unknown>) => page.addInitScript((d) => { for (const [k, v] of Object.entries(d)) if (localStorage.getItem(k) === null) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); }, data);

for (const tag of ["", " @phone"]) {
  test(`/start: three paths, every link opens, done shows after reading${tag}`, async ({ page, request }) => {
    await visitor(page);
    await seed(page, { "tk-r3d-progress": { read: { "concepts/networking-essentials": 1 }, best: {} } });
    await page.goto("/start");
    await expect(page.getByRole("heading", { name: "Beginner" })).toBeVisible();
    await expect(page.locator(".path")).toHaveCount(3);
    const hrefs = await page.locator(".steps a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(18);
    for (const h of new Set(hrefs)) expect((await request.get(h)).status(), h).toBe(200);
    // each path ends in a problem
    for (const id of ["beginner", "intermediate", "advanced"]) expect(await page.locator(`#${id} .steps li:last-child a`).getAttribute("href")).toMatch(/^\/problems\//);
    await expect(page.locator("#beginner .steps li.done")).toHaveCount(1);
    await expect(page.locator("#beginner .path-count")).toHaveText("1 of 7 done");
    await expect(page.locator("#beginner .steps li").first()).toContainText("Done");
    // reading one more article marks it, on the same page
    await page.goto("/learn/concepts/api-design");
    await page.locator("[data-complete]").click();
    await page.goto("/start");
    await expect(page.locator("#beginner .path-count")).toHaveText("2 of 7 done");
  });
}

test("Home shows the progress panel from this browser's record", async ({ page }) => {
  await visitor(page);
  const T = (name: string, ok: boolean) => ({ id: name, name, ok });
  await seed(page, {
    "tk-r3d-progress": { read: { "concepts/caching": 1, "concepts/api-design": 2 }, best: {} },
    "tk-progress-v1": { steps: { "solved:url-shortener": true } },
    "tk-subs-v1": { "url-shortener": [{ at: 1, score: 88, tests: [T("Cache failure", false)] }], "chat-app": [{ at: 2, score: 40, tests: [T("Cache failure", false), T("Toss spike", true)] }] },
    "tk-path": "beginner",
  });
  await page.goto("/home");
  const panel = page.locator(".prog-panel");
  await expect(panel).toBeVisible();
  await expect(panel.locator("dd").nth(0)).toContainText("1 of 22");
  await expect(panel.locator("dd").nth(1)).toContainText("2 of");
  await expect(panel.locator("dd").nth(2)).toContainText("88");
  await expect(panel.locator("dd").nth(2)).toContainText("40");
  await expect(panel).toContainText("Next recommended");
  await expect(panel).toContainText("Next on your Beginner path");
  await expect(panel.locator(".prog-row", { hasText: "Weakest area" })).toContainText("Cache failure");
});

test("Home with nothing done points to Start here", async ({ page }) => {
  await visitor(page);
  await page.goto("/home");
  await expect(page.locator(".prog-panel")).toContainText("Not sure where to start?");
  await page.locator(".prog-panel a", { hasText: "Not sure where to start?" }).click();
  await expect(page).toHaveURL(/\/start$/);
});

test("an article says when it was updated; /changelog lists dated changes", async ({ page }) => {
  await visitor(page);
  await page.goto("/learn/concepts/caching");
  await expect(page.locator(".meta").first()).toContainText(/Updated \d+ \w+ 2026/);
  await page.goto("/changelog");
  await expect(page).toHaveTitle(/What's new/);
  await expect(page.locator(".log > li").first()).toContainText("28 Nov 2026");
  expect(await page.locator(".log > li").count()).toBeGreaterThanOrEqual(4);
});

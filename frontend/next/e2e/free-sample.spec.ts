import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The free sample (content access "free"): one article per Learn section and the URL shortener's canvas open to everyone, signed out, in full.
// Everything else stays behind the sign-in. The API is the gated one (production's behaviour): no session.

const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function signedOut(page: Page) {
  await localApi(page, false);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ status: 401, json: {}, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 401, json: {}, headers: CORS }));
}
const errors = (page: Page) => { const list: string[] = []; page.on("pageerror", (e) => list.push(String(e))); return list; };

for (const path of ["/learn/concepts/networking-essentials", "/learn/components/redis", "/learn/real-systems/discord-messages", "/learn/interview-questions/how-to-answer"]) {
  test(`signed out: ${path} is the whole article, with no sign-in card`, async ({ page }) => {
    await signedOut(page);
    const errs = errors(page);
    await page.goto(path);
    await expect(page.locator(".rd-full")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".gate-card, .si-card, .preview-fade")).toHaveCount(0);
    // the full text: many sections, not the two-paragraph preview
    expect(await page.locator(".rd-full h2").count()).toBeGreaterThan(3);
    expect(errs).toEqual([]);
  });
}

test("signed out: a gated article still shows its preview and the sign-in card", async ({ page }) => {
  await signedOut(page);
  await page.goto("/learn/components/kafka-in-practice");
  await expect(page.locator(".gate-card")).toBeVisible();
});

test("the lists mark the free articles with a small Free label", async ({ page }) => {
  await signedOut(page);
  await page.goto("/learn/concepts");
  await expect(page.locator("a[href='/learn/concepts/networking-essentials'] .free-tag")).toHaveText("Free");
  await expect(page.locator("a[href='/learn/concepts/caching'] .free-tag")).toHaveCount(0);
  await page.goto("/problems");
  await expect(page.locator("a[href='/problems/url-shortener'] .free-tag")).toHaveText("Free");
  await expect(page.locator("a[href='/problems/ticket-booking'] .free-tag")).toHaveCount(0);
});

test("signed out: the URL shortener runs, submits and offers sign-in only after the first Submit", async ({ page }) => {
  await signedOut(page);
  const errs = errors(page);
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".ws-host .solve")).toBeVisible({ timeout: 40_000 });
  await expect(page.locator(".gate-card, .si-card, .acct-keep")).toHaveCount(0); // nothing asks for a sign-in before a Submit
  await page.getByRole("button", { name: /^Run/ }).first().click();
  await expect(page.locator(".sv-console")).toContainText(/test/i, { timeout: 30_000 });
  await expect(page.locator(".acct-keep")).toHaveCount(0);
  await page.getByRole("button", { name: /Submit/ }).first().click();
  await expect(page.locator(".sv-console")).toContainText(/tests passed|Wrong design|Accepted/, { timeout: 30_000 });
  await expect(page.locator(".sv-console .acct-keep")).toBeVisible(); // after the first Submit: sign in to keep it
  expect(errs).toEqual([]);
});

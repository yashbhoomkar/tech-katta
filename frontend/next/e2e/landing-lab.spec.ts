import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The landing as a practice lab (no sign-in): the "Fix the failing system" demo runs the real judge, the counts are the API's, /free lists the free shelf,
// and the first Submit on a problem shows a compact result card.

const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function signedOut(page: Page) {
  await localApi(page, false);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ status: 401, json: {}, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 401, json: {}, headers: CORS }));
}
async function signedIn(page: Page) {
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha", email: "asha@example.com" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}

test("landing: today's hero is kept, and the demo starts only on tap, signed out", async ({ page }) => {
  await signedOut(page);
  await page.goto("/");
  await expect(page.locator(".hero h1")).toContainText("Everything for it, in one place");
  await expect(page.locator(".hero .actions a[href='/home']")).toContainText("Start preparing");
  await expect(page.getByRole("button", { name: /See what is inside/ })).toBeVisible();
  // before the tap: a still frame, a failing verdict, no fixes shown, nothing playing
  await expect(page.locator("[data-demo-checks] li.bad").first()).toBeVisible();
  await expect(page.locator(".demo-fixes")).toBeHidden();
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await expect(page.locator("#demo")).toBeInViewport();
  await page.locator("[data-demo-start]").click();
  await expect(page.locator(".demo-fixes")).toBeVisible();
});

test("demo: each fix runs the real judge, and the verdict is what the simulator gives the same design", async ({ page }) => {
  await signedOut(page);
  await page.goto("/");
  await page.locator("[data-demo-start]").click();
  const shown = async () => (await page.locator("[data-demo-checks] li b").allTextContents()).join("|");
  const expected = (on: string[]) => page.evaluate(async (fixes) => {
    const url = "/3d/scripts/sim.js";
    const { INCIDENTS, run } = await import(/* @vite-ignore */ url);
    const d = { ...INCIDENTS[0].start } as Record<string, number>;
    if (fixes.includes("apps")) d.apps += 2; if (fixes.includes("cache")) d.cache += 1; if (fixes.includes("replicas")) d.replicas += 2;
    const r = run(INCIDENTS[0], d);
    return { passed: r.passed, values: r.checks.map((c: { value: string }) => c.value).join("|") };
  }, on);
  const on: string[] = [];
  const done = () => expect(page.locator(".demo-card")).not.toHaveAttribute("data-running", "1", { timeout: 15_000 });
  await done();
  let e = await expected(on);
  expect(await shown()).toBe(e.values); expect(e.passed).toBe(false);
  await expect(page.locator(".demo-verdict.bad")).toBeVisible();
  for (const id of ["apps", "cache", "replicas"]) {
    await page.locator(`[data-fix="${id}"]`).click(); on.push(id);
    await done();
    e = await expected(on);
    expect(await shown(), `after ${on.join("+")}`).toBe(e.values);
    await expect(page.locator(e.passed ? ".demo-verdict.ok" : ".demo-verdict.bad")).toBeVisible();
  }
  expect(e.passed, "all three fixes together hold").toBe(true);
  // a fix taken back fails again
  await page.locator('[data-fix="replicas"]').click();
  await done();
  await expect(page.locator(".demo-verdict.bad")).toBeVisible();
});

test("the counts strip equals the API's real counts", async ({ page, request }) => {
  await signedOut(page);
  await page.goto("/");
  const list = (await (await request.get("http://127.0.0.1:5112/v1/articles")).json()).articles as { section: string; group: string }[];
  const problems = list.filter((a) => a.section === "interview-questions" && a.group !== "start").length;
  const lessons = list.filter((a) => !(a.section === "interview-questions" && a.group !== "start") && a.group !== "start").length;
  const lab = await (await request.get("http://127.0.0.1:5112/v1/lab")).json();
  await page.locator(".lab-counts").scrollIntoViewIfNeeded();
  await expect(page.locator('[data-count="Lessons"]')).toHaveText(String(lessons));
  await expect(page.locator('[data-count="Canvas problems"]')).toHaveText(String(problems));
  await expect(page.locator('[data-count="Challenges"]')).toHaveText(String(lab.challenges.length));
  await expect(page.locator('[data-count="Warm-ups"]')).toHaveText("5");
});

test("/free lists what opens in full signed out", async ({ page, request }) => {
  await signedOut(page);
  await page.goto("/free");
  await expect(page).toHaveTitle(/Free while in beta/);
  const list = (await (await request.get("http://127.0.0.1:5112/v1/articles")).json()).articles as { access: string }[];
  await expect(page.locator(".shelf li")).toHaveCount(list.filter((a) => a.access === "free").length);
  await expect(page.locator(".shelf a[href='/problems/url-shortener']")).toBeVisible();
  await expect(page.locator(".headline")).toContainText("Free while");
});

test("a problem says what you get, and the first Submit shows a result card", async ({ page }) => {
  await signedIn(page);
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".ws-host .solve")).toBeVisible({ timeout: 40_000 });
  await expect(page.locator(".sv-payoff").first()).toHaveText(/\d+ tests · Replay · Fixes explained/);
  await page.getByRole("button", { name: /Submit/ }).first().click();
  const card = page.locator(".sv-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText(/\d+ \/ \d+ tests passed/);
  await expect(card.locator(".sv-card-next")).toHaveAttribute("href", /^\/problems\/[a-z0-9-]+$/);
  // only the first Submit
  await page.getByRole("button", { name: /Submit/ }).first().click();
  await expect(page.locator(".sv-console")).toContainText(/tests passed|Wrong design|Accepted/);
  await expect(page.locator(".sv-card")).toHaveCount(0);
});

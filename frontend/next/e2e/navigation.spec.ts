import { expect, test, type Page } from "@playwright/test";
import { CORS, LIVE, localApi, questionCount } from "./api";

// Three places and You (tech-katta-context 53, phase 2): the phone bar, the sidebar, one Solve list, the old Simulator address.

async function open(page: Page, who: "out" | "in" = "in") {
  await localApi(page, who === "in");
  await page.route(`${LIVE}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${LIVE}/v1/me`, (r) => (who === "in" ? r.fulfill({ json: { user: { name: "Asha", email: "asha@example.com" } }, headers: CORS }) : r.fulfill({ status: 401, json: {}, headers: CORS })));
  await page.route(`${LIVE}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${LIVE}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}

test("phone: the bar is Home, Learn, Solve, You, each at least 44 px, You shows the initial @phone", async ({ page }) => {
  await open(page);
  await page.goto("/home");
  const items = page.locator(".tabbar a, .tabbar button");
  await expect(items).toHaveText(["Home", "Learn", "Solve", "You"]);
  for (const el of await items.all()) { const b = (await el.boundingBox()) ?? { width: 0, height: 0 }; expect(b.width, await el.innerText()).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
  await expect(page.locator(".tabbar [data-you].has-i")).toBeVisible();
  await expect(page.locator(".tabbar [data-you] i")).toHaveAttribute("data-i", "A");
  await page.goto("/problems");
  await expect(page.locator(".tabbar a[aria-current]")).toHaveText("Solve");
});

test("phone: the URL shortener canvas is two taps from Home @phone", async ({ page }) => {
  await open(page);
  await page.goto("/home");
  await page.locator(".tabbar a", { hasText: "Solve" }).click();
  await expect(page).toHaveURL(/\/problems$/);
  await expect(page.locator("[data-pane=problems] a.lesson").first()).toBeInViewport(); // the first problem is on the first screen: no preview in the way
  await page.locator("[data-pane=problems] a.lesson", { hasText: "URL shortener" }).click();
  await expect(page).toHaveURL(/\/problems\/url-shortener$/);
});

test("Solve is one list: Problems, Challenges, Warm-ups, kept in the #fragment; /simulator opens the warm-ups", async ({ page }) => {
  await open(page);
  await page.goto("/problems");
  await expect(page.locator("[data-pane=problems]")).toBeVisible();
  await page.locator("[data-filter=challenges]").click();
  await expect(page).toHaveURL(/\/problems#challenges$/);
  await expect(page.locator("[data-pane=challenges] a.lesson")).toHaveCount(8);
  await page.locator("[data-filter=warm-ups]").click();
  await expect(page.locator("[data-pane=warm-ups] a.lesson")).toHaveCount(5);
  await page.locator("[data-filter=problems]").click();
  await expect(page).toHaveURL(/\/problems$/);
  await page.goto("/simulator");
  await expect(page).toHaveURL(/\/problems#warm-ups$/);
  await expect(page.locator("[data-pane=warm-ups]")).toBeVisible();
  await page.goto("/simulator/ind-vs-pak"); // a warm-up keeps its own address
  await expect(page).toHaveURL(/\/simulator\/ind-vs-pak$/);
});

test("the sidebar groups Learn and Solve, and no menu says Practice or Simulator", async ({ page }) => {
  await open(page);
  await page.goto("/problems#challenges");
  const side = page.locator("aside.side");
  await expect(side.locator(".side-head")).toHaveText(["Learn", "Solve", "Account"]);
  await expect(side.locator(".side-row.on")).toHaveText(/Challenges/);
  const text = await side.innerText();
  expect(text).not.toMatch(/Practice|Simulator|Dashboard|Interview questions/);
  await side.getByRole("link", { name: /Warm-ups/ }).click();
  await expect(page).toHaveURL(/#warm-ups$/);
  await expect(side.locator(".side-row.on")).toHaveText(/Warm-ups/);
});

test("Interview guides: every problem's answer has Solve and Read", async ({ page }) => {
  await open(page);
  await page.goto("/learn/interview-questions");
  await expect(page.locator(".headline .thin")).toHaveText("Interview guides");
  await expect(page.locator("li.ans")).toHaveCount(await questionCount());
  const first = page.locator("li.ans").first();
  await expect(first.locator(".solve-go")).toHaveAttribute("href", /\/problems\/[\w-]+$/);
  await expect(first.locator("a.lesson")).toHaveAttribute("href", /\/learn\/interview-questions\/[\w-]+$/);
});

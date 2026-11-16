import { test, expect, open } from "./fixtures";

test("search finds a lesson and opens it", async ({ page }) => {
  await open(page, "/home");
  await page.getByRole("button", { name: "Search" }).click();
  await page.keyboard.type("consistent hash");
  await expect(page.getByRole("option", { name: /^Consistent hashing/, selected: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/learn\/concepts\/consistent-hashing$/);
});

// tech.katta.cc's addresses land on the same page (content/legacy.ts)
for (const [from, to] of [
  ["dashboard/", /\/home$/],
  ["dashboard/concepts/caching/", /\/learn\/concepts\/caching$/],
  ["dashboard/#components/redis", /\/learn\/components\/redis$/],
  ["dashboard/problems/url-shortener/", /\/problems\/url-shortener$/],
  ["dashboard/lab/", /\/problems$/],
] as const) {
  test(`old address ${from} redirects`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  });
}

test("the theme choice survives a reload", async ({ page }) => {
  await open(page, "/me", "You");
  await page.getByRole("radio", { name: /Dark/ }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the search shortcut opens search", async ({ page }) => {
  await open(page, "/home");
  await page.locator("body").press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
});

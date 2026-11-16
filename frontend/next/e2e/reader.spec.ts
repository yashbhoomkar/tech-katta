import { test, expect, open } from "./fixtures";

test("a lesson draws its figures and steps them @phone", async ({ page }) => {
  await open(page, "/learn/concepts/caching", /^Caching/);
  const fig = page.locator("article .a-fig").first();
  await fig.scrollIntoViewIfNeeded();
  await expect(fig.locator(".a-fig-body svg")).toBeVisible();
  await expect(fig.locator(".a-fig-n")).toHaveText(/Step 1 of/);
  await fig.getByRole("button", { name: /next step/i }).click();
  await expect(fig.locator(".a-fig-n")).toHaveText(/Step 2 of/);
});

test("Cards mode shows one topic per card and opens it", async ({ page }) => {
  await open(page, "/learn/concepts/caching", /^Caching/);
  await page.getByRole("radio", { name: "Cards" }).click();
  await expect(page.locator(".tc").first()).toBeVisible();
  await page.locator(".tc").first().click();
  await expect(page.locator("body > .ts")).toBeVisible();
});

test("Mark complete counts on Home", async ({ page }) => {
  await open(page, "/learn/concepts/caching", /^Caching/);
  await page.getByRole("button", { name: /Mark complete/ }).click();
  await open(page, "/home");
  await expect(page.getByText(/^1 of \d+$/).first()).toBeVisible();
});

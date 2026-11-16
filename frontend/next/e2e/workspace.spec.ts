import { test, expect } from "./fixtures";

test("a problem opens its canvas, and Run answers with the judge's checks", async ({ page }) => {
  await page.goto("problems/url-shortener");
  await expect(page.locator(".react-flow")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Design a URL shortener" })).toBeVisible();
  await page.getByRole("button", { name: /Run/ }).first().click();
  await expect(page.locator(".solve")).toContainText(/test|pass|fail|score|fix/i);
});

test("the sandbox opens its canvas", async ({ page }) => {
  await page.goto("problems/sandbox");
  await expect(page.locator(".react-flow")).toBeVisible();
});

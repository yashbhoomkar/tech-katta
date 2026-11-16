import { test, expect, open } from "./fixtures";

// Every main page opens with its content from the API.
test("landing @phone", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start learning/ }).first()).toBeVisible();
});

for (const [path, heading] of [
  ["/home", /Good (morning|afternoon|evening)/],
  ["/learn", "Learn"],
  ["/learn/components", "Components"],
  ["/learn/concepts/caching", /^Caching/],
  ["/problems", /Design it/],
  ["/me", "You"],
  ["/privacy", "What is kept when you sign in"],
] as const) {
  test(`${path} opens`, async ({ page }) => {
    await open(page, path, heading);
  });
}

test("an unknown address shows the not-found page with ways on @phone", async ({ page }) => {
  await open(page, "/no-such-page", "This page isn't here.");
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link")).toHaveCount(6);
});

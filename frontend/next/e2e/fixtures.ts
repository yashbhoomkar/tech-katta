import { test as base, expect, type Page } from "@playwright/test";

// Every test fails if the page throws: an uncaught error is a bug even when the screen looks fine. The sign-in calls
// are expected to fail on hosts the API does not trust for credentials (only tech.katta.cc until PR #368), so
// network errors are not counted; thrown page errors are.
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
      expect(errors, "uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Opens a path of the app (relative to /next/) and waits for its main heading. */
export async function open(page: Page, path: string, heading?: string | RegExp) {
  await page.goto(path.replace(/^\//, ""));
  if (heading) await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

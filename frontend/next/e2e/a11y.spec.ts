import AxeBuilder from "@axe-core/playwright";
import { test, expect, open } from "./fixtures";

// WCAG 2.1 AA on the main pages, light and dark (axe-core)
for (const scheme of ["light", "dark"] as const) {
  for (const path of ["/", "/home", "/learn/concepts/caching", "/problems"]) {
    test(`${path} meets WCAG 2.1 AA (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }
}

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { localApi } from "./api";

// Accessibility checks on the main pages (axe, serious and critical only; colour contrast is checked by eye against the 3D site's own tokens).
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
for (const path of ["/home", "/learn/concepts", "/problems", "/me", "/privacy"]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await localApi(page, false);
    await page.route("https://tech-api.katta.cc/v1/auth/config", (r) => r.fulfill({ json: { enabled: false }, headers: CORS }));
    await page.goto(path);
    await expect(page.locator("#view")).toBeAttached();
    await page.waitForTimeout(1500);
    const { violations } = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`)).toEqual([]);
  });
}

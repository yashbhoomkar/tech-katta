import { expect, test, type Page } from "@playwright/test";

// The design canvas in 3D (src/lab/design3d.jsx): move a part, join two, delete one, the 3D | 2D switch, the replay's HUD and Break it yourself.
const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function signedIn(page: Page) {
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
/** the screen point under a part: its label sits above it */
const partAt = (page: Page, name: string) =>
  page.evaluate((n) => { const p = Array.from(document.querySelectorAll(".d3 .p3")).find((e) => (e as HTMLElement).innerText.trim().startsWith(n)); if (!p) throw new Error(`no part named ${n}`); const r = p.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 28 }; }, name);
const count = (page: Page, sel: string) => page.locator(sel).count();

test("3D design canvas: draw, move, connect, delete, and switch to 2D", async ({ page }) => {
  await signedIn(page);
  await page.goto("/problems/sandbox");
  await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  const n0 = await count(page, ".react-flow__node"), e0 = await count(page, ".react-flow__edge");
  // put two parts down from the palette (a tap adds one in the middle)
  await page.locator(".lab-item", { hasText: "Clients" }).first().focus();
  await page.keyboard.press("Enter");
  await page.locator(".lab-item", { hasText: "Load Balancer" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".d3 canvas")).toBeVisible();
  await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 2);
  // move one: its card's position changes
  const before = await page.locator(".react-flow__node").first().evaluate((n) => (n as HTMLElement).style.transform);
  const p = await partAt(page, "Load Balancer");
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 90, p.y + 40, { steps: 8 }); await page.mouse.up();
  const moved = await page.locator(".react-flow__node").evaluateAll((ns) => ns.map((n) => (n as HTMLElement).style.transform));
  expect(moved.some((t) => t !== before)).toBe(true);
  // join Clients to the Load Balancer
  await page.locator(".d3-tools button", { hasText: "Connect" }).click();
  const a = await partAt(page, "Clients"); await page.mouse.click(a.x, a.y);
  const b = await partAt(page, "Load Balancer"); await page.mouse.click(b.x, b.y);
  await expect.poll(() => count(page, ".react-flow__edge")).toBe(e0 + 1);
  // delete the selected part
  const c = await partAt(page, "Load Balancer"); await page.mouse.click(c.x, c.y); await page.keyboard.press("Delete");
  await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 1);
  // the switch to the flat canvas and back
  await page.locator(".lab-view button", { hasText: "2D" }).click();
  await expect(page.locator(".d3")).toHaveCount(0);
  await page.locator(".lab-view button", { hasText: "3D" }).click();
  await expect(page.locator(".d3 canvas")).toBeVisible();
});

test("replay: the HUD shows the minute and Break it yourself is a row of choices", async ({ page }) => {
  await signedIn(page);
  await page.goto("/problems/url-shortener");
  await expect(page.locator(".ws-host .solve")).toBeVisible({ timeout: 40_000 });
  await page.getByRole("button", { name: /Submit/ }).first().click();
  await expect(page.locator(".sv-console")).toContainText(/tests passed|Wrong design|Accepted/, { timeout: 30_000 });
  await page.locator(".sv-console summary", { hasText: "Test 7" }).first().click();
  await page.locator(".sv-console details[open]").getByText(/Replay this test/).first().click();
  await expect(page.locator(".sv-hud div")).toHaveCount(4);
  expect(await count(page, ".sv-fault")).toBeGreaterThanOrEqual(4);
});

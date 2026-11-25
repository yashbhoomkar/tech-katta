import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// The design canvas in 3D (src/lab/design3d.jsx): move a part, join two, delete one, the 3D | 2D switch, the replay's HUD and Break it yourself.
const API = "https://tech-api.katta.cc";
const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };
async function signedIn(page: Page) {
  await localApi(page, true);
  await page.route(`${API}/v1/auth/config`, (r) => r.fulfill({ json: { enabled: true, clientId: "test" }, headers: CORS }));
  await page.route(`${API}/v1/me`, (r) => r.fulfill({ json: { user: { name: "Asha" } }, headers: CORS }));
  await page.route(`${API}/v1/events`, (r) => r.fulfill({ status: 204, headers: CORS }));
  await page.route(`${API}/v1/me/**`, (r) => r.fulfill({ status: 204, headers: CORS }));
}
/** the screen point under a part: its label sits above it. The labels glide to their place (and the 3D scene keeps easing for a moment after a move), so this waits until the point has not moved for several frames: on a slow machine the point measured at once is a few frames old, and a click there misses the part */
const partAt = (page: Page, name: string) =>
  page.evaluate(
    (n) =>
      new Promise<{ x: number; y: number }>((resolve, reject) => {
        const read = () => {
          const p = Array.from(document.querySelectorAll(".d3 .p3")).find((e) => (e as HTMLElement).innerText.trim().startsWith(n));
          if (!p) return null;
          const r = p.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.bottom + 28 };
        };
        let last = read(), still = 0;
        const t0 = performance.now();
        const tick = () => {
          const now = read();
          if (!now) return performance.now() - t0 > 10_000 ? reject(new Error(`no part named ${n}`)) : requestAnimationFrame(tick);
          still = last && Math.abs(now.x - last.x) < 0.5 && Math.abs(now.y - last.y) < 0.5 ? still + 1 : 0;
          last = now;
          if (still >= 5) return resolve(now);
          if (performance.now() - t0 > 10_000) return resolve(now);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    name,
  );
const count = (page: Page, sel: string) => page.locator(sel).count();
/** the number of elements once it has stopped changing for a while: the sandbox's starting parts arrive a moment after the canvas is drawn (later on a slow machine), and a count taken before they are in makes every later count look off by that many */
async function settled(page: Page, sel: string) {
  let last = await count(page, sel), since = Date.now();
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(250);
    const now = await count(page, sel);
    if (now !== last) { last = now; since = Date.now(); } else if (Date.now() - since >= 1500) return now;
  }
  return last;
}

test("3D design canvas: draw, move, connect, delete, and switch to 2D", async ({ page }) => {
  // the scene is drawn in software (swiftshader) and every click waits for the labels to settle: about 35 s on a 4-core machine, over 60 s on CI's 2 cores
  // next to the other 3D spec. A longer time budget for this test only; every check stays as it is.
  test.setTimeout(150_000);
  await signedIn(page);
  await page.goto("/problems/sandbox");
  await expect(page.locator(".d3 canvas")).toBeVisible({ timeout: 30_000 });
  const n0 = await settled(page, ".react-flow__node"), e0 = await settled(page, ".react-flow__edge");
  // put two parts down from the palette (a tap adds one in the middle)
  await page.locator(".lab-item", { hasText: "Clients" }).first().focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 1);
  // a part added while another is selected is joined to it (Canvas.jsx, add): clear the selection first, so the only arrow is the one this test draws
  await page.locator(".lab-view button", { hasText: "3D" }).focus();
  await page.keyboard.press("Escape");
  await expect.poll(() => count(page, ".react-flow__node.selected")).toBe(0);
  await page.locator(".lab-item", { hasText: "Load Balancer" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".d3 canvas")).toBeVisible();
  await expect.poll(() => count(page, ".react-flow__node")).toBe(n0 + 2);
  expect(await count(page, ".react-flow__edge")).toBe(e0);
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
  test.setTimeout(150_000); // judging every test in the browser and opening a replay take 25–40 s of CPU on CI; see the canvas test above
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

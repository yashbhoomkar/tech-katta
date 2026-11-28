import { expect, test, type Page } from "@playwright/test";
import { localApi } from "./api";

// Quick drills (/drills), the decision guides (/guides) and this week's incident on Home: from the API's content, with the cards seen kept in this browser only.
const visitor = async (page: Page) => { await localApi(page, false); };

test("/drills: one card at a time, show the answer, next; the cards seen are remembered, with links to the article section and a problem @phone", async ({ page }) => {
  await visitor(page);
  await page.goto("/drills");
  await expect(page.locator(".drill-q")).toBeVisible();
  const first = await page.locator(".drill-q").innerText();
  await expect(page.locator(".drill-a")).toHaveCount(0);
  await page.getByRole("button", { name: "Show the answer" }).tap();
  await expect(page.locator(".drill-a")).toBeVisible();
  const links = await page.locator(".drill-a a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(links[0]).toMatch(/^\/learn\/(concepts|components)\/[\w-]+#[\w-]+$/);
  expect(links[1]).toMatch(/^\/problems\/[\w-]+$/);
  await page.getByRole("button", { name: /Next question/ }).tap();
  await expect(page.locator(".drill-q")).not.toHaveText(first);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tk-drills-v1") || "{}").seen?.length)).toBe(1);
  // after a reload the seen card is not the one offered first
  await page.reload();
  await expect(page.locator(".drill-q")).not.toHaveText(first);
  await expect(page.locator(".drill-count")).toContainText("1 seen");
  // no sideways scroll on a phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("/guides lists five guides; each guide has when to pick which, a table, an example, and links that open", async ({ page, request }) => {
  await visitor(page);
  await page.goto("/guides");
  await expect(page.locator(".shelf a")).toHaveCount(5);
  await page.locator(".shelf a", { hasText: "Redis or Kafka?" }).click();
  await expect(page.locator("h1")).toContainText("Redis or Kafka?");
  await expect(page.locator("table")).toBeVisible();
  await expect(page.getByRole("heading", { name: "At Zotato" })).toBeVisible();
  const hrefs = await page.locator(".guide .shelf a").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.length).toBeGreaterThanOrEqual(3);
  for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
});

test("the guides and drills are in the page's HTML for search engines, and in the sitemap", async ({ request }) => {
  const html = await (await request.get("/guides/sql-vs-nosql")).text();
  expect(html).toContain("<title>SQL or NoSQL? · Decision guides · Tech Katta</title>");
  expect(html).toContain("<table>"); expect(html).toContain("PostgreSQL");
  expect(html).toContain('rel="canonical" href="https://tech.katta.cc/guides/sql-vs-nosql"');
  const drills = await (await request.get("/drills")).text();
  expect(drills).toContain("Redis crashes at peak: what happens?");
  const map = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/drills", "/guides", "/guides/redis-vs-kafka", "/guides/queue-vs-stream"]) expect(map, p).toContain(`<loc>https://tech.katta.cc${p}</loc>`);
});

test("Home has this week's incident, a Warm-up that opens", async ({ page }) => {
  await localApi(page, true);
  await page.route("https://tech-api.katta.cc/v1/auth/config", (r) => r.fulfill({ json: { enabled: true, clientId: "test", required: false }, headers: { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" } }));
  await page.goto("/home");
  const card = page.locator(".incident-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("This week's incident");
  const href = await card.getAttribute("href");
  expect(href).toMatch(/^\/simulator\/[\w-]+$/);
  await card.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

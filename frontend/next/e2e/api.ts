import type { Page } from "@playwright/test";

// The text is behind the sign-in (tech-katta-context 52), so the end-to-end tests run against two local copies of the API instead of the live one
// (playwright.config.ts starts them): GATED is the API as it is in production (no session: only the public part), OPEN is the same API with the
// development flag OPEN_CONTENT=1 (every text), which stands in for a signed-in visitor, whose sign-in the tests fake. The browser still believes
// it is talking to tech-api.katta.cc; these helpers answer for it.
export const LIVE = "https://tech-api.katta.cc";
export const GATED = "http://127.0.0.1:5112", OPEN = "http://127.0.0.1:5111";
export const CORS = { "access-control-allow-origin": "http://localhost:4173", "access-control-allow-credentials": "true" };

/** send every API request of this page to the local API: the open one for a signed-in visitor, the gated one for anyone else; register this before the specific fakes (the last route registered wins) */
export async function localApi(page: Page, signedIn: boolean) {
  const base = signedIn ? OPEN : GATED;
  await page.route(`${LIVE}/v1/**`, async (route) => {
    const req = route.request(), u = new URL(req.url());
    const r = await fetch(base + u.pathname + u.search, { method: req.method(), headers: { "content-type": "application/json" }, body: ["POST", "PUT"].includes(req.method()) ? (req.postData() ?? undefined) : undefined });
    await route.fulfill({ status: r.status, body: await r.text(), headers: { "content-type": "application/json", ...CORS } });
  });
}

/** how many interview questions there are, from the API (the tests never type the count) */
export async function questionCount(): Promise<number> {
  const list = (await (await fetch(`${OPEN}/v1/articles`)).json()) as { articles: { section: string; group: string }[] };
  return list.articles.filter((a) => a.section === "interview-questions" && a.group !== "start").length;
}

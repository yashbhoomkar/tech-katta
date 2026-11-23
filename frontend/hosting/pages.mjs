// The pages the 3D site draws that have no article behind them, with the title and description each page's HTML carries before the 3D router starts
// (the browser tab, link previews). Static ones are listed here; a problem, a practice problem and a challenge come from the live content API when it
// is reachable (if it is not, they still work: the host answers them through the rewrites in hosting/routes.json and the router sets the title).
const API = process.env.VITE_API_BASE ?? "https://tech-api.katta.cc";

/** route (no leading slash) → [title, description?] */
export async function workspacePages() {
  const routes = new Map([
    ["problems/sandbox", ["Sandbox · Problems", "A free canvas: any parts, any traffic."]],
    ["problems/shared", ["Shared design · Problems", "A system design shared from Tech Katta's canvas."]],
    ["me", ["You"]],
    ["learn/quick-notes", ["Quick Notes"]],
    ["practice", ["Practice", "Design problems, LeetCode style: write the design, run the tests, submit."]],
  ]);
  const get = async (p) => {
    const res = await fetch(`${API}${p}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`${p} answered ${res.status}`);
    return res.json();
  };
  try {
    const { articles } = await get("/v1/articles");
    for (const a of articles) if (a.tests) routes.set(`problems/${a.slug}`, [`${a.title} · Problems`, a.dek]);
  } catch (err) { console.warn(`pages: problem pages skipped (${err.message})`); }
  try {
    const { problems } = await get("/v1/practice/problems");
    for (const p of problems) routes.set(`practice/${p.slug}`, [`${p.title} · Practice`, "Practice: write the design, run the tests, submit."]);
  } catch (err) { console.warn(`pages: practice pages skipped (${err.message})`); }
  try {
    const { challenges } = await get("/v1/lab");
    for (const c of challenges) routes.set(`problems/challenge/${c.id}`, [`${c.title} · Challenge`, c.brief]);
  } catch (err) { console.warn(`pages: challenge pages skipped (${err.message})`); }
  return routes;
}

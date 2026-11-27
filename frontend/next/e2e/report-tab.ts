import { expect, type Page } from "@playwright/test";

// The Report tab's rule (the owner chose the blue tab on the right edge, tech-katta-feedback#11 / #399): it may never cover a control (a button, a link, an input), nor the tab bar or the
// top bar; against text it may overlap a text box by at most 4 px sideways (the 16 px page margin leaves that room); it is at most 20 px wide, at least 88 px tall, flush to the right edge.
export async function tabProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const tab = document.querySelector(".tk-report") as HTMLElement | null; if (!tab) return ["there is no Report tab"];
    const t = tab.getBoundingClientRect(), out: string[] = [];
    if (t.width > 20.5) out.push(`it is ${Math.round(t.width)} px wide (at most 20)`);
    if (t.height < 88) out.push(`it is ${Math.round(t.height)} px tall (at least 88)`);
    if (Math.abs(innerWidth - t.right) > 0.5) out.push(`it is not flush to the right edge (${Math.round(t.right)} of ${innerWidth})`);
    const mid = (t.top + t.height / 2) / innerHeight;
    if (mid < 0.4 || mid > 0.8) out.push(`its middle is at ${Math.round(mid * 100)} % of the height`);
    const hit = (b: DOMRect, slack = 0) => b.width > 0 && b.height > 0 && b.left < t.right - slack && b.right > t.left + slack && b.top < t.bottom && b.bottom > t.top;
    const shown = (e: Element) => { for (let n: Element | null = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return false; } return true; };
    const skip = (e: Element) => !!e.closest(".tk-report, .tk-report-pop, canvas, script, style");
    for (const q of [".tabbar", ".top"]) { const e = document.querySelector(q); if (e && shown(e) && hit(e.getBoundingClientRect())) out.push(`it touches the ${q}`); }
    document.querySelectorAll("a, button, input, textarea, select, [role=button], [tabindex]:not([tabindex=\"-1\"])").forEach((e) => {
      if (skip(e) || !shown(e)) return;
      if (/^(ASIDE|SECTION|DIV|MAIN|ARTICLE|NAV|HEADER|FOOTER|PRE|UL|OL|TABLE|SPAN|P)$/.test(e.tagName) && e.hasAttribute("tabindex")) return; // a scrolling panel made focusable is not a control
      if (hit(e.getBoundingClientRect())) out.push(`it covers ${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24)}"`);
    });
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentElement; if (!p || !n.textContent?.trim() || skip(p) || !shown(p)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of Array.from(rg.getClientRects())) if (hit(b, 4)) { out.push(`it overlaps the text "${n.textContent.trim().slice(0, 24)}" by more than 4 px`); break; }
    }
    return out;
  });
}
export async function expectTabClear(page: Page, what: string) { expect(await tabProblems(page), `${what}: the Report tab`).toEqual([]); }

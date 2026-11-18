import { test, expect, open } from "./fixtures";

// Each build is in its own look from the first paint (scripts/look.mjs sets <html data-style> in the page itself).
test("the page is in this build's look @phone", async ({ page }, info) => {
  const look = info.project.metadata.look as string;
  await open(page, "/home");
  const html = page.locator("html");
  if (look) await expect(html).toHaveAttribute("data-style", look);
  else await expect(html).not.toHaveAttribute("data-style", /./);
  // the look's SVG filters (lib/look.ts installLookDefs) exist only in a look that has them
  await expect(page.locator("svg.tk-look-defs")).toHaveCount(look === "neo-brutalism" ? 1 : 0);
});

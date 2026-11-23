import { describe, expect, it } from "vitest";
// @ts-expect-error a plain ES module used by vite.islands.config.ts
import { lookSelector, scopeSelector } from "./island-scope.mjs";

// The islands (the workspace inside a 3D page) must not restyle the page around them: the base CSS is scoped to .tk-island.
describe("island scoping", () => {
  it("moves the look's root blocks under .tk-island", () => {
    expect(lookSelector(':root[data-style="3d"]')).toBe(".tk-island");
    expect(lookSelector(':root[data-style="3d"][data-theme="dark"] .x')).toBe(':root[data-theme="dark"] .tk-island .x');
    expect(lookSelector(":global(:root[data-style=\"3d\"]) .x")).toBe(":global(.tk-island) .x");
  });
  it("scopes the base files' rules", () => {
    expect(scopeSelector("html")).toBe(".tk-island");
    expect(scopeSelector("body")).toBe(".tk-island");
    expect(scopeSelector(":root")).toBe(".tk-island");
    expect(scopeSelector("*, ")).toBe(".tk-island *,");
    expect(scopeSelector("*::before")).toBe(".tk-island *::before");
    expect(scopeSelector("h1")).toBe(".tk-island h1");
    expect(scopeSelector(':root[data-theme="dark"]')).toBe(':root[data-theme="dark"] .tk-island');
    expect(scopeSelector(".tk-island .x")).toBe(".tk-island .x");
  });
});

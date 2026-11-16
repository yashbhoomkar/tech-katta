import { describe, expect, it } from "vitest";
// @ts-expect-error a plain ES module used by vite.config.ts
import { checkLook, lookHtml, onlyLook } from "./look.mjs";

const html = '<!doctype html>\n<html lang="en">\n<head><meta name="theme-color" content="#F6F5F1" /></head></html>';

describe("looks", () => {
  it("leaves the default look's page as it is", () => {
    expect(lookHtml(html, "")).toBe(html);
  });
  it("marks <html> and sets the theme colour for neo-brutalism", () => {
    const out = lookHtml(html, "neo-brutalism");
    expect(out).toContain('<html lang="en" data-style="neo-brutalism">');
    expect(out).toContain('content="#F8F2E5"');
  });
  it("refuses an unknown look", () => {
    expect(() => checkLook("brutalism")).toThrow(/unknown look/);
    expect(checkLook("")).toBe("");
  });
});

describe("onlyLook (the build keeps its own look's CSS)", () => {
  // a minimal stand-in for PostCSS's rule nodes
  const rule = (selector: string, parent?: { type: string; nodes: unknown[]; remove: () => void }) => {
    const r = { selector, parent, removed: false,
      get selectors() { return this.selector.split(/,\s*/); }, set selectors(v: string[]) { this.selector = v.join(", "); },
      remove() { this.removed = true; if (parent) parent.nodes = parent.nodes.filter((n) => n !== r); } };
    parent?.nodes.push(r);
    return r;
  };
  it("drops neo-brutalism rules from the default build", () => {
    const r = rule(':root[data-style="neo-brutalism"] ._card_1');
    onlyLook("").Rule(r);
    expect(r.removed).toBe(true);
  });
  it("keeps the selectors shared with other looks", () => {
    const r = rule('._card_1, :root[data-style="neo-brutalism"] ._card_1');
    onlyLook("").Rule(r);
    expect(r.removed).toBe(false);
    expect(r.selector).toBe("._card_1");
  });
  it("keeps everything in the neo-brutalism build", () => {
    const r = rule(':root[data-style="neo-brutalism"] ._card_1');
    onlyLook("neo-brutalism").Rule(r);
    expect(r.removed).toBe(false);
  });
  it("removes a media query left empty", () => {
    const media = { type: "atrule", nodes: [] as unknown[], removed: false, parent: undefined, remove() { this.removed = true; } };
    onlyLook("").Rule(rule(':root[data-style="neo-brutalism"] a', media));
    expect(media.removed).toBe(true);
  });
});

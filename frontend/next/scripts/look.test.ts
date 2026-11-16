import { describe, expect, it } from "vitest";
// @ts-expect-error a plain ES module used by vite.config.ts
import { checkLook, lookHtml } from "./look.mjs";

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

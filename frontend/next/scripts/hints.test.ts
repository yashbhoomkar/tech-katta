import { describe, expect, it } from "vitest";
// @ts-expect-error a plain ES module used by vite.config.ts
import { apiHints } from "./hints.mjs";

describe("apiHints", () => {
  it("preconnects to the API and preloads the site and articles requests", () => {
    const out = apiHints("<html><head><title>x</title></head></html>", "https://tech-api.katta.cc/");
    expect(out).toContain('<link rel="preconnect" href="https://tech-api.katta.cc" crossorigin />');
    expect(out).toContain('<link rel="preload" as="fetch" href="https://tech-api.katta.cc/v1/site" crossorigin />');
    expect(out).toContain('href="https://tech-api.katta.cc/v1/articles"');
    expect(out.indexOf("preconnect")).toBeLessThan(out.indexOf("</head>"));
  });
  it("follows a local API base", () => {
    expect(apiHints("<head></head>", "http://localhost:8787")).toContain('href="http://localhost:8787/v1/site"');
  });
});

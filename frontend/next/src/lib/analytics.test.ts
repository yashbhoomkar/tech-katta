import { describe, expect, it } from "vitest";
import { pageOf } from "./analytics";

describe("pageOf", () => {
  it("names each kind of page for page_view events", () => {
    expect(pageOf("/")).toEqual({ section: "next:landing", slug: "" });
    expect(pageOf("/home")).toEqual({ section: "next:home", slug: "" });
    expect(pageOf("/learn")).toEqual({ section: "next:learn", slug: "" });
    expect(pageOf("/learn/concepts/caching")).toEqual({ section: "next:concepts", slug: "caching" });
    expect(pageOf("/problems/url-shortener")).toEqual({ section: "next:problems", slug: "url-shortener" });
    expect(pageOf("/problems/challenge/one-server")).toEqual({ section: "next:challenge", slug: "one-server" });
  });
});

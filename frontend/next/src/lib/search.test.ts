import { describe, expect, it } from "vitest";
import { buildIndex, search, stem, type SearchItem } from "./search";

const item = (title: string, detail = "", group: SearchItem["group"] = "Lessons"): SearchItem => ({ id: title, group, title, detail, href: "/" });
const index = buildIndex([item("Caching: when to add a cache"), item("Message queues"), item("Design a chat app", "Problem"), item("Kafka", "Queues and logs")]);

describe("search", () => {
  it("stems so word forms match", () => {
    expect(stem("caching")).toBe(stem("cache"));
    expect(stem("queues")).toBe(stem("queue"));
    expect(stem("uses")).toBe(stem("use"));
    expect(stem("api")).toBe("api"); // too short to stem
  });
  it('finds "Caching" from "cache" (the prototype could not)', () => {
    expect(search(index, "cache").map((h) => h.title)).toEqual(["Caching: when to add a cache"]);
  });
  it("ranks title matches above description matches", () => {
    expect(search(index, "queue").map((h) => h.title)).toEqual(["Message queues", "Kafka"]);
  });
  it("needs every word to match", () => {
    expect(search(index, "chat app").map((h) => h.title)).toEqual(["Design a chat app"]);
    expect(search(index, "chat kafka")).toEqual([]);
  });
  it("is empty for an empty query", () => {
    expect(search(index, "  ")).toEqual([]);
  });
});

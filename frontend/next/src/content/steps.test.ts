import { describe, expect, it } from "vitest";
import { pathSteps, shortTitle } from "./steps";

const L = ["a", "b", "c", "d", "e"].map((s) => ({ slug: s, title: `Lesson ${s.toUpperCase()}: the long part` }));

describe("shortTitle", () => {
  it("keeps the name before a colon or dash", () => {
    expect(shortTitle("Caching: when to add a cache")).toBe("Caching");
    expect(shortTitle("Kafka — the log")).toBe("Kafka");
    expect(shortTitle("Plain")).toBe("Plain");
  });
});

describe("pathSteps", () => {
  it("starts at the first lesson when nothing is read", () => {
    const s = pathSteps(L, {});
    expect(s.map((x) => x.slug)).toEqual(["a", "b", "c"]);
    expect(s[0]?.current).toBe(true);
    expect(s[0]?.label).toBe("Lesson A");
  });
  it("starts at a lesson in progress, else the first not done", () => {
    expect(pathSteps(L, { a: { done: true } as never, b: { done: true } as never }).map((x) => x.slug)).toEqual(["c", "d", "e"]);
    expect(pathSteps(L, { a: { done: true } as never, d: { read: 0.4 } as never }).find((x) => x.current)?.slug).toBe("d");
  });
  it("slides to stay full near the end, and marks done lessons", () => {
    const s = pathSteps(L, { a: { done: true } as never, b: { done: true } as never, c: { done: true } as never, d: { done: true } as never });
    expect(s.map((x) => x.slug)).toEqual(["c", "d", "e"]);
    expect(s.map((x) => x.done)).toEqual([true, true, false]);
    expect(s.find((x) => x.current)?.slug).toBe("e");
  });
  it("puts a given lesson in the middle", () => {
    const s = pathSteps(L, {}, "c");
    expect(s.map((x) => x.slug)).toEqual(["b", "c", "d"]);
    expect(s[1]?.current).toBe(true);
    expect(pathSteps(L, {}, "a").map((x) => x.slug)).toEqual(["a", "b", "c"]);
  });
  it("handles short and empty lists", () => {
    expect(pathSteps(L.slice(0, 2), {})).toHaveLength(2);
    expect(pathSteps([], {})).toEqual([]);
  });
});

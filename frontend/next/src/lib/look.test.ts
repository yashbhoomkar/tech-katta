import { afterEach, describe, expect, it } from "vitest";
import { LOOK, LOOKS, installLookDefs, look } from "./look";
// @ts-expect-error a plain ES module used by vite.config.ts
import { LOOKS as BUILD_LOOKS } from "../../scripts/look.mjs";

afterEach(() => {
  delete document.documentElement.dataset.style;
  document.querySelectorAll(".tk-look-defs").forEach((n) => n.remove());
});

describe("looks", () => {
  it("the app and the build know the same looks", () => {
    expect([...LOOKS].sort()).toEqual(Object.keys(BUILD_LOOKS).sort());
  });
  it("the test build is the default look, and the page reports its own look", () => {
    expect(LOOK).toBe("");
    expect(look()).toBe("");
    document.documentElement.dataset.style = "neo-brutalism";
    expect(look()).toBe("neo-brutalism");
    document.documentElement.dataset.style = "no-such-look";
    expect(look()).toBe("");
  });
  it("the default look adds no definitions", () => {
    installLookDefs();
    expect(document.querySelector(".tk-look-defs")).toBeNull();
  });
  it("neo-brutalism adds its hard shadow once", () => {
    document.documentElement.dataset.style = "neo-brutalism";
    installLookDefs();
    installLookDefs();
    expect(document.querySelectorAll("#nb-hard")).toHaveLength(1);
    const drop = document.querySelector("#nb-hard feDropShadow");
    expect(drop?.getAttribute("stdDeviation")).toBe("0");
    expect(drop?.getAttribute("dx")).toBe("3");
  });
});

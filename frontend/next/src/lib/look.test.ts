import { afterEach, describe, expect, it } from "vitest";
import { installLookDefs, look } from "./look";

afterEach(() => {
  delete document.documentElement.dataset.style;
  document.querySelectorAll(".tk-look-defs").forEach((n) => n.remove());
});

describe("look", () => {
  it("is empty in the default look and adds no definitions", () => {
    expect(look()).toBe("");
    installLookDefs();
    expect(document.getElementById("nb-hard")).toBeNull();
  });
  it("adds the neo-brutalism hard shadow once", () => {
    document.documentElement.dataset.style = "neo-brutalism";
    expect(look()).toBe("neo-brutalism");
    installLookDefs();
    installLookDefs();
    expect(document.querySelectorAll("#nb-hard")).toHaveLength(1);
    const drop = document.querySelector("#nb-hard feDropShadow");
    expect(drop?.getAttribute("stdDeviation")).toBe("0");
    expect(drop?.getAttribute("dx")).toBe("3");
  });
});

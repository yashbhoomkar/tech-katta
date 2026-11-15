import { describe, expect, it } from "vitest";
import { getPref, resolveTheme } from "./theme";

describe("theme", () => {
  it("resolves system to the device setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("defaults to system and ignores junk in storage", () => {
    expect(getPref()).toBe("system");
    localStorage.setItem("tk-theme", "purple");
    expect(getPref()).toBe("system");
  });
});

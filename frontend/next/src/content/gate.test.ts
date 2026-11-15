import { describe, expect, it } from "vitest";
import { gateFor } from "./gate";

const copy = { pageLock: {}, previewLock: {} };
const out = { ready: true, enabled: true, user: null };

describe("gateFor", () => {
  it("opens everything to a signed-in reader, or when sign-in is unavailable", () => {
    expect(gateFor("workspace", { ...out, user: { id: "u" } }, copy)).toBe("open");
    expect(gateFor("article", { ...out, enabled: false }, copy)).toBe("open");
  });
  it("signed out: lists open, lessons preview, the workspace locks", () => {
    expect(gateFor("list", out, copy)).toBe("open");
    expect(gateFor("article", out, copy)).toBe("preview");
    expect(gateFor("workspace", out, copy)).toBe("locked");
    expect(gateFor("open", out, copy)).toBe("open");
  });
  it("waits for the account check, and follows the copy's switches", () => {
    expect(gateFor("article", { ...out, ready: false }, copy)).toBe("wait");
    expect(gateFor("article", out, undefined)).toBe("open");
    expect(gateFor("article", out, { pageLock: {} })).toBe("locked");
    expect(gateFor("list", out, { pageLock: {} })).toBe("locked");
  });
});

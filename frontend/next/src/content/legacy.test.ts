import { describe, expect, it } from "vitest";
import { legacyKey, legacyTarget } from "./legacy";

const P = ["url-shortener", "ind-vs-pak-live-streaming"];
const S = ["concepts", "components", "interview-questions", "real-systems", "quick-notes"];
const to = (path: string, hash = "") => legacyTarget(legacyKey(path, hash), P, S);

describe("tech.katta.cc addresses on the new frontend", () => {
  it("reads the key from the path, or from the hash when there is one", () => {
    expect(legacyKey("/dashboard/concepts/caching/", "")).toBe("concepts/caching");
    expect(legacyKey("/dashboard/", "#components/redis")).toBe("components/redis");
    expect(legacyKey("/dashboard", "")).toBe("");
    expect(legacyKey("/dashboard/concepts%2Fx/", "")).toBe("concepts/x");
  });
  it("maps the dashboard, sections and lessons", () => {
    expect(to("/dashboard/")).toBe("/home");
    expect(to("/dashboard/concepts/")).toBe("/learn/concepts");
    expect(to("/dashboard/concepts/caching/")).toBe("/learn/concepts/caching");
    expect(to("/dashboard/", "#interview-questions/url-shortener-iq")).toBe("/learn/interview-questions/url-shortener-iq");
  });
  it("maps problems, the sandbox, challenges, practice and the policies", () => {
    expect(to("/dashboard/problems/")).toBe("/problems");
    expect(to("/dashboard/problems/url-shortener/")).toBe("/problems/url-shortener");
    expect(to("/dashboard/problems/sandbox/")).toBe("/problems/sandbox");
    expect(to("/dashboard/problems/challenge/cricket/")).toBe("/problems/challenge/cricket");
    expect(to("/dashboard/practice/")).toBe("/practice");
    expect(to("/dashboard/practice/two-sum-cache/")).toBe("/practice/two-sum-cache");
    expect(to("/dashboard/privacy/")).toBe("/privacy");
    expect(to("/dashboard/terms/")).toBe("/terms");
  });
  it("keeps a shared design's data in the hash", () => {
    expect(to("/dashboard/problems/shared/", "#problems/shared/eJyrVkos")).toBe("/problems/shared#problems/shared/eJyrVkos");
  });
  it("maps the old Lab addresses, including a challenge that became a problem", () => {
    expect(to("/dashboard/lab/")).toBe("/problems");
    expect(to("/dashboard/lab/cricket/")).toBe("/problems/challenge/cricket");
    expect(to("/dashboard/lab/ind-vs-pak-live-streaming/")).toBe("/problems/ind-vs-pak-live-streaming");
  });
  it("sends unknown keys home and unknown problems to the list", () => {
    expect(to("/dashboard/nothing/")).toBe("/home");
    expect(to("/dashboard/problems/no-such-problem/")).toBe("/problems");
  });
});

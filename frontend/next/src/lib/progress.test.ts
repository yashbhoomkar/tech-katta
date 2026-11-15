import { beforeEach, describe, expect, it } from "vitest";
import { getProgress, lastInProgress, markComplete, recordReading, resetProgress, streakDays } from "./progress";

describe("progress", () => {
  beforeEach(() => resetProgress());
  it("keeps the furthest point read and persists it", () => {
    recordReading("caching", 0.6, 1);
    recordReading("caching", 0.2, 2);
    expect(getProgress().caching).toEqual({ read: 0.6, at: 2, done: false });
    expect(JSON.parse(localStorage.getItem("tk-progress-v1") ?? "{}")).toHaveProperty("caching");
  });
  it("marks complete and finds the last unfinished article", () => {
    recordReading("a", 0.5, 10);
    recordReading("b", 0.5, 20);
    markComplete("b", 30);
    expect(lastInProgress(getProgress())).toBe("a");
  });
  it("counts a streak of consecutive days ending today or yesterday", () => {
    const day = 86_400_000;
    const now = new Date(2026, 10, 15, 12).getTime();
    recordReading("a", 0.1, now);
    recordReading("b", 0.1, now - day);
    recordReading("c", 0.1, now - 2 * day);
    expect(streakDays(getProgress(), now)).toBe(3);
    expect(streakDays(getProgress(), now + day)).toBe(3); // nothing yet today: yesterday still counts
    expect(streakDays(getProgress(), now + 3 * day)).toBe(0);
  });
});

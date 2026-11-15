import { useSyncExternalStore } from "react";
import { readJson, writeJson } from "./storage";

// Reading progress, kept in this browser (account sync comes with sign-in, in a later milestone).
// One record per article slug: how far it was read (0..1), when, and whether it was marked complete.

export interface ArticleProgress {
  read: number;
  at: number;
  done: boolean;
}
export type Progress = Record<string, ArticleProgress>;

const KEY = "tk-progress-v1";
const listeners = new Set<() => void>();

function isProgress(v: unknown): v is Progress {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v).every(
    (p: unknown) => !!p && typeof p === "object" && typeof (p as ArticleProgress).read === "number" && typeof (p as ArticleProgress).at === "number" && typeof (p as ArticleProgress).done === "boolean",
  );
}

let snapshot: Progress = readJson<Progress>(KEY, {}, isProgress);

function commit(next: Progress): void {
  snapshot = next;
  writeJson(KEY, next);
  listeners.forEach((l) => l());
}

export function getProgress(): Progress {
  return snapshot;
}

export function recordReading(slug: string, read: number, now = Date.now()): void {
  const prev = snapshot[slug];
  const clamped = Math.max(0, Math.min(1, read));
  commit({ ...snapshot, [slug]: { read: Math.max(prev?.read ?? 0, clamped), at: now, done: prev?.done ?? false } });
}

export function markComplete(slug: string, now = Date.now()): void {
  commit({ ...snapshot, [slug]: { read: 1, at: now, done: true } });
}

/** The article read most recently and not yet finished, if any. */
export function lastInProgress(progress: Progress): string | null {
  let best: [string, number] | null = null;
  for (const [slug, p] of Object.entries(progress)) {
    if (!p.done && (!best || p.at > best[1])) best = [slug, p.at];
  }
  return best?.[0] ?? null;
}

/** Consecutive days, ending today or yesterday, with any reading. */
export function streakDays(progress: Progress, now = Date.now()): number {
  const day = (t: number) => Math.floor((t - new Date(t).getTimezoneOffset() * 60_000) / 86_400_000);
  const days = new Set(Object.values(progress).map((p) => day(p.at)));
  let d = day(now);
  if (!days.has(d)) d -= 1;
  let n = 0;
  while (days.has(d)) {
    n += 1;
    d -= 1;
  }
  return n;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getProgress);
}

/** For tests. */
export function resetProgress(): void {
  commit({});
}

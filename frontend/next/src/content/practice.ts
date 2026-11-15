import { useEffect, useState } from "react";
import { readProgress, type LegacyProgress } from "@legacy/progress.js";
import { bestScore, readSubs } from "@legacy/practice.js";
import { readMarks } from "@legacy/plan/plan.js";
import { getJson } from "@/lib/api/client";
import { useResource } from "@/lib/resource";
import type { ArticleSummary } from "@/lib/api/types";

// Practice progress (solved problems, best scores, challenge stars) is the current app's, kept in this browser by
// its workspace and synced to the account by it; this module reads it for the lists and dashboards.

export interface Challenge { id: string; level: string; title: string; brief: string; stars: unknown[] }
export interface LabResponse { challenges: Challenge[]; levels?: Record<string, string> }

export type ProblemStatus = "solved" | "started" | "new";
export interface ProblemRow { a: ArticleSummary; status: ProblemStatus; best: number | null; tests: number }

export function usePractice(): LegacyProgress {
  const [p, setP] = useState(readProgress);
  useEffect(() => {
    const on = () => setP(readProgress());
    window.addEventListener("tk-progress", on);
    window.addEventListener("storage", on);
    window.addEventListener("focus", on);
    return () => {
      window.removeEventListener("tk-progress", on);
      window.removeEventListener("storage", on);
      window.removeEventListener("focus", on);
    };
  }, []);
  return p;
}

export function problemRows(problems: ArticleSummary[], prog: LegacyProgress): ProblemRow[] {
  return problems.map((a) => {
    const solved = !!prog.steps[`solved:${a.slug}`];
    const tried = !!prog.steps[`practice:${a.slug}`] || readSubs(a.slug).length > 0;
    return { a, status: solved ? "solved" : tried ? "started" : "new", best: bestScore(a.slug), tests: typeof a.tests === "number" ? a.tests : 0 };
  });
}

const fetchLab = (signal: AbortSignal) => getJson<LabResponse>("/v1/lab", signal);
export const useLab = () => useResource("lab", fetchLab);


/** Bookmarked problems (the current app's marks), kept current. */
export function useBookmarks(): Record<string, number> {
  const [m, setM] = useState(() => readMarks().bookmarks);
  useEffect(() => {
    const on = () => setM(readMarks().bookmarks);
    window.addEventListener("tk-marks", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("tk-marks", on); window.removeEventListener("storage", on); };
  }, []);
  return m;
}

/** Per-problem acceptance (all visitors): /v1/problems/stats. */
export interface ProblemStats { problems: Record<string, { submissions: number; accepted: number }> }
const fetchStats = (signal: AbortSignal) => getJson<ProblemStats>("/v1/problems/stats", signal);
export const useProblemStats = () => useResource("problem-stats", fetchStats);

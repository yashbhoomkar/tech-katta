import { useEffect, useState } from "react";
import { readProgress, type LegacyProgress } from "@legacy/progress.js";
import { bestScore, readSubs } from "@legacy/practice.js";
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


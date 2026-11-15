import { Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { problemsOf } from "@/content/model";
import { paths } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Skeleton } from "@/components/ui";
import { NotFoundPage } from "./NotFound";

// /problems/<slug> (the workspace) and /problems/challenge/<id>. The workspace code is large (canvas, judge), so
// it loads only here.
const Workspace = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Workspace })));
const Challenge = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Challenge })));

const Wait = () => <div style={{ padding: 40, display: "grid", gap: 14 }}><Skeleton height={28} width="40%" /><Skeleton height={360} /></div>;

export function ProblemWorkspacePage() {
  const { slug = "" } = useParams();
  const { articles } = useContent();
  const problem = problemsOf(articles).find((a) => a.slug === slug);
  usePageMeta(problem?.title ?? "Problem", { to: paths.problems, label: "Problems" });
  if (!problem) return <NotFoundPage />;
  return <Suspense fallback={<Wait />}><Workspace slug={slug} /></Suspense>;
}

export function ChallengePage() {
  const { id = "" } = useParams();
  usePageMeta("Challenge", { to: paths.problems, label: "Problems" });
  return <Suspense fallback={<Wait />}><Challenge id={id} /></Suspense>;
}

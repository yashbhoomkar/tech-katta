import { Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { problemsOf } from "@/content/model";
import { paths } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Skeleton } from "@/components/ui";
import { NotFoundPage } from "./NotFound";
import { useGate } from "@/content/gate";
import { PageLock } from "@/components/Locks";

// /problems/<slug> (the workspace) and /problems/challenge/<id>. The workspace code is large (canvas, judge), so
// it loads only here.
const Workspace = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Workspace })));
const PracticeView = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Practice })));
const SandboxView = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Sandbox })));
const Challenge = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Challenge })));

const Wait = () => <div style={{ padding: 40, display: "grid", gap: 14 }}><Skeleton height={28} width="40%" /><Skeleton height={360} /></div>;

export function ProblemWorkspacePage() {
  const { slug = "" } = useParams();
  const { articles } = useContent();
  const problem = problemsOf(articles).find((a) => a.slug === slug);
  usePageMeta(problem?.title ?? "Problem", { to: paths.problems, label: "Problems" });
  const gate = useGate("workspace");
  if (!problem) return <NotFoundPage />;
  if (gate === "wait") return <Wait />;
  if (gate === "locked") return <PageLock title={problem.title} />;
  return <Suspense fallback={<Wait />}><Workspace slug={slug} /></Suspense>;
}

export function ChallengePage() {
  const { id = "" } = useParams();
  usePageMeta("Challenge", { to: paths.problems, label: "Problems" });
  const gate = useGate("workspace");
  if (gate === "wait") return <Wait />;
  if (gate === "locked") return <PageLock title="Challenge" />;
  return <Suspense fallback={<Wait />}><Challenge id={id} /></Suspense>;
}

export function SandboxPage() {
  usePageMeta("Sandbox", { to: paths.problems, label: "Problems" });
  const gate = useGate("workspace");
  if (gate === "wait") return <Wait />;
  if (gate === "locked") return <PageLock title="Sandbox" />;
  return <Suspense fallback={<Wait />}><SandboxView /></Suspense>;
}

/** /practice and /practice/<slug>: the current app's practice pages (open to everyone, as on tech.katta.cc). */
export function PracticePage() {
  const { slug = "" } = useParams();
  usePageMeta("Practice", slug ? { to: "/practice", label: "Practice" } : { to: paths.problems, label: "Problems" });
  return <Suspense fallback={<Wait />}><PracticeView slug={slug} /></Suspense>;
}

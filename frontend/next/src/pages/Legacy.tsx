import { Suspense, lazy } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useContent } from "@/content/ContentProvider";
import { legacyKey, legacyTarget } from "@/content/legacy";
import { problemsOf } from "@/content/model";
import { paths } from "@/content/sections";
import { usePageMeta } from "@/components/layout/PageMeta";
import { Skeleton } from "@/components/ui";

// tech.katta.cc's addresses (/dashboard/…) and shared designs, so the new frontend can take over the site with every
// old link, bookmark and search result still landing on its page (content/legacy.ts).

function useLegacyMap() {
  const { site, articles } = useContent();
  const problems = problemsOf(articles).map((a) => a.slug);
  const sections = site.dashboard.sections.map(([id]) => id);
  return (key: string) => legacyTarget(key, problems, sections);
}

/** /dashboard/… → the same page's new address (replacing the history entry). */
export function LegacyRedirect() {
  const loc = useLocation();
  const map = useLegacyMap();
  return <Navigate replace to={map(legacyKey(loc.pathname, loc.hash))} />;
}

const SharedDesign = lazy(() => import("@legacy/lab/SharedDesign.jsx"));
const Frame = lazy(() => import("@/features/workspace/Workspace").then((m) => ({ default: m.Frame })));

/** /problems/shared#problems/shared/<data>: a design someone shared, read-only, with its ways on (open it in your
 *  sandbox, open its problem). The current app's viewer moves on by setting #problems/…, which the workspace Frame
 *  turns into navigation. */
export function SharedDesignPage() {
  usePageMeta("Shared design", { to: paths.problems, label: "Problems" });
  const { articles } = useContent();
  const loc = useLocation();
  const data = loc.hash.match(/^#problems\/shared\/(.+)$/)?.[1] ?? "";
  return (
    <Suspense fallback={<div style={{ padding: 40 }}><Skeleton height={360} /></div>}>
      <Frame>
        <SharedDesign data={data} problemTitle={(s) => articles.find((a) => a.slug === s && a.tests !== undefined)?.title} />
      </Frame>
    </Suspense>
  );
}

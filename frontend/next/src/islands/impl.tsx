import "@/styles/tokens.css";
import "@/styles/global.css";
import "@look";
import "./island.css";
import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ContentProvider, useContent } from "@/content/ContentProvider";
import { ContentGate } from "@/content/ContentGate";
import { Skeleton } from "@/components/ui";
import { Challenge, Frame, Practice, Sandbox, Workspace } from "@/features/workspace/Workspace";
import type { IslandOptions } from "./index";

// What the island pages render: one component each, inside the content (site copy and article list, which the legacy
// canvas and judge read) and a MemoryRouter, because the workspace code navigates with react-router and reads hash
// links. Every navigation goes out to the 3D router (window.tkGo), which draws the next page: a whole page load for
// an address the 3D site does not draw yet.

const SharedDesign = lazy(() => import("@legacy/lab/SharedDesign.jsx"));

declare global {
  interface Window { tkGo?: (to: string) => void }
}

/** react-router moves (the workspace's hash links turned into routes) go to the 3D router */
function Bridge({ path }: { path: string }) {
  const loc = useLocation();
  useEffect(() => {
    if (loc.pathname !== path) {
      const to = loc.pathname + loc.search + loc.hash;
      if (window.tkGo) window.tkGo(to);
      else window.location.assign(to);
    }
  }, [loc, path]);
  return null;
}

function Shared() {
  const { articles } = useContent();
  const data = window.location.hash.match(/^#problems\/shared\/(.+)$/)?.[1] ?? "";
  return (
    <Suspense fallback={<Skeleton height={360} />}>
      <Frame>
        <SharedDesign data={data} problemTitle={(s: string) => articles.find((a) => a.slug === s && a.tests !== undefined)?.title} />
      </Frame>
    </Suspense>
  );
}

const pathOf = (kind: string, o: IslandOptions) =>
  kind === "problem" ? `/problems/${o.slug}` : kind === "challenge" ? `/problems/challenge/${o.id}` : kind === "sandbox" ? "/problems/sandbox"
    : kind === "shared" ? "/problems/shared" : o.slug ? `/practice/${o.slug}` : "/practice";

function view(kind: string, o: IslandOptions): ReactNode {
  switch (kind) {
    case "problem": return <Workspace slug={o.slug ?? ""} />;
    case "challenge": return <Challenge id={o.id ?? ""} />;
    case "sandbox": return <Sandbox />;
    case "shared": return <Shared />;
    default: return <Practice slug={o.slug ?? ""} />;
  }
}

/** draws one island into el; returns the function that removes it */
export function render(kind: string, el: HTMLElement, o: IslandOptions): () => void {
  const path = pathOf(kind, o);
  el.classList.add("tk-island");
  const root = createRoot(el);
  root.render(
    <MemoryRouter initialEntries={[path]}>
      <ContentProvider>
        <Bridge path={path} />
        <ContentGate>{view(kind, o)}</ContentGate>
      </ContentProvider>
    </MemoryRouter>,
  );
  return () => { root.unmount(); el.classList.remove("tk-island"); };
}

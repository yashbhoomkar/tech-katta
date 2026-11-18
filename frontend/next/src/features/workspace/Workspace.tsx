import { Component, Suspense, lazy, useEffect, type ReactNode } from "react";
import { setShareBase } from "@legacy/lab/share.js";
import { useNavigate } from "react-router-dom";
import { Block } from "@legacy/dashboard/blocks.jsx";
import { Article, withFigs } from "@legacy/dashboard/article.jsx";
import { useContent } from "@/content/ContentProvider";
import { useLegacySite } from "@/features/legacy/site";
import { paths } from "@/content/sections";
import { Skeleton, StateMessage, Button } from "@/components/ui";
import tokens from "@/features/reader/figureTokens.module.css";
import { useDocTheme } from "@/features/reader/useDocTheme";
import "./legacy-scope.css";
import s from "./workspace.module.css";

// The design workspace and the challenges are the current app's (frontend/src/solve.jsx, lab/Lab.jsx: the canvas,
// the judge, tests, hints, submissions, the interviewer), imported as they are and loaded only on these pages.
// They run inside `.tk-legacy`, which carries the current app's tokens scoped to this element, recoloured to this
// design. Their links are hashes ("#problems/<slug>"); they are turned into this app's routes here.

const Solve = lazy(() => import("@legacy/solve.jsx"));
const Lab = lazy(() => import("@legacy/lab/Lab.jsx"));
const PracticeApp = lazy(() => import("@legacy/practice/index.jsx"));
const SandboxCanvas = lazy(() => import("@legacy/sandbox/Sandbox.jsx"));

/** "#problems/url-shortener" → /problems/url-shortener, "#problems/challenge/x" → /problems/challenge/x, "#concepts/caching" → the lesson. */
function useHashRoutes() {
  const navigate = useNavigate();
  useEffect(() => {
    const onHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1)).replace(/^\/+/, "");
      if (!h) return;
      const [head, ...rest] = h.split("/");
      let to: string | null = null;
      if (head === "practice") to = rest.length ? `/practice/${rest.join("/")}` : "/practice";
      else if (head === "problems") to = rest.length ? `/problems/${rest.join("/")}` : paths.problems;
      else if (head && rest[0] && ["concepts", "components", "interview-questions", "real-systems", "quick-notes"].includes(head)) to = paths.article(head, rest[0]);
      if (to) navigate(to, { replace: false });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [navigate]);
}

// share links made here open here: /problems/shared#problems/shared/<data> (pages/Legacy.tsx); the current app's
// default form still works through the /dashboard route
setShareBase(`${import.meta.env.BASE_URL}problems/shared#problems/shared/`);

export function Frame({ children }: { children: ReactNode }) {
  const theme = useDocTheme();
  useHashRoutes();
  return (
    <div className={`tk-legacy ${tokens.tokens} ${s.frame}`}>
      <LegacyBoundary>
        <Suspense fallback={<div className={s.loading}><Skeleton height={28} width="40%" /><Skeleton height={16} /><Skeleton height={360} /></div>}>
          {/* keyed by theme: the canvas reads its colours when it draws */}
          <div key={theme} className={s.fill}>{children}</div>
        </Suspense>
      </LegacyBoundary>
    </div>
  );
}

export function Workspace({ slug }: { slug: string }) {
  const site = useLegacySite();
  const { articles } = useContent();
  return (
    <Frame>
      <Solve slug={slug} tab="q" s={site.problems?.solve} articles={articles} Block={Block} Article={Article} prep={withFigs} Lab={Lab} />
    </Frame>
  );
}

export function Challenge({ id }: { id: string }) {
  useLegacySite();
  return (
    <Frame>
      <Lab key={id} challenge={id} embedded={{ open: "Problems", href: "#problems", back: true, h1: true, next: true }} />
    </Frame>
  );
}

class LegacyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(err: Error) {
    console.error("workspace failed", err);
  }
  override render() {
    return this.state.failed ? (
      <div className={s.loading}>
        <StateMessage scene="broken" title="The workspace couldn't open" action={<Button onClick={() => window.location.reload()}>Reload</Button>}>Something went wrong while drawing the canvas. Your designs are kept in this browser.</StateMessage>
      </div>
    ) : this.props.children;
  }
}

/** The free canvas (the current app's sandbox): any parts, any traffic, no tests. */
export function Sandbox() {
  useLegacySite();
  return (
    <Frame>
      <SandboxCanvas Lab={Lab} />
    </Frame>
  );
}

/** Practice, LeetCode style (the current app's): the list, or one problem's page with its own judge. */
export function Practice({ slug }: { slug: string }) {
  const site = useLegacySite();
  return (
    <Frame>
      <PracticeApp key={slug} slug={slug} t={site.account} />
    </Frame>
  );
}

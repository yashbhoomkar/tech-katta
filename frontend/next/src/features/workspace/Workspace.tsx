import { Component, Suspense, lazy, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { track } from "@legacy/analytics.js";
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

// A chunk that fails to download (a mobile network dropping for a moment) would otherwise land on the error screen: try once more after a pause.
const again = <T,>(load: () => Promise<T>) => () => load().catch(() => new Promise((r) => setTimeout(r, 1500)).then(load));
const Solve = lazy(again(() => import("@legacy/solve.jsx")));
const Lab = lazy(again(() => import("@legacy/lab/Lab.jsx")));
const PracticeApp = lazy(again(() => import("@legacy/practice/index.jsx")));
const SandboxCanvas = lazy(again(() => import("@legacy/sandbox/Sandbox.jsx")));

/** "#problems/url-shortener" → /problems/url-shortener, "#problems/challenge/x" → /problems/challenge/x, "#concepts/caching" → the lesson. */
function useHashRoutes(slug?: string) {
  const navigate = useNavigate();
  useEffect(() => {
    const onHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1)).replace(/^\/+/, "");
      if (!h) return;
      const [head, ...rest] = h.split("/");
      // a problem's own Description and Solution tabs stay on the page (see Workspace)
      if (slug && rest.length === 1 && rest[0] === slug && (head === "problems" || head === "interview-questions")) return;
      let to: string | null = null;
      if (head === "practice") to = rest.length ? `/practice/${rest.join("/")}` : "/practice";
      else if (head === "problems") to = rest.length ? `/problems/${rest.join("/")}` : paths.problems;
      else if (head && rest[0] && ["concepts", "components", "interview-questions", "real-systems", "quick-notes"].includes(head)) to = paths.article(head, rest[0]);
      if (to) navigate(to, { replace: false });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [navigate, slug]);
}

// share links made here open here: /problems/shared#problems/shared/<data> (pages/Legacy.tsx); the current app's
// default form still works through the /dashboard route
// (an island is built with a base of its own, /3d/islands/; the page it sits in is at the site root)
setShareBase(`${import.meta.env.BASE_URL.startsWith("/3d/islands") ? "/" : import.meta.env.BASE_URL}problems/shared#problems/shared/`);

export function Frame({ children, slug }: { children: ReactNode; slug?: string }) {
  const theme = useDocTheme();
  useHashRoutes(slug);
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

/** The problem's tab from the address: "#interview-questions/<slug>" is the Solution (its design with Copy to my canvas, then the
 *  article), anything else the Description. The current app's tabs set these hashes, so links, Back and the tabs agree. */
const tabOf = (hash: string, slug: string) => (decodeURIComponent(hash.slice(1)).replace(/^\/+/, "") === `interview-questions/${slug}` ? "a" : "q");

export function Workspace({ slug }: { slug: string }) {
  const site = useLegacySite();
  const { articles } = useContent();
  const [tab, setTab] = useState(() => tabOf(window.location.hash, slug));
  useEffect(() => {
    const on = () => setTab(tabOf(window.location.hash, slug));
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [slug]);
  return (
    <Frame slug={slug}>
      <Solve slug={slug} tab={tab} s={site.problems?.solve} acct={site.account} articles={articles} Block={Block} Article={Article} prep={withFigs} Lab={Lab} />
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
  override componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("workspace failed", err);
    // what broke, so a crash on someone's phone can be found (the events API keeps letters, digits and simple punctuation, 80 characters)
    const clean = (t: string) => t.replace(/[^\w.:/ -]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    const where = clean((info.componentStack || "").split("\n").map((l) => l.trim()).find((l) => l.startsWith("at ")) || "");
    let view = "3d";
    try { view = localStorage.getItem("tk-design-view") || "3d"; } catch { /* storage blocked */ }
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    track("canvas_error", { msg: clean(`${err?.name || "Error"}: ${err?.message || ""}`), where, view, ...(typeof mem === "number" ? { mem } : {}) });
  }
  override render() {
    // Open in 2D: the 3D canvas needs graphics memory a phone may not have; the 2D canvas edits the same design
    const in2d = () => {
      try { localStorage.setItem("tk-design-view", "2d"); } catch { /* storage blocked */ }
      window.location.reload();
    };
    return this.state.failed ? (
      <div className={s.loading}>
        <StateMessage scene="broken" title="The workspace couldn't open" action={<><Button onClick={in2d}>Open in 2D</Button> <Button onClick={() => window.location.reload()}>Reload</Button></>}>Something went wrong while drawing the canvas. Your designs are kept in this browser.</StateMessage>
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

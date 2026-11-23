import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter, Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { NotFoundPage } from "@/pages/NotFound";
import { RouteError } from "./RouteError";
import { AppShell } from "@/components/layout/AppShell";
import { PageMetaProvider } from "@/components/layout/PageMeta";
import { ContentGate } from "@/content/ContentGate";
import { Providers } from "./Providers";
import { HostAnalytics } from "@legacy/hostanalytics.jsx";
import { usePageViews } from "@/lib/analytics";
import { SITE3D } from "@/lib/site3d";

// Routes. The landing page has its own chrome; every other page sits in the app shell. Paths mirror the
// full-site prototype (/learn/<section>/<slug>, /problems/<slug>, /me) without its hash.
//
// Each page's code loads when it is first opened (Lighthouse, 2026-11-16: the first load ran every page's code on
// a phone's CPU before painting). The page you open fetches only its own chunk; once it is idle, the other pages
// are fetched in the background, so moving around stays instant. The not-found page is small and stays in the
// main bundle.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPage = ComponentType<any>;
const LOADERS: (() => Promise<unknown>)[] = [];
/** A lazy page. When a chunk fails to load after a release, the current app's handler (frontend/src/api.js,
 *  "vite:preloadError") cancels the error and reloads the page, which makes the import resolve to undefined: the page
 *  then keeps showing Loading until the reload, instead of throwing. Without that handler the import rejects and
 *  RouteError asks for a reload. */
export function page<M>(load: () => Promise<M | undefined>, pick: (m: M) => AnyPage) {
  LOADERS.push(load);
  return lazy(() => load().then((m) => (m === undefined ? new Promise<never>(() => {}) : { default: pick(m) })));
}
const LandingPage = page(() => import("@/pages/Landing"), (m) => m.LandingPage);
const HomePage = page(() => import("@/pages/Home"), (m) => m.HomePage);
const LearnPage = page(() => import("@/pages/Learn"), (m) => m.LearnPage);
const SectionPage = page(() => import("@/pages/Section"), (m) => m.SectionPage);
const ReaderPage = page(() => import("@/pages/Reader"), (m) => m.ReaderPage);
const ProblemsPage = page(() => import("@/pages/Problems"), (m) => m.ProblemsPage);
const MePage = page(() => import("@/pages/Me"), (m) => m.MePage);
const PolicyPage = page(() => import("@/pages/Policy"), (m) => m.PolicyPage);
const ChallengePage = page(() => import("@/pages/ProblemWorkspace"), (m) => m.ChallengePage);
const PracticePage = page(() => import("@/pages/ProblemWorkspace"), (m) => m.PracticePage);
const ProblemWorkspacePage = page(() => import("@/pages/ProblemWorkspace"), (m) => m.ProblemWorkspacePage);
const SandboxPage = page(() => import("@/pages/ProblemWorkspace"), (m) => m.SandboxPage);
const LegacyRedirect = page(() => import("@/pages/Legacy"), (m) => m.LegacyRedirect);
const SharedDesignPage = page(() => import("@/pages/Legacy"), (m) => m.SharedDesignPage);

/** Fetch every page's code once the first page has settled (idle), so later navigations do not wait. */
export function prefetchPages(): void {
  for (const load of LOADERS) void load().catch(() => {});
}

/** While a page's code arrives: an empty area of the page's height, so nothing jumps. */
function Loading({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div aria-busy="true" style={{ minHeight: "70vh" }} />}>{children}</Suspense>;
}

function Root() {
  usePageViews();
  useEffect(() => {
    // after the first page has loaded and settled: an idle callback alone fires while the page waits for the API,
    // and compiling every page then slowed the first paint on phones (Lighthouse, 2026-11-16)
    let timer = 0;
    const idle = () => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(prefetchPages, { timeout: 5000 }) : prefetchPages());
    const start = () => { timer = window.setTimeout(idle, 3000); };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => { window.clearTimeout(timer); window.removeEventListener("load", start); };
  }, []);
  return (
    <Providers>
      <Outlet />
      <HostAnalytics />
    </Providers>
  );
}

function Landing() {
  return (
    <PageMetaProvider>
      <ContentGate>
        <Loading><LandingPage /></Loading>
      </ContentGate>
      <ScrollRestoration />
    </PageMetaProvider>
  );
}

const gated = (el: ReactNode) => <ContentGate><Loading>{el}</Loading></ContentGate>;

// The 3D site (frontend/site3d) answers at tech.katta.cc's landing, /home, and the four Learn sections and their
// articles (hosting/switch.mjs). A production build says so with VITE_SITE3D=1: then this app leaves those addresses
// to it with a whole page load, so a link from the problem workspace to Learn opens the 3D page, not this app's old
// one. Quick Notes, the problems, /me and the policies stay here. Other builds (tests, the e2e looks) keep every page.
export { SITE3D };
const OWNED_BY_3D = /^\/(?:|home|learn(?:\/(?:concepts|components|interview-questions|real-systems)(?:\/[\w-]+)?)?)\/?$/;
export const ownedBy3d = (path: string) => SITE3D && OWNED_BY_3D.test(path);
const AWAY_KEY = "tk-3d-away";
/** Load the address again as a whole page (the host serves the 3D site there). If that already happened for this
 *  address (the host had no 3D page for it, say a mistyped article), show not found instead of reloading forever. */
function ToSite3d({ fallback, path }: { fallback: ReactNode; path: string }) {
  let again = false;
  try { again = sessionStorage.getItem(AWAY_KEY) === path; } catch { /* storage blocked */ }
  useEffect(() => {
    if (again) { try { sessionStorage.removeItem(AWAY_KEY); } catch { /* blocked */ } return; }
    try { sessionStorage.setItem(AWAY_KEY, path); } catch { /* blocked */ }
    location.replace(location.href);
  }, [again, path]);
  return again ? <>{fallback}</> : <div aria-busy="true" style={{ minHeight: "70vh" }} />;
}
/** this app's page, or (in a 3D build, on an address the 3D site owns) a whole page load to it */
function Own({ el }: { el: ReactNode }) {
  const { pathname } = useLocation();
  return ownedBy3d(pathname) ? <ToSite3d key={pathname} path={pathname} fallback={<NotFoundPage />} /> : <>{el}</>;
}

export const routes = [
  {
    element: <Root />,
    // any error a page throws while rendering shows a friendly page instead of a blank screen (RouteError)
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <Own el={<Landing />} /> },
      {
        element: <AppShell />,
        // inside the shell: the sidebar and tabs stay, so the reader can move on
        errorElement: <RouteError />,
        children: [
          { path: "home", element: <Own el={gated(<HomePage />)} /> },
          { path: "learn", element: <Own el={gated(<LearnPage />)} /> },
          { path: "learn/:section", element: <Own el={gated(<SectionPage />)} /> },
          { path: "learn/:section/:slug", element: <Own el={gated(<ReaderPage />)} /> },
          { path: "problems", element: gated(<ProblemsPage />) },
          { path: "problems/challenge/:id", element: gated(<ChallengePage />) },
          { path: "problems/sandbox", element: gated(<SandboxPage />) },
          { path: "problems/shared", element: gated(<SharedDesignPage />) },
          { path: "practice", element: gated(<PracticePage />) },
          { path: "practice/:slug", element: gated(<PracticePage />) },
          { path: "problems/:slug", element: gated(<ProblemWorkspacePage />) },
          { path: "me", element: <Loading><MePage /></Loading> },
          { path: "privacy", element: gated(<PolicyPage which="privacy" />) },
          { path: "terms", element: gated(<PolicyPage which="terms" />) },
          // tech.katta.cc's addresses (content/legacy.ts), so every old link lands on its page
          { path: "dashboard", element: gated(<LegacyRedirect />) },
          { path: "dashboard/*", element: gated(<LegacyRedirect />) },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });
}

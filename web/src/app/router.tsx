import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageMetaProvider } from "@/components/layout/PageMeta";
import { ContentGate } from "@/content/ContentGate";
import { ComingSoonPage } from "@/pages/ComingSoon";
import { HomePage } from "@/pages/Home";
import { LandingPage } from "@/pages/Landing";
import { LearnPage } from "@/pages/Learn";
import { MePage } from "@/pages/Me";
import { NotFoundPage } from "@/pages/NotFound";
import { SectionPage } from "@/pages/Section";
import { Providers } from "./Providers";

// Routes. The landing page has its own chrome; every other page sits in the app shell. Paths mirror the
// full-site prototype (/learn/<section>/<slug>, /problems/<slug>, /me) without its hash.

function Root() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}

function Landing() {
  return (
    <PageMetaProvider>
      <ContentGate>
        <LandingPage />
      </ContentGate>
      <ScrollRestoration />
    </PageMetaProvider>
  );
}

const gated = (el: React.ReactNode) => <ContentGate>{el}</ContentGate>;

export const routes = [
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      {
        element: <AppShell />,
        children: [
          { path: "home", element: gated(<HomePage />) },
          { path: "learn", element: gated(<LearnPage />) },
          { path: "learn/:section", element: gated(<SectionPage />) },
          { path: "learn/:section/:slug", element: gated(<ComingSoonPage kind="article" />) },
          { path: "problems", element: gated(<ComingSoonPage kind="problems" />) },
          { path: "problems/:slug", element: gated(<ComingSoonPage kind="problem" />) },
          { path: "me", element: <MePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" });
}

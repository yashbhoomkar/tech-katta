import { useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { PageMetaProvider } from "./PageMeta";
import s from "./layout.module.css";

// The app chrome: sidebar on desktop (full or a narrow rail), top bar and bottom tabs on phones.
// On every route change the page fades in (160 ms) and focus moves to <main>, so screen readers announce it.

export function AppShell() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <PageMetaProvider>
      <a className={s.skip} href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>
        Skip to content
      </a>
      <div className={s.shell}>
        <Sidebar />
        <div className={s.column}>
          <TopBar />
          <main id="main" ref={main} tabIndex={-1} className={s.main} key={pathname}>
            <Outlet />
          </main>
        </div>
      </div>
      <TabBar />
      <ScrollRestoration />
    </PageMetaProvider>
  );
}

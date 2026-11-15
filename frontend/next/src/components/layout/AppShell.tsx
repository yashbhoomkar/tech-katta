import { useEffect, useRef } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { TopBar } from "./TopBar";
import { PageMetaProvider } from "./PageMeta";
import { PageTour } from "@/components/PageTour";
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

  useBarsAway(/^\/learn\/[^/]+\/[^/]+/.test(pathname));

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
            <PageTour />
            <Outlet />
          </main>
        </div>
      </div>
      <TabBar />
      <ScrollRestoration />
    </PageMetaProvider>
  );
}

/** On reading pages (phones) the top bar and tabs slide away while you scroll down and come back when you scroll up. */
function useBarsAway(reading: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (!reading) {
      root.removeAttribute("data-bars");
      return;
    }
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y > 120 && y > last + 4) root.setAttribute("data-bars", "away");
        else if (y < last - 4 || y < 120) root.removeAttribute("data-bars");
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      root.removeAttribute("data-bars");
    };
  }, [reading]);
}

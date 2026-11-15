import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useContentState } from "@/content/ContentProvider";
import type { TourStepCopy } from "@/lib/api/types";
import { useTour, type TourStep } from "./Tour";
import s from "./Overlays.module.css";

// "Tour" on every page, as on tech.katta.cc. The words are the site's own tour copy (site.tour.<page kind>); each
// step's target there is the current app's selector, mapped here to the element that plays that part in this
// design. The workspace and challenges are the current app's own, so their selectors are used as they are.

const MAP: Record<string, string> = {
  ".side-nav": "side-nav",
  ".side-sub": "side-sub",
  ".d-list, .qt-start, .d-notes": "[data-tour=\"list\"], [data-tour=\"notes\"]",
  ".tabs": "nav[aria-label=\"Main\"]",
  ".d-head .theme-btn": "theme",
  ".d-tour": "tour",
  ".reader": "listen",
  ".a-fig": "figure",
  ".d-rail": "toc",
  ".a-more": "details",
  '.tabs .tab[href="#problems"]': "nav[aria-label=\"Main\"] a[href$=\"/problems\"]",
  '.tabs .tab[href="#concepts"]': "nav[aria-label=\"Main\"] a[href$=\"/learn/concepts\"]",
  ".d-desc": "desc",
  ".d-list > section:first-of-type li:nth-child(2)": "[data-tour=\"list\"] a:nth-of-type(2)",
  ".d-list > section:first-of-type li:first-child": "first",
  'a.qt-start[href*="how-to-answer"]': "[data-tour=\"list\"] a[href*=\"how-to-answer\"]",
  ".qt-table": "[data-tour=\"table\"], [data-tour=\"list\"]",
  ".qt-levels": "levels",
  "a.qt-start": "first",
  ".d-notes": "notes",
  ".numbers-wrap": "numbers",
  ".pb-bar": "stats",
  ".pb-pick": "pick",
  ".pb-group + .pb-group": "#challenges",
  ".lock-card": "lock",
  ".cards": "explore",
  ".d-head .acct": "prog",
};

/** Which tour copy a path uses. */
export function tourKind(pathname: string): string | null {
  const [a = "", b = "", c = ""] = pathname.split("/").filter(Boolean);
  if (a === "home") return "dashboard";
  if (a === "learn" && b && c) return "article";
  if (a === "learn" && b) return b;
  if (a === "problems" && b === "challenge") return "lab";
  if (a === "problems" && b) return "problem";
  if (a === "problems") return "problems";
  return null;
}

export function usePageTour() {
  const { pathname } = useLocation();
  const content = useContentState();
  const tour = content.status === "success" ? content.data.site.tour : undefined;
  const kind = tourKind(pathname);
  const steps: TourStep[] = useMemo(() => {
    if (!tour || !kind) return [];
    const copy = (tour[kind] ?? (kind.includes("-") || kind === "concepts" || kind === "components" ? tour.section : undefined)) as TourStepCopy[] | undefined;
    return (copy ?? []).map((st) => ({ target: MAP[st.target] ?? st.target, title: st.title, text: st.text }));
  }, [tour, kind]);
  const t = useTour(steps);
  return { ...t, label: tour?.button ?? "Tour", available: steps.length > 0 };
}

/** The Tour button (top right on wide screens) and the tour itself. */
export function PageTour() {
  const t = usePageTour();
  if (!t.available) return null;
  return (
    <>
      <button type="button" className={s.tourBtn} onClick={t.start} data-tour="tour">{t.label}</button>
      {t.ui}
    </>
  );
}

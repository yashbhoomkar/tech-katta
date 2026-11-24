import { useSyncExternalStore } from "react";
import { readString, writeString } from "./storage";

// Light / dark. The viewer picks System, Light or Dark; System follows the device and changes live.
// public/boot-theme.js sets the first value before paint (same key, same attribute); this keeps it in step.

export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";

const KEY = "tk-theme";
const listeners = new Set<() => void>();
const darkQuery = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;

const isPref = (v: string | null): v is ThemePref => v === "system" || v === "light" || v === "dark";

/** With no choice made: dark (the 3D site at tech.katta.cc is dark by default). */
const DEFAULT_PREF: ThemePref = "dark";

export function getPref(): ThemePref {
  const v = readString(KEY);
  return isPref(v) ? v : DEFAULT_PREF;
}

export function resolveTheme(pref: ThemePref, systemDark = darkQuery?.matches ?? false): Theme {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

function apply(): void {
  const theme = resolveTheme(getPref());
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  const page = getComputedStyle(root).getPropertyValue("--page").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", page || (theme === "dark" ? "#131312" : "#F6F5F1"));
  listeners.forEach((l) => l());
}

export function setPref(pref: ThemePref): void {
  const before = resolveTheme(getPref());
  writeString(KEY, pref);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // cross-fade only when the colours actually change
  if (resolveTheme(pref) !== before && "startViewTransition" in document && !reduced) {
    // marked so the page-change transition (a rise) is not used for the theme's plain cross-fade
    document.documentElement.dataset.vt = "theme";
    document.startViewTransition(apply).finished.finally(() => delete document.documentElement.dataset.vt);
  } else apply();
}

let started = false;
/** Call once at start-up. */
export function initTheme(): void {
  if (started) return;
  started = true;
  apply();
  darkQuery?.addEventListener("change", () => {
    if (getPref() === "system") apply();
  });
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The viewer's choice (system / light / dark), re-rendering when it changes. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getPref, () => "system");
}

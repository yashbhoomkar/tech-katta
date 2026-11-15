import { useSyncExternalStore } from "react";
import type { Theme } from "@/lib/theme";

// The theme the page is drawn in right now (data-theme on <html>, set by lib/theme). Figures key on it: their
// colours are read once per draw, so a theme change must draw them again.
const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
function subscribe(on: () => void): () => void {
  const mo = new MutationObserver(on);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
export const useDocTheme = (): Theme => useSyncExternalStore(subscribe, read, () => "light");

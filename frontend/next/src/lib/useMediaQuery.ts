import { useSyncExternalStore } from "react";

/** Whether a media query matches, kept current. False where matchMedia is missing (tests, old engines). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (on) => {
      if (typeof matchMedia !== "function") return () => {};
      const q = matchMedia(query);
      q.addEventListener("change", on);
      return () => q.removeEventListener("change", on);
    },
    () => typeof matchMedia === "function" && matchMedia(query).matches,
    () => false,
  );
}

import { type RefObject } from "react";
import { settleMs, useDrag } from "@legacy/theme/gesture.js";
import { useMediaQuery } from "./useMediaQuery";

// Touch gestures with the current app's thresholds (theme/gesture.js: a flick or more than half way), so they feel
// the same on both sites.

/** A bottom sheet (phones) that follows the finger down and closes past the threshold, or springs back. */
export function useSheetDrag(ref: RefObject<HTMLElement | null>, onClose: () => void, on = true): void {
  const phone = useMediaQuery("(max-width: 640px)");
  const put = (d: number, ms = 0) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = ms ? `transform ${ms}ms var(--out)` : "none";
    el.style.transform = d ? `translateY(${d}px)` : "";
  };
  const size = () => ref.current?.offsetHeight ?? 400;
  useDrag(ref, {
    axis: "y", on: on && phone, min: 0, size, ignore: "input, textarea, select, [role=listbox]",
    onMove: (d) => put(Math.max(0, d)),
    onEnd: (go, d) => {
      if (go === 1) {
        const ms = settleMs(size() - d, size());
        put(size(), ms);
        window.setTimeout(onClose, ms);
      } else put(0, settleMs(d, size()));
    },
  });
}

/** Sideways swipes on an element (phones): left for next, right for back, with the element following the finger. */
export function useSwipeX(ref: RefObject<HTMLElement | null>, { onNext, onBack, canNext, canBack }: { onNext: () => void; onBack: () => void; canNext: boolean; canBack: boolean }): void {
  const phone = useMediaQuery("(max-width: 640px)");
  const put = (d: number, ms = 0) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = ms ? `transform ${ms}ms var(--out)` : "none";
    el.style.transform = d ? `translateX(${d}px)` : "";
  };
  useDrag(ref, {
    axis: "x", on: phone, min: canNext ? -Infinity : 0, max: canBack ? Infinity : 0,
    onMove: (d) => put(d),
    onEnd: (go, d) => {
      put(0, settleMs(d, ref.current?.offsetWidth ?? 300));
      if (go === -1) onNext();
      else if (go === 1) onBack();
    },
  });
}

import { useMemo, type CSSProperties } from "react";
import { Icon as SectionMark } from "@legacy/dashboard/icons.jsx";
import { useContent } from "@/content/ContentProvider";
import { problemsOf, sectionView } from "@/content/model";
import { sectionMeta } from "@/content/sections";
import type { SectionId } from "@/lib/api/types";
import { pathSteps } from "@/content/steps";
import { useProgress } from "@/lib/progress";
import { cx } from "@/lib/cx";
import s from "./ui/ui.module.css";

// The small figure on a card (owner, 2026-11-16: a whole figure shrunk onto a card cannot be read, and a lone icon
// leaves the card empty; "smaller figures will make sense"). It is drawn for the card's size rather than shrunk:
// the section's mark, then a short path through the section's real lessons — the one to read next and the two after
// it — joined by a line a request travels along. The lesson you are on is filled with the card's colour, finished
// ones carry a tick. The labels are text, so they stay readable at any size; a narrow card stacks the path, a wide
// one lays it out sideways (container query). Given `around`, the path is that lesson between its neighbours.
// Neo-brutalism draws it outlined, with a square chip that hops from box to box (ui.module.css).

export function SectionMini({ section, around, className }: { section: string; around?: string | undefined; className?: string | undefined }) {
  const { site, articles } = useContent();
  const progress = useProgress();
  const ordered = useMemo(() => {
    if (section === "problems") return problemsOf(articles);
    if (section === "quick-notes") return (site.notes?.items ?? []).map(([no, title]) => ({ slug: `note-${no}`, title }));
    return sectionView(site, articles, section as SectionId).groups.flatMap((g) => g.articles);
  }, [section, site, articles]);
  const steps = pathSteps(ordered, progress, around);
  const accent = sectionMeta(section)?.accent ?? "problems";
  return (
    <span className={cx(s.mini, className)} data-accent={accent} aria-hidden="true">
      <span className={s.miniMark}><SectionMark name={section} /></span>
      <span className={s.miniPath} style={{ "--n": steps.length } as CSSProperties}>
        {steps.map((st) => (
          <span key={st.slug} className={cx(s.miniStep, st.current && s.miniNow, st.done && s.miniDone)}>{st.label}</span>
        ))}
      </span>
    </span>
  );
}

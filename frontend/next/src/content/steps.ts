import type { ArticleSummary } from "@/lib/api/types";
import type { Progress } from "@/lib/progress";

// The small figure on a card (SectionMini): a short path through a section's lessons, in the section's order. On a
// section card it starts at the lesson to read next; on a lesson's card it is that lesson between its neighbours.

export interface Step {
  slug: string;
  /** the lesson's short name: its title up to the first colon or dash */
  label: string;
  done: boolean;
  current: boolean;
}

export const shortTitle = (title: string): string => title.split(/\s*[:—–]\s*/)[0]?.trim() || title;

/** Up to `n` steps from `ordered`: the window starting at the lesson to read next (one in progress, else the first
 *  not done), or, given `around`, the window with that lesson in the middle. Near either end the window slides so it
 *  stays full. */
export function pathSteps(ordered: Pick<ArticleSummary, "slug" | "title">[], progress: Progress, around?: string, n = 3): Step[] {
  if (!ordered.length) return [];
  const size = Math.min(n, ordered.length);
  let current = around ? ordered.findIndex((a) => a.slug === around) : -1;
  if (current < 0) {
    const started = ordered.findIndex((a) => progress[a.slug] && !progress[a.slug]?.done);
    const notDone = ordered.findIndex((a) => !progress[a.slug]?.done);
    current = started >= 0 ? started : notDone >= 0 ? notDone : ordered.length - 1;
  }
  const first = Math.max(0, Math.min(around ? current - Math.floor((size - 1) / 2) : current, ordered.length - size));
  return ordered.slice(first, first + size).map((a, i) => ({
    slug: a.slug,
    label: shortTitle(a.title),
    done: !!progress[a.slug]?.done,
    current: first + i === current,
  }));
}

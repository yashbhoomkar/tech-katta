import { Icon as SectionMark } from "@legacy/dashboard/icons.jsx";
import { sectionMeta } from "@/content/sections";
import { cx } from "@/lib/cx";
import s from "./ui/ui.module.css";

// A card's picture (owner, 2026-11-16: whole figures shrunk onto cards are unreadable), in both looks. Instead
// of a zoomed-out figure, a card shows its section's mark (the figure-part marks of the sidebar, spec 24 G4) drawn
// large on a tile in the section's (card's) colour, and an optional label (a lesson's tag). ui.module.css styles it
// softly in the default look and as an outlined, tilted sticker in neo-brutalism.
// Full figures stay where they can be read: lessons, full screen and the landing figure.
export function MarkSticker({ section, label, className }: { section: string; label?: string | undefined; className?: string | undefined }) {
  return (
    <span className={cx(s.sticker, className)} data-accent={sectionMeta(section)?.accent ?? (section === "problems" ? "problems" : undefined)} aria-hidden="true">
      <span className={s.stickerMark}><SectionMark name={section} /></span>
      {label && <b className={s.stickerLabel}>{label}</b>}
    </span>
  );
}

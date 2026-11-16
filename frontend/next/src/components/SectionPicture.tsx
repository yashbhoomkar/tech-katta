import { MarkSticker } from "./MarkSticker";

// The picture on a section's card (Home Explore, Learn, the landing cards). It used to be the library card's mini
// diagram or the section's first lesson figure, shrunk to fit; at card size neither could be read (owner,
// 2026-11-16), so a card shows its section's mark as a sticker in the card's colour. Figures are drawn only where
// they can be read: lessons, full screen, the topic sheet and the landing figure.
export function SectionPicture({ sectionId, className }: { sectionId: string; className?: string | undefined }) {
  return <MarkSticker section={sectionId} className={className} />;
}

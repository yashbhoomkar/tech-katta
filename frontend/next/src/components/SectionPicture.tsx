import { SectionMini } from "./SectionMini";

// The picture on a section's card (Home Explore, Learn, the landing cards): a small figure drawn for the card
// (SectionMini) — the section's mark and the next lessons on a path — rather than a lesson figure shrunk to fit,
// which could not be read (owner, 2026-11-16).
export function SectionPicture({ sectionId, className }: { sectionId: string; className?: string | undefined }) {
  return <SectionMini section={sectionId} className={className} />;
}

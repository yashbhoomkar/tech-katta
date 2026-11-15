import { useContent } from "@/content/ContentProvider";
import { FigureThumb } from "@/features/reader/FigureThumb";
import { CardPicture } from "./CardPicture";

// The picture on a section's card, as on tech.katta.cc: the library card's diagram where the API names one
// (site.topics cards: Concepts, Components, Interview Questions), otherwise the section's first lesson figure.
const CARD_ID: Record<string, string> = { concepts: "concepts", components: "components", "interview-questions": "problems" };

export function SectionPicture({ sectionId, className }: { sectionId: string; className?: string | undefined }) {
  const { site, articles } = useContent();
  const visual = site.topics.cards.find((c) => c.id === CARD_ID[sectionId])?.visual;
  if (visual) return <CardPicture visual={visual} className={className} />;
  const own = sectionId === "problems" ? articles.filter((a) => a.tests !== undefined) : articles.filter((a) => a.section === sectionId);
  const fig = own.find((a) => a.fig)?.fig;
  return fig ? <FigureThumb id={fig} className={className} /> : null;
}

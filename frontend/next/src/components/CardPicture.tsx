import { Mini } from "@legacy/library.jsx";
import "@legacy/library.css";
import "@/features/workspace/legacy-scope.css";
import tokens from "@/features/reader/figureTokens.module.css";
import { useDocTheme } from "@/features/reader/useDocTheme";
import s from "./ui/ui.module.css";

// A library card's picture, as on tech.katta.cc: the small diagram named by the topic card's `visual` (site.topics
// cards: "cap", "path", "steps"), drawn by the current app's library (Mini), in this design's colours.
export function CardPicture({ visual, className }: { visual: string | undefined; className?: string | undefined }) {
  const theme = useDocTheme();
  if (!visual) return null;
  return (
    <span className={`tk-legacy ${tokens.tokens} ${s.cardPicture} ${className ?? ""}`} aria-hidden="true">
      <Mini key={theme} type={visual} />
    </span>
  );
}

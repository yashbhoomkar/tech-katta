import { createContext } from "react";

/** Set by the article body once the figure colours have been read for the current theme (see ArticleBody):
 *  figures draw only then, keyed by the theme, so a theme change redraws them in the new colours. */
export const FigureTheme = createContext<{ theme: string; still: boolean; example: string } | null>(null);

// Types for the current app's figure modules (frontend/src/figs, plain JavaScript), imported as they are.
declare module "@legacy/figs/index.js" {
  import type { ComponentType } from "react";
  export interface LegacyFigure {
    /** draws the figure; `still` = no animation (reduced motion), `uid` keeps SVG ids unique on a page */
    C: ComponentType<{ still?: boolean; uid?: string }>;
    /** width / height */
    ar?: number;
    /** the heading, given the example system's name */
    title: (exampleName: string) => string;
  }
  export function knownFig(id: string): boolean;
  export function figOf(id: string): LegacyFigure | undefined;
  export function loadFigs(ids: string[]): Promise<unknown>;
  export function prefetchFigs(tab: string, subTab: string): void;
}

declare module "@legacy/figs/phone.jsx" {
  import type { ComponentType } from "react";
  /** portrait versions of some figures, for phones */
  export const PHONE_FIGS: Record<string, { C: ComponentType<{ still?: boolean; uid?: string }> } | undefined>;
}

declare module "@legacy/theme/palette.js" {
  /** re-reads the figure colours from the page's CSS variables (call after the theme changes) */
  export function readTokens(el?: Element | null): void;
}

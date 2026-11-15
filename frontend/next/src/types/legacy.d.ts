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

declare module "@legacy/account.js" {
  export interface AccountUser { id?: string; name?: string; email?: string; picture?: string }
  export interface AccountState {
    ready: boolean;
    enabled: boolean;
    user: AccountUser | null;
    clientId: string | null;
    syncing: boolean;
    error: string | null;
  }
  /** current state; a "tk-account" window event fires on every change */
  export function account(): AccountState;
  export function startAccount(): Promise<void>;
  export function renderGoogleButton(el: HTMLElement, opts?: { text?: string }): Promise<void>;
  export function setTermsChoice(v: boolean): void;
  export function signOut(): Promise<void>;
  export function signOutAll(): Promise<void>;
  export function deleteAccount(): Promise<void>;
}

declare module "@legacy/dashboard/site.js" {
  /** fills the current app's live site bindings (copy, articles, example) that its components read */
  export function setSite(site: unknown, list: { articles: unknown[] }): void;
}
declare module "@legacy/dashboard/blocks.jsx" {
  import type { ComponentType } from "react";
  export const Block: ComponentType<Record<string, unknown>>;
}
declare module "@legacy/dashboard/article.jsx" {
  import type { ComponentType } from "react";
  export const Article: ComponentType<Record<string, unknown>>;
  export function withFigs<T>(a: T): Promise<T>;
}
declare module "@legacy/solve.jsx" {
  import type { ComponentType } from "react";
  const Solve: ComponentType<Record<string, unknown>>;
  export default Solve;
}
declare module "@legacy/lab/Lab.jsx" {
  import type { ComponentType } from "react";
  const Lab: ComponentType<Record<string, unknown>>;
  export default Lab;
}

declare module "@legacy/progress.js" {
  export interface LegacyProgress { steps: Record<string, unknown>; stars: Record<string, number> }
  /** this browser's practice progress; a "tk-progress" window event fires when it changes */
  export function readProgress(): LegacyProgress;
}
declare module "@legacy/practice.js" {
  export function bestScore(slug: string): number | null;
  export function readSubs(slug: string): { score: number; copied?: boolean }[];
}

declare module "@legacy/analytics.js" {
  /** queues a usage event for our API (/v1/events); nothing is sent when the browser asks not to be tracked */
  export function track(name: string, props?: Record<string, string | number | boolean>): void;
  /** the referring site's hostname, or "" */
  export function referrer(): string;
  /** measures reading of one article (time, depth, finished); returns the stop function */
  export function readArticle(section: string, slug: string): () => void;
}
declare module "@legacy/hostanalytics.jsx" {
  import type { ComponentType } from "react";
  /** the host's anonymous page counts (Vercel Web Analytics), gated like our own events */
  export const HostAnalytics: ComponentType<Record<string, unknown>>;
}

declare module "@legacy/preview.js" {
  /** how many blocks of a body signed-out readers see (the same cut the SEO pages use) */
  export function previewCut(body: unknown[]): number;
}
declare module "@legacy/numbers.jsx" {
  import type { ComponentType } from "react";
  /** Numbers worth knowing: the log-scale latency chart and estimation shortcuts (site.numbers) */
  const Numbers: ComponentType<{ n: unknown }>;
  export default Numbers;
}

declare module "@legacy/dashboard/reader.jsx" {
  import type { ComponentType } from "react";
  /** read aloud: recorded voice where there is one, else the device's; cur is the block being read ("head" = the dek) */
  export interface ReaderState { cur: number | "head" | null }
  export function useReader(article: unknown): ReaderState;
  export const Reader: ComponentType<{ r: ReaderState }>;
}
declare module "@legacy/dashboard/topics.jsx" {
  import type { ComponentType } from "react";
  export function topicsOf(article: unknown): unknown[];
  export const TopicCards: ComponentType<{ ts: unknown[]; still: boolean; onOpen: (k: number, via?: string) => void }>;
  export const TopicSheet: ComponentType<{ ts: unknown[]; n: number; setN: (n: number) => void; onClose: () => void; still: boolean; fn: Record<number, number> }>;
}

// Types for scene3d.js (the 3D story scene, plain JS ported from the scroll-3d prototype).
export interface Scene3d {
  setChapter(n: number): void;
  /** a fractional chapter index from the scroll position: the camera glides between chapters */
  setProgress(f: number): void;
  destroy(): void;
  count: number;
  kind: "webgl";
}
export function createScene3d(canvas: HTMLCanvasElement, overlay: HTMLElement, opts: { reduced: boolean }): Scene3d | null;

// Islands: the React parts of tech.katta.cc, mounted by 3D pages (frontend/site3d/scripts/pages/workspace.js). Each mount*
// renders one component without the React frame (no sidebar, header, tab bar or page titles: the 3D page has them) and
// returns unmount(). This entry stays tiny: React, the canvas and the judge load with the first mount (./impl).

export interface IslandOptions { slug?: string; id?: string }
type Kind = "problem" | "challenge" | "sandbox" | "shared" | "practice";

function mount(kind: Kind, el: HTMLElement, opts: IslandOptions): () => void {
  let stop: (() => void) | null = null;
  let gone = false;
  void import("./impl").then((m) => {
    if (!gone) stop = m.render(kind, el, opts);
  });
  return () => {
    gone = true;
    stop?.();
  };
}

export const mountWorkspace = (el: HTMLElement, o: { slug: string }) => mount("problem", el, o);
export const mountChallenge = (el: HTMLElement, o: { id: string }) => mount("challenge", el, o);
export const mountSandbox = (el: HTMLElement) => mount("sandbox", el, {});
export const mountShared = (el: HTMLElement) => mount("shared", el, {});
export const mountPractice = (el: HTMLElement, o: { slug?: string } = {}) => mount("practice", el, o);

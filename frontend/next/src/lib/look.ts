// The looks the app can be built in, and the one this build uses.
//
// A look is a second visual design of the same app: the same pages, data and behaviour, different styling and
// motion. The build picks one with VITE_STYLE (scripts/look.mjs puts data-style on <html> and checks the name;
// vite.config.ts points @look at styles/looks/<look>/). LOOKS here and in scripts/look.mjs must match (look.test.ts).
//
// To add a look:
//   1. add its name here and in scripts/look.mjs (with its page colour);
//   2. styles/looks/<look>/: index.ts (imports its fonts and CSS), theme.css (tokens and base type, under
//      :root[data-style="<look>"]) and motion.css (its keyframes);
//   3. a :global(:root[data-style="<look>"]) block in the CSS modules whose pieces it restyles;
//   4. its figure palette in features/reader/figureTokens.module.css;
//   5. any SVG definitions it needs in DEFS below;
//   6. a build and copy in frontend's build:prototype scripts (hosting/prototype-copies.mjs COPIES).

export const LOOKS = ["", "neo-brutalism", "soft-3d"] as const;
export type Look = (typeof LOOKS)[number];

const isKnown = (v: unknown): v is Look => typeof v === "string" && (LOOKS as readonly string[]).includes(v);

/** This build's look, fixed when it is built (VITE_STYLE), so code for other looks is left out of the bundle.
 *  "" is the default look. */
export const LOOK: Look = isKnown(import.meta.env.VITE_STYLE) ? import.meta.env.VITE_STYLE : "";

/** The look the page is showing (its <html data-style>). Normally LOOK; read from the page for code that must
 *  follow the document, such as tests. */
export function look(doc: Document | undefined = typeof document !== "undefined" ? document : undefined): Look {
  const v = doc?.documentElement.dataset.style ?? "";
  return isKnown(v) ? v : "";
}

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (doc: Document, tag: string, attrs: Record<string, string>) => {
  const el = doc.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/** Each look's shared SVG definitions, which its CSS points at (filter: url(#…)). */
const DEFS: Partial<Record<Look, (doc: Document) => SVGElement[]>> = {
  // the hard, unblurred shadow under figure boxes (figureTokens.module.css)
  "neo-brutalism": (doc) => {
    const filter = svgEl(doc, "filter", { id: "nb-hard", x: "-20%", y: "-30%", width: "150%", height: "170%", "color-interpolation-filters": "sRGB" });
    filter.append(svgEl(doc, "feDropShadow", { dx: "3", dy: "3", stdDeviation: "0", "flood-opacity": "1" }));
    return [filter];
  },
};

/** Adds the look's SVG definitions to the page once (a hidden <svg class="tk-look-defs">). */
export function installLookDefs(doc: Document = document, which: Look = look(doc)): void {
  const make = DEFS[which];
  if (!make || doc.querySelector("svg.tk-look-defs")) return;
  const svg = svgEl(doc, "svg", { width: "0", height: "0", "aria-hidden": "true", class: "tk-look-defs" });
  svg.append(...make(doc));
  doc.body.prepend(svg);
}

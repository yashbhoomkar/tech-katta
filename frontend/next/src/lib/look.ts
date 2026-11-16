// The look this build was made in (vite.config.ts: VITE_STYLE sets <html data-style>). The default look has none.
// installLookDefs() adds the shared SVG definitions a look's figures point at: for neo-brutalism the hard,
// unblurred shadow under figure boxes (figureTokens.module.css: filter: url(#nb-hard)).

export const look = (): string => (typeof document !== "undefined" ? document.documentElement.dataset.style ?? "" : "");

const SVG_NS = "http://www.w3.org/2000/svg";

export function installLookDefs(doc: Document = document): void {
  if (doc.documentElement.dataset.style !== "neo-brutalism" || doc.getElementById("nb-hard")) return;
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "tk-look-defs");
  const filter = doc.createElementNS(SVG_NS, "filter");
  filter.id = "nb-hard";
  for (const [k, v] of Object.entries({ x: "-20%", y: "-30%", width: "150%", height: "170%", "color-interpolation-filters": "sRGB" })) filter.setAttribute(k, v);
  const drop = doc.createElementNS(SVG_NS, "feDropShadow");
  for (const [k, v] of Object.entries({ dx: "3", dy: "3", stdDeviation: "0", "flood-opacity": "1" })) drop.setAttribute(k, v);
  filter.append(drop);
  svg.append(filter);
  doc.body.prepend(svg);
}

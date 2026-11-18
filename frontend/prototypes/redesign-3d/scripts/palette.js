// The one place the pastels live. Every kind of part has one pastel, and the same colour is used everywhere on the
// site: the 3D models (world.js), the legend chips and label dots, highlights and tints (app.css reads the CSS
// variables this file sets). Named after the app's six section colours.
// Brighter pastels (owner, 2026-11-18: "Choose some brighter colours, but still don't copy rca.gg"): six clear hues
// as a family, never one lavender with one violet; the lilac leans orchid (pink), away from lavender.
export const PASTEL = {
  light: { sky: ['#8CD2FF', '#2C83C9'], lilac: ['#E3A8F7', '#A04FC4'], peach: ['#FFB980', '#D9772A'], mint: ['#86E5B8', '#22A06B'],
    lemon: ['#FFE36E', '#C29E00'], rose: ['#FF9FB4', '#D9506F'], mist: ['#D9D6E4', '#6F6A80'] },
  dark: { sky: ['#4FAEF0', '#B5E2FF'], lilac: ['#B76AD9', '#EBC6FA'], peach: ['#E8894A', '#FFD0A8'], mint: ['#34B77E', '#A8F0CC'],
    lemon: ['#CBAE2C', '#FFF0A0'], rose: ['#D9637E', '#FFC0CE'], mist: ['#5E5B68', '#CFCADB'] },
};
/** which pastel each kind of part wears */
export const KIND_PASTEL = { server: 'sky', lb: 'lilac', cache: 'peach', db: 'mint', queue: 'lemon', globe: 'rose', laptop: 'mist', small: 'lilac' };
/** the parts as people meet them, in the legend */
export const LEGEND = [
  ['server', 'App server', 'sky'], ['lb', 'Load balancer', 'lilac'], ['cache', 'Cache', 'peach'],
  ['db', 'Database', 'mint'], ['queue', 'Queue', 'lemon'], ['globe', 'CDN', 'rose'],
];

export const kindColours = (kind, dark) => (dark ? PASTEL.dark : PASTEL.light)[KIND_PASTEL[kind] || 'lilac'];

/** writes --sky, --sky-edge … and --k-server … onto <html>, for the current theme; follows theme changes */
export function applyPaletteVars(root = document.documentElement) {
  const set = () => {
    const P = root.dataset.theme === 'dark' ? PASTEL.dark : PASTEL.light;
    for (const [name, [fill, edge]] of Object.entries(P)) { root.style.setProperty(`--${name}`, fill); root.style.setProperty(`--${name}-edge`, edge); }
    for (const [kind, name] of Object.entries(KIND_PASTEL)) root.style.setProperty(`--k-${kind}`, P[name][0]);
  };
  set();
  new MutationObserver(set).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}

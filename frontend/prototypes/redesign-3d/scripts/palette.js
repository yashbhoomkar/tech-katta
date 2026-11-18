// The one place the pastels live. Every kind of part has one pastel, and the same colour is used everywhere on the
// site: the 3D models (world.js), the legend chips and label dots, highlights and tints (app.css reads the CSS
// variables this file sets). Named after the app's six section colours.
// Bright colours (owner, 2026-11-18: "Choose some brighter colours, but still don't copy rca.gg", then, of the app
// servers' dull blue: "Change that blue colour. Look for bright colours"). Six saturated hues as a family, the same
// fill in light and dark (bright reads well on both); never one lavender with one violet.
export const PASTEL = {
  light: { sky: ['#3DB5FF', '#0B6FB8'], lilac: ['#C98BFF', '#7E3FC2'], peach: ['#FFA24D', '#C2620F'], mint: ['#3DDC97', '#12895A'],
    lemon: ['#FFD43B', '#B08A00'], rose: ['#FF7AC6', '#C2338A'], mist: ['#D9D6E4', '#6F6A80'] },
  dark: { sky: ['#3DB5FF', '#BDE6FF'], lilac: ['#C98BFF', '#E8D2FF'], peach: ['#FFA24D', '#FFD7B0'], mint: ['#3DDC97', '#B4F3D6'],
    lemon: ['#FFD43B', '#FFF0A8'], rose: ['#FF7AC6', '#FFC6E6'], mist: ['#5E5B68', '#CFCADB'] },
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

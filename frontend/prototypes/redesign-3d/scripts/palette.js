// The one place the pastels live. Every kind of part has one pastel, and the same colour is used everywhere on the
// site: the 3D models (world.js), the legend chips and label dots, highlights and tints (app.css reads the CSS
// variables this file sets). Named after the app's six section colours.
export const PASTEL = {
  light: { sky: ['#BFE3FA', '#5B93C2'], lilac: ['#DCCFF7', '#8A72C9'], peach: ['#FDD3B0', '#D08A52'], mint: ['#BFEBD6', '#4FA17E'],
    lemon: ['#F2E8A8', '#B3A23E'], rose: ['#F8CBD3', '#C9737F'], mist: ['#ECEAF2', '#8D8899'] },
  dark: { sky: ['#3D6E96', '#9FD0F5'], lilac: ['#5B4A8F', '#C7B6F5'], peach: ['#9A5B2E', '#FFC38F'], mint: ['#2F7A5A', '#9FE5C4'],
    lemon: ['#7C7128', '#F0E38A'], rose: ['#8C4553', '#F5B1BD'], mist: ['#55525F', '#CFCADB'] },
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

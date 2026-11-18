// The soft 3D look's CSS (rca.gg-like: lavender page, one violet accent, orange only for broken, green only for fixed,
// Manrope and IBM Plex Mono), loaded only by its build (VITE_STYLE=soft-3d; vite.config.ts points @look here).
// Its landing opens with the 3D scroll story (pages/landing/Story3d.tsx, three.js), loaded only in this build.
import "@fontsource-variable/manrope";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme.css";
import "./motion.css";

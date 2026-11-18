// The neo-brutalism look's CSS, loaded only by its build (VITE_STYLE=neo-brutalism; vite.config.ts points @look here),
// so the default build carries none of it. Its rules apply under <html data-style="neo-brutalism">.
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo-black/400.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./theme.css";
// after global.css, so its keyframes replace the default look's of the same name
import "./motion.css";

import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
// The current app's figure manifest plugin: which module draws which figure ("virtual:fig-manifest").
import figManifest from "../figs-manifest.js";

const legacy = fileURLToPath(new URL("../src", import.meta.url));

// The article figures (232) are the current app's, imported as they are from frontend/src/figs (@legacy).
// Served under /next/ on prototype.katta.cc while the new frontend grows (BASE_PATH overrides it,
// e.g. BASE_PATH=/ once it replaces the old app).
const base = process.env.BASE_PATH ?? "/next/";
// The look: unset is the default design; VITE_STYLE=neo-brutalism builds the same app in the second look
// (styles/themes/neo-brutalism.css), served at prototype.katta.cc/p/neo-brutalism/. Set on <html> in the page itself,
// so the first paint already has it.
const STYLES: Record<string, string> = { "neo-brutalism": "#F8F2E5" };
const style = process.env.VITE_STYLE ?? "";
if (style && !STYLES[style]) throw new Error(`VITE_STYLE: unknown look "${style}" (known: ${Object.keys(STYLES).join(", ")})`);
const lookPlugin: Plugin = {
  name: "tk-look",
  transformIndexHtml: (html) =>
    style ? html.replace('<html lang="en">', `<html lang="en" data-style="${style}">`).replace(/(<meta name="theme-color" content=")[^"]*/, `$1${STYLES[style]}`) : html,
};

export default defineConfig({
  base,
  // the footer's "Last updated", as on tech.katta.cc
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  plugins: [react(), lookPlugin, figManifest(`${legacy}/figs`)],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@legacy": legacy },
    // the current app's figures import "react" from frontend/: make them share this app's single copy
    dedupe: ["react", "react-dom"],
  },
  // no public source maps, like the current app; es2020 keeps older phones (Safari 14+) working
  build: { target: "es2020", sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5174 },
});

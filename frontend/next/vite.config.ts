import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
// The current app's figure manifest plugin: which module draws which figure ("virtual:fig-manifest").
import figManifest from "../figs-manifest.js";
// the looks (VITE_STYLE): scripts/look.mjs
import { checkLook, lookHtml } from "./scripts/look.mjs";

const legacy = fileURLToPath(new URL("../src", import.meta.url));

// The article figures (232) are the current app's, imported as they are from frontend/src/figs (@legacy).
// Served under /next/ on prototype.katta.cc while the new frontend grows (BASE_PATH overrides it,
// e.g. BASE_PATH=/ once it replaces the old app).
const base = process.env.BASE_PATH ?? "/next/";
// The look: unset is the default design; VITE_STYLE=neo-brutalism builds the same app in the second look
// (styles/themes/neo-brutalism.css), served at prototype.katta.cc/p/neo-brutalism/. Set on <html> in the page itself,
// so the first paint already has it.
const style = checkLook(process.env.VITE_STYLE ?? "");
const lookPlugin: Plugin = { name: "tk-look", transformIndexHtml: (html) => lookHtml(html, style) };

export default defineConfig({
  base,
  // the footer's "Last updated", as on tech.katta.cc
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  plugins: [react(), lookPlugin, figManifest(`${legacy}/figs`)],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@legacy": legacy, "@look": fileURLToPath(new URL(`./src/styles/looks/${style || "default"}`, import.meta.url)) },
    // the current app's figures import "react" from frontend/: make them share this app's single copy
    dedupe: ["react", "react-dom"],
  },
  // no public source maps, like the current app; es2020 keeps older phones (Safari 14+) working
  build: { target: "es2020", sourcemap: false, assetsInlineLimit: 0 },
  server: { port: 5174 },
});

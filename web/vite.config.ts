import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// The current app's figure manifest plugin: which module draws which figure ("virtual:fig-manifest").
import figManifest from "../frontend/figs-manifest.js";

const legacy = fileURLToPath(new URL("../frontend/src", import.meta.url));

// The article figures (232) are the current app's, imported as they are from frontend/src/figs (@legacy).
// Served under /next/ on prototype.katta.cc while the new frontend grows (BASE_PATH overrides it,
// e.g. BASE_PATH=/ once it replaces the old app).
const base = process.env.BASE_PATH ?? "/next/";

export default defineConfig({
  base,
  plugins: [react(), figManifest(`${legacy}/figs`)],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@legacy": legacy },
    // the current app's figures import "react" from frontend/: make them share this app's single copy
    dedupe: ["react", "react-dom"],
  },
  build: { target: "es2022", sourcemap: true, assetsInlineLimit: 0 },
  server: { port: 5174 },
});

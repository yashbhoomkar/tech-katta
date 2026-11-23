import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import figManifest from "../figs-manifest.js";
import { islandScope } from "./scripts/island-scope.mjs";

// The islands: the React parts of tech.katta.cc (the workspace, challenges, sandbox, shared designs, practice) that the
// 3D site's pages mount (frontend/site3d/scripts/pages/workspace.js). One entry, islands.js, whose mount functions load
// the rest (React, the canvas, the judge and their CSS) when called, so a 3D page that never mounts one loads nothing.
// Built into dist-islands/ and copied by hosting/switch.mjs to dist/3d/islands/. The 3d look is the only look.
const legacy = fileURLToPath(new URL("../src", import.meta.url));

// The account and usage-event modules are the 3D page's, not the island's: whoever signs in on the page is signed in
// in the island, and the island's Run, Submit and article events share the page's queue. Imports of them (from any
// file, by any path) become imports of /3d/legacy/legacy.js, which the page has already loaded (site3d/legacy/entry.js).
const SHARED = "/3d/legacy/legacy.js";
const sharedWithPage = {
  name: "tk-shared-with-page",
  enforce: "pre" as const,
  async resolveId(this: { resolve: (id: string, from?: string, o?: object) => Promise<{ id: string } | null> }, id: string, importer?: string) {
    if (!/account\.js$|analytics\.js$/.test(id)) return null;
    const r = await this.resolve(id, importer, { skipSelf: true });
    return r && /[\\/]frontend[\\/]src[\\/](?:account|analytics)\.js$/.test(r.id) ? { id: SHARED, external: true } : null;
  },
};

export default defineConfig({
  base: "/3d/islands/",
  publicDir: false,
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
  plugins: [sharedWithPage, react(), figManifest(`${legacy}/figs`)],
  // nothing from the base CSS reaches outside .tk-island (scripts/island-scope.mjs)
  css: { postcss: { plugins: [islandScope()] } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@legacy": legacy, "@look": fileURLToPath(new URL("./src/styles/looks/3d", import.meta.url)) },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2020", sourcemap: false, assetsInlineLimit: 0, outDir: "dist-islands", emptyOutDir: true,
    rollupOptions: {
      input: { islands: fileURLToPath(new URL("./src/islands/index.tsx", import.meta.url)) },
      preserveEntrySignatures: "strict",
      output: { entryFileNames: "islands.js", chunkFileNames: "assets/[name]-[hash].js", assetFileNames: "assets/[name]-[hash].[ext]" },
    },
  },
});

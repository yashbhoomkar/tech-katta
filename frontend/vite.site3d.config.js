// The 3D site's bridge to the current app's account and analytics code: one ES module, no hash in its name (the 3D
// shell loads it by that name; hosting/routes.json gives /3d/* a short cache). Built by `npm run build:site3d`.
import { resolve } from "node:path";
import { defineConfig } from "vite";

// account.js imports the React theme hook; the 3D page has its own theme, so that one import is swapped (see legacy/mode.js)
const swapMode = { name: "site3d-mode", enforce: "pre", resolveId: (id, from) => (from && id === "./theme/mode.js" ? resolve(import.meta.dirname, "site3d/legacy/mode.js") : null) };

export default defineConfig({
  publicDir: false,
  plugins: [swapMode],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "site3d-dist",
    emptyOutDir: true,
    lib: { entry: resolve(import.meta.dirname, "site3d/legacy/entry.js"), formats: ["es"], fileName: () => "legacy.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

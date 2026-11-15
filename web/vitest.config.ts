import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { figManifest } from "../frontend/figs-manifest.js";

const legacy = fileURLToPath(new URL("../frontend/src", import.meta.url));

// the figure manifest, without the build plugin's directory watching (which vitest reads as imports)
const manifest = {
  name: "fig-manifest-test",
  resolveId: (id: string) => (id === "virtual:fig-manifest" ? "\0virtual:fig-manifest" : null),
  load: (id: string) => (id === "\0virtual:fig-manifest" ? `export default ${JSON.stringify(figManifest(`${legacy}/figs`))};` : null),
};

export default defineConfig({
  plugins: [react(), manifest],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@legacy": legacy }, dedupe: ["react", "react-dom"] },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false, restoreMocks: true },
});

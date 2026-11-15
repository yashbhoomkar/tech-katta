import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served under /next/ on prototype.katta.cc while the new frontend grows (BASE_PATH overrides it,
// e.g. BASE_PATH=/ once it replaces the old app).
const base = process.env.BASE_PATH ?? "/next/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { target: "es2022", sourcemap: true, assetsInlineLimit: 0 },
  server: { port: 5174 },
});

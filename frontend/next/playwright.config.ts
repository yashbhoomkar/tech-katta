import { defineConfig, devices } from "@playwright/test";
import { LOOKS } from "./scripts/look.mjs";

// End-to-end tests for both prototypes, which are one codebase built twice: the default look (/p/next) and
// VITE_STYLE=neo-brutalism (/p/neo-brutalism). Each look is built into its own folder and served by `vite preview` on
// its own port; every spec runs against both. They call the live content API (tech-api.katta.cc), the same content
// production shows. CI installs the browser first: npx playwright install --with-deps chromium.
// A new look in scripts/look.mjs is picked up here without changes.
const lookName = (look: string) => look || "default";
const servers = Object.keys(LOOKS).map((look, i) => ({ look, port: 4173 + i, dir: `dist-e2e/${lookName(look)}` }));

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // the API is a real network service: one retry in CI absorbs a blip, not a bug (a bug fails twice)
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  projects: servers.flatMap(({ look, port }) => [
    {
      name: lookName(look),
      metadata: { look },
      use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, baseURL: `http://localhost:${port}/next/`, trace: "off" as const },
    },
    // the phone layout: the specs tagged @phone
    { name: `${lookName(look)} phone`, metadata: { look }, grep: /@phone/, use: { ...devices["Pixel 7"], baseURL: `http://localhost:${port}/next/`, trace: "off" as const } },
  ]),
  // `vite build` only: the typecheck is `npm run check`'s job
  webServer: servers.map(({ look, port, dir }) => ({
    command: `npx vite build && node scripts/postbuild.mjs && npx vite preview --port ${port} --strictPort`,
    env: { VITE_STYLE: look, OUT_DIR: dir },
    url: `http://localhost:${port}/next/`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  })),
});

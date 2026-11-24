import { defineConfig, devices } from "@playwright/test";

// End-to-end tests of the real site: the whole build (frontend's npm run build: the 3D site, its islands, the search-engine pages) served the way the host
// serves it (hosting/serve-local.mjs: files, directory indexes, routes.json rewrites, 404.html with status 404). They call two local copies of the API (the text is behind the sign-in, tech-katta-context 52);
// sign-in is faked per spec where a spec needs a signed-in or signed-out visitor.
// CI installs the browser first: npx playwright install --with-deps chromium.
const port = 4173;
const use = { baseURL: `http://localhost:${port}`, trace: "off" as const, launchOptions: { args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] } };

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // the API is a real network service: one retry in CI absorbs a blip, not a bug (a bug fails twice)
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  projects: [
    { name: "desktop", grepInvert: /@phone/, use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, ...use } },
    { name: "phone", grep: /@phone/, use: { ...devices["Pixel 7"], ...use } },
  ],
  // the site (built and served as the host serves it) and two local copies of the API: the gated one (production's behaviour) and the open one (a stand-in for a signed-in visitor), e2e/api.ts
  webServer: [
    {
      command: `cd .. && npm run build && node hosting/serve-local.mjs dist ${port} hosting/routes.json`,
      url: `http://localhost:${port}/home`,
      reuseExistingServer: !process.env.CI,
      timeout: 600_000,
    },
    { command: "cd ../../backend && PORT=5112 FRONTEND_ORIGIN=http://localhost:4173 node src/server.js", url: "http://127.0.0.1:5112/health", reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: "cd ../../backend && PORT=5111 OPEN_CONTENT=1 FRONTEND_ORIGIN=http://localhost:4173 node src/server.js", url: "http://127.0.0.1:5111/health", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});

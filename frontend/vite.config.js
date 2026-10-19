import { defineConfig } from 'vite';

const buildSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VITE_BUILD_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  'unknown';

export default defineConfig({
  define: {
    __TECH_KATTA_BUILD_SHA__: JSON.stringify(buildSha),
  },
});

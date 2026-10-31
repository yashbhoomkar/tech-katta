import{resolve}from"node:path";import{defineConfig}from"vite";
// Two pages: the landing page (/) and the dashboard (/dashboard/).
export default defineConfig({build:{rollupOptions:{input:{main:resolve(__dirname,"index.html"),dashboard:resolve(__dirname,"dashboard/index.html")}}}});

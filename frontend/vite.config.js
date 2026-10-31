import{resolve}from"node:path";import{defineConfig}from"vite";
// Two pages: the landing page (/) and the dashboard (/dashboard/).
// "Last updated" in the footer is the build (deploy) date, e.g. "31 Oct 2026".
const built=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
export default defineConfig({define:{__BUILD_DATE__:JSON.stringify(built)},build:{rollupOptions:{input:{main:resolve(__dirname,"index.html"),dashboard:resolve(__dirname,"dashboard/index.html")}}}});

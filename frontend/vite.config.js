import{resolve}from"node:path";import{defineConfig}from"vite";
// Three pages: the landing page (/), the dashboard (/dashboard/) and the owner's analytics
// (/analytics/, served as analytics.katta.cc).
// "Last updated" in the footer is the build (deploy) date, e.g. "31 Oct 2026".
const built=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
export default defineConfig({define:{__BUILD_DATE__:JSON.stringify(built)},build:{rollupOptions:{input:{main:resolve(__dirname,"index.html"),dashboard:resolve(__dirname,"dashboard/index.html"),analytics:resolve(__dirname,"analytics/index.html")}}}});

import{resolve}from"node:path";import{defineConfig}from"vite";import articlePages from"./seo.js";
// Three pages (plus one small page per article and section, written by seo.js after the build): the landing page (/), the dashboard (/dashboard/) and the owner's analytics
// (/analytics/, served as analytics.katta.cc).
// "Last updated" in the footer is the build (deploy) date, e.g. "31 Oct 2026".
const built=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
export default defineConfig({plugins:[articlePages(resolve(__dirname,"../content"))],define:{__BUILD_DATE__:JSON.stringify(built)},build:{rollupOptions:{input:{main:resolve(__dirname,"index.html"),dashboard:resolve(__dirname,"dashboard/index.html"),analytics:resolve(__dirname,"analytics/index.html")}}}});

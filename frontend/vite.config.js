import{resolve}from"node:path";import{defineConfig,loadEnv}from"vite";import articlePages from"./seo.js";import figManifest from"./figs-manifest.js";
// Three pages (plus one small page per article and section, written by seo.js after the build): the landing page (/), the dashboard (/dashboard/) and the owner's analytics
// (/analytics/, served as analytics.katta.cc).
// "Last updated" in the footer is the build (deploy) date, e.g. "31 Oct 2026".
const built=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"});
// Early hints in each page's head, so the browser starts on the API while the scripts are still downloading:
// a connection for content (no cookies) and one for the account calls (with cookies), and the content the
// page asks for first. The preloads must match the app's own requests (api.js getJSON: a plain CORS GET),
// or the browser fetches twice.
export const FIRST={"/index.html":["/v1/site"],"/dashboard/index.html":["/v1/site","/v1/articles"]};
export function apiHints(api){return{name:"api-hints",transformIndexHtml(html,ctx){const first=FIRST[ctx.path];if(!first)return html;
return html.replace("</title>",`</title><link rel="preconnect" href="${api}" crossorigin/><link rel="preconnect" href="${api}"/>${first.map(p=>`<link rel="preload" as="fetch" href="${api}${p}" crossorigin="anonymous"/>`).join("")}`)}}}
export default defineConfig(({mode})=>{const api=(loadEnv(mode,__dirname,"VITE_").VITE_API_BASE||"https://tech-api.katta.cc").replace(/\/$/,"");
return{plugins:[apiHints(api),figManifest(resolve(__dirname,"src/figs")),articlePages(resolve(__dirname,"../content"),api)],define:{__BUILD_DATE__:JSON.stringify(built)},build:{rollupOptions:{input:{main:resolve(__dirname,"index.html"),dashboard:resolve(__dirname,"dashboard/index.html"),analytics:resolve(__dirname,"analytics/index.html")}}}}});

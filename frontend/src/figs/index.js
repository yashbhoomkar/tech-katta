// Every figure an article can show, by id: { C: the component, ar: its aspect ratio, title: n => the heading
// (n is the example system's name). Each sub-tab (site.json dashboard.groups) that has figures owns one module,
// figs/<tab>/<sub-tab>.jsx, exporting FIGS, and one list of the same ids in the backend,
// backend/src/content/figs/<tab>/<sub-tab>.js. A new sub-tab adds both files (and a line to the backend's
// index); a backend test checks that each pair has the same ids.
// The modules load on demand, each as its own small script: an article page loads the ones its figures are
// in (usually its own sub-tab's), not all 262 figures. Which module draws which figure comes from the
// modules themselves at build time (figs-manifest.js).
import manifest from"virtual:fig-manifest";
const modules=import.meta.glob("./*/*.jsx");
const drawn={},loading={};
// A module that can't be fetched fails with figs:true. The browser remembers a failed module and won't fetch
// it again in this page, so the page's "Try again" reloads the page instead (dashboard/article.jsx, solve.jsx).
const load=m=>loading[m]||=modules[`./${m}.jsx`]().then(x=>{if(!x?.FIGS)throw new Error("no FIGS");Object.assign(drawn,x.FIGS)})
.catch(e=>{delete loading[m];throw Object.assign(new Error(`couldn't load the figures in ${m}`),{figs:true,cause:e})});
// a figure id some module draws
export const knownFig=id=>Object.hasOwn(manifest,id);
// the figure, once its module has loaded (loadFigs)
export const figOf=id=>drawn[id];
// load the modules for these figure ids; rejects (figs:true) if one can't be loaded
export const loadFigs=ids=>Promise.all([...new Set(ids.filter(knownFig).map(id=>manifest[id]))].map(load));
// start loading a sub-tab's figures early, while its article is still on its way
export const prefetchFigs=(tab,subTab)=>{if(modules[`./${tab}/${subTab}.jsx`])load(`${tab}/${subTab}`).catch(()=>{})};

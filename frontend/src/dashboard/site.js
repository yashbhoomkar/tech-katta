// The dashboard's data, filled from the API once at boot (dashboard.jsx): site copy (c), dashboard chrome (d), the
// section ids, the article summaries and the example system. Every dashboard module reads these live bindings.
export let c,d,ids,articles,example;
export function setSite(site,list){c=site;d=site.dashboard;
// Problems (site.json "problems") is a tab only this build knows how to draw, so it is added here,
// after Interview Questions, instead of in dashboard.sections (an older build would show it empty).
if(c.problems&&!d.sections.some(s=>s[0]==="problems")){const i=d.sections.findIndex(s=>s[0]==="interview-questions");d.sections.splice(i<0?d.sections.length:i+1,0,["problems",c.problems.label,null])}
ids=d.sections.map(s=>s[0]);example=site.example;articles=list.articles}

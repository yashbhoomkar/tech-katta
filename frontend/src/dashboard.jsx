// The dashboard (/dashboard/). Its parts live in dashboard/: the frame and routes (shell.jsx), articles (article.jsx,
// blocks.jsx, figure.jsx, reader.jsx, share.jsx), section pages (pages.jsx) and the data from the API (site.js).
import"./theme/index.js";import React from"react";import{createRoot}from"react-dom/client";import{getJSON}from"./api.js";import{Loading,LoadError,Boundary}from"./status.jsx";import{prefetchAccount,startAccount,wireSync}from"./account.js";import{setSite,c}from"./dashboard/site.js";import Dashboard from"./dashboard/shell.jsx";
// Content comes from the API: site copy (with the example system) and article summaries, then render.
const root=createRoot(document.getElementById("root"));
function boot(){root.render(<Loading/>);prefetchAccount();Promise.all([getJSON("/v1/site"),getJSON("/v1/articles")]).then(([site,list])=>{setSite(site,list);
root.render(<React.StrictMode><Boundary><Dashboard/></Boundary></React.StrictMode>);if(c.account){wireSync();startAccount()}}).catch(()=>root.render(<LoadError retry={boot}/>))}
boot();

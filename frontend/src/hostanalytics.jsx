// Page-count analytics from the company hosting the site (HOSTING.md). Today that is Vercel Web Analytics:
// anonymous page counts, no cookies, nothing sent by browsers that ask not to be tracked (vercelGate).
// Build with VITE_HOST_ANALYTICS=none on any other host: the component then renders nothing, and the
// privacy page's sentence about it (content/site.json) should change with it. Our own usage events
// (analytics.js, sent to our API) don't depend on the host.
import React from"react";import{Analytics}from"@vercel/analytics/react";import{vercelGate}from"./analytics.js";
export const HOST_ANALYTICS=(import.meta.env?.VITE_HOST_ANALYTICS||"vercel").toLowerCase();
export const HostAnalytics=props=>HOST_ANALYTICS==="vercel"?<Analytics beforeSend={vercelGate} {...props}/>:null;

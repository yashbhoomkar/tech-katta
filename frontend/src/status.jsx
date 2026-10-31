import React from"react";import"./status.css";
// Shown while content loads from the API, and if it cannot be reached.
export const Loading=({label="Loading"})=><div className="st" role="status" aria-live="polite"><i/><span>{label}…</span></div>;
export const LoadError=({retry,what="this page"})=><div className="st st-err" role="alert"><b>Couldn't load {what}.</b><span>Check your connection and try again.</span><button type="button" onClick={retry}>Try again</button></div>;

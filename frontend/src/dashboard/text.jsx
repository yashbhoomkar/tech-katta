// Inline text (backticks become code) and read-time counts.
import React from"react";import{spoken}from"../speech.js";
export const inline=x=>x.split(/`([^`]+)`/).map((t,i)=>i%2?<code key={i}>{t}</code>:t);
// Read time of the main text; "more" sections and type details are extra.
export const count=x=>(x||"").split(/\s+/).filter(Boolean).length;
export const words=a=>count(a.dek)+a.body.reduce((n,b)=>n+count(spoken(b,0,a.example)),0);
export const extraWords=a=>a.body.reduce((n,b)=>n+(b.more||[]).reduce((m,x)=>m+count(x),0)+(b.t==="more"?b.body.reduce((m,x)=>m+count(spoken(x,0,a.example)||x.x),0):0),0);

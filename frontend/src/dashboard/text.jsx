// Inline text (backticks become code) and read-time counts.
import React from"react";
// The words of a block that count towards the read time (code counts by its label only).
const textOf=(b,example)=>b.t==="p"||b.t==="h2"||b.t==="h3"||b.t==="analogy"||b.t==="lab"?b.x:b.t==="list"?b.items.filter(x=>typeof x==="string").join(" "):b.t==="example"?`${example?.text||""} ${(example?.parts||[]).map(p=>p.join(" ")).join(" ")}`:b.t==="type"?[b.name,b.what,b.use,b.avoid,b.ex,b.like].filter(Boolean).join(" "):b.t==="code"?b.label:b.t==="fig"?b.cap:b.t==="table"?b.rows.map(r=>r.join(" ")).join(" "):"";
export const inline=x=>x.split(/`([^`]+)`/).map((t,i)=>i%2?<code key={i}>{t}</code>:t);
// Read time of the main text; "more" sections and type details are extra.
export const count=x=>(x||"").split(/\s+/).filter(Boolean).length;
export const words=a=>count(a.dek)+a.body.reduce((n,b)=>n+count(textOf(b,a.example)),0);
export const extraWords=a=>a.body.reduce((n,b)=>n+(b.more||[]).reduce((m,x)=>m+count(x),0)+(b.t==="more"?b.body.reduce((m,x)=>m+count(textOf(x,a.example)||x.x),0):0),0);

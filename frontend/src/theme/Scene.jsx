// Small scenes for empty, error and busy states (tech-katta-context 24, G3), drawn in the figures' language: a box for
// the reader ("you"), a line the request travels, a dot for the request. They say in a picture what the sentence beside
// them says, so they are aria-hidden. A moving scene plays twice and then rests on its last frame (nothing loops except
// loading marks); under reduced motion every scene is its last frame. Colours come from tokens (scene.css), so they
// follow the theme.
//   offline  the request stops halfway at a red ✕   (couldn't load, couldn't reach the judge)
//   missing  the request reaches a dashed box "404" (a page or problem that doesn't exist)
//   empty    an empty dashed lane, one request waiting at "you" (nothing yet: no submissions)
//   busy     three requests queued in front of a box (too many submissions: wait a minute)
//   broken   a box with a ✕ (this page failed to draw)
import React from"react";import"./scene.css";import{useStill}from"./motion.js";
const You=()=><g><rect className="sc-box sc-you" x="8" y="26" width="52" height="28" rx="6"/><text className="sc-t" x="34" y="44" textAnchor="middle">you</text></g>;
const Box=({t,dash})=><g><rect className={"sc-box"+(dash?" sc-dash":"")} x="172" y="26" width="60" height="28" rx="6"/><text className="sc-t" x="202" y="44" textAnchor="middle">{t}</text></g>;
// a request dot that eases from x1 to x2 in 1.2 s, twice, then stays at x2
const Go=({x1,x2,still})=>still?<circle className="sc-dot" cx={x2} cy="40" r="4.5"/>:<circle className="sc-dot" cx={x1} cy="40" r="4.5"><animate attributeName="cx" values={`${x1};${x2};${x2}`} keyTimes="0;.7;1" calcMode="spline" keySplines=".45 0 .2 1;0 0 1 1" dur="1.2s" repeatCount="2" fill="freeze"/></circle>;
const X=({x})=><g className="sc-x"><path d={`M${x-6} 34L${x+6} 46M${x+6} 34L${x-6} 46`}/></g>;
export default function Scene({kind}){const still=useStill();let body;
if(kind==="offline")body=<><You/><line className="sc-line" x1="60" y1="40" x2="172" y2="40"/><Box t="site"/><X x={128}/><Go x1={66} x2={116} still={still}/></>;
else if(kind==="missing")body=<><You/><line className="sc-line" x1="60" y1="40" x2="172" y2="40"/><Box t="404" dash/><Go x1={66} x2={164} still={still}/></>;
else if(kind==="empty")body=<><You/><line className="sc-line sc-dash" x1="60" y1="40" x2="172" y2="40"/><rect className="sc-box sc-dash" x="172" y="26" width="60" height="28" rx="6"/><circle className="sc-dot" cx="70" cy="40" r="4.5"/></>;
else if(kind==="busy")body=<><You/><line className="sc-line" x1="60" y1="40" x2="172" y2="40"/><Box t="judge"/>{[160,146,132].map(x=><circle key={x} className="sc-dot" cx={x} cy="40" r="4.5"/>)}</>;
else body=<><rect className="sc-box" x="94" y="22" width="52" height="36" rx="6"/><X x={120}/></>;
return <svg className={"scene sc-"+kind} viewBox="0 0 240 80" width="240" height="80" aria-hidden="true" focusable="false">{body}</svg>}

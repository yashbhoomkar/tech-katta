// The design canvas: opens inside a problem (its Canvas tab), a challenge from Problems, or the landing page's IND vs PAK.
// The design is judged by the v2 evaluator (src/eval): a problem's Run and Submit (solve.jsx), a challenge's Score.
// The canvas shows a replayed load test minute by minute when one is being watched. The component catalogue, prices and
// settings come from the API (GET /v1/lab: content/lab.json and eval.json). Designs are kept in this browser.
// Its parts: Canvas.jsx, nodes.jsx, Palette.jsx, Inspector.jsx, Score.jsx and shared.jsx in this folder.
import React,{useEffect,useState}from"react";
import{ReactFlowProvider}from"@xyflow/react";
import"@xyflow/react/dist/style.css";import"./lab.css";
import{getJSON}from"../api.js";import{Loading,LoadError}from"../status.jsx";
import{syncLab,useCatalogue}from"../account.js";
import{Canvas}from"./Canvas.jsx";

// Signed in, the account's designs are merged in before the Lab opens (at most 4 s), so a stale copy
// in this browser is never what gets edited.
export default function Lab({challenge,embedded,problem,onDesign,trace,replay,flow}){const[st,set]=useState({});const go=()=>{set({});getJSON("/v1/lab").then(async lab=>{useCatalogue(lab);await Promise.race([syncLab(),new Promise(r=>setTimeout(r,4000))]);set({lab})},()=>set({err:1}))};useEffect(go,[]);
if(st.err)return <LoadError what="the canvas" retry={go}/>;if(!st.lab)return <Loading label="Loading the canvas"/>;
return <div className="lab-wrap"><div className="lab-small">{st.lab.smallScreen}</div><ReactFlowProvider><Canvas trace={trace} replay={replay} flow={flow} lab={st.lab} start={challenge} embedded={embedded} problem={problem} onDesign={onDesign}/></ReactFlowProvider></div>}

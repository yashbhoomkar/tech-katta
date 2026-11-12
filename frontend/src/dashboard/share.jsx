import React,{useState}from"react";
// Share (phone share sheet where available, otherwise copy the link).
export function Share({a}){const[msg,setMsg]=useState("");const url=location.href;const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500)};
const go=async()=>{if(navigator.share){try{await navigator.share({title:a.title,text:a.dek,url});return}catch(e){if(e?.name==="AbortError")return}}
try{await navigator.clipboard.writeText(url);flash("Link copied")}catch{flash("Couldn't copy the link")}};
return <button type="button" className="r-btn share" onClick={go} aria-live="polite">{msg||"↗ Share"}</button>}

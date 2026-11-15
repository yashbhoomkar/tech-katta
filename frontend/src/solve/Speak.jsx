// Speak it (context 36, step 21): record a spoken summary beside the design and play it back. Kept in this browser only.
import React,{useEffect,useRef,useState}from"react";import{track}from"../analytics.js";
import{SPEAK_MAX,speakOutline,mmss,pickMime,loadTake,saveTake,dropTake}from"./speak.js";

export function Speak({slug,P}){const[take,setTake]=useState(null),[url,setUrl]=useState(""),[rec,setRec]=useState(null),[secs,setSecs]=useState(0),[err,setErr]=useState("");
const chunks=useRef([]),started=useRef(0);
useEffect(()=>{let on=true;setTake(null);loadTake(slug).then(t=>{if(on&&t?.blob)setTake(t)});return()=>{on=false}},[slug]);
useEffect(()=>{if(!take?.blob){setUrl("");return}const u=URL.createObjectURL(take.blob);setUrl(u);return()=>URL.revokeObjectURL(u)},[take]);
useEffect(()=>{if(!rec)return;const t=setInterval(()=>{const s=(Date.now()-started.current)/1000;setSecs(s);if(s>=SPEAK_MAX)rec.stop()},250);return()=>clearInterval(t)},[rec]);
useEffect(()=>()=>{try{rec?.stop()}catch{}},[rec]);
const start=async()=>{setErr("");if(typeof MediaRecorder==="undefined"||!navigator.mediaDevices?.getUserMedia){setErr("This browser can't record audio.");return}
let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch{setErr("The microphone wasn't allowed. Allow it for this site to record.");return}
const mime=pickMime(m=>MediaRecorder.isTypeSupported?.(m)),r=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks.current=[];
r.ondataavailable=e=>{if(e.data?.size)chunks.current.push(e.data)};
r.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const seconds=Math.min(SPEAK_MAX,Math.round((Date.now()-started.current)/1000)),blob=new Blob(chunks.current,{type:r.mimeType||mime||"audio/webm"});setRec(null);
if(!blob.size)return;const t={blob,seconds,at:Date.now()};setTake(t);await saveTake(slug,t);track("speak_record",{seconds})};
started.current=Date.now();setSecs(0);r.start(1000);setRec(r)};
return <section className="sv-speak" aria-labelledby="sv-speak-h"><h2 id="sv-speak-h">Say it out loud</h2>
<p className="sv-help">In the interview you say all of this. Record two minutes, then listen: you'll hear what was unclear. Not graded, and kept only in this browser.</p>
<ol className="sv-speak-outline">{speakOutline(P).map(([t,x],i)=><li key={i}><small>{t}</small>{x}</li>)}</ol>
{rec?<p className="sv-speak-rec" role="timer"><span className="sv-speak-dot" aria-hidden="true"/>Recording {mmss(secs)} / {mmss(SPEAK_MAX)} <button type="button" className="sv-run" onClick={()=>rec.stop()}>■ Stop</button></p>
:<p className="sh-acts"><button type="button" className="sv-run" onClick={start}>🎙 {take?"Record again":"Record"}</button>{take&&<button type="button" className="sv-linkbtn" onClick={async()=>{await dropTake(slug);setTake(null)}}>Delete it</button>}</p>}
{err&&<p className="sv-speak-err" role="alert">{err}</p>}
{url&&!rec&&<div className="sv-speak-take"><audio controls src={url} preload="metadata"/><small>{mmss(take.seconds)} · recorded {new Date(take.at).toLocaleString()} · <a href={url} download={`${slug}-summary.${(take.blob.type.includes("mp4")?"m4a":take.blob.type.includes("ogg")?"ogg":"webm")}`}>Download</a></small></div>}</section>}

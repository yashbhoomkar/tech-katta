import React,{useEffect,useRef,useState}from"react";import{chunks}from"../speech.js";import{track}from"../analytics.js";import{lsGet,lsSet}from"./storage.js";
// Read aloud. Articles with a recording (tools/tts → /audio/<slug>/manifest.json) play a natural
// Kokoro voice from MP3s, chunk by chunk; any chunk without a matching recording, and articles
// without one, use the browser's speech engine (Web Speech API). The block being read is highlighted.
const canSpeak=typeof window!=="undefined"&&"speechSynthesis" in window&&!!window.speechSynthesis&&typeof SpeechSynthesisUtterance!=="undefined";
const REC="recorded";
// Device voices differ. Rank the natural-sounding ones first: Edge/Windows "Natural"/"Online"
// neural voices, Apple "Premium"/"Enhanced"/Siri voices, Chrome's "Google" voices; prefer en-IN.
const vScore=v=>(/natural|neural|online/i.test(v.name)?100:/premium|enhanced|siri/i.test(v.name)?80:/^google/i.test(v.name)?60:0)+(/^en[-_]IN/i.test(v.lang)?20:/^en[-_](GB|US)/i.test(v.lang)?10:0)-(/compact|espeak/i.test(v.name)?40:0);
function useVoices(){const[vs,set]=useState([]);useEffect(()=>{if(!canSpeak)return;const f=()=>set((speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang)).sort((a,b)=>vScore(b)-vScore(a)));f();speechSynthesis.addEventListener?.("voiceschanged",f);return()=>speechSynthesis.removeEventListener?.("voiceschanged",f)},[]);return vs}
// Only articles marked `audio:true` (recorded with tools/tts) have a manifest; others are not fetched.
function useRecording(a){const[m,set]=useState(null);useEffect(()=>{let on=true;set(null);if(!a.audio)return;fetch(`/audio/${a.slug}/manifest.json`).then(r=>r.ok?r.json():null).then(j=>{if(on&&j?.chunks)set(j)}).catch(()=>{});return()=>{on=false}},[a]);return m}
export function useReader(a){const q=React.useMemo(()=>chunks(a),[a]);const voices=useVoices();const rec=useRecording(a);
const[voice,setVoiceName]=useState(()=>lsGet("tk-voice")||"");const[state,setState]=useState("idle");const[cur,setCur]=useState(null);const[rate,setRate]=useState(1);
const run=useRef(0),idx=useRef(0),rateRef=useRef(1),voiceRef=useRef(null),el=useRef(null),next=useRef(null),usingRec=useRef(false);
const recOn=!!rec&&(voice===""||voice===REC||!voices.some(v=>v.name===voice));
voiceRef.current=recOn?null:voices.find(v=>v.name===voice)||voices[0]||null;
const src=i=>{const c=rec?.chunks?.[i];return recOn&&c&&c.text===q[i]?.text?`/audio/${a.slug}/${c.file}`:null};
const halt=()=>{run.current++;if(canSpeak)speechSynthesis.cancel();if(el.current){el.current.onended=el.current.onerror=null;el.current.pause()}};
const play=from=>{halt();track("read_aloud",{from});const id=run.current;
const done=()=>{setState("idle");setCur(null);idx.current=0};
const device=i=>{if(!canSpeak)return say(i+1);const u=new SpeechSynthesisUtterance(q[i].text);const v=voiceRef.current;if(v){u.voice=v;u.lang=v.lang}u.rate=rateRef.current;u.onend=()=>say(i+1);u.onerror=e=>{if(e.error!=="interrupted"&&e.error!=="canceled")say(i+1)};speechSynthesis.speak(u)};
const say=i=>{if(id!==run.current)return;if(i>=q.length)return done();idx.current=i;setCur(q[i].key);const s=src(i);usingRec.current=!!s;
if(!s)return device(i);
const e=el.current||(el.current=new Audio());e.src=s;e.playbackRate=rateRef.current;e.onended=()=>say(i+1);e.onerror=()=>{if(id===run.current)device(i)};
e.play().catch(()=>{if(id===run.current)device(i)});const n=src(i+1);if(n){next.current=new Audio(n);next.current.preload="auto"}};
setState("playing");say(from)};
useEffect(()=>()=>halt(),[a]);
// Restart after a voice change, unless playback was stopped or the article left meanwhile.
const restart=()=>{if(state!=="playing")return;const id=run.current;setTimeout(()=>{if(id===run.current)play(idx.current)})};
const pause=()=>{if(usingRec.current&&el.current){el.current.pause();setState("paused");return}halt();setState("paused")};
const resume=()=>{if(usingRec.current&&el.current&&el.current.src&&el.current.onended){el.current.play().then(()=>setState("playing")).catch(()=>play(idx.current));return}play(idx.current)};
return{q,state,cur,rate,voices,rec:!!rec,voice:recOn?REC:voiceRef.current?.name||"",usingRec:recOn,
play:()=>state==="paused"?resume():play(0),pause,stop:()=>{halt();idx.current=0;setState("idle");setCur(null)},
setRate:r=>{rateRef.current=r;setRate(r);if(usingRec.current&&el.current)el.current.playbackRate=r;else restart()},
setVoice:n=>{lsSet("tk-voice",n);setVoiceName(n);restart()}}}
const vLabel=v=>v.name.replace(/^(Microsoft|Google)\s+/,"").replace(/\s+Online\s+\(Natural\)/," (natural)").replace(/\s*-\s*English.*$/,"")+(/^en[-_]IN/i.test(v.lang)?" · IN":/^en[-_]GB/i.test(v.lang)?" · UK":/^en[-_]US/i.test(v.lang)?" · US":"");
export function Reader({r}){if(!canSpeak&&!r.rec)return null;return <div className={"reader"+(r.state!=="idle"?" on":"")} role="group" aria-label="Listen to this article">
<button type="button" className="r-btn primary" onClick={r.state==="playing"?r.pause:r.play} aria-pressed={r.state==="playing"}>{r.state==="playing"?"❚❚ Pause":r.state==="paused"?"▶ Resume":"▶ Listen"}</button>
{r.state!=="idle"&&<button type="button" className="r-btn" onClick={r.stop}>■ Stop</button>}
<label className="r-rate">Speed<select value={r.rate} onChange={e=>r.setRate(+e.target.value)}>{[.75,1,1.25,1.5].map(x=><option key={x} value={x}>{x}×</option>)}</select></label>
{(r.rec?r.voices.length>0:r.voices.length>1)&&<label className="r-rate r-voice">Voice<select value={r.voice} onChange={e=>r.setVoice(e.target.value)}>{r.rec&&<option value={REC}>Natural voice (recorded)</option>}{r.voices.slice(0,12).map(v=><option key={v.name} value={v.name}>{vLabel(v)}</option>)}</select></label>}
<span className="r-note" aria-live="polite">{r.state==="playing"?"Reading aloud":r.state==="paused"?"Paused":r.usingRec?"Natural voice, recorded for this article":"Uses your device's voices; the best ones are listed first"}</span></div>}

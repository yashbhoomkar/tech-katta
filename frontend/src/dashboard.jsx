import React,{Suspense,lazy,useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{createPortal}from"react-dom";import{chunks,spoken}from"./speech.js";import{getJSON}from"./api.js";import{Loading,LoadError,Boundary}from"./status.jsx";import"./dashboard.css";import Problems,{Questions}from"./problems.jsx";
import Numbers from"./numbers.jsx";import{routeKey,pathFor}from"./routes.js";import{LOOP,Dot,Box,Arr,Glow,Show,Mark}from"./figs/parts.jsx";import{COMPONENT_FIGS}from"./figs/components.jsx";import{CONCEPT_FIGS}from"./figs/concepts.jsx";import{QUESTION_FIGS}from"./figs/questions.jsx";import{PAPER_FIGS}from"./figs/papers.jsx";import{TOOL_FIGS}from"./figs/tools.jsx";import{NETWORK_FIGS}from"./figs/network.jsx";import{API_FIGS}from"./figs/apidesign.jsx";import{DM_FIGS}from"./figs/datamodel.jsx";import{CACHE_FIGS}from"./figs/caching.jsx";import{SHARD_FIGS}from"./figs/sharding.jsx";import LibraryCards from"./library.jsx";import{Analytics}from"@vercel/analytics/react";import Tour from"./tour.jsx";import{startAccount,wireSync}from"./account.js";import{track,referrer,readArticle,vercelGate}from"./analytics.js";import{AccountControl,PageLock,useAccount}from"./accountui.jsx";

// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={problems:"M3.5 5.5l1.5 1.5 2.5-2.5M10 6h6.5M3.5 10.5l1.5 1.5 2.5-2.5M10 11h6.5M3.5 15.5h4M10 16h6.5",papers:"M5 2.5h7l3 3v12H5zM12 2.5v3h3M7.5 9h5M7.5 12h5M7.5 15h3",lab:"M7.5 3h5M8.5 3v5.2L4.2 15.6A1 1 0 0 0 5.1 17h9.8a1 1 0 0 0 .9-1.4L11.5 8.2V3M6.3 12.5h7.4",concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
const Icon=({name})=><svg className="ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[name]}/></svg>;
// Filled from the API at boot (see bottom): site copy, dashboard chrome, article summaries, example system.
let c,d,ids,articles,example;
// Routes: /dashboard/<section>/ lists a section, /dashboard/<section>/<slug>/ opens an article (routes.js).
// In-app links use #<section>/<slug>; the address bar then shows the path form (see Dashboard).
const fromHash=()=>{const[sec,slug]=routeKey(location).split("/");if(sec==="privacy"&&c.privacy)return{sec:"privacy"};if(sec==="terms"&&c.terms)return{sec:"terms"};if(!ids.includes(sec))return{sec:null};/* no section chosen (or an unknown one): the dashboard starts empty */return{sec,art:articles.find(a=>a.section===sec&&a.slug===slug),sub:sec==="lab"||sec==="problems"&&c.problems?.solve?slug:undefined}};
const inline=x=>x.split(/`([^`]+)`/).map((t,i)=>i%2?<code key={i}>{t}</code>:t);
// Read time of the main text; "more" sections and type details are extra.
const count=x=>(x||"").split(/\s+/).filter(Boolean).length;
const words=a=>count(a.dek)+a.body.reduce((n,b)=>n+count(spoken(b,0,a.example)),0);
const extraWords=a=>a.body.reduce((n,b)=>n+(b.more||[]).reduce((m,x)=>m+count(x),0)+(b.t==="more"?b.body.reduce((m,x)=>m+count(spoken(x,0,a.example)||x.x),0):0),0);

// prefers-reduced-motion, including changes while the page is open.
function useStill(){const q="(prefers-reduced-motion: reduce)";const[s,set]=useState(()=>matchMedia(q).matches);useEffect(()=>{const m=matchMedia(q),f=()=>set(m.matches);m.addEventListener("change",f);return()=>m.removeEventListener("change",f)},[]);return s}

// FIG. 01 of the API article: the four interaction patterns inside Zotato (viewBox 640×372).
// Animated with SMIL on an 8 s loop: a Dot travels x1→x2 between fractions t0 and t1 of the loop
// and is hidden the rest of the time. Reduced motion renders the static diagram.
const ROWS=[["REQUEST / RESPONSE","REST · GraphQL · gRPC"],["OPEN CONNECTION","WebSockets · SSE"],["CALLBACK","Webhooks"],["ASYNCHRONOUS","Queues · event streams"]];
function ApiFig({still,uid=""}){const M=`ah${uid}`;return <svg viewBox="0 0 640 372" role="img" aria-labelledby={`fig1t${uid}`}><title id={`fig1t${uid}`}>Four API interaction patterns in Zotato: the customer app requests an order and waits for the response; the rider app and Dispatch keep a connection open and send messages both ways; the payment provider calls Zotato's webhook; the Order service puts an event on Kafka for the Notification service.</title><defs><marker id={M} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>
{ROWS.map(([a,b],i)=><g key={a}>{i>0&&<line x1="0" x2="640" y1={i*93} y2={i*93} stroke="#d9dee7"/>}<text x="0" y={i*93+42} className="fk">{a}</text><text x="0" y={i*93+58} className="fsub">{b}</text></g>)}
<Box x={190} y={46} t="Customer app"/><Box x={512} y={46} w={120} t="Order API"/><Arr m={M} x1={316} x2={510} y={38} t="GET /orders/123"/><Arr m={M} x1={510} x2={316} y={56} t="200 + the order as JSON" ty={72} dash/>
<Box x={190} y={139} t="Rider app"/><Box x={512} y={139} w={120} t="Dispatch"/><rect x="316" y="131" width="196" height="16" fill="#f5f7fa" stroke="#d9dee7"/><text x="414" y="124" textAnchor="middle" className="fl">one connection stays open</text><Arr m={M} x1={320} x2={505} y={135}/><Arr m={M} x1={505} x2={320} y={143}/><text x="414" y="164" textAnchor="middle" className="fl">location → · ← new jobs</text>
<Box x={190} y={232} t="Payment provider"/><Box x={512} y={232} w={120} t="Zotato webhook" blue/><Arr m={M} x1={316} x2={510} y={224} t="POST payment.captured"/><Arr m={M} x1={510} x2={316} y={242} t="200 once the event is stored" ty={258} dash/>
<Box x={190} y={325} t="Order service"/><Box x={366} y={325} w={92} t="Kafka" blue/><Box x={512} y={325} w={120} t="Notifications"/><Arr m={M} x1={316} x2={364} y={325}/><Arr m={M} x1={460} x2={510} y={325}/><text x="414" y="358" textAnchor="middle" className="fl">order.placed · nobody waits</text>
{!still&&<g aria-hidden="true">
<Dot x1={318} x2={504} y={38} t0={.05} t1={.25}/><Dot x1={504} x2={318} y={56} t0={.32} t1={.52}/>
<Dot x1={324} x2={500} y={135} t0={.05} t1={.2}/><Dot x1={500} x2={324} y={143} t0={.26} t1={.41}/><Dot x1={324} x2={500} y={135} t0={.47} t1={.62}/><Dot x1={324} x2={500} y={135} t0={.8} t1={.95}/>
<Dot x1={318} x2={504} y={224} t0={.12} t1={.32}/><Dot x1={622} x2={622} y={223} t0={.32} t1={.46}/><Dot x1={504} x2={318} y={242} t0={.46} t1={.64}/>
<Dot x1={318} x2={358} y={325} t0={.04} t1={.12}/><Dot x1={448} x2={448} y={316} t0={.12} t1={.48}/><Dot x1={462} x2={504} y={325} t0={.48} t1={.56}/></g>}</svg>}


// More figures for the API article, same conventions as FIG. 01: 640-wide viewBox, SMIL packets
// on a loop, nothing animated when `still`. Glow outlines a box during [t0,t1] of the loop.

// FIG: choosing an API type. Ask from the top, stop at the first yes; the packet walks three Zotato cases.
// Order matters: the ladder stops at the first yes, so "another company reporting an event" comes
// before "can the work happen later" (a payment callback is a webhook even though its follow-up is queued).
const QS=[["Another company reporting an event?","Webhook"],["Can the work happen later?","Queue"],["Server pushes; the client only listens?","SSE"],["Both sides send often?","WebSockets"],["Your own services, and speed matters?","gRPC"],["Screens need different data?","GraphQL"],["Otherwise","REST"]];
const qy=i=>50+i*64;
function ChooseFig({still,uid=""}){const M=`ac${uid}`,D="12s";const down=(from,to,t0,t1)=>Array.from({length:to-from},(_,k)=>{const s=t0+(t1-t0)*k/(to-from),e=t0+(t1-t0)*(k+1)/(to-from);return <Dot key={k} x1={165} x2={165} y={qy(from+k)+20} y2={qy(from+k+1)-20} t0={s} t1={e} dur={D}/>});
return <svg viewBox="0 0 640 470" role="img" aria-labelledby={`fct${uid}`}><title id={`fct${uid}`}>Choosing an API type: ask in order whether another company is reporting an event (webhook), whether the work can happen later (queue), whether the server pushes while the client only listens (SSE), whether both sides send often (WebSockets), whether it is your own services and speed matters (gRPC), whether screens need different data (GraphQL); otherwise REST.</title><Mark m={M}/>
{QS.map(([q,a],i)=>{const y=qy(i),last=i===QS.length-1;return <g key={q}><rect x="0" y={y-18} width="330" height="36" fill="#fff" stroke="#9aa5b4" strokeDasharray={last?"4 3":undefined}/><text x="12" y={y+4} className="fq">{q}</text>
<Arr m={M} x1={332} x2={496} y={y} t={last?"":"yes"}/><Box x={498} y={y} w={136} t={a} blue={last}/>
{!last&&<g><line x1="165" y1={y+18} x2="165" y2={y+44} stroke="#1c2733" markerEnd={`url(#${M})`}/><text x="173" y={y+36} className="fl">no</text></g>}</g>})}
{!still&&<g aria-hidden="true">
<Show t0={.001} t1={.31} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE ORDER SMS</text></Show>
<Show t0={.33} t1={.65} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE TRACKING SCREEN</text></Show>
<Show t0={.67} t1={.999} dur={D}><text x="640" y="16" textAnchor="end" className="fk">ZOTATO · THE RESTAURANT API</text></Show>
{down(0,1,.03,.08)}<Dot x1={334} x2={492} y={qy(1)} t0={.09} t1={.18} dur={D}/><Glow x={498} y={qy(1)-17} w={136} h={34} t0={.18} t1={.31} dur={D}/>
{down(0,2,.35,.43)}<Dot x1={334} x2={492} y={qy(2)} t0={.44} t1={.52} dur={D}/><Glow x={498} y={qy(2)-17} w={136} h={34} t0={.52} t1={.65} dur={D}/>
{down(0,6,.68,.86)}<Dot x1={334} x2={492} y={qy(6)} t0={.87} t1={.93} dur={D}/><Glow x={498} y={qy(6)-17} w={136} h={34} t0={.93} t1={.999} dur={D}/></g>}</svg>}

// FIG: one Zotato order, end to end, as a sequence diagram (lanes left to right, time downwards).
const LANES=[["Customer","app"],["Order","API"],["Payments","Dispatch"],["Payment","provider"],["Kafka",""],["Notifications","Invoices"],["Rider","app"]];
const lx=i=>44+i*92,sy=i=>84+i*34;
const STEPS=[[0,1,"1 GraphQL · home screen"],[0,1,"2 REST · POST /orders"],[1,2,"3 gRPC · charge, find rider"],[3,1,"4 webhook · payment.captured"],[1,4,"5 order.placed"],[4,5,"6 SMS, ticket, invoice"],[1,0,"7 SSE · rider picked up",1],[2,6,"8 WebSocket · location ⇄ jobs"]];
function OrderFig({still,uid=""}){const M=`ao${uid}`,D="12s";const end=(a,b)=>[lx(a)+(b>a?5:-5),lx(b)+(b>a?-6:6)];
return <svg viewBox="0 0 640 364" role="img" aria-labelledby={`fot${uid}`}><title id={`fot${uid}`}>One Zotato order: 1 the customer app loads the home screen with GraphQL; 2 it places the order with POST /orders; 3 the Order API calls Payments and Dispatch over gRPC; 4 the payment provider calls a webhook with payment.captured; 5 the Order API writes order.placed to Kafka; 6 Kafka feeds the SMS, the restaurant ticket and the invoice; 7 the tracking screen gets updates over server-sent events; 8 the rider app and Dispatch exchange location and jobs over a WebSocket.</title><Mark m={M}/>
{LANES.map(([a,b],i)=><g key={a}><line x1={lx(i)} y1="46" x2={lx(i)} y2="356" stroke="#d9dee7" strokeDasharray="3 3"/><rect x={lx(i)-43} y="6" width="86" height="40" fill={i===4?"#f8faff":"#fff"} stroke={i===4?"#2855d9":i===3||i===0||i===6?"#1c2733":"#9aa5b4"}/><text x={lx(i)} y={b?23:30} textAnchor="middle" className="fh">{a}</text>{b&&<text x={lx(i)} y="37" textAnchor="middle" className="fh">{b}</text>}</g>)}
{STEPS.map(([a,b,t,dash],i)=>{const[x1,x2]=end(a,b),y=sy(i),two=i===7;return <g key={t}><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd={`url(#${M})`}/>{two&&<line x1={x2} y1={y+7} x2={x1} y2={y+7} stroke="#1c2733" markerEnd={`url(#${M})`}/>}<text x={(x1+x2)/2} y={y-6} textAnchor="middle" className="fl halo">{t}</text></g>})}
{!still&&<g aria-hidden="true">{STEPS.map(([a,b],i)=>{const[x1,x2]=end(a,b),t0=.03+i*.118,t1=t0+.09;return <g key={i}><Dot x1={x1} x2={x2} y={sy(i)} t0={t0} t1={t1} dur={D}/>{i===7&&<Dot x1={x2} x2={x1} y={sy(i)+7} t0={t0} t1={t1} dur={D}/>}</g>})}</g>}</svg>}

// FIG: a retry with an idempotency key. The first reply is lost; the retry gets the same order back.
function RetryFig({still,uid=""}){const M=`ar${uid}`,D="10s",A=110,B=470;
const note=(y,t)=><g><rect x={B+8} y={y-13} width="154" height="26" fill="#f8faff" stroke="#b9c9ff"/><text x={B+16} y={y+4} className="fl">{t}</text></g>;
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`frt${uid}`}><title id={`frt${uid}`}>The app sends POST /orders with an idempotency key; the Order API saves order o_123 with the key; the reply is lost on the network; the app retries the same request with the same key; the API finds the key and returns o_123 instead of creating a second order.</title><Mark m={M}/>
{[[A,"Customer app"],[B,"Order API"]].map(([x,t])=><g key={t}><line x1={x} y1="40" x2={x} y2="272" stroke="#d9dee7" strokeDasharray="3 3"/><rect x={x-70} y="6" width="140" height="34" fill="#fff" stroke="#9aa5b4"/><text x={x} y="27" textAnchor="middle" className="fb">{t}</text></g>)}
<line x1={A+5} y1="76" x2={B-6} y2="76" stroke="#1c2733" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="70" textAnchor="middle" className="fl halo">POST /orders · Idempotency-Key: 7f3c</text>
{note(102,"saves o_123 + key 7f3c")}
<line x1={B-5} y1="138" x2="300" y2="138" stroke="#1c2733" strokeDasharray="4 3"/><text x="292" y="143" textAnchor="middle" className="fx">✕</text><text x={(300+B)/2} y="132" textAnchor="middle" className="fl halo">201 o_123 · lost on the network</text>
<line x1={A+5} y1="180" x2={B-6} y2="180" stroke="#1c2733" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="174" textAnchor="middle" className="fl halo">retry · same request, same key</text>
{note(206,"key seen: no new order")}
<line x1={B-5} y1="244" x2={A+6} y2="244" stroke="#1c2733" strokeDasharray="4 3" markerEnd={`url(#${M})`}/><text x={(A+B)/2} y="238" textAnchor="middle" className="fl halo">201 o_123 · the same order</text>
<text x="320" y="292" textAnchor="middle" className="fk">ONE ORDER, ONE CHARGE</text>
{!still&&<g aria-hidden="true"><Dot x1={A+8} x2={B-10} y={76} t0={.03} t1={.15} dur={D}/><Glow x={B+8} y={89} w={154} h={26} t0={.15} t1={.27} dur={D}/><Dot x1={B-8} x2={304} y={138} t0={.28} t1={.38} dur={D}/>
<Dot x1={A+8} x2={B-10} y={180} t0={.45} t1={.57} dur={D}/><Glow x={B+8} y={193} w={154} h={26} t0={.57} t1={.68} dur={D}/><Dot x1={B-8} x2={A+10} y={244} t0={.69} t1={.81} dur={D}/></g>}</svg>}

const FIGS={patterns:{C:ApiFig,ar:640/372,title:n=>`FOUR WAYS TWO PROGRAMS TALK, IN ${n}`},choose:{C:ChooseFig,ar:640/470,title:()=>"CHOOSING AN API TYPE"},order:{C:OrderFig,ar:640/364,title:n=>`ONE ${n} ORDER, END TO END`},retry:{C:RetryFig,ar:640/300,title:()=>"A RETRY THAT DOES NOT CHARGE TWICE"},...COMPONENT_FIGS,...CONCEPT_FIGS,...QUESTION_FIGS,...PAPER_FIGS,...TOOL_FIGS,...NETWORK_FIGS,...API_FIGS,...DM_FIGS,...CACHE_FIGS,...SHARD_FIGS};
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
function useReader(a){const q=React.useMemo(()=>chunks(a),[a]);const voices=useVoices();const rec=useRecording(a);
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
function Reader({r}){if(!canSpeak&&!r.rec)return null;return <div className={"reader"+(r.state!=="idle"?" on":"")} role="group" aria-label="Listen to this article">
<button type="button" className="r-btn primary" onClick={r.state==="playing"?r.pause:r.play} aria-pressed={r.state==="playing"}>{r.state==="playing"?"❚❚ Pause":r.state==="paused"?"▶ Resume":"▶ Listen"}</button>
{r.state!=="idle"&&<button type="button" className="r-btn" onClick={r.stop}>■ Stop</button>}
<label className="r-rate">Speed<select value={r.rate} onChange={e=>r.setRate(+e.target.value)}>{[.75,1,1.25,1.5].map(x=><option key={x} value={x}>{x}×</option>)}</select></label>
{(r.rec?r.voices.length>0:r.voices.length>1)&&<label className="r-rate r-voice">Voice<select value={r.voice} onChange={e=>r.setVoice(e.target.value)}>{r.rec&&<option value={REC}>Natural voice (recorded)</option>}{r.voices.slice(0,12).map(v=><option key={v.name} value={v.name}>{vLabel(v)}</option>)}</select></label>}
<span className="r-note" aria-live="polite">{r.state==="playing"?"Reading aloud":r.state==="paused"?"Paused":r.usingRec?"Natural voice, recorded for this article":"Uses your device's voices; the best ones are listed first"}</span></div>}

// Figures: fit the column (zoomed out on phones) plus a full-screen view. In portrait the
// full-screen figure is turned sideways so it uses the long side of the screen.
function FullFig({title,ar=640/372,children,onClose}){const stage=useRef(null),close=useRef(null);const[box,setBox]=useState(null);
useEffect(()=>{const page=document.getElementById("root"),prev=document.activeElement;const key=e=>e.key==="Escape"&&onClose();document.body.style.overflow="hidden";if(page)page.inert=true;document.addEventListener("keydown",key);close.current?.focus();
const fit=()=>{const r=stage.current?.getBoundingClientRect();if(!r)return;const turn=r.height>r.width*1.15;const w=turn?Math.min(r.height,r.width*ar):Math.min(r.width,r.height*ar);setBox({w,turn})};fit();addEventListener("resize",fit);
return()=>{document.body.style.overflow="";if(page)page.inert=false;document.removeEventListener("keydown",key);removeEventListener("resize",fit);prev?.focus?.()}},[]);
return createPortal(<div className="fs" role="dialog" aria-modal="true" aria-label={title}><div className="fs-head"><div className="fs-title"><b>{title}</b><span className="fs-hint">Turn your phone sideways for a bigger view</span></div><button ref={close} type="button" className="r-btn" onClick={onClose}>Close ✕</button></div><div className="fs-stage" ref={stage}>{box&&<div className="fs-fig" style={{width:box.w,transform:`translate(-50%,-50%)${box.turn?" rotate(90deg)":""}`}}>{children}</div>}</div></div>,document.body)}
function Fig({id,n,cap,still,rd}){const[full,setFull]=useState(false);const f=FIGS[id];if(!f)return null;const C=f.C;const title=`FIG. ${String(n).padStart(2,"0")} — ${f.title(example.name.toUpperCase())}`;
return <figure className={"a-fig"+rd}><div className="a-fig-head">{title}</div><div className="a-fig-body"><C still={still}/></div>
<button type="button" className="fs-btn" onClick={()=>setFull(true)}>⤢ Tap to view full screen</button><figcaption>{inline(cap)}</figcaption>{full&&<FullFig title={title} ar={f.ar} onClose={()=>setFull(false)}><C still={still} uid="fs"/></FullFig>}</figure>}

// Share (phone share sheet where available, otherwise copy the link).
function Share({a}){const[msg,setMsg]=useState("");const url=location.href;const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500)};
const go=async()=>{if(navigator.share){try{await navigator.share({title:a.title,text:a.dek,url});return}catch(e){if(e?.name==="AbortError")return}}
try{await navigator.clipboard.writeText(url);flash("Link copied")}catch{flash("Couldn't copy the link")}};
return <button type="button" className="r-btn share" onClick={go} aria-live="polite">{msg||"↗ Share"}</button>}

function Block({b,i,rd,still,fn}){const k=i;const cls=x=>x+(rd?rd(k):"");
switch(b.t){
case"h2":return <h2 id={`s-${k}`} className={cls("")}>{b.x}</h2>;
case"p":return <p className={cls("")}>{inline(b.x)}</p>;
case"list":return <ul className={cls("")}>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul>;
case"tldr":return <aside className={cls("a-tldr")} aria-label="In 30 seconds"><b>IN 30 SECONDS</b><ul>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul></aside>;
case"example":return <aside className={cls("a-example")} aria-label="Example system"><div className="a-ex-head"><b>EXAMPLE SYSTEM</b><span>{example.name}</span><small>{example.kind}</small></div><p>{example.text}</p><dl>{example.parts.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></aside>;
case"type":return <section className={cls("a-type")}><h3>{b.name}<small>{b.kind}</small></h3><p className="a-what">{inline(b.what)}</p><dl><dt>Use it for</dt><dd>{inline(b.use)}</dd><dt>Avoid it for</dt><dd>{inline(b.avoid)}</dd><dt className="ex">In {example.name}</dt><dd className="ex">{inline(b.ex)}</dd>{b.like&&<><dt className="like">In real life</dt><dd className="like">{inline(b.like)}</dd></>}</dl>{b.more&&<details className="a-more"><summary>How it works and what it costs</summary>{b.more.map(x=><p key={x}>{inline(x)}</p>)}</details>}</section>;
case"analogy":return <aside className={cls("a-analogy")} aria-label="In real life"><b>IN REAL LIFE</b><p>{inline(b.x)}</p></aside>;
case"code":return <figure className={cls("a-code")}><figcaption>{b.label}</figcaption><pre tabIndex="0" aria-label={b.say}><code>{b.x}</code></pre></figure>;
case"fig":return <Fig id={b.id} n={fn?.[k]??1} cap={b.cap} still={still} rd={rd?rd(k):""}/>;
case"lab":return <a className={cls("a-lab")} href={`#${b.to}`}><b>TRY IT IN THE LAB</b><p>{inline(b.x)}</p><em>{b.go||"Open the Lab"} →</em></a>;
case"table":return <div className={cls("a-table")} role="region" aria-label={b.label||"Comparison table"} tabIndex="0"><table role="table"><thead role="rowgroup"><tr role="row">{b.head.map(h=><th key={h} scope="col" role="columnheader">{h}</th>)}</tr></thead><tbody role="rowgroup">{b.rows.map(r=><tr key={r[0]} role="row"><th scope="row" role="rowheader">{r[0]}</th>{r.slice(1).map((x,j)=><td key={j} role="cell" data-label={b.head[j+1]}>{x}</td>)}</tr>)}</tbody></table></div>;
case"more":return <details className="a-more a-deeper"><summary><small>GO DEEPER</small>{b.label}</summary>{b.body.map((x,j)=><Block key={j} b={x} i={`${k}.${j}`} still={still}/>)}</details>;
default:return null}}

function Article({a,pane}){const label=d.sections.find(s=>s[0]===a.section)[1];const still=useStill();const r=useReader(a);const rd=k=>r.cur===k?" reading":"";
// Interview Questions (not the method page) open their problem workspace: design it on the canvas, Run, Submit.
const pr=a.section==="interview-questions"&&a.group!=="start";
useEffect(()=>{if(r.cur==null)return;const el=document.querySelector(".d-article .reading");el?.scrollIntoView({block:"nearest",behavior:still?"auto":"smooth"})},[r.cur]);
const fn={};a.body.reduce((n,b,i)=>b.t==="fig"?(fn[i]=n+1):n,0);
const main=Math.max(1,Math.round(words(a)/220)),all=Math.max(main,Math.round((words(a)+extraWords(a))/220));
return <div className="d-read"><article className="d-panel d-article" aria-labelledby="d-title">
<nav className="crumbs" aria-label="Breadcrumb"><a href={`#${a.section}`}>{label}</a><span aria-hidden="true">/</span><span>{a.no}</span></nav>
<label>{a.tag}</label><h1 id="d-title">{a.title}</h1><p className={"d-dek"+rd("head")}>{a.dek}</p><Reader r={r}/><div className="d-meta"><span>{a.date} · {main} MIN READ{all>main?` · ${all} WITH DETAILS`:""}</span><Share a={a}/></div>
{pr&&!pane&&c.problems?.solve&&<a className="pr-solve" href={`#problems/${a.slug}`}>{c.problems.solve.button} →</a>}
{a.body.map((b,i)=><Block key={i} b={b} i={i} rd={rd} still={still} fn={fn}/>)}
<NextProblem a={a}/><a className="a-back" href={`#${a.section}`}>← All {label.toLowerCase()}</a></article>{!pane&&<Rail a={a}/>}</div>}
// Wide screens: a column beside the article with its sections (the one you are reading is marked) and,
// for an article with a Lab card, a shortcut to it. Hidden below 1240 px, where the article fills the width.
function Rail({a}){const hs=a.body.map((b,i)=>b.t==="h2"?{id:`s-${i}`,x:b.x}:null).filter(Boolean);const lab=a.body.find(b=>b.t==="lab");const[on,setOn]=useState(null);
useEffect(()=>{if(!hs.length||typeof IntersectionObserver==="undefined")return;const els=hs.map(h=>document.getElementById(h.id)).filter(Boolean);
const pick=()=>{let cur=null;const line=innerHeight*.35;for(const el of els){if(el.getBoundingClientRect().top<=line)cur=el.id;else break}if(innerHeight+scrollY>=document.documentElement.scrollHeight-4)cur=els[els.length-1]?.id??cur;setOn(cur)};const io=new IntersectionObserver(pick,{rootMargin:"0px 0px -60% 0px"});els.forEach(el=>io.observe(el));addEventListener("scroll",pick,{passive:true});pick();
return()=>{io.disconnect();removeEventListener("scroll",pick)}},[a.slug]);
const go=(e,id)=>{const el=document.getElementById(id);if(!el)return;e.preventDefault();el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});setOn(id)};
const solve=c.problems?.solve&&a.section==="interview-questions"&&a.group!=="start";if(!hs.length&&!lab&&!solve)return null;
return <aside className="d-rail" aria-label="On this page">{hs.length>0&&<nav><b>ON THIS PAGE</b><ol>{hs.map(h=><li key={h.id}><a href={`#${a.section}/${a.slug}`} aria-current={on===h.id?"location":undefined} className={on===h.id?"on":""} onClick={e=>go(e,h.id)}>{h.x}</a></li>)}</ol></nav>}
{solve&&<a className="rail-lab rail-solve" href={`#problems/${a.slug}`}><b>{c.problems.solve.eyebrow}</b><span>{c.problems.solve.button} →</span></a>}
{lab&&<a className="rail-lab" href={`#${lab.to}`}><b>TRY IT IN THE LAB</b><span>{lab.go||"Open the Lab"} →</span></a>}</aside>}
// After an Interview Question: the next one in the list (site.json "problems" copy), and the Problems page.
function NextProblem({a}){const p=c.problems;if(!p?.next||a.section!=="interview-questions"||a.group==="start")return null;const qs=articles.filter(x=>x.section===a.section&&x.group!=="start");const n=qs[qs.findIndex(x=>x.slug===a.slug)+1];
return <nav className="a-next" aria-label={p.next}>{n&&<a href={`#${n.section}/${n.slug}`}><small>{p.next}</small><b>{n.title} →</b></a>}<a className="a-all" href="#problems">{p.allProblems}</a></nav>}

// Article bodies are fetched when opened; the summaries list came with the dashboard.
// A figure id this build doesn't know (new content can go live a few minutes before the frontend that
// draws it) is left out, so the page, the figure numbers and read aloud all skip it instead of showing
// the wrong diagram.
const knownFigs=a=>a.body.some(x=>x.t==="fig"&&!FIGS[x.id])?{...a,body:a.body.filter(x=>x.t!=="fig"||FIGS[x.id])}:a;
function ArticlePage({s}){const[st,set]=useState({});const load=()=>{set({});getJSON(`/v1/articles/${s.slug}`).then(a=>set({a:knownFigs(a)}),e=>set({err:e.status===404?"missing":"failed"}))};useEffect(load,[s.slug]);useEffect(()=>readArticle(s.section,s.slug),[s.section,s.slug]);
return st.a?<Article a={st.a}/>:st.err?<section className="d-panel">{st.err==="missing"?<p className="d-desc">This article is no longer available. <a href={`#${s.section}`}>Back to {s.section}</a></p>:<LoadError what="this article" retry={load}/>}</section>:<section className="d-panel"><Loading label={s.title}/></section>}

// The dashboard's start page (no tab selected): the three library cards. A card opens its section
// (tab selected in the sidebar and top bar) and that section's first article, or the section itself
// while it has none.
function Home(){const href=x=>{const sec=d.sections.find(s=>s[2]===x.id)?.[0];if(!sec)return"#";const first=articles.find(a=>a.section===sec);return first?`#${sec}/${first.slug}`:`#${sec}`};
return <section className="d-panel d-start" aria-labelledby="d-title"><label>{c.topics.eyebrow}</label><h1 id="d-title">{c.topics.title}</h1><LibraryCards cards={c.topics.cards} href={href}/></section>}
// Privacy and Terms pages (site.json "privacy", "terms").
function Policy({p}){return <section className="d-panel" aria-labelledby="d-title"><label>{p.eyebrow}</label><h1 id="d-title">{p.title}</h1><p className="d-desc">{p.updated}</p>
{p.sections.map(([h,x])=><div className="priv" key={h}><h2>{h}</h2><p>{x}</p></div>)}</section>}
function Section({id}){if(id==="problems"&&c.problems)return <Problems p={c.problems} articles={articles} groups={d.groups?.["interview-questions"]}/>;const[,label,card]=d.sections.find(s=>s[0]===id);const t=c.topics.cards.find(x=>x.id===card);
// the section header: a library card's, the Research Papers block (site.json `papers`), or Quick Notes'
const h=t?{eyebrow:t.no,desc:t.desc}:id==="papers"&&c.papers?c.papers:{eyebrow:c.notes.eyebrow,desc:c.notes.desc};
if(id==="interview-questions"&&c.problems?.solve)return <Questions p={c.problems} articles={articles} label={label} desc={t?t.desc:""} eyebrow={t?t.no:""} groups={d.groups?.[id]}/>;
return <section className="d-panel" aria-labelledby="d-title"><label>{h.eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{h.desc}</p>
{id==="quick-notes"?<><ol className="d-notes">{c.notes.items.map(([n,title,tag,status])=><li key={n}><span className="d-no">{n}</span><b>{title}</b><span className="d-tag">{tag}</span><em className={status==="DRAFT"?"draft":""}>{status}</em></li>)}</ol><Numbers n={c.numbers}/></>
:<List id={id}/>}</section>}
// A section's articles under its subsection headings (site.json dashboard.groups[section]: [[id, label, desc]],
// article "group"), in that order; articles without a known group come last. No groups: one plain list.
const grouped=(id,list)=>{const g=d.groups?.[id];if(!g)return[[null,list]];const known=new Set(g.map(x=>x[0]));const rest=list.filter(a=>!known.has(a.group));
return[...g.map(([gid,label,desc])=>[{gid,label,desc},list.filter(a=>a.group===gid)]),...(rest.length?[[null,rest]]:[])]};
const Item=({id,a})=><li><a href={`#${id}/${a.slug}`}><small>{a.no}</small><b>{a.title}</b><p>{a.dek}</p><em>Read →</em></a></li>;
function List({id}){const list=articles.filter(a=>a.section===id);return list.length?<div className="d-list"><span>{list.length} {list.length>1?"PAGES":"PAGE"}</span>
{grouped(id,list).map(([g,items],i)=>g?<section className="d-group" key={g.gid} aria-labelledby={`g-${g.gid}`}><h2 id={`g-${g.gid}`}>{g.label}</h2><p>{g.desc}</p>{items.length?<ol>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>:<p className="d-soon">{d.groupEmpty||"Coming soon."}</p>}</section>:<ol key={i}>{items.map(a=><Item key={a.slug} id={id} a={a}/>)}</ol>)}</div>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}

// The System Design Lab (React Flow + simulation) loads only when its tab is opened.
const Lab=lazy(()=>import("./lab/Lab.jsx"));const Solve=lazy(()=>import("./solve.jsx"));

// Every tab needs a signed-in visitor (owner, 11-05); the start page, Privacy and Terms stay open.
// gate: false (show the page), "wait" (still checking the session) or the locked page's title.
function useGate(route){const a=useAccount();const open=!route.sec||route.sec==="privacy"||route.sec==="terms";
if(open||!c.account?.pageLock)return false;if(!a.ready)return"wait";if(!a.enabled||a.user)return false;
return route.art?route.art.title:d.sections.find(s=>s[0]===route.sec)?.[1]||""}
// Skip link: the dashboard routes on the hash, so it focuses <main> instead of linking to an id.
const skipToMain=e=>{e.preventDefault();const m=document.querySelector("main");if(m){m.focus();m.scrollIntoView()}};
const keyOf=r=>!r.sec?"":r.art?`${r.sec}/${r.art.slug}`:r.sub?`${r.sec}/${r.sub}`:r.sec;
function Dashboard(){const[route,setRoute]=useState(fromHash);const gate=useGate(route);const firstView=useRef(true);useEffect(()=>{track("page_view",{section:route.sec||"home",slug:route.art?.slug||route.sub||"",ref:firstView.current?referrer():""});firstView.current=false},[route.sec,route.art?.slug,route.sub]);// eslint-disable-line
const active=route.sec;const[collapsed,setCollapsed]=useState(()=>lsGet("tk-sidebar")==="collapsed");
// The Lab needs the width: the sidebar folds to icons there by default (the saved preference for
// other pages is untouched), and the toggle works per mode.
// Every Interview Question opens in the problem workspace (solve.jsx): on its description from Problems,
// on its worked answer from Interview Questions. Needs site.json problems.solve.
const ws=!c.problems?.solve?null:active==="problems"&&route.sub?route.sub:route.art&&route.art.section==="interview-questions"&&route.art.group!=="start"?route.art.slug:null;
const solving=!!ws;const inLab=(active==="lab"&&!route.art)||solving;const[labOpen,setLabOpen]=useState(false);const fold=inLab?!labOpen:collapsed;const toggle=()=>inLab?setLabOpen(v=>!v):setCollapsed(v=>!v);const[open,setOpen]=useState(false);const menuBtn=useRef(null);const drawer=useRef(null);
// Back/Forward return to where you were on that page; following a link starts at the top (QA M8).
useEffect(()=>{const pos=new Map();let clicked=false,key=routeKey(location);const onScroll=()=>pos.set(key,scrollY);const onClick=e=>{const a=e.target.closest?.("a[href^='#']");if(a)clicked=true};
addEventListener("scroll",onScroll,{passive:true});document.addEventListener("click",onClick,true);
const restore=()=>{const k=routeKey(location);if(k===key)return;const want=clicked?0:pos.get(k)||0;clicked=false;key=k;if(!want){scrollTo(0,0);return}let n=0;const go=()=>{scrollTo(0,want);if(Math.abs(scrollY-want)>2&&++n<40)setTimeout(go,50)};go()};
addEventListener("hashchange",restore);addEventListener("popstate",restore);return()=>{removeEventListener("scroll",onScroll);document.removeEventListener("click",onClick,true);removeEventListener("hashchange",restore);removeEventListener("popstate",restore)}},[]);
// A link (#…) or Back/Forward (a path) changes the route; both events can fire for one link, so only a new
// route counts. The address bar then shows the route's own path, the one search engines and shares use.
useEffect(()=>{let last=routeKey(location);const f=()=>{const k=routeKey(location);if(k===last)return;last=k;setRoute(fromHash());setOpen(false)};addEventListener("hashchange",f);addEventListener("popstate",f);return()=>{removeEventListener("hashchange",f);removeEventListener("popstate",f)}},[]);
useEffect(()=>{const p=pathFor(keyOf(route));if(location.pathname!==p||location.hash){try{history.replaceState(history.state,"",p)}catch{}}let l=document.querySelector('link[rel="canonical"]');if(!l){l=document.createElement("link");l.rel="canonical";document.head.appendChild(l)}l.href="https://tech.katta.cc"+p},[route]);
useEffect(()=>{lsSet("tk-sidebar",collapsed?"collapsed":"open")},[collapsed]);
// Guided tour, one per kind of page: the dashboard, a problem's workspace, the Lab. It opens only when
// the Tour button is pressed (owner's decision, 2026-11-07): never by itself.
const tourKind=solving?(c.tour?.problem?"problem":null):active==="lab"&&!route.art?"lab":"dashboard";
const[tour,setTour]=useState(null);const closeTour=()=>setTour(null);
useEffect(()=>{if(!open)return;const r=requestAnimationFrame(()=>drawer.current?.querySelector(".side-nav a")?.focus());const k=e=>{if(e.key==="Escape"){setOpen(false);menuBtn.current?.focus()}};addEventListener("keydown",k);return()=>{cancelAnimationFrame(r);removeEventListener("keydown",k)}},[open]);
useEffect(()=>{const s=d.sections.find(s=>s[0]===active);document.title=route.art?`${route.art.title} | Tech Katta`:active==="privacy"?`${c.privacy.title} | Tech Katta`:active==="terms"?`${c.terms.title} | Tech Katta`:s?`${s[1]} · Dashboard | Tech Katta`:"Dashboard | Tech Katta"},[route]);
const links=cls=>d.sections.map(([id,label])=>{const subs=cls==="side-link"&&id===active?articles.filter(a=>a.section===id):[];return <React.Fragment key={id}><a href={`#${id}`} className={cls+(id===active?" active":"")} aria-current={id===active&&!route.art?"page":undefined} title={fold?label:undefined}>{cls==="side-link"&&<Icon name={id}/>}<span>{label}</span></a>
{subs.length>0&&<div className="side-sub">{grouped(id,subs).map(([g,items],i)=>items.length>0&&<React.Fragment key={g?.gid||i}>{g&&<span className="side-group">{g.label}</span>}{items.map(a=><a key={a.slug} href={`#${id}/${a.slug}`} className={route.art===a?"active":""} aria-current={route.art===a?"page":undefined}>{a.title.split(":")[0]}</a>)}</React.Fragment>)}</div>}</React.Fragment>});
return <div className={"dash"+(fold?" collapsed":"")+(open?" open":"")}><a className="skip" href="#" onClick={skipToMain}>Skip to content</a><Analytics beforeSend={vercelGate} route={"/dashboard/"+(route.sec?"[section]"+(route.art?"/[article]":route.sub?"/[challenge]":""):"")} path={"/dashboard/"+(route.sec||"")+(route.art?"/"+route.art.slug:route.sub?"/"+route.sub:"")}/>
<aside className="side" id="sidebar" ref={drawer} aria-label="Dashboard"><div className="side-head"><a className="side-brand" href="/" aria-label="Tech Katta home"><b>TK</b><span>{c.brand.name}</span></a><button type="button" className="icon-btn desk" aria-label={fold?"Expand sidebar":"Collapse sidebar"} aria-expanded={!fold} aria-controls="sidebar" onClick={toggle}><Icon name="collapse"/></button><button type="button" className="icon-btn mob" aria-label="Close menu" onClick={()=>{setOpen(false);menuBtn.current?.focus()}}><Icon name="close"/></button></div>
<div className="side-label">{d.label}</div><nav className="side-nav">{links("side-link")}</nav>
{c.privacy&&<a className="side-priv" href="#privacy">{c.account?.privacy||c.privacy.eyebrow}</a>}{c.terms&&<a className="side-priv" href="#terms">{c.account?.termsLink||c.terms.title}</a>}<a className="side-foot" href="/" aria-label={d.back}><Icon name="back"/><span>{d.back}</span></a></aside>
{open&&<div className="scrim" onClick={()=>setOpen(false)}/>}
<div className="d-main"><header className="d-head"><button type="button" ref={menuBtn} className="icon-btn mob" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={()=>setOpen(true)}><Icon name="menu"/></button><nav className="tabs" aria-label="Sections">{links("tab")}</nav><AccountControl t={c.account} button={false}/>{c.tour&&<button type="button" className="d-tour" onClick={()=>tourKind&&setTour(tourKind)}>{c.tour.button}</button>}<a className="d-home" href="/">tech.katta.cc</a></header>{tour&&<Tour key={tour} steps={c.tour[tour]} labels={c.tour} onClose={closeTour}/>}
<main tabIndex={-1} className={"d-body"+(inLab&&!gate?" d-lab":"")}>{gate==="wait"?<Loading/>:gate?<PageLock t={c.account} lock={c.account.pageLock} title={gate} section={active} slug={route.art?.slug||route.sub||""}/>:solving?<Suspense fallback={<Loading/>}><Solve slug={ws} tab={active==="problems"?"q":"a"} s={c.problems.solve} articles={articles} Block={Block} Article={Article} prep={knownFigs} Lab={Lab}/></Suspense>:route.art?<ArticlePage s={route.art}/>:active==="lab"?<Suspense fallback={<Loading label="Loading the Lab"/>}><Lab challenge={route.sub}/></Suspense>:active==="privacy"?<Policy p={c.privacy}/>:active==="terms"?<Policy p={c.terms}/>:active?<Section id={active}/>:<Home/>}</main></div></div>}

// Content comes from the API: site copy (with the example system) and article summaries, then render.
// Storage can be blocked (private modes, site settings): every read and write is optional (QA M1).
const lsGet=k=>{try{return localStorage.getItem(k)}catch{return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
const root=createRoot(document.getElementById("root"));
function boot(){root.render(<Loading/>);Promise.all([getJSON("/v1/site"),getJSON("/v1/articles")]).then(([site,list])=>{c=site;d=site.dashboard;
// Problems (site.json "problems") is a tab only this build knows how to draw, so it is added here,
// after Interview Questions, instead of in dashboard.sections (an older build would show it empty).
if(c.problems&&!d.sections.some(s=>s[0]==="problems")){const i=d.sections.findIndex(s=>s[0]==="interview-questions");d.sections.splice(i<0?d.sections.length:i+1,0,["problems",c.problems.label,null])}
ids=d.sections.map(s=>s[0]);example=site.example;articles=list.articles;root.render(<React.StrictMode><Boundary><Dashboard/></Boundary></React.StrictMode>);if(c.account){wireSync();startAccount()}}).catch(()=>root.render(<LoadError retry={boot}/>))}
boot();

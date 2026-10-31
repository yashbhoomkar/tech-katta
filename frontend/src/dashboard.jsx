import React,{useEffect,useRef,useState}from"react";import{createRoot}from"react-dom/client";import{createPortal}from"react-dom";import{chunks,spoken}from"./speech.js";import{getJSON}from"./api.js";import{Loading,LoadError}from"./status.jsx";import"./dashboard.css";

// Line icons drawn on a 20×20 grid (stand-ins for the Stitch mock's Material Symbols).
const ICON={concepts:"M3 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H3zM17 4.5h-5.5A1.5 1.5 0 0 0 10 6v10a1.5 1.5 0 0 1 1.5-1.5H17z",components:"M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z","interview-questions":"M5 3.5h10v13H5zM7.5 7h5M7.5 10h5M7.5 13h3","quick-notes":"M4 5h9M4 9h7M4 13h4M15.5 8.5l2 2-6 6H9.5v-2z",menu:"M3 5h14M3 10h14M3 15h14",collapse:"M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",close:"M5 5l10 10M15 5L5 15",back:"M12 5l-5 5 5 5"};
const Icon=({name})=><svg className="ico" viewBox="0 0 20 20" aria-hidden="true"><path d={ICON[name]}/></svg>;
// Filled from the API at boot (see bottom): site copy, dashboard chrome, article summaries, example system.
let c,d,ids,articles,example;
// Hash routes: #<section> lists a section, #<section>/<slug> opens an article.
const fromHash=()=>{let h;try{h=decodeURIComponent(location.hash.slice(1))}catch{h=""}const[sec,slug]=h.split("/");if(!ids.includes(sec))return{sec:ids[0]};return{sec,art:articles.find(a=>a.section===sec&&a.slug===slug)}};
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
const LOOP="8s";
const Dot=({x1,x2,y,y2=y,t0,t1,dur=LOOP})=><circle cx={x1} cy={y} r="4" fill="#2855d9" opacity="0"><animate attributeName="cx" values={`${x1};${x1};${x2};${x2}`} keyTimes={`0;${t0};${t1};1`} dur={dur} repeatCount="indefinite"/>{y2!==y&&<animate attributeName="cy" values={`${y};${y};${y2};${y2}`} keyTimes={`0;${t0};${t1};1`} dur={dur} repeatCount="indefinite"/>}<animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/></circle>;
const Box=({x,y,w=124,t,blue})=><g><rect x={x} y={y-17} width={w} height="34" fill={blue?"#f8faff":"#fff"} stroke={blue?"#2855d9":"#9aa5b4"}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;
const Arr=({x1,x2,y,t,dash,ty,m="ah"})=><g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#1c2733" strokeDasharray={dash?"4 3":undefined} markerEnd={`url(#${m})`}/>{t&&<text x={(x1+x2)/2} y={ty??y-6} textAnchor="middle" className="fl">{t}</text>}</g>;
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
const Glow=({x,y,w,h,t0,t1,dur})=><rect x={x-3} y={y-3} width={w+6} height={h+6} fill="none" stroke="#2855d9" strokeWidth="2" opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/></rect>;
const Show=({t0,t1,dur,children})=><g opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes={`0;${t0};${t1}`} calcMode="discrete" dur={dur} repeatCount="indefinite"/>{children}</g>;
const Mark=({m})=><defs><marker id={m} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#1c2733"/></marker></defs>;

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

const FIGS={patterns:{C:ApiFig,ar:640/372,title:n=>`FOUR WAYS TWO PROGRAMS TALK, IN ${n}`},choose:{C:ChooseFig,ar:640/470,title:()=>"CHOOSING AN API TYPE"},order:{C:OrderFig,ar:640/364,title:n=>`ONE ${n} ORDER, END TO END`},retry:{C:RetryFig,ar:640/300,title:()=>"A RETRY THAT DOES NOT CHARGE TWICE"}};
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
const[voice,setVoiceName]=useState(()=>localStorage.getItem("tk-voice")||"");const[state,setState]=useState("idle");const[cur,setCur]=useState(null);const[rate,setRate]=useState(1);
const run=useRef(0),idx=useRef(0),rateRef=useRef(1),voiceRef=useRef(null),el=useRef(null),next=useRef(null),usingRec=useRef(false);
const recOn=!!rec&&(voice===""||voice===REC||!voices.some(v=>v.name===voice));
voiceRef.current=recOn?null:voices.find(v=>v.name===voice)||voices[0]||null;
const src=i=>{const c=rec?.chunks?.[i];return recOn&&c&&c.text===q[i]?.text?`/audio/${a.slug}/${c.file}`:null};
const halt=()=>{run.current++;if(canSpeak)speechSynthesis.cancel();if(el.current){el.current.onended=el.current.onerror=null;el.current.pause()}};
const play=from=>{halt();const id=run.current;
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
setVoice:n=>{localStorage.setItem("tk-voice",n);setVoiceName(n);restart()}}}
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
function Fig({id,n,cap,still,rd}){const[full,setFull]=useState(false);const f=FIGS[id]||FIGS.patterns,C=f.C;const title=`FIG. ${String(n).padStart(2,"0")} — ${f.title(example.name.toUpperCase())}`;
return <figure className={"a-fig"+rd}><div className="a-fig-head">{title}</div><div className="a-fig-body"><C still={still}/></div>
<button type="button" className="fs-btn" onClick={()=>setFull(true)}>⤢ Tap to view full screen</button><figcaption>{inline(cap)}</figcaption>{full&&<FullFig title={title} ar={f.ar} onClose={()=>setFull(false)}><C still={still} uid="fs"/></FullFig>}</figure>}

// Share (phone share sheet where available, otherwise copy the link).
function Share({a}){const[msg,setMsg]=useState("");const url=location.href;const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),2500)};
const go=async()=>{if(navigator.share){try{await navigator.share({title:a.title,text:a.dek,url});return}catch(e){if(e?.name==="AbortError")return}}
try{await navigator.clipboard.writeText(url);flash("Link copied")}catch{flash("Couldn't copy the link")}};
return <button type="button" className="r-btn share" onClick={go} aria-live="polite">{msg||"↗ Share"}</button>}

function Block({b,i,rd,still,fn}){const k=i;const cls=x=>x+(rd?rd(k):"");
switch(b.t){
case"h2":return <h2 className={cls("")}>{b.x}</h2>;
case"p":return <p className={cls("")}>{inline(b.x)}</p>;
case"list":return <ul className={cls("")}>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul>;
case"tldr":return <aside className={cls("a-tldr")} aria-label="In 30 seconds"><b>IN 30 SECONDS</b><ul>{b.items.map(x=><li key={x}>{inline(x)}</li>)}</ul></aside>;
case"example":return <aside className={cls("a-example")} aria-label="Example system"><div className="a-ex-head"><b>EXAMPLE SYSTEM</b><span>{example.name}</span><small>{example.kind}</small></div><p>{example.text}</p><dl>{example.parts.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></aside>;
case"type":return <section className={cls("a-type")}><h3>{b.name}<small>{b.kind}</small></h3><p className="a-what">{inline(b.what)}</p><dl><dt>Use it for</dt><dd>{inline(b.use)}</dd><dt>Avoid it for</dt><dd>{inline(b.avoid)}</dd><dt className="ex">In {example.name}</dt><dd className="ex">{inline(b.ex)}</dd></dl>{b.more&&<details className="a-more"><summary>How it works and what it costs</summary>{b.more.map(x=><p key={x}>{inline(x)}</p>)}</details>}</section>;
case"code":return <figure className={cls("a-code")}><figcaption>{b.label}</figcaption><pre tabIndex="0" aria-label={b.say}><code>{b.x}</code></pre></figure>;
case"fig":return <Fig id={b.id} n={fn?.[k]??1} cap={b.cap} still={still} rd={rd?rd(k):""}/>;
case"table":return <div className={cls("a-table")} role="region" aria-label="API types compared" tabIndex="0"><table role="table"><thead role="rowgroup"><tr role="row">{b.head.map(h=><th key={h} scope="col" role="columnheader">{h}</th>)}</tr></thead><tbody role="rowgroup">{b.rows.map(r=><tr key={r[0]} role="row"><th scope="row" role="rowheader">{r[0]}</th>{r.slice(1).map((x,j)=><td key={j} role="cell" data-label={b.head[j+1]}>{x}</td>)}</tr>)}</tbody></table></div>;
case"more":return <details className="a-more a-deeper"><summary><small>GO DEEPER</small>{b.label}</summary>{b.body.map((x,j)=><Block key={j} b={x} i={`${k}.${j}`} still={still}/>)}</details>;
default:return null}}

function Article({a}){const label=d.sections.find(s=>s[0]===a.section)[1];const still=useStill();const r=useReader(a);const rd=k=>r.cur===k?" reading":"";
useEffect(()=>{if(r.cur==null)return;const el=document.querySelector(".d-article .reading");el?.scrollIntoView({block:"nearest",behavior:still?"auto":"smooth"})},[r.cur]);
const fn={};a.body.reduce((n,b,i)=>b.t==="fig"?(fn[i]=n+1):n,0);
const main=Math.max(1,Math.round(words(a)/220)),all=Math.max(main,Math.round((words(a)+extraWords(a))/220));
return <article className="d-panel d-article" aria-labelledby="d-title">
<nav className="crumbs" aria-label="Breadcrumb"><a href={`#${a.section}`}>{label}</a><span aria-hidden="true">/</span><span>{a.no}</span></nav>
<label>{a.tag}</label><h1 id="d-title">{a.title}</h1><p className={"d-dek"+rd("head")}>{a.dek}</p><Reader r={r}/><div className="d-meta"><span>{a.date} · {main} MIN READ{all>main?` · ${all} WITH DETAILS`:""}</span><Share a={a}/></div>
{a.body.map((b,i)=><Block key={i} b={b} i={i} rd={rd} still={still} fn={fn}/>)}
<a className="a-back" href={`#${a.section}`}>← All {label.toLowerCase()}</a></article>}

// Article bodies are fetched when opened; the summaries list came with the dashboard.
function ArticlePage({s}){const[st,set]=useState({});const load=()=>{set({});getJSON(`/v1/articles/${s.slug}`).then(a=>set({a}),e=>set({err:e.status===404?"missing":"failed"}))};useEffect(load,[s.slug]);
return st.a?<Article a={st.a}/>:st.err?<section className="d-panel">{st.err==="missing"?<p className="d-desc">This article is no longer available. <a href={`#${s.section}`}>Back to {s.section}</a></p>:<LoadError what="this article" retry={load}/>}</section>:<section className="d-panel"><Loading label={s.title}/></section>}

function Section({id}){const[,label,card]=d.sections.find(s=>s[0]===id);const t=c.topics.cards.find(x=>x.id===card);
return <section className="d-panel" aria-labelledby="d-title"><label>{t?t.no:c.notes.eyebrow}</label><h1 id="d-title">{label}</h1><p className="d-desc">{t?t.desc:c.notes.desc}</p>
{id==="quick-notes"?<ol className="d-notes">{c.notes.items.map(([n,title,tag,status])=><li key={n}><span className="d-no">{n}</span><b>{title}</b><span className="d-tag">{tag}</span><em className={status==="DRAFT"?"draft":""}>{status}</em></li>)}</ol>
:<List id={id}/>}</section>}
function List({id}){const list=articles.filter(a=>a.section===id);return list.length?<div className="d-list"><span>{list.length} {list.length>1?"PAGES":"PAGE"}</span><ol>{list.map(a=><li key={a.slug}><a href={`#${id}/${a.slug}`}><small>{a.no}</small><b>{a.title}</b><p>{a.dek}</p><em>Read →</em></a></li>)}</ol></div>
:<div className="d-empty"><span>0 PAGES</span><p>{d.empty}</p></div>}

function Dashboard(){const[route,setRoute]=useState(fromHash);const active=route.sec;const[collapsed,setCollapsed]=useState(()=>localStorage.getItem("tk-sidebar")==="collapsed");const[open,setOpen]=useState(false);const menuBtn=useRef(null);const drawer=useRef(null);
useEffect(()=>{const f=()=>{setRoute(fromHash());setOpen(false);scrollTo(0,0)};addEventListener("hashchange",f);return()=>removeEventListener("hashchange",f)},[]);
useEffect(()=>{localStorage.setItem("tk-sidebar",collapsed?"collapsed":"open")},[collapsed]);
useEffect(()=>{if(!open)return;const r=requestAnimationFrame(()=>drawer.current?.querySelector(".side-nav a")?.focus());const k=e=>{if(e.key==="Escape"){setOpen(false);menuBtn.current?.focus()}};addEventListener("keydown",k);return()=>{cancelAnimationFrame(r);removeEventListener("keydown",k)}},[open]);
useEffect(()=>{const s=d.sections.find(s=>s[0]===active);document.title=route.art?`${route.art.title} | Tech Katta`:`${s[1]} · Dashboard | Tech Katta`},[route]);
const links=cls=>d.sections.map(([id,label])=>{const subs=cls==="side-link"&&id===active?articles.filter(a=>a.section===id):[];return <React.Fragment key={id}><a href={`#${id}`} className={cls+(id===active?" active":"")} aria-current={id===active&&!route.art?"page":undefined} title={collapsed?label:undefined}>{cls==="side-link"&&<Icon name={id}/>}<span>{label}</span></a>
{subs.length>0&&<div className="side-sub">{subs.map(a=><a key={a.slug} href={`#${id}/${a.slug}`} className={route.art===a?"active":""} aria-current={route.art===a?"page":undefined}>{a.title.split(":")[0]}</a>)}</div>}</React.Fragment>});
return <div className={"dash"+(collapsed?" collapsed":"")+(open?" open":"")}>
<aside className="side" id="sidebar" ref={drawer} aria-label="Dashboard"><div className="side-head"><a className="side-brand" href="/" aria-label="Tech Katta home"><b>TK</b><span>{c.brand.name}</span></a><button type="button" className="icon-btn desk" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} aria-controls="sidebar" onClick={()=>setCollapsed(v=>!v)}><Icon name="collapse"/></button><button type="button" className="icon-btn mob" aria-label="Close menu" onClick={()=>{setOpen(false);menuBtn.current?.focus()}}><Icon name="close"/></button></div>
<div className="side-label">{d.label}</div><nav className="side-nav">{links("side-link")}</nav>
<a className="side-foot" href="/"><Icon name="back"/><span>{d.back}</span></a></aside>
{open&&<div className="scrim" onClick={()=>setOpen(false)}/>}
<div className="d-main"><header className="d-head"><button type="button" ref={menuBtn} className="icon-btn mob" aria-label="Open menu" aria-expanded={open} aria-controls="sidebar" onClick={()=>setOpen(true)}><Icon name="menu"/></button><nav className="tabs" aria-label="Sections">{links("tab")}</nav><a className="d-home" href="/">tech.katta.cc</a></header>
<main className="d-body">{route.art?<ArticlePage s={route.art}/>:<Section id={active}/>}</main></div></div>}

// Content comes from the API: site copy (with the example system) and article summaries, then render.
const root=createRoot(document.getElementById("root"));
function boot(){root.render(<Loading/>);Promise.all([getJSON("/v1/site"),getJSON("/v1/articles")]).then(([site,list])=>{c=site;d=site.dashboard;ids=d.sections.map(s=>s[0]);example=site.example;articles=list.articles;root.render(<React.StrictMode><Dashboard/></React.StrictMode>)}).catch(()=>root.render(<LoadError retry={boot}/>))}
boot();

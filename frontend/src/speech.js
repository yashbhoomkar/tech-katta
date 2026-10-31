// Text an article is read aloud from, shared by the browser player (dashboard.jsx) and the
// recording script (tools/tts). The article is split into sentence-sized chunks (≤ ~220 chars;
// long utterances stall in Chrome); `key` is the body block index ("head" for title + dek) so the
// player can highlight the block being read. Recorded audio is matched to chunks by exact text.
import{example}from"./articles.js";

// Spoken forms for things a voice tends to misread.
const SAY=[[/\bgRPC-Web\b/g,"g R P C Web"],[/\bgRPC\b/g,"g R P C"],[/\bGraphQL\b/g,"Graph Q L"],[/\bJSON-RPC\b/g,"Jason R P C"],[/\bJSON\b/g,"Jason"],[/\bJWTs\b/g,"J W Ts"],[/\bSSE\b/g,"S S E"],[/\bWSDL\b/g,"W S D L"],[/\bHTTP\/2\b/g,"HTTP 2"],[/\bHTTP\/1\.1\b/g,"HTTP 1.1"],[/\bN\+1\b/g,"N plus 1"],[/\.proto\b/g,"dot proto"],[/\{(\w+)\}/g,"$1"],[/\?(\w+)=(?=[^\w]|$)/g," $1"],[/\b([1-5])xx\b/g,"$1-hundreds"],[/\?(\w+)=(\w+)/g," $1 equals $2"],[/(^|[\s(])\/([\w/.:-]*)/g,(m,p,path)=>p+"slash "+path.split("/").filter(Boolean).join(" slash ")+(path.endsWith("/")?" slash":"")],[/→/g," to "],[/←/g,""],[/\s*·\s*/g,", "]];
export const speakable=x=>SAY.reduce((s,[re,to])=>s.replace(re,to),(x||"").replace(/`/g,"")).replace(/\s+/g," ").trim();

export function chunks(a){const out=[];const add=(key,text)=>{const s=speakable(text).match(/[^.!?]+[.!?]+["”)]?\s*|[^.!?]+$/g)||[];let buf="";for(const x of s){if((buf+x).length>220&&buf){out.push({key,text:buf.trim()});buf=""}buf+=x}if(buf.trim())out.push({key,text:buf.trim()})};
add("head",`${a.title}. ${a.dek}`);a.body.forEach((b,i)=>add(i,b.t==="p"||b.t==="h2"?b.x:b.t==="list"?b.items.join(" "):b.t==="example"?`The example system: ${example.name}, a food delivery app. ${example.text} ${example.parts.map(p=>`${p[0]}: ${p[1]}.`).join(" ")}`:b.t==="type"?`${b.name}. ${b.how} Use it for: ${b.use} What it costs: ${b.cost} In ${example.name}: ${b.ex}`:b.t==="code"?b.say:b.t==="fig"?`Figure 1. ${b.cap}`:b.t==="table"?`Comparison table. ${b.rows.map(r=>`${r[0]}: who starts, ${r[1]}; format, ${r[2]}; from a browser, ${r[3]}; typical use, ${r[4]}.`).join(" ")}`:""));return out}

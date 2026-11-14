// A design as a file to keep or paste elsewhere (spec 33 part 2): Mermaid text (for docs, READMEs, notes) and a
// standalone SVG drawn the way the canvas draws it (lab/drawing.js), with the current theme's colours written in, so
// it opens anywhere. Pure functions over a stored design {nodes, edges} and the catalogue; no React Flow.
import{ICON,TINT,SX,SY,box,layout}from"./drawing.js";import{protocolOf,DASH}from"./protocols.js";import{TOKENS}from"../theme/palette.js";

const nameOf=(n,cat)=>n.name||cat[n.type]?.name||n.type;
const kindOf=(n,cat)=>n.name?cat[n.type]?.name||n.type:cat[n.type]?.group||"";
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

// Mermaid flowchart, left to right: one node per component ("Name / kind"), one arrow per arrow with its protocol
// (or label); message arrows dashed. Ids are made safe for Mermaid (letters, digits, underscore).
export function toMermaid(design,cat){const ids=new Map();const id=x=>{if(!ids.has(x))ids.set(x,"n"+ids.size+"_"+String(x).replace(/[^A-Za-z0-9_]/g,"").slice(0,20));return ids.get(x)};
const q=s=>String(s).replace(/"/g,"'").replace(/[\[\]{}|<>]/g," ");
const kind=Object.fromEntries((design.nodes||[]).map(n=>[n.id,n.type]));
const lines=["flowchart LR",...(design.nodes||[]).map(n=>`  ${id(n.id)}["${q(nameOf(n,cat))}<br/><small>${q(kindOf(n,cat))}</small>"]`)];
for(const e of design.edges||[]){if(!(e.from in kind)||!(e.to in kind))continue;const p=protocolOf(e,kind[e.from],kind[e.to]),t=q(e.label||p.name);
  lines.push(`  ${id(e.from)} ${p.dash==="solid"?"-->":"-.->"}|${t}| ${id(e.to)}`)}
return lines.join("\n")+"\n"}

// The current theme's colours, read from the page (tokens.css); fallbacks are the light theme's.
export function themeColours(el=typeof document!=="undefined"?document.documentElement:null){const T=TOKENS,d={bg:T.bg,page:T.page,ink:T.ink,"ink-2":T["ink-2"],"ink-3":T["ink-3"],muted:T.muted,line:T.line,teal:T["cat-teal"],green:T["cat-green"],pink:T["cat-pink"],violet:T["cat-violet"],amber:T["cat-amber"]};
if(!el||typeof getComputedStyle!=="function")return d;const cs=getComputedStyle(el),g=(k,v)=>cs.getPropertyValue(v).trim()||d[k];
return{bg:g("bg","--bg"),page:g("page","--page"),ink:g("ink","--ink"),"ink-2":g("ink-2","--ink-2"),"ink-3":g("ink-3","--ink-3"),muted:g("muted","--muted"),line:g("line","--line"),
 teal:g("teal","--cat-teal"),green:g("green","--cat-green"),pink:g("pink","--cat-pink"),violet:g("violet","--cat-violet"),amber:g("amber","--cat-amber")}}

// Standalone SVG: cards (200 × 74), curved arrows round cards with protocol pills, colours written in.
export function toSvg(design,cat,c=themeColours(),{title="Design"}={}){const NW=200,NH=74,PAD=30;const nodes=design.nodes||[];if(!nodes.length)return"";
const at=Object.fromEntries(nodes.map(n=>[n.id,box((n.x||0)*SX,(n.y||0)*SY,NW,NH)])),kind=Object.fromEntries(nodes.map(n=>[n.id,n.type]));
const list=(design.edges||[]).filter(e=>at[e.from]&&at[e.to]).map((e,k)=>{const p=protocolOf(e,kind[e.from],kind[e.to]);return{id:String(k),from:e.from,to:e.to,p,text:e.label||p.name}});
const geo=layout(at,list),col=p=>p.color==="ink"?c["ink-3"]:c[p.color];
const pts=list.flatMap(a=>geo[a.id]?geo[a.id].path.match(/-?[\d.]+/g).map(Number):[]);
const xs=[...Object.values(at).flatMap(b=>[b.x,b.x+b.w]),...pts.filter((_,i)=>i%2===0),...list.flatMap(a=>geo[a.id]?[geo[a.id].lx-60,geo[a.id].lx+60]:[])];
const ys=[...Object.values(at).flatMap(b=>[b.y,b.y+b.h]),...pts.filter((_,i)=>i%2===1)];
const x0=Math.min(...xs)-PAD,y0=Math.min(...ys)-PAD,W=Math.max(...xs)+PAD-x0,H=Math.max(...ys)+PAD-y0;
const font=`font-family="Instrument Sans, Helvetica, Arial, sans-serif"`;
const marks=[...new Set(list.map(a=>a.p.color))].map(k=>`<marker id="m-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="${col({color:k})}"/></marker>`).join("");
const edges=list.filter(a=>geo[a.id]).map(a=>`<path d="${geo[a.id].path}" fill="none" stroke="${col(a.p)}" stroke-width="1.6" stroke-linecap="round"${DASH[a.p.dash]?` stroke-dasharray="${DASH[a.p.dash]}"`:""} marker-end="url(#m-${a.p.color})"/>`).join("");
const cards=nodes.map(n=>{const b=at[n.id],t=c[TINT[n.type]]||c.teal,cut=(s,k)=>s.length>k?s.slice(0,k-1)+"…":s;
 return`<g transform="translate(${b.x},${b.y})"><rect width="${NW}" height="${NH}" rx="12" fill="${c.bg}" stroke="${t}" stroke-opacity=".45"/><rect x="12" y="12" width="32" height="32" rx="9" fill="${t}" fill-opacity=".13"/><path d="${ICON[n.type]||ICON.server}" transform="translate(19.5 19.5) scale(.85)" fill="none" stroke="${t}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="54" y="26" ${font} font-size="13" font-weight="600" fill="${c.ink}">${esc(cut(nameOf(n,cat),22))}</text><text x="54" y="41" ${font} font-size="11" fill="${c.muted}">${esc(cut(kindOf(n,cat),28))}</text></g>`}).join("");
const pills=list.filter(a=>geo[a.id]).map(a=>{const w=a.text.length*6+24,{lx,ly}=geo[a.id];return`<g transform="translate(${lx-w/2},${ly-9})"><rect width="${w}" height="18" rx="9" fill="${c.bg}" stroke="${c.line}"/><circle cx="10" cy="9" r="3" fill="${col(a.p)}"/><text x="17" y="12.5" ${font} font-size="10.5" font-weight="600" fill="${c["ink-2"]}">${esc(a.text)}</text></g>`}).join("");
return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${W} ${H}" width="${Math.round(W)}" height="${Math.round(H)}"><title>${esc(title)}</title><defs>${marks}</defs><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${c.page}"/>${edges}${cards}${pills}</svg>`}

// Save a text as a file (the browser's download), and copy to the clipboard with a fallback answer.
export function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{return false}}
export const fileName=s=>(String(s||"design").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"design");

// The order to walk a design in: from the Clients (and other starts) along the arrows, breadth first; parts not
// reached come last in their stored order.
export function walkOrder(design){const nodes=design.nodes||[],out=new Map(nodes.map(n=>[n.id,[]])),inn=new Map(nodes.map(n=>[n.id,0]));
for(const e of design.edges||[])if(out.has(e.from)&&inn.has(e.to)){out.get(e.from).push(e.to);inn.set(e.to,inn.get(e.to)+1)}
const starts=nodes.filter(n=>n.type==="client").map(n=>n.id),rest=nodes.filter(n=>!inn.get(n.id)&&n.type!=="client").map(n=>n.id);
const seen=new Set(),order=[],q=[...starts,...rest];while(q.length){const id=q.shift();if(seen.has(id))continue;seen.add(id);order.push(id);q.push(...out.get(id))}
for(const n of nodes)if(!seen.has(n.id))order.push(n.id);return order}

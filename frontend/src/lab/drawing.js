// How the canvas (nodes.jsx) and the Solution tab (SolutionDesign.jsx) draw a design, with nothing from React Flow:
// the components' icons and tile colours, the spacing, and the arrows' geometry. Sides are "top", "right",
// "bottom" and "left" (React Flow's Position values). A box is {x, y, w, h, cx, cy}.
export const ICON={cdn:"M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM2.5 10h15M10 2.5c2 2 3 4.5 3 7.5s-1 5.5-3 7.5M10 2.5c-2 2-3 4.5-3 7.5s1 5.5 3 7.5",client:"M4 5h12v8H4zM8 16h4M10 13v3",apigw:"M3 10h4M13 10h4M7 6h6v8H7zM10 6V3M10 17v-3",server:"M4 4h12v5H4zM4 11h12v5H4zM7 6.5h1M7 13.5h1",lb:"M10 3v4M10 7l-6 6M10 7l6 6M10 7v6M2 13h4v4H2zM8 13h4v4H8zM14 13h4v4h-4z",cache:"M11 2L4 11h5l-1 7 7-9h-5z",queue:"M2 7h16v6H2zM6 7v6M10 7v6M14 7v6",external:"M3 10h9M9 6l4 4-4 4M14 4h3v12h-3",realtime:"M4 10a6 6 0 0 1 12 0M7 10a3 3 0 0 1 6 0M10 10v7M7 17h6",stream:"M2 6h16M2 10h16M2 14h16M15 4l3 2-3 2",pubsub:"M10 4v4M10 8l-6 6M10 8l6 6M10 8v6M3 14h2v2H3zM9 14h2v2H9zM15 14h2v2h-2z",scheduler:"M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l3 2",processor:"M2 6h6M2 10h6M2 14h6M8 4h6v12H8zM14 10h4",coord:"M10 3l6 3.5v7L10 17l-6-3.5v-7zM10 3v14M4 6.5l12 7M16 6.5l-12 7",database:"M4 5c0-1.4 2.7-2.5 6-2.5s6 1.1 6 2.5v10c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5zM4 5c0 1.4 2.7 2.5 6 2.5S16 6.4 16 5M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"};
// The colour of a component's icon tile (a category token, light and dark in tokens.css).
export const TINT={client:"violet",cdn:"teal",apigw:"pink",lb:"violet",external:"amber",server:"teal",realtime:"violet",scheduler:"amber",processor:"teal",database:"green",cache:"amber",coord:"green",queue:"pink",stream:"pink",pubsub:"pink"};
// The canvas draws a design further apart than it is stored (SX across, SY down): designs were laid out for the
// old 176 px boxes (240 px steps), and the 200 px cards need room between them for the arrows' protocol pills.
// Stored positions and the judge are unchanged; the canvas divides back when it saves (shared.jsx fromFlow).
export const SX=1.35,SY=1.25;
export const box=(x,y,w,h)=>({x,y,w,h,cx:x+w/2,cy:y+h/2});

const at=(b,p,off)=>p==="right"?[b.x+b.w,b.cy+off]:p==="left"?[b.x,b.cy+off]:p==="top"?[b.cx+off,b.y]:[b.cx+off,b.y+b.h];
// Where an arrow starts and ends: the middle of the sides of the two cards that face each other. `off` moves both
// ends sideways, so an arrow and the one coming back are two lines, not one.
export function ends(a,b,off=0){const dx=b.cx-a.cx,dy=b.cy-a.cy;
const across=Math.abs(dx)/((a.w+b.w)/2)>=Math.abs(dy)/((a.h+b.h)/2);
const[sp,tp]=across?(dx>=0?["right","left"]:["left","right"]):(dy>=0?["bottom","top"]:["top","bottom"]);
const[sx,sy]=at(a,sp,off),[tx,ty]=at(b,tp,off);return{sourceX:sx,sourceY:sy,sourcePosition:sp,targetX:tx,targetY:ty,targetPosition:tp}}
// A control point the way React Flow's bezier edges place them (curvature .25).
const pull=d=>d>=0?.5*d:.25*25*Math.sqrt(-d);
const ctrl=(p,x1,y1,x2,y2)=>p==="left"?[x1-pull(x1-x2),y1]:p==="right"?[x1+pull(x2-x1),y1]:p==="top"?[x1,y1-pull(y1-y2)]:[x1,y1+pull(y2-y1)];
const mid=(a,b,c,d)=>.125*a+.375*b+.375*c+.125*d;
// The cubic of an arrow: its two ends (sides sp, tp, moved along them by os, ot) and, for a detour, the line it
// bends out to.
function cubic(a,b,sp,tp,os,ot,bend){const[sx,sy]=at(a,sp,os),[tx,ty]=at(b,tp,ot);
if(bend!=null)return sp==="top"||sp==="bottom"?[sx,sy,sx,bend,tx,bend,tx,ty]:[sx,sy,bend,sy,bend,ty,tx,ty];
const[c1x,c1y]=ctrl(sp,sx,sy,tx,ty),[c2x,c2y]=ctrl(tp,tx,ty,sx,sy);return[sx,sy,c1x,c1y,c2x,c2y,tx,ty]}
const point=(c,t)=>{const u=1-t;return[u*u*u*c[0]+3*u*u*t*c[2]+3*u*t*t*c[4]+t*t*t*c[6],u*u*u*c[1]+3*u*u*t*c[3]+3*u*t*t*c[5]+t*t*t*c[7]]};
const pathOf=c=>`M${c[0]},${c[1]} C${c[2]},${c[3]} ${c[4]},${c[5]} ${c[6]},${c[7]}`;
// An arrow's path between two boxes, and the point halfway along it (for a single arrow; layout() does a design).
export function route(a,b,way,off=0){const g=ends(a,b);
const c=way?cubic(a,b,way.side,way.side,off,off,way.at):cubic(a,b,g.sourcePosition,g.targetPosition,off,off);const[lx,ly]=point(c,.5);return[pathOf(c),lx,ly]}

// A whole design's arrows at once (the canvas and the Solution tab): `cards` maps id → box, `arrows` is
// [{id, from, to, text}] (text: the pill's words). For each arrow:
//  1. the route: the direct curve, or an arc over, under, left or right of every card in its span; the curve that
//     crosses fewest other cards wins, then the shortest (each curve is sampled, so a bend that clips a card counts);
//  2. the ports: arrows that meet a card on the same side are spread along it, in the order of where they go, so
//     they leave and arrive side by side instead of from one point;
//  3. the pill: halfway along, or slid along the arrow until it is clear of the cards and of the pills placed so far.
// Returns id → {path, lx, ly}.
const PAD=6,SAMPLES=24,PILL_H=18,pillW=t=>t.length*6.4+30;
const inBox=(x,y,o,pad)=>x>o.x-pad&&x<o.x+o.w+pad&&y>o.y-pad&&y<o.y+o.h+pad;
const overlap=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
export function layout(cards,arrows){const all=Object.entries(cards).map(([id,b])=>({id,...b})),out={};
const live=arrows.filter(e=>cards[e.from]&&cards[e.to]&&e.from!==e.to);
// 1. routes
const SIDES=["top","right","bottom","left"];
const plan=live.map(e=>{const a=cards[e.from],b=cards[e.to],others=all.filter(o=>o.id!==e.from&&o.id!==e.to),g=ends(a,b);
 const opts=[{sp:g.sourcePosition,tp:g.targetPosition,first:true}];
 for(const sp of SIDES)for(const tp of SIDES)if(sp!==g.sourcePosition||tp!==g.targetPosition)opts.push({sp,tp});
 // detours: bend lines just past the two cards, then past each card in the way, nearest first (at most 4 a side)
 const x0=Math.min(a.x,b.x),x1=Math.max(a.x+a.w,b.x+b.w),y0=Math.min(a.y,b.y),y1=Math.max(a.y+a.h,b.y+b.h);
 const inX=others.filter(o=>o.x<x1&&o.x+o.w>x0),inY=others.filter(o=>o.y<y1&&o.y+o.h>y0);
 const levels=(base,more,dir)=>[base,...more.filter(v=>dir<0?v<base:v>base).sort((u,v)=>dir*(u-v))].slice(0,4);
 for(const v of levels(y0-36,inX.map(o=>o.y-36),-1))opts.push({sp:"top",tp:"top",bend:v});
 for(const v of levels(y1+36,inX.map(o=>o.y+o.h+36),1))opts.push({sp:"bottom",tp:"bottom",bend:v});
 for(const v of levels(x0-36,inY.map(o=>o.x-36),-1))opts.push({sp:"left",tp:"left",bend:v});
 for(const v of levels(x1+36,inY.map(o=>o.x+o.w+36),1))opts.push({sp:"right",tp:"right",bend:v});
 let best=null;for(const o of opts){const c=cubic(a,b,o.sp,o.tp,0,0,o.bend);let hits=0,len=0,prev=point(c,0);const hit=new Set();
  for(let i=1;i<=SAMPLES;i++){const t=i/SAMPLES,q=point(c,t);len+=Math.hypot(q[0]-prev[0],q[1]-prev[1]);prev=q;
   for(const k of others)if(!hit.has(k.id)&&inBox(q[0],q[1],k,PAD)){hit.add(k.id);hits++}
   // never back through its own two cards (away from where it leaves and arrives)
   if(t>.12&&t<.88&&(inBox(q[0],q[1],a,-3)||inBox(q[0],q[1],b,-3)))hits+=.5}
  // the facing sides are preferred: another pair of sides only wins if it is clearly better
  const score=hits*1e6+len*(o.first?1:1.15)+(o.bend!=null?20:0);if(!best||score<best.score)best={...o,score}}
 return{e,a,b,...best}});
// 2. ports: per card side, the arrows that meet it, ordered by the far end's position along that side
const ports=new Map(),add=(id,side,far,key)=>{const k=id+"|"+side;if(!ports.has(k))ports.set(k,[]);ports.get(k).push({far,key})};
for(const p of plan){const along=s=>s==="top"||s==="bottom"?"cx":"cy";add(p.e.from,p.sp,p.b[along(p.sp)],p.e.id+"|s");add(p.e.to,p.tp,p.a[along(p.tp)],p.e.id+"|t")}
const off={};for(const[k,list]of ports){const[id,side]=k.split("|"),c=cards[id],len=side==="top"||side==="bottom"?c.w:c.h;
 list.sort((x,y)=>x.far-y.far);const n=list.length,gap=Math.min(18,len*.7/Math.max(1,n-1));list.forEach((x,i)=>{off[x.key]=n>1?(i-(n-1)/2)*gap:0})}
// 3. paths and pills
const placed=[];
for(const p of plan){const c=cubic(p.a,p.b,p.sp,p.tp,off[p.e.id+"|s"],off[p.e.id+"|t"],p.bend),w=pillW(p.e.text||"");let pick=null;
 let fewest=Infinity;
 for(const t of[.5,.42,.58,.34,.66,.26,.74,.18,.82]){const[x,y]=point(c,t),r={x:x-w/2,y:y-PILL_H/2,w,h:PILL_H};
  const n=all.filter(o=>overlap(r,{x:o.x-2,y:o.y-2,w:o.w+4,h:o.h+4})).length*2+placed.filter(q=>overlap(r,q)).length;
  if(n<fewest){fewest=n;pick=r}if(!n)break}
 placed.push(pick);out[p.e.id]={path:pathOf(c),lx:pick.x+w/2,ly:pick.y+PILL_H/2}}
return out}

// Tidy up (context 36, step 2): a layered layout, no dependency. Each card's column is its longest path of arrows from a
// card nothing points at (the Clients first), so calls run left to right; inside a column, cards are ordered by where the
// cards that point at them sit (one barycentre pass), and each column is centred on the tallest. Arrows that close a loop
// are ignored for the columns. Returns id → {x, y} in canvas units; w and h are a card's size and the gaps between them.
export function tidy(cards,arrows,{w=200,h=96,gapX=110,gapY=56}={}){const ids=Object.keys(cards);if(!ids.length)return{};
 const out={};const inn=Object.fromEntries(ids.map(i=>[i,[]])),outs=Object.fromEntries(ids.map(i=>[i,[]]));
 for(const e of arrows)if(cards[e.from]&&cards[e.to]&&e.from!==e.to){outs[e.from].push(e.to);inn[e.to].push(e.from)}
 // depth-first order to find the arrows that close loops
 const state={},back=new Set(),order=[];const visit=v=>{state[v]=1;for(const t of outs[v]){if(state[t]===1)back.add(v+">"+t);else if(!state[t])visit(t)}state[v]=2;order.push(v)};
 const roots=ids.filter(i=>!inn[i].length).sort((a,b)=>(cards[a].kind==="client"?-1:0)-(cards[b].kind==="client"?-1:0)||cards[a].y-cards[b].y);
 for(const r of roots)if(!state[r])visit(r);for(const i of ids)if(!state[i])visit(i);
 const rank={};for(const v of order.reverse()){rank[v]=Math.max(0,...inn[v].filter(s=>!back.has(s+">"+v)).map(s=>(rank[s]??-1)+1))}
 const cols=[];for(const i of ids)(cols[rank[i]]||(cols[rank[i]]=[])).push(i);
 const pos={};cols.forEach((col,c)=>{if(!col)return;col.sort((a,b)=>{const m=v=>{const p=inn[v].filter(s=>pos[s]!=null);return p.length?p.reduce((t,s)=>t+pos[s],0)/p.length:cards[v].y/1000};return m(a)-m(b)});col.forEach((v,k)=>{pos[v]=k})});
 const tallest=Math.max(...cols.filter(Boolean).map(c=>c.length));
 cols.forEach((col,c)=>{if(!col)return;const top=(tallest-col.length)*(h+gapY)/2;col.forEach((v,k)=>{out[v]={x:Math.round(c*(w+gapX)/20)*20,y:Math.round((top+k*(h+gapY))/20)*20}})});
 return out}

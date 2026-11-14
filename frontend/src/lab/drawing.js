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
// An arrow whose straight run would cross other cards goes round them instead: over or under them (an arrow
// running across), or beside them (one running up or down), whichever way is shorter. `others` are the boxes
// of every other card; returns {side, at} (the line it bends out to) or null when nothing is in the way.
export function detour(a,b,others){const g=ends(a,b),across=g.sourcePosition==="left"||g.sourcePosition==="right";
const[u0,v0,u1,v1]=across?[g.sourceX,g.sourceY,g.targetX,g.targetY]:[g.sourceY,g.sourceX,g.targetY,g.targetX];
const lo=Math.min(u0,u1),hi=Math.max(u0,u1);if(hi-lo<1)return null;
const v=u=>v0+(v1-v0)*(u-u0)/(u1-u0);
const hit=others.filter(o=>{const[p0,p1,q0,q1]=across?[o.x,o.x+o.w,o.y,o.y+o.h]:[o.y,o.y+o.h,o.x,o.x+o.w];const s0=Math.max(lo,p0),s1=Math.min(hi,p1);if(s1<=s0)return false;
const va=v(s0),vb=v(s1);return Math.max(va,vb)>q0-8&&Math.min(va,vb)<q1+8});
if(!hit.length)return null;
const top=k=>across?k.y:k.x,bot=k=>across?k.y+k.h:k.x+k.w,all=[a,b,...hit];
const up=Math.min(...all.map(top))-40,down=Math.max(...all.map(bot))+40;
const goUp=Math.min(top(a),top(b))-up<=down-Math.max(bot(a),bot(b));
return{side:across?(goUp?"top":"bottom"):(goUp?"left":"right"),at:goUp?up:down}}
// A control point the way React Flow's bezier edges place them (curvature .25).
const pull=d=>d>=0?.5*d:.25*25*Math.sqrt(-d);
const ctrl=(p,x1,y1,x2,y2)=>p==="left"?[x1-pull(x1-x2),y1]:p==="right"?[x1+pull(x2-x1),y1]:p==="top"?[x1,y1-pull(y1-y2)]:[x1,y1+pull(y2-y1)];
const mid=(a,b,c,d)=>.125*a+.375*b+.375*c+.125*d;
// An arrow's path between two boxes, and the point halfway along it (where its pill goes): a curve between the
// facing sides, or, with a detour, out of the sides that face the detour line and bent out to it.
export function route(a,b,way,off=0){
if(way){const{side,at:d}=way,[sx,sy]=at(a,side,off),[tx,ty]=at(b,side,off);
if(side==="top"||side==="bottom")return[`M${sx},${sy} C${sx},${d} ${tx},${d} ${tx},${ty}`,(sx+tx)/2,mid(sy,d,d,ty)];
return[`M${sx},${sy} C${d},${sy} ${d},${ty} ${tx},${ty}`,mid(sx,d,d,tx),(sy+ty)/2]}
const g=ends(a,b,off),[c1x,c1y]=ctrl(g.sourcePosition,g.sourceX,g.sourceY,g.targetX,g.targetY),[c2x,c2y]=ctrl(g.targetPosition,g.targetX,g.targetY,g.sourceX,g.sourceY);
return[`M${g.sourceX},${g.sourceY} C${c1x},${c1y} ${c2x},${c2y} ${g.targetX},${g.targetY}`,mid(g.sourceX,c1x,c2x,g.targetX),mid(g.sourceY,c1y,c2y,g.targetY)]}

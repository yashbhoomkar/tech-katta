// Figures for the "Real-time updates" group in Concepts. Same conventions as sharding.jsx.
import React from"react";import{Show,Mk,Bx,Ar,Caps,Cap}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9",LB="#f8faff",LR="#fff5f4";
const T=({x,y,t,c,a,b})=><text x={x} y={y} textAnchor={a} className={b?"fb":"fl"} style={c?{fill:c}:undefined}>{t}</text>;
const Steps=({caps,g,D="14s",only=[]})=><g aria-hidden="true"><Caps caps={caps} D={D}/>{g.map((x,i)=>x&&<Show key={i} t0={i/4} t1={only.includes(i)?(i+1)/4:1} dur={D}>{x}</Show>)}</g>;
const Fig=({still,h,id,title,M,base,caps,g,only,last,c})=><svg viewBox={`0 0 640 ${h}`} role="img" aria-labelledby={id}><title id={id}>{title}</title>{M&&<Mk m={M}/>}{base}
{still?<g>{last}<Cap t={caps[3][0]} c={c??caps[3][1]}/></g>:<Steps caps={caps} g={g} only={only}/>}</svg>;

// Real-time in an interview: two hops.
function TwoHopsFig({still,uid=""}){const M=`rh${uid}`;
const cs=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={330} y={48+i*60} w={140} h={40} t={`connection server ${i+1}`} s={i===1?"holds Ravi's socket":"other users"} c={c} fill={fill}/>;
const base=<g>{[0,1,2].map(i=>cs(i))}</g>;
const s1=<g><Bx x={10} y={108} w={100} h={40} t="Asha" s="sends 'hi'"/><Ar x1={112} y1={128} x2={146} y2={128} m={M}/><Bx x={150} y={108} w={130} h={40} t="chat service" s="has the message"/></g>;
const s2=<g><Ar x1={282} y1={128} x2={326} y2={128} m={M} c={BLUE} w={2}/>{cs(1,BLUE,LB)}<T x={150} y={182} t="hop 2: from the source" c={BLUE} b/><T x={150} y={198} t="to the right server" c={BLUE}/></g>;
const s3=<g><Ar x1={472} y1={128} x2={526} y2={128} m={M} c={BLUE} w={3}/><Bx x={530} y={108} w={100} h={40} t="Ravi's phone" c={BLUE} fill={LB}/><T x={480} y={182} t="hop 1: down the" c={BLUE} b/><T x={480} y={198} t="open connection" c={BLUE}/></g>;
const s4=<g><T x={10} y={232} t="two separate choices: how to find the server, and what kind of connection to use" c={INK}/></g>;
const caps=[["1 · Asha sends Ravi a message; the chat service has it",INK],["2 · it must reach the one connection server holding Ravi's connection",BLUE],["3 · which pushes it down that open connection to his phone",BLUE],["4 · two hops, two separate design choices",INK]];
return <Fig still={still} h={242} id={`rht${uid}`} M={M} caps={caps} title="Two hops for a real-time update. Asha sends Ravi a message, which reaches the chat service. The first problem is getting it from that source to the one connection server, among several, that holds Ravi's open connection. The second is pushing it down that open connection to Ravi's phone. Each hop is a separate design choice."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// First hop: polling versus long polling.
function PollingFig({still,uid=""}){
const x=t=>80+t*26;
const axis=y=><g><line x1={x(0)} y1={y} x2={x(20)} y2={y} stroke={GREY}/>{[0,5,10,15,20].map(t=><T key={t} x={x(t)} y={y+16} t={`${t} s`} a="middle"/>)}</g>;
const base=<g><T x={10} y={70} t="polling" b/><T x={10} y={84} t="every 5 s"/><T x={10} y={160} t="long" b/><T x={10} y={174} t="polling"/>{axis(90)}{axis(180)}</g>;
const poll=(t,c,lab)=><g key={t+c}><line x1={x(t)} y1={60} x2={x(t)} y2={90} stroke={c} strokeWidth="2"/>{lab&&<T x={x(t)} y={54} t={lab} a="middle" c={c}/>}</g>;
const upd=y=><g><circle cx={x(6)} cy={y} r={6} fill={RED}/><T x={x(6)+10} y={y+4} t="update" c={RED}/></g>;
const s1=<g>{[0,5,15,20].map(t=>poll(t,GREY,"empty"))}{poll(10,GREY)}</g>;
const s2=<g>{upd(76)}{poll(10,BLUE,"delivered")}<rect x={x(6)} y={96} width={x(10)-x(6)} height={6} fill={RED}/><T x={x(8)} y={124} t="4 s late" a="middle" c={RED}/></g>;
const s3=<g><rect x={x(0)} y={150} width={x(6)-x(0)} height={14} fill={LB} stroke={BLUE}/><T x={x(3)} y={146} t="request held open" a="middle" c={BLUE}/><circle cx={x(6)} cy={157} r={6} fill={RED}/><line x1={x(6)} y1={150} x2={x(6)} y2={180} stroke={BLUE} strokeWidth="2"/><rect x={x(6)+4} y={150} width={x(20)-x(6)-4} height={14} fill={LB} stroke={BLUE} strokeDasharray="4 3"/><T x={x(13)} y={146} t="next request waits" a="middle" c={BLUE}/></g>;
const s4=<g><T x={10} y={222} t="long polling answers the moment the update exists; polling wastes requests and is up to one interval late" c={INK}/></g>;
const caps=[["1 · polling asks every 5 seconds; most answers are empty",INK],["2 · an update at 6 s waits for the poll at 10 s",RED],["3 · long polling keeps the request open and answers at once",BLUE],["4 · then the client opens the next waiting request",INK]];
return <Fig still={still} h={232} id={`rpt${uid}`} caps={caps} title="Polling versus long polling over 20 seconds. Polling every 5 seconds sends requests at 0, 5, 10, 15 and 20 seconds; most come back empty, and an update at 6 seconds is only delivered by the poll at 10, 4 seconds late. Long polling keeps a request open until the update arrives at 6 seconds, answers immediately, and the client opens the next waiting request."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Second hop: route by hashing the user.
function HashRouteFig({still,uid=""}){const M=`rr${uid}`;
const sv=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={300} y={44+i*50} w={140} h={36} t={`connection server ${i+1}`} c={c} fill={fill}/>;
const base=<g>{[0,1,2,3].map(i=>sv(i))}</g>;
const s1=<g><Bx x={500} y={144} w={130} h={36} t="Ravi's phone"/><Ar x1={498} y1={162} x2={444} y2={162} m={M} dash/><T x={630} y={132} t="connects to hash(ravi) → 3" a="end"/>{sv(2,BLUE,LB)}</g>;
const s2=<g><Bx x={10} y={144} w={150} h={36} t="chat service" s="message for Ravi"/><T x={10} y={132} t="hash(ravi) → server 3" c={BLUE}/><Ar x1={162} y1={162} x2={296} y2={162} m={M} c={BLUE} w={2}/></g>;
const s3=<g><Ar x1={442} y1={168} x2={498} y2={168} m={M} c={BLUE} w={3}/><T x={470} y={196} t="pushed" a="middle" c={BLUE}/></g>;
const s4=<g><T x={10} y={252} t="no lookup and no broadcast; when servers are added or removed, some users move and reconnect" c={INK}/></g>;
const caps=[["1 · Ravi's id hashes to server 3, so his phone connects there",BLUE],["2 · the chat service computes the same hash and sends the message to server 3",BLUE],["3 · server 3 pushes it down Ravi's connection",BLUE],["4 · simple routing; changing the set of servers moves some users",INK]];
return <Fig still={still} h={262} id={`rrt${uid}`} M={M} caps={caps} title="Routing by consistent hashing. Ravi's id hashes to connection server 3, so his phone connects there. The chat service computes the same hash for a message to Ravi and sends it straight to server 3, which pushes it down his connection. There is no lookup and no broadcast, but adding or removing servers moves some users, who reconnect."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Second hop: pub/sub channels.
function PubSubFig({still,uid=""}){const M=`ru${uid}`;
const sv=(i,sub,c=GREY,fill="#fff")=><Bx key={i+c+sub} x={460} y={44+i*70} w={170} h={44} t={`server ${i+1}`} s={sub} c={c} fill={fill}/>;
const SUB=["user:asha, user:dev","user:ravi, room:42","user:meera"];
const base=<g><rect x={220} y={84} width={170} height={96} fill="#fff" stroke={GREY}/><T x={230} y={102} t="pub/sub broker" b/>{["user:ravi","user:asha","room:42","user:meera"].map((t,i)=><T key={t} x={230} y={120+i*15} t={t}/>)}{[0,1,2].map(i=>sv(i,SUB[i]))}</g>;
const s1=<g>{[0,1,2].map(i=><Ar key={i} x1={458} y1={66+i*70} x2={394} y2={110+i*20} m={M} dash/>)}<T x={305} y={76} t="subscriptions" a="middle"/></g>;
const s2=<g><Bx x={10} y={110} w={150} h={44} t="chat service" s="publish user:ravi"/><Ar x1={162} y1={132} x2={216} y2={132} m={M} c={BLUE} w={2}/><rect x={226} y={109} width={70} height={15} fill="none" stroke={BLUE}/></g>;
const s3=<g><Ar x1={394} y1={124} x2={456} y2={136} m={M} c={BLUE} w={2}/>{sv(1,SUB[1],BLUE,LB)}</g>;
const s4=<g>{sv(2,"user:meera, user:ravi",BLUE,LB)}<T x={10} y={210} t="Ravi reconnects to server 3: server 3 subscribes to user:ravi," c={INK}/><T x={10} y={226} t="and the publisher never needs to know" c={INK}/></g>;
const caps=[["1 · each connection server subscribes to the channels of the users it holds",INK],["2 · the chat service publishes to user:ravi, without knowing where Ravi is",BLUE],["3 · the broker delivers it to the server that subscribed",BLUE],["4 · when Ravi reconnects elsewhere, the new server subscribes instead",INK]];
return <Fig still={still} h={236} id={`rut${uid}`} M={M} caps={caps} title="Routing by publish and subscribe. Each connection server subscribes, on the broker, to the channels of the users it holds: server 2 to user:ravi and room:42. The chat service publishes a message to user:ravi without knowing where Ravi is connected, and the broker delivers it to server 2. If Ravi reconnects to server 3, server 3 subscribes to user:ravi instead, and the publisher never needs to know."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Deep dives: one update to crores of viewers.
function CelebrityFig({still,uid=""}){const M=`rc${uid}`;
const sv=(i,c=GREY,fill="#fff")=><Bx key={i+c} x={370} y={44+i*48} w={120} h={34} t={`server ${i+1}`} c={c} fill={fill}/>;
const base=<g>{[0,1,2,3].map(i=>sv(i))}<T x={430} y={244} t="… hundreds more" a="middle"/></g>;
const s1=<g><Bx x={10} y={110} w={120} h={44} t="wicket!" s="score service"/><Ar x1={132} y1={132} x2={176} y2={132} m={M} c={BLUE} w={2}/><Bx x={180} y={110} w={140} h={44} t="topic match:final" s="published once" c={BLUE} fill={LB}/></g>;
const s2=<g>{[0,1,2,3].map(i=><Ar key={i} x1={322} y1={132} x2={366} y2={61+i*48} m={M} c={BLUE}/>)}{[0,1,2,3].map(i=>sv(i,BLUE,LB))}<T x={180} y={184} t="one message per server," c={BLUE}/><T x={180} y={200} t="not one per viewer" c={BLUE}/></g>;
const s3=<g>{[0,1,2,3].map(i=><g key={i}>{[0,1,2,3,4,5].map(j=><circle key={j} cx={515+j*20} cy={61+i*48} r={5} fill={BLUE} opacity={0.7}/>)}<line x1={492} y1={61+i*48} x2={508} y2={61+i*48} stroke={BLUE}/></g>)}<T x={630} y={38} t="each server's own viewers" a="end" c={BLUE}/></g>;
const s4=<g><T x={10} y={232} t="for comments: batch every second, sample when busy" c={INK}/><T x={10} y={248} t="for big content: push a signal, let clients fetch from a CDN" c={INK}/></g>;
const caps=[["1 · a wicket: the score service publishes one update to the match topic",BLUE],["2 · the broker sends it once to each connection server",BLUE],["3 · each server pushes it to the viewers connected to it",BLUE],["4 · batch, sample, and serve heavy content from a cache or CDN",INK]];
return <Fig still={still} h={256} id={`rct${uid}`} M={M} caps={caps} title="One update to crores of viewers. A wicket is published once by the score service to the topic for the match. The broker sends it once to each connection server, hundreds of messages rather than crores, and each server pushes it to its own connected viewers. Comments are batched every second and sampled when busy, and heavy content is fetched by clients from a CDN after a small signal."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// Deep dives: ordering with sequence numbers.
function OrderingFig({still,uid=""}){const M=`ro${uid}`;
const base=<g><Bx x={10} y={100} w={100} h={44} t="Asha"/><Bx x={140} y={100} w={150} h={44} t="chat service" s="numbers each message"/><Bx x={330} y={52} w={120} h={40} t="server A" s="slow just now"/><Bx x={330} y={150} w={120} h={40} t="server B"/><rect x={490} y={70} width={140} height={110} fill="#fff" stroke={GREY}/><T x={500} y={88} t="Ravi's phone" b/></g>;
const s1=<g><Ar x1={112} y1={122} x2={136} y2={122} m={M}/><T x={140} y={168} t="#17 'free tonight?'" c={INK}/><T x={140} y={184} t="#18 'or tomorrow?'" c={INK}/></g>;
const s2=<g><Ar x1={292} y1={130} x2={326} y2={168} m={M} c={RED}/><Ar x1={452} y1={170} x2={486} y2={150} m={M} c={RED}/><T x={500} y={110} t="#18 arrives first" c={RED}/></g>;
const s3=<g><Ar x1={292} y1={114} x2={326} y2={76} m={M}/><Ar x1={452} y1={72} x2={486} y2={96} m={M}/><T x={500} y={126} t="#17 arrives" c={INK}/></g>;
const s4=<g><rect x={492} y={134} width={136} height={44} fill={LB}/><T x={500} y={150} t="shows #17, then #18" c={BLUE} b/><T x={500} y={168} t="sorted by number" c={BLUE}/></g>;
const caps=[["1 · the conversation's owner numbers each message: #17, then #18",INK],["2 · they take different paths, and #18 arrives first",RED],["3 · #17 arrives a moment later",INK],["4 · the phone orders by number, so the chat reads correctly",BLUE]];
return <Fig still={still} h={214} id={`rot${uid}`} M={M} caps={caps} title="Keeping messages in order. The chat service, which owns the conversation, numbers each of Asha's messages: 17, 'free tonight?', then 18, 'or tomorrow?'. They travel through different servers and 18 reaches Ravi's phone first, then 17. The phone orders them by number, so it shows 17 then 18 and the chat reads correctly."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

export const RT_FIGS={
"rt-two-hops":{C:TwoHopsFig,ar:640/242,title:()=>"TWO HOPS TO RAVI'S PHONE"},
"rt-polling":{C:PollingFig,ar:640/232,title:()=>"ASK AGAIN, OR WAIT FOR NEWS"},
"rt-hash-route":{C:HashRouteFig,ar:640/262,title:()=>"THE HASH SAYS WHERE RAVI IS"},
"rt-pubsub":{C:PubSubFig,ar:640/236,title:()=>"PUBLISH TO A CHANNEL, NOT A SERVER"},
"rt-celebrity":{C:CelebrityFig,ar:640/256,title:()=>"ONE WICKET, CRORES OF SCREENS"},
"rt-ordering":{C:OrderingFig,ar:640/214,title:()=>"BACK IN ORDER BY NUMBER"},
};

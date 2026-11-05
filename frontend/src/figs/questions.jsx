// Figures for the Interview Questions articles. Same conventions as components.jsx and concepts.jsx:
// 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated when `still`, and a `uid` so the
// full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
const SBox=({x,y,w=110,t,blue})=><g><rect x={x} y={y-12} width={w} height="24" fill={blue?"#f8faff":"#fff"} stroke={blue?BLUE:GREY}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

// Method, FIG: a 45-minute interview as a bar. Requirements 5, entities 2, API 5, high-level design 15,
// deep dives 13, questions at the end 5. A marker walks the clock and the current step lights up.
function ClockFig({still,uid=""}){const D="15s",X0=20,W=600,Y=120,T=45;
const steps=[["Requirements",5,""],["Entities",2,""],["API",5,""],["High-level design",15,"a design that works end to end"],["Deep dives",13,"make it hold up"],["Your questions",5,""]];
let at=0;const segs=steps.map(([n,m,sub])=>{const s={n,m,sub,a:at};at+=m;return s});const x=(m)=>X0+(m/T)*W;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`ckt${uid}`}><title id={`ckt${uid}`}>A 45-minute system design interview split into steps: about 5 minutes on requirements, 2 on the core entities, 5 on the API, 15 on a high-level design that works end to end, 13 on deep dives that make it hold up, and the last 5 for your questions.</title>
<text x="20" y="30" className="fb">One 45-minute interview</text><text x="20" y="48" className="fl">rough minutes; the design that works end to end comes first</text>
{segs.map((s,i)=><g key={s.n}><rect x={x(s.a)} y={Y-20} width={x(s.a+s.m)-x(s.a)-2} height="40" rx="2" fill={i===3?BLUE:i===4?"#6f8fe6":i===5?"#e6eaf0":"#b9c9ff"}/>
{s.m>=5&&<text x={(x(s.a)+x(s.a+s.m))/2} y={Y+5} textAnchor="middle" className="fb" style={{fill:i===3||i===4?"#fff":INK}}>{s.m} min</text>}
<text x={x(s.a)+2} y={i%2?Y+62:Y+44} className="fl">{s.n}</text>{s.sub&&<text x={x(s.a)+2} y={i%2?Y+78:Y+60} className="fl" style={{fill:GREY}}>{s.sub}</text>}
{!still&&<Glow x={x(s.a)} y={Y-20} w={x(s.a+s.m)-x(s.a)-2} h={40} t0={s.a/T} t1={(s.a+s.m)/T} dur={D}/>}</g>)}
{!still&&<line x1={x(0)} y1={Y-30} x2={x(0)} y2={Y+28} stroke={RED} strokeWidth="2" aria-hidden="true"><animate attributeName="x1" values={`${x(0)};${x(T)}`} dur={D} repeatCount="indefinite"/><animate attributeName="x2" values={`${x(0)};${x(T)}`} dur={D} repeatCount="indefinite"/></line>}</svg>}

// URL shortener, FIG: the two paths. Creating: the marketing tool posts a long URL, the API turns its next
// ID into a short code, stores it and returns zot.to/2Bi. Opening: a customer taps the link in an SMS,
// the redirect service finds the code in Redis and answers 302 to the long URL, and logs the click.
function ShortenerFig({still,uid=""}){const M=`sh${uid}`,D="14s";
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`sht${uid}`}><title id={`sht${uid}`}>Creating a short link: Zotato's marketing tool sends the long URL to the links API, which takes the next number from its block of IDs, turns it into the code 2Bi, stores code and URL in the database, and returns zot.to/2Bi. Opening it: a customer taps the link in an SMS; the redirect service looks the code up in Redis, falls back to the database on a miss, answers 302 with the long URL, and sends a click event to a stream for analytics.</title><Mark m={M}/>
<text x="0" y="20" className="fb">Create</text>
<SBox x={0} y={50} w={120} t="Marketing tool"/><Line x1={122} y1={50} x2={216} y2={50} m={M}/><text x="168" y="42" textAnchor="middle" className="fl">POST /links</text>
<SBox x={220} y={50} w={120} t="Links API" blue/><text x="280" y="80" textAnchor="middle" className="fl">ID 10,000 → "2Bi"</text>
<Line x1={342} y1={50} x2={476} y2={50} m={M}/><SBox x={480} y={50} w={150} t="Database (code → URL)"/>
<line x1="0" y1="110" x2="640" y2="110" stroke="#e6eaf0"/>
<text x="0" y="132" className="fb">Open (100 times more often)</text>
<SBox x={0} y={170} w={120} t="Customer's phone"/><Line x1={122} y1={170} x2={216} y2={170} m={M}/><text x="168" y="162" textAnchor="middle" className="fl">GET /2Bi</text>
<SBox x={220} y={170} w={120} t="Redirect service" blue/><Line x1={216} y1={182} x2={124} y2={182} m={M} dash/><text x="168" y="198" textAnchor="middle" className="fl">302 → long URL</text>
<Line x1={342} y1={164} x2={476} y2={150} m={M}/><SBox x={480} y={150} w={150} t="Redis (hot codes)"/>
<Line x1={342} y1={176} x2={476} y2={200} m={M} c={GREY}/><SBox x={480} y={200} w={150} t="Database, on a miss"/>
<Line x1={280} y1={184} x2={280} y2={246} m={M} c={GREY}/><SBox x={220} y={258} w={120} t="Click stream"/><text x="348" y="262" className="fl">→ analytics, later</text>
{!still&&<g aria-hidden="true">
<Dot x1={124} x2={214} y={50} t0={.02} t1={.1} dur={D}/><Glow x={220} y={38} w={120} h={24} t0={.1} t1={.2} dur={D}/><Dot x1={344} x2={474} y={50} t0={.2} t1={.3} dur={D}/><Glow x={480} y={38} w={150} h={24} t0={.3} t1={.38} dur={D}/>
<Show t0={.3} t1={.45} dur={D}><text x="168" y="80" textAnchor="middle" className="fl" style={{fill:BLUE}}>zot.to/2Bi</text></Show>
<Dot x1={124} x2={214} y={170} t0={.5} t1={.58} dur={D}/><Dot x1={344} x2={474} y={164} y2={150} t0={.6} t1={.68} dur={D}/><Glow x={480} y={138} w={150} h={24} t0={.68} t1={.76} dur={D}/>
<Dot x1={214} x2={126} y={182} t0={.76} t1={.84} dur={D}/><Dot x1={280} x2={280} y={186} y2={244} t0={.8} t1={.9} dur={D}/>
<Show t0={.84} t1={.98} dur={D}><text x="60" y="204" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu opens</text></Show></g>}</svg>}

// URL shortener, FIG: making codes without collisions. A counter hands each API server a block of
// 1,000 IDs; each server turns its next ID into base 62 (0-9, a-z, A-Z). No two servers can make the
// same code, and the counter is asked once per 1,000 links.
function ShortCodesFig({still,uid=""}){const M=`sc${uid}`,D="12s";
const rows=[["Server A","10,000–10,999","10,000","2Bi"],["Server B","11,000–11,999","11,157","2TX"]];
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`sct${uid}`}><title id={`sct${uid}`}>A counter in the database hands each links server a block of 1,000 IDs: server A gets 10,000 to 10,999, server B gets 11,000 to 11,999. Each server turns its next ID into base 62 using the characters 0 to 9, a to z and A to Z: 10,000 becomes 2Bi and 11,157 becomes 2TX. No two servers can make the same code, and the counter is touched once per thousand links. Seven characters allow about 3.5 trillion codes.</title><Mark m={M}/>
<SBox x={0} y={130} w={130} t="Counter" blue/><text x="65" y="160" textAnchor="middle" className="fl">next block: 12,000</text>
{rows.map(([n,blk,id,code],i)=>{const y=80+i*100;return <g key={n}><Line x1={132} y1={130} x2={226} y2={y} m={M} c={GREY}/><text x="150" y={y+(i?20:-8)} className="fl">{blk}</text>
<SBox x={230} y={y} w={110} t={n}/><Line x1={342} y1={y} x2={406} y2={y} m={M}/><text x="374" y={y-8} textAnchor="middle" className="fl">ID {id}</text>
<rect x="410" y={y-14} width="90" height="28" fill="#f8faff" stroke={BLUE}/><text x="455" y={y+5} textAnchor="middle" className="fb" style={{fill:BLUE}}>{code}</text><text x="512" y={y+5} className="fl">zot.to/{code}</text></g>})}
<text x="0" y="30" className="fb">Base 62: 0–9, a–z, A–Z</text><text x="0" y="48" className="fl">7 characters ≈ 3.5 lakh crore codes · 6 run out in about 18 months at 10 crore a day</text>
{!still&&<g aria-hidden="true"><Dot x1={132} x2={224} y={130} y2={80} t0={.05} t1={.15} dur={D}/><Glow x={230} y={68} w={110} h={24} t0={.15} t1={.3} dur={D}/><Dot x1={342} x2={404} y={80} t0={.25} t1={.33} dur={D}/>
<Dot x1={132} x2={224} y={130} y2={180} t0={.5} t1={.6} dur={D}/><Glow x={230} y={168} w={110} h={24} t0={.6} t1={.75} dur={D}/><Dot x1={342} x2={404} y={180} t0={.7} t1={.78} dur={D}/></g>}</svg>}

// File sync, FIG: one edit reaching another device. 1 the laptop puts the changed chunk straight into object
// storage, 2 commits the new chunk list (the change log gets #8840), 3 the notifier tells the phone,
// 4 the phone asks for changes after its cursor, 5 and downloads just that chunk.
function SyncFig({still,uid=""}){const M=`sy${uid}`,D="14s";
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`syt${uid}`}><title id={`syt${uid}`}>One edit reaching another device. First, the counter laptop uploads only the changed chunk of menu.pdf straight to object storage with a signed URL. Second, it commits the new chunk list to the metadata service, which records version 8 and adds change number 8840 to the owner's change log. Third, the notifier tells the owner's phone it has changes. Fourth, the phone asks the metadata service for changes after its cursor, 8839. Fifth, it downloads just the new chunk from object storage.</title><Mark m={M}/>
<SBox x={0} y={60} w={120} t="Counter laptop"/><SBox x={250} y={60} w={140} t="Metadata service" blue/><SBox x={500} y={60} w={140} t="Notifier"/>
<SBox x={250} y={230} w={140} t="Object storage"/><SBox x={500} y={230} w={140} t="Owner's phone"/>
<Line x1={122} y1={60} x2={246} y2={60} m={M}/><text x="184" y="52" textAnchor="middle" className="fl">2 commit v8</text>
<Line x1={392} y1={60} x2={496} y2={60} m={M}/><text x="444" y="52" textAnchor="middle" className="fl">3 "changes"</text>
<text x="320" y="92" textAnchor="middle" className="fl">change log: #8840 menu.pdf v8</text>
<Line x1={90} y1={73} x2={246} y2={222} m={M}/><text x="170" y="160" textAnchor="end" className="fl">1 PUT chunk 41ab</text><text x="180" y="174" textAnchor="end" className="fl" style={{fill:GREY}}>signed URL, no API server</text>
<Line x1={570} y1={73} x2={570} y2={216} m={M} dash/><text x="578" y="150" className="fl">push</text>
<Line x1={520} y1={217} x2={380} y2={74} m={M} c={GREY}/><text x="458" y="140" className="fl">4 GET /changes</text><text x="470" y="154" className="fl" style={{fill:GREY}}>cursor=8839</text>
<Line x1={392} y1={230} x2={496} y2={230} m={M}/><text x="444" y="222" textAnchor="middle" className="fl">5 GET 41ab</text>
{!still&&<g aria-hidden="true">
<Dot x1={92} x2={244} y={75} y2={220} t0={.02} t1={.14} dur={D}/><Glow x={250} y={218} w={140} h={24} t0={.14} t1={.22} dur={D}/>
<Dot x1={124} x2={244} y={60} t0={.22} t1={.32} dur={D}/><Glow x={250} y={48} w={140} h={24} t0={.32} t1={.4} dur={D}/>
<Show t0={.32} t1={.6} dur={D}><text x="320" y="108" textAnchor="middle" className="fl" style={{fill:BLUE}}>#8840 added</text></Show>
<Dot x1={394} x2={494} y={60} t0={.4} t1={.48} dur={D}/><Dot x1={570} x2={570} y={76} y2={214} t0={.48} t1={.56} dur={D}/>
<Dot x1={518} x2={382} y={215} y2={76} t0={.58} t1={.7} dur={D}/><Dot x1={394} x2={494} y={230} t0={.72} t1={.82} dur={D}/><Glow x={500} y={218} w={140} h={24} t0={.82} t1={.98} dur={D}/>
<Show t0={.84} t1={.98} dur={D}><text x="570" y="262" textAnchor="middle" className="fl" style={{fill:BLUE}}>menu.pdf v8</text></Show></g>}</svg>}

// File sync, FIG: chunks named by their hash. menu.pdf (9 MB) is three chunks of 4, 4 and 1 MB; a price change on page 2
// changes only the middle chunk's hash, so only that chunk is uploaded.
function ChunksFig({still,uid=""}){const M=`fc${uid}`,D="10s",X=[130,240,350];
const v7=["9f2c…","41ab…","c07e…"],v8=["9f2c…","d51e…","c07e…"],pg=["page 1","page 2: price","page 3"];
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`fct${uid}`}><title id={`fct${uid}`}>menu.pdf, version 7, is 9 MB: three chunks of 4, 4 and 1 MB, named by their hashes: 9f2c, 41ab and c07e. A price changes on page 2. In version 8 the first and last chunks are unchanged; only the middle chunk is new, with hash d51e, so only that one chunk is uploaded to object storage: 4 MB instead of 9.</title><Mark m={M}/>
<text x="0" y="64" className="fb">menu.pdf v7</text><text x="0" y="80" className="fl">9 MB</text><text x="0" y="174" className="fb">menu.pdf v8</text>
{X.map((x,i)=><g key={i}><SBox x={x} y={60} w={100} t={v7[i]}/><text x={x+50} y={90} textAnchor="middle" className="fl">{pg[i]}</text>
<Line x1={x+50} y1={98} x2={x+50} y2={156} c={i===1?BLUE:GREY} dash={i!==1}/><text x={x+56} y={132} className="fl" style={{fill:i===1?BLUE:GREY}}>{i===1?"edited":"same"}</text>
<SBox x={x} y={170} w={100} t={v8[i]} blue={i===1}/></g>)}
<Line x1={452} y1={170} x2={506} y2={170} m={M}/><SBox x={510} y={170} w={130} t="Object storage"/>
<text x="0" y="222" className="fl">1 chunk of 3 sent: 4 MB instead of 9. The new version is the old list with one hash swapped.</text>
{!still&&<g aria-hidden="true"><Glow x={240} y={158} w={100} h={24} t0={.15} t1={.5} dur={D}/><Dot x1={454} x2={504} y={170} t0={.45} t1={.6} dur={D}/><Glow x={510} y={158} w={130} h={24} t0={.6} t1={.8} dur={D}/></g>}</svg>}

// Restaurants near me, FIG: one home-screen request. The nearby service turns the location into a cell,
// 1 reads which restaurants deliver into it from the in-memory geo index, 2 drops closed or busy ones
// (status in Redis), 3 adds names and ratings from a cache, then ranks and returns 20.
function NearbyFig({still,uid=""}){const M=`nb${uid}`,D="12s";
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`nbt${uid}`}><title id={`nbt${uid}`}>One home-screen request. The customer app sends its location to the nearby service. The service turns it into a map cell and first reads, from an in-memory geo index, the restaurants that deliver into that cell: about 180. Second, it checks their status in Redis and drops the closed and busy ones. Third, it adds names and ratings from a cache. Then it ranks them and returns the first 20 to the app.</title><Mark m={M}/>
<SBox x={0} y={130} w={120} t="Customer app"/><SBox x={190} y={130} w={130} t="Nearby service" blue/>
<SBox x={450} y={50} w={190} t="Geo index (in memory)"/><SBox x={450} y={130} w={190} t="Open or busy (Redis)"/><SBox x={450} y={210} w={190} t="Names, ratings (cache)"/>
<Line x1={122} y1={124} x2={186} y2={124} m={M}/><text x="154" y="114" textAnchor="middle" className="fl">GET /nearby</text>
<Line x1={188} y1={138} x2={124} y2={138} m={M} dash/><text x="154" y="156" textAnchor="middle" className="fl">top 20</text>
<Line x1={322} y1={122} x2={446} y2={54} m={M}/><text x="392" y="68" textAnchor="end" className="fl">1 cell → 180</text>
<Line x1={322} y1={130} x2={446} y2={130} m={M}/><text x="384" y="122" textAnchor="middle" className="fl">2 open now?</text>
<Line x1={322} y1={138} x2={446} y2={206} m={M}/><text x="334" y="196" className="fl">3 details</text>
<text x="255" y="170" textAnchor="middle" className="fl" style={{fill:GREY}}>rank, page</text>
{!still&&<g aria-hidden="true">
<Dot x1={124} x2={184} y={124} t0={.02} t1={.12} dur={D}/><Glow x={190} y={118} w={130} h={24} t0={.12} t1={.2} dur={D}/>
<Dot x1={324} x2={444} y={121} y2={55} t0={.2} t1={.32} dur={D}/><Glow x={450} y={38} w={190} h={24} t0={.32} t1={.4} dur={D}/>
<Dot x1={324} x2={444} y={130} t0={.4} t1={.5} dur={D}/><Glow x={450} y={118} w={190} h={24} t0={.5} t1={.58} dur={D}/>
<Dot x1={324} x2={444} y={139} y2={205} t0={.58} t1={.7} dur={D}/><Glow x={450} y={198} w={190} h={24} t0={.7} t1={.78} dur={D}/>
<Dot x1={186} x2={126} y={138} t0={.8} t1={.9} dur={D}/><Show t0={.88} t1={.99} dur={D}><text x="60" y="166" textAnchor="middle" className="fl" style={{fill:BLUE}}>20 restaurants</text></Show></g>}</svg>}

// Restaurants near me, FIG: why you search 9 cells. The customer sits near the right edge of their cell;
// Biryani Zone is 300 m away but in the next cell. One cell misses it; the 3 × 3 block finds it.
function GeoCellsFig({still,uid=""}){const D="10s",X=40,Y=40,C=70,ux=X+C+62,uy=Y+C+34,bx=X+2*C+14,by=Y+C+30;
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`gct${uid}`}><title id={`gct${uid}`}>A 3 by 3 block of map cells. The customer is near the right edge of the middle cell. Biryani Zone is 300 metres away, but just across the border in the cell to the right. Searching only the customer's cell misses it; searching the customer's cell and the 8 around it finds it. If cells are at least as wide as the search radius, the 3 by 3 block always covers the whole search circle.</title>
{[0,1,2].map(r=>[0,1,2].map(c=><rect key={r+"-"+c} x={X+c*C} y={Y+r*C} width={C} height={C} fill={r===1&&c===1?"#eef2ff":"#fff"} stroke={GREY}/>))}
<circle cx={ux} cy={uy} r="5" fill={INK}/><text x={ux-4} y={uy+18} textAnchor="end" className="fl">you</text>
<rect x={bx-4} y={by-4} width="8" height="8" fill={RED}/><text x={X+2*C+35} y={by-24} textAnchor="middle" className="fl" style={{fill:RED}}>Biryani</text><text x={X+2*C+35} y={by-12} textAnchor="middle" className="fl" style={{fill:RED}}>Zone</text>
<line x1={ux} y1={uy} x2={bx} y2={by} stroke={RED} strokeDasharray="3 2"/><text x={X+2*C+35} y={by+22} textAnchor="middle" className="fl">300 m</text>
<text x={X} y={Y-12} className="fl">3 × 3 cells around you</text>
<text x="300" y="70" className="fb">Your cell only</text><text x="300" y="88" className="fl">misses Biryani Zone, 300 m away,</text><text x="300" y="104" className="fl">just across the border</text>
<text x="300" y="130" className="fb" style={{fill:BLUE}}>Your cell + 8 neighbours</text><text x="300" y="148" className="fl">9 lookups; nothing within reach is missed</text>
<text x="300" y="190" className="fb">Cell size</text><text x="300" y="208" className="fl">at least as wide as the search radius,</text><text x="300" y="224" className="fl">e.g. 5-character geohash ≈ 5 km a side</text>
{!still&&<g aria-hidden="true"><Show t0={0} t1={.45} dur={D}><rect x={X+C} y={Y+C} width={C} height={C} fill="none" stroke={BLUE} strokeWidth="3"/></Show><Show t0={.5} t1={.99} dur={D}><rect x={X} y={Y} width={3*C} height={3*C} fill="none" stroke={BLUE} strokeWidth="3"/></Show></g>}
{still&&<rect x={X} y={Y} width={3*C} height={3*C} fill="none" stroke={BLUE} strokeWidth="3"/>}</svg>}

// Grocery delivery, FIG: one order against the 10-minute clock. The customer holds stock and pays
// (minute 0-1); payment starts the picker and assigns a rider at the same moment; picking and packing take
// to minute 4 while the rider waits at the store; the ride is minutes 4-10. A red line walks the clock.
function MinutesFig({still,uid=""}){const D="12s",X0=96,W=520,x=(m)=>X0+m*W/10;
const lanes=[["Customer",[[0,1,"hold + pay",BLUE]]],["Picker",[[1,4,"pick, pack",BLUE]]],["Rider",[[1,4,"assigned, waits at store","#e6eaf0"],[4,10,"ride, about 2 km",BLUE]]]];
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`mnt${uid}`}><title id={`mnt${uid}`}>One order against a 10-minute clock. Minute 0 to 1: the customer's items are held and they pay. The moment payment lands, a picker starts and a rider is assigned. Minutes 1 to 4: the picker picks and packs while the rider waits at the store. Minutes 4 to 10: the rider rides about 2 kilometres to the door.</title>
{lanes.map(([n,bars],i)=>{const y=60+i*60;return <g key={n}><text x="0" y={y+5} className="fb">{n}</text>
{bars.map(([a,b,t,c])=>{const out=b-a<2;return <g key={t}><rect x={x(a)} y={y-16} width={x(b)-x(a)-2} height="32" fill={c} stroke={c===BLUE?BLUE:GREY}/><text x={out?x(b)+8:(x(a)+x(b))/2} y={y+4} textAnchor={out?"start":"middle"} className="fl" style={{fill:c===BLUE&&!out?"#fff":INK}}>{t}</text></g>})}</g>})}
<line x1={x(1)} y1="36" x2={x(1)} y2="196" stroke={INK} strokeDasharray="3 2"/><text x={x(1)+4} y="32" className="fl">paid: picker and rider start together</text>
{[0,1,2,3,4,5,6,7,8,9,10].map(m=><g key={m}><line x1={x(m)} y1="206" x2={x(m)} y2="212" stroke={GREY}/><text x={x(m)} y="226" textAnchor="middle" className="fl">{m}</text></g>)}
<text x={x(10)} y="246" textAnchor="end" className="fl">minutes after ordering</text>
{!still&&<line x1={x(0)} y1="40" x2={x(0)} y2="200" stroke={RED} strokeWidth="2" aria-hidden="true"><animate attributeName="x1" values={`${x(0)};${x(10)}`} dur={D} repeatCount="indefinite"/><animate attributeName="x2" values={`${x(0)};${x(10)}`} dur={D} repeatCount="indefinite"/></line>}</svg>}

// Grocery delivery, FIG: the last packet. Two customers send the same conditional update ("hold 1 if at
// least 1 is available"); the database applies them one after the other. A's changes one row and
// holds the packet; B's changes none, so B is told it's sold out before paying.
function StockHoldFig({still,uid=""}){const M=`sh4${uid}`,D="12s";
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`skt${uid}`}><title id={`skt${uid}`}>Two customers want the last packet of milk. Both send the same update: hold 1 if at least 1 is available. The database applies them one at a time. Customer A's update changes one row, so the packet is held and A pays. Customer B's update changes no rows, so B is told it is sold out before paying anything.</title><Mark m={M}/>
<text x="320" y="24" textAnchor="middle" className="fl">both send: hold 1 if available ≥ 1</text>
<SBox x={0} y={70} w={110} t="Customer A"/><SBox x={0} y={190} w={110} t="Customer B"/>
<SBox x={240} y={130} w={160} t="Stock: milk 500 ml" blue/><text x="320" y="162" textAnchor="middle" className="fl">available 1 → 0</text><text x="320" y="176" textAnchor="middle" className="fl">held 0 → 1</text>
<Line x1={112} y1={74} x2={236} y2={124} m={M}/><text x="150" y="112" textAnchor="end" className="fl">1st</text>
<Line x1={112} y1={186} x2={236} y2={136} m={M}/><text x="150" y="152" textAnchor="end" className="fl">2nd</text>
<Line x1={402} y1={124} x2={476} y2={74} m={M}/><Line x1={402} y1={136} x2={476} y2={186} m={M} c={GREY}/>
<SBox x={480} y={70} w={150} t="1 row changed" blue/><text x="555" y="100" textAnchor="middle" className="fl">held; A pays</text>
<SBox x={480} y={190} w={150} t="0 rows changed"/><text x="555" y="220" textAnchor="middle" className="fl" style={{fill:RED}}>sold out, no charge</text>
{!still&&<g aria-hidden="true">
<Dot x1={114} x2={234} y={75} y2={123} t0={.03} t1={.15} dur={D}/><Glow x={240} y={118} w={160} h={24} t0={.15} t1={.25} dur={D}/><Dot x1={404} x2={474} y={123} y2={75} t0={.25} t1={.35} dur={D}/><Glow x={480} y={58} w={150} h={24} t0={.35} t1={.5} dur={D}/>
<Dot x1={114} x2={234} y={185} y2={137} t0={.45} t1={.57} dur={D}/><Glow x={240} y={118} w={160} h={24} t0={.57} t1={.67} dur={D}/><Dot x1={404} x2={474} y={137} y2={185} t0={.67} t1={.77} dur={D}/><Glow x={480} y={178} w={150} h={24} t0={.77} t1={.95} dur={D}/></g>}</svg>}

// id → {C, ar (width/height of the viewBox), title(example name)}; merged into FIGS in dashboard.jsx.
// Keep in step with FIGS in backend/src/content/validate.js.
export const QUESTION_FIGS={
"interview-clock":{C:ClockFig,ar:640/240,title:()=>"WHERE THE 45 MINUTES GO"},
"shortener-flow":{C:ShortenerFig,ar:640/300,title:()=>"CREATE A LINK, OPEN A LINK"},
"short-codes":{C:ShortCodesFig,ar:640/260,title:()=>"SHORT CODES THAT NEVER CLASH"},
"sync-flow":{C:SyncFig,ar:640/280,title:()=>"ONE EDIT, EVERY DEVICE"},
"file-chunks":{C:ChunksFig,ar:640/240,title:()=>"SEND ONLY THE CHUNK THAT CHANGED"},
"nearby-flow":{C:NearbyFig,ar:640/260,title:()=>"ONE HOME SCREEN, THREE LOOKUPS"},
"geo-cells":{C:GeoCellsFig,ar:640/280,title:()=>"WHY YOU SEARCH NINE CELLS"},
"minutes-flow":{C:MinutesFig,ar:640/260,title:()=>"WHERE THE 10 MINUTES GO"},
"stock-hold":{C:StockHoldFig,ar:640/260,title:()=>"THE LAST PACKET, TWO BUYERS"},
};

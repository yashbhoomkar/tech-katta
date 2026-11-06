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

// Ticket booking, FIG: the waiting room. 50 lakh people join the line (random places before noon); it admits
// about 110 a second, as fast as booking can serve, so about 20,000 shop at once. Booking holds seats and
// takes payment; everyone still in line sees their place, then "sold out".
function WaitingRoomFig({still,uid=""}){const M=`wr${uid}`,D="10s";
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`wrt${uid}`}><title id={`wrt${uid}`}>50 lakh people join the line for tickets; everyone who joins before noon gets a random place. The waiting room admits about 110 people a second, as fast as booking can serve, so about 20,000 are shopping at once. Booking holds their seats in the seat database and takes payment. Everyone still in line sees their place, and then "sold out" once every seat is sold or held.</title><Mark m={M}/>
<SBox x={0} y={110} w={120} t="50 lakh people"/><SBox x={170} y={110} w={150} t="Waiting room" blue/><text x="245" y="140" textAnchor="middle" className="fl">random places before 12:00</text>
<SBox x={380} y={110} w={110} t="Booking"/><text x="435" y="140" textAnchor="middle" className="fl">~20,000 shopping</text>
<SBox x={530} y={60} w={110} t="Seats"/><SBox x={530} y={160} w={110} t="Payment"/>
<Line x1={122} y1={110} x2={166} y2={110} m={M}/><Line x1={322} y1={110} x2={376} y2={110} m={M}/><text x="349" y="100" textAnchor="middle" className="fl">110/s</text>
<Line x1={492} y1={104} x2={526} y2={66} m={M}/><Line x1={492} y1={116} x2={526} y2={154} m={M}/>
<Line x1={245} y1={150} x2={245} y2={186} m={M} c={GREY} dash/><text x="245" y="206" textAnchor="middle" className="fl">everyone else: your place, then</text><text x="245" y="222" textAnchor="middle" className="fl" style={{fill:RED}}>"sold out"</text>
{!still&&<g aria-hidden="true">{[0,.12,.24,.36,.48,.6,.72].map(t=><Dot key={t} x1={124} x2={164} y={110} t0={t} t1={t+.08} dur={D}/>)}
<Dot x1={324} x2={374} y={110} t0={.2} t1={.3} dur={D}/><Dot x1={494} x2={524} y={103} y2={67} t0={.32} t1={.4} dur={D}/><Dot x1={494} x2={524} y={117} y2={153} t0={.44} t1={.52} dur={D}/>
<Dot x1={324} x2={374} y={110} t0={.6} t1={.7} dur={D}/></g>}</svg>}

// Ticket booking, FIG: a seat's three states. Available → held (one conditional update, 10 minutes) → sold
// when payment lands in time; held → available when 10 minutes pass with no payment.
function SeatStatesFig({still,uid=""}){const M=`ss${uid}`,D="12s";
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`sst${uid}`}><title id={`sst${uid}`}>A seat is available, held or sold. A hold moves an available seat to held for 10 minutes. Payment in time moves it to sold. If 10 minutes pass with no payment, it goes back to available. Each move is one conditional update, so two buyers can't both win the same seat.</title><Mark m={M}/>
<SBox x={0} y={100} w={150} t="Available"/><SBox x={245} y={100} w={150} t="Held, 10 min" blue/><SBox x={490} y={100} w={150} t="Sold"/>
<Line x1={152} y1={100} x2={241} y2={100} m={M}/><text x="196" y="70" textAnchor="middle" className="fl">hold: only if</text><text x="196" y="84" textAnchor="middle" className="fl">still available</text>
<Line x1={397} y1={100} x2={486} y2={100} m={M}/><text x="441" y="84" textAnchor="middle" className="fl">paid in time</text>
<path d="M320 114 V170 H75 V118" fill="none" stroke={GREY} strokeDasharray="4 3" markerEnd={`url(#${M})`}/><text x="197" y="190" textAnchor="middle" className="fl">10 minutes pass, no payment: back on sale</text>
{!still&&<g aria-hidden="true"><Glow x={0} y={88} w={150} h={24} t0={0} t1={.2} dur={D}/><Dot x1={154} x2={239} y={100} t0={.2} t1={.3} dur={D}/><Glow x={245} y={88} w={150} h={24} t0={.3} t1={.5} dur={D}/>
<Dot x1={399} x2={484} y={100} t0={.5} t1={.6} dur={D}/><Glow x={490} y={88} w={150} h={24} t0={.6} t1={.78} dur={D}/>
<Show t0={.8} t1={.98} dur={D}><path d="M320 114 V170 H75 V118" fill="none" stroke={BLUE} strokeWidth="2"/></Show></g>}</svg>}

// Photo sharing, FIG: an upload's life. 1 the app creates the record and gets a signed URL, 2 puts the
// original straight into object storage, 3 storage queues the new file, 4 a worker makes the sizes and
// checks the image, 5 marks the photo live; 6 phones fetch the size they need through the CDN.
function PhotoUploadFig({still,uid=""}){const M=`pu${uid}`,D="14s";
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`put${uid}`}><title id={`put${uid}`}>An upload's life. First, the app asks the photo service to create the photo and gets a signed upload URL. Second, it puts the original straight into object storage. Third, storage puts a message on a queue. Fourth, a worker makes three sizes and checks the image. Fifth, it marks the photo live in the photo service. Sixth, phones fetch the size they need through the CDN, which reads from storage only on a miss.</title><Mark m={M}/>
<SBox x={0} y={140} w={100} t="App"/><SBox x={160} y={50} w={140} t="Photo service" blue/><SBox x={160} y={230} w={140} t="Object storage"/>
<SBox x={360} y={230} w={100} t="Queue"/><SBox x={510} y={230} w={130} t="Resize workers"/><SBox x={360} y={140} w={100} t="CDN"/>
<Line x1={60} y1={128} x2={156} y2={56} m={M}/><text x="104" y="84" textAnchor="end" className="fl">1 POST /photos</text>
<Line x1={60} y1={152} x2={156} y2={226} m={M}/><text x="104" y="206" textAnchor="end" className="fl">2 PUT original</text>
<Line x1={302} y1={230} x2={356} y2={230} m={M}/><text x="329" y="220" textAnchor="middle" className="fl">3</text>
<Line x1={462} y1={230} x2={506} y2={230} m={M}/><text x="484" y="220" textAnchor="middle" className="fl">4</text><text x="575" y="262" textAnchor="middle" className="fl">3 sizes, safety check</text>
<path d="M575 218 V50 H304" fill="none" stroke={INK} markerEnd={`url(#${M})`}/><text x="440" y="42" textAnchor="middle" className="fl">5 all sizes ready: live</text>
<Line x1={102} y1={140} x2={356} y2={140} m={M}/><text x="229" y="132" textAnchor="middle" className="fl">6 GET thumbnail</text>
<Line x1={390} y1={152} x2={270} y2={218} m={M} c={GREY} dash/><text x="338" y="196" className="fl" style={{fill:GREY}}>on a miss</text>
{!still&&<g aria-hidden="true"><Dot x1={62} x2={154} y={127} y2={57} t0={.02} t1={.1} dur={D}/><Dot x1={62} x2={154} y={153} y2={225} t0={.12} t1={.22} dur={D}/>
<Dot x1={304} x2={354} y={230} t0={.24} t1={.3} dur={D}/><Dot x1={464} x2={504} y={230} t0={.32} t1={.38} dur={D}/><Glow x={510} y={218} w={130} h={24} t0={.38} t1={.5} dur={D}/>
<Glow x={160} y={38} w={140} h={24} t0={.52} t1={.62} dur={D}/><Dot x1={104} x2={354} y={140} t0={.66} t1={.78} dur={D}/><Glow x={360} y={128} w={100} h={24} t0={.78} t1={.95} dur={D}/></g>}</svg>}

// Photo sharing, FIG: a viral photo's like count. One row taking every like makes writers queue up;
// the same count split over 8 rows takes an eighth of the writes per row, and a read adds the 8 up.
function LikeCounterFig({still,uid=""}){const M=`lc${uid}`,D="8s",parts=[6027,6031,6019,6025,6030,6022,6034,6025],X=200,W=46,G=6;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`lct${uid}`}><title id={`lct${uid}`}>A viral photo's like count. Kept in one row, every like waits for the one before, so writers queue up. Split over 8 rows, each like adds 1 to a random one, so each row takes an eighth of the writes, and reading the count adds the 8 rows up: 48,213.</title><Mark m={M}/>
<text x="0" y="64" className="fb">One row</text><Line x1={110} y1={60} x2={196} y2={60} m={M}/><SBox x={200} y={60} w={180} t="likes: 48,213"/><text x="200" y="92" className="fl" style={{fill:RED}}>every like waits for the one before</text>
<text x="0" y="174" className="fb">Split over 8</text><Line x1={110} y1={170} x2={196} y2={170} m={M}/>
{parts.map((n,i)=><SBox key={i} x={X+i*(W+G)} y={170} w={W} t={n.toLocaleString("en-IN")} blue/>)}
<text x={X+8*(W+G)-G} y="206" textAnchor="end" className="fl">read: add the 8 rows = 48,213</text>
{!still&&<g aria-hidden="true">{[0,.1,.2,.3].map(t=><Dot key={t} x1={112} x2={194} y={60} t0={t} t1={t+.3} dur={D}/>)}<Glow x={200} y={48} w={180} h={24} t0={.3} t1={.9} dur={D}/>
{[[0,3],[.12,6],[.24,1],[.36,5],[.48,0],[.6,7]].map(([t,k])=><g key={t}><Dot x1={112} x2={194} y={170} t0={t} t1={t+.08} dur={D}/><Glow x={X+k*(W+G)} y={158} w={W} h={24} t0={t+.08} t1={t+.14} dur={D}/></g>)}</g>}</svg>}

// News feed, FIG: push. Posting saves the post and queues it; fan-out workers add the id to each follower's
// list in Redis. Opening the feed reads one list (1) and fetches the posts from a cache (2).
function FeedFanoutFig({still,uid=""}){const M=`ff${uid}`,D="12s";
return <svg viewBox="0 0 640 280" role="img" aria-labelledby={`fft${uid}`}><title id={`fft${uid}`}>Posting saves the post and puts a message on a queue. Fan-out workers look up the author's followers and add the post id to each follower's feed list in Redis. Opening the feed reads one list of post ids and fetches the posts themselves from a cache.</title><Mark m={M}/>
<SBox x={0} y={60} w={100} t="Author"/><SBox x={150} y={60} w={130} t="Post service" blue/><SBox x={330} y={60} w={90} t="Queue"/><SBox x={470} y={60} w={170} t="Fan-out workers"/>
<SBox x={470} y={170} w={170} t="Feed lists (Redis)"/><SBox x={0} y={210} w={100} t="Reader"/><SBox x={150} y={210} w={130} t="Feed service" blue/><SBox x={330} y={250} w={110} t="Post cache"/>
<Line x1={102} y1={60} x2={146} y2={60} m={M}/><Line x1={282} y1={60} x2={326} y2={60} m={M}/><Line x1={422} y1={60} x2={466} y2={60} m={M}/><text x="304" y="88" textAnchor="middle" className="fl">post saved; fan-out later</text>
<Line x1={555} y1={72} x2={555} y2={156} m={M}/><text x="549" y="118" textAnchor="end" className="fl">add the id to each follower's list</text>
<Line x1={102} y1={210} x2={146} y2={210} m={M}/><Line x1={282} y1={204} x2={466} y2={176} m={M}/><text x="380" y="210" className="fl">1 one list of ids</text>
<Line x1={282} y1={218} x2={326} y2={246} m={M}/><text x="250" y="262" textAnchor="end" className="fl">2 the posts</text>
{!still&&<g aria-hidden="true"><Dot x1={104} x2={144} y={60} t0={.02} t1={.08} dur={D}/><Dot x1={284} x2={324} y={60} t0={.1} t1={.16} dur={D}/><Dot x1={424} x2={464} y={60} t0={.18} t1={.24} dur={D}/>
<Dot x1={555} x2={555} y={74} y2={154} t0={.26} t1={.36} dur={D}/><Glow x={470} y={158} w={170} h={24} t0={.36} t1={.46} dur={D}/>
<Dot x1={104} x2={144} y={210} t0={.55} t1={.61} dur={D}/><Dot x1={284} x2={464} y={203} y2={177} t0={.63} t1={.73} dur={D}/><Dot x1={284} x2={324} y={219} y2={245} t0={.76} t1={.84} dur={D}/><Glow x={150} y={198} w={130} h={24} t0={.86} t1={.98} dur={D}/></g>}</svg>}

// News feed, FIG: the hybrid. Posts from ordinary accounts are pushed into your list; the few big
// accounts you follow are pulled when you open the feed; the two are merged by time.
function FeedHybridFig({still,uid=""}){const M=`fh${uid}`,D="10s",W=190;
const pushed=[["Ananya · 8:02 pm",55],["Rohit · 7:59 pm",80],["Meera · 7:51 pm",105]],pulled=[["Food blogger · 8:04 pm",175],["Biryani chain · 7:58 pm",200]];
const merged=[["Food blogger · 8:04 pm",1],["Ananya · 8:02 pm",0],["Rohit · 7:59 pm",0],["Biryani chain · 7:58 pm",1],["Meera · 7:51 pm",0]];
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`fht${uid}`}><title id={`fht${uid}`}>Opening the feed. Posts from ordinary accounts, Ananya, Rohit and Meera, were pushed into your list when they posted. Posts from the two big accounts you follow, a food blogger and a biryani chain, are pulled when you open the feed. The two are merged by time: the blogger at 8:04, Ananya at 8:02, Rohit at 7:59, the biryani chain at 7:58 and Meera at 7:51.</title><Mark m={M}/>
<text x="0" y="32" className="fb">Pushed into your list</text>{pushed.map(([t,y])=><SBox key={t} x={0} y={y} w={W} t={t}/>)}
<text x="0" y="152" className="fb" style={{fill:BLUE}}>Pulled when you open</text>{pulled.map(([t,y])=><SBox key={t} x={0} y={y} w={W} t={t} blue/>)}
<Line x1={W+4} y1={80} x2={346} y2={100} m={M}/><Line x1={W+4} y1={188} x2={346} y2={130} m={M}/><text x="270" y="128" textAnchor="middle" className="fl">merge by time</text>
<text x="350" y="32" className="fb">Your feed</text>
{merged.map(([t,b],i)=>{const box=<SBox x={350} y={55+i*30} w={W+20} t={t} blue={!!b}/>;return still?<g key={t}>{box}</g>:<Show key={t} t0={.1+i*.12} t1={.98} dur={D}>{box}</Show>})}</svg>}

// Dating app, FIG: the two paths. Swiping: the phone sends each swipe to the swipe service, which updates
// the pair's row; when both have said yes, a message goes on a queue and both phones get a push. Browsing:
// the deck service hands out the next profiles from a deck kept in Redis, which a deck builder refills
// from the profiles near you, skipping anyone you've already seen.
function SwipeFlowFig({still,uid=""}){const M=`sf${uid}`,D="12s";
return <svg viewBox="0 0 640 300" role="img" aria-labelledby={`sft${uid}`}><title id={`sft${uid}`}>Swiping: the phone sends each swipe to the swipe service, which updates one row for the pair of people. When both have said yes, a message goes on a queue and both phones get a push. Browsing: the phone asks the deck service for the next profiles, which come from a deck kept in Redis. A deck builder refills the deck from profiles near you, skipping anyone you have already seen.</title><Mark m={M}/>
<text x="0" y="24" className="fb">Swiping</text>
<SBox x={0} y={60} w={90} t="Phone"/><SBox x={140} y={60} w={130} t="Swipe service" blue/><SBox x={320} y={60} w={120} t="Pair rows"/><SBox x={500} y={60} w={140} t="Queue"/><SBox x={500} y={130} w={140} t="Push to both"/>
<Line x1={92} y1={60} x2={136} y2={60} m={M}/><Line x1={272} y1={60} x2={316} y2={60} m={M}/><Line x1={442} y1={60} x2={496} y2={60} m={M}/><text x="470" y="88" textAnchor="middle" className="fl">both said yes</text>
<Line x1={570} y1={72} x2={570} y2={116} m={M}/>
<text x="0" y="184" className="fb">Browsing</text>
<SBox x={0} y={220} w={90} t="Phone"/><SBox x={140} y={220} w={130} t="Deck service" blue/><SBox x={320} y={220} w={120} t="Deck (Redis)"/><SBox x={500} y={220} w={140} t="Deck builder"/><SBox x={500} y={280} w={140} t="Profiles near you"/>
<Line x1={92} y1={220} x2={136} y2={220} m={M}/><Line x1={272} y1={220} x2={316} y2={220} m={M}/><text x="114" y="248" textAnchor="middle" className="fl">next 20</text>
<Line x1={496} y1={220} x2={444} y2={220} m={M}/><text x="470" y="206" textAnchor="middle" className="fl">refill</text>
<Line x1={570} y1={266} x2={570} y2={234} m={M}/><text x="490" y="284" textAnchor="end" className="fl">minus the ones you've seen</text>
{!still&&<g aria-hidden="true"><Dot x1={94} x2={134} y={60} t0={.02} t1={.08} dur={D}/><Dot x1={274} x2={314} y={60} t0={.1} t1={.16} dur={D}/><Glow x={320} y={48} w={120} h={24} t0={.16} t1={.26} dur={D}/>
<Dot x1={444} x2={494} y={60} t0={.26} t1={.32} dur={D}/><Dot x1={570} x2={570} y={74} y2={114} t0={.34} t1={.42} dur={D}/><Glow x={500} y={118} w={140} h={24} t0={.42} t1={.52} dur={D}/>
<Dot x1={94} x2={134} y={220} t0={.56} t1={.62} dur={D}/><Dot x1={274} x2={314} y={220} t0={.64} t1={.7} dur={D}/><Glow x={320} y={208} w={120} h={24} t0={.7} t1={.78} dur={D}/>
<Dot x1={570} x2={570} y={264} y2={236} t0={.8} t1={.86} dur={D}/><Dot x1={494} x2={446} y={220} t0={.88} t1={.94} dur={D}/></g>}</svg>}

// Dating app, FIG: the pair row. Ananya and Rohit swipe right on each other at the same moment. Both swipes
// update the same row in one step each and read the other side's flag back. Ananya's lands first and sees
// "no", so nothing happens; Rohit's sees "yes" and creates the match. Exactly one of them creates it.
function PairRowFig({still,uid=""}){const D="10s",L=200,W=240,V=400;
const val=(y,t0,before,after)=>still?<text x={V} y={y} className="fb" style={{fill:BLUE}}>{after}</text>:<><Show t0={.001} t1={t0} dur={D}><text x={V} y={y} className="fb" style={{fill:GREY}}>{before}</text></Show><Show t0={t0} t1={.98} dur={D}><text x={V} y={y} className="fb" style={{fill:BLUE}}>{after}</text></Show></>;
const note=(x,y,t0,t,anchor)=>still?<text x={x} y={y} textAnchor={anchor} className="fl">{t}</text>:<Show t0={t0} t1={.98} dur={D}><text x={x} y={y} textAnchor={anchor} className="fl">{t}</text></Show>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`prt${uid}`}><title id={`prt${uid}`}>Ananya and Rohit swipe right on each other at the same moment. Both swipes update the same row, one row per pair of people, and each update reads the other side's answer back in the same step. Ananya's update lands first and sees that Rohit hasn't said yes, so nothing happens. Rohit's update sees that Ananya has, so it marks the pair matched and both get the news. Exactly one of the two creates the match.</title>
<SBox x={0} y={60} w={110} t="Ananya swipes →"/><SBox x={530} y={60} w={110} t="← Rohit swipes"/>
<rect x={L} y={30} width={W} height={140} fill="#fff" stroke={GREY}/><text x={L+10} y={50} className="fl">one row: pair a_17 · r_42</text>
<line x1={L} y1={62} x2={L+W} y2={62} stroke={GREY}/>
<text x={L+10} y={90} className="fl">Ananya likes Rohit</text>{val(90,.2,"—","yes")}
<text x={L+10} y={120} className="fl">Rohit likes Ananya</text>{val(120,.5,"—","yes")}
<text x={L+10} y={150} className="fl">matched</text>{val(150,.6,"no","yes")}
{note(55,96,.22,"Rohit: not yet","middle")}{note(55,112,.22,"→ nothing to do","middle")}
{note(585,96,.52,"Ananya: yes","middle")}{note(585,112,.52,"→ create the match","middle")}
{note(320,200,.65,"It's a match: one message, a push to both phones","middle")}
{!still&&<g aria-hidden="true"><Dot x1={112} x2={196} y={60} y2={86} t0={.05} t1={.18} dur={D}/><Dot x1={528} x2={444} y={60} y2={116} t0={.35} t1={.48} dur={D}/><Glow x={L} y={30} w={W} h={140} t0={.6} t1={.98} dur={D}/></g>}</svg>}

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
"waiting-room":{C:WaitingRoomFig,ar:640/250,title:()=>"50 LAKH PEOPLE, ONE LINE"},
"seat-states":{C:SeatStatesFig,ar:640/220,title:()=>"A SEAT'S THREE STATES"},
"photo-upload":{C:PhotoUploadFig,ar:640/280,title:()=>"AN UPLOAD'S LIFE"},
"like-counter":{C:LikeCounterFig,ar:640/240,title:()=>"ONE HOT ROW, OR EIGHT"},
"feed-fanout":{C:FeedFanoutFig,ar:640/280,title:()=>"PUSH: ONE POST, MANY LISTS"},
"feed-hybrid":{C:FeedHybridFig,ar:640/240,title:()=>"PUSHED, PULLED, MERGED"},
"swipe-flow":{C:SwipeFlowFig,ar:640/300,title:()=>"A SWIPE, AND THE NEXT TWENTY"},
"pair-row":{C:PairRowFig,ar:640/240,title:()=>"ONE ROW PER PAIR"},
};

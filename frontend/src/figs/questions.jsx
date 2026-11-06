// Figures for the Interview Questions articles. Same conventions as components.jsx and concepts.jsx:
// 640-wide viewBox, Swiss colours, SMIL on a loop, nothing animated when `still`, and a `uid` so the
// full-screen copy gets its own marker ids.
import React from"react";import{Dot,Box,Glow,Show,Mark}from"./parts.jsx";

const INK="#1c2733",GREY="#9aa5b4",RED="#c8372d",BLUE="#2855d9";
const Line=({x1,y1,x2,y2,m,dash,c=INK})=><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeDasharray={dash?"4 3":undefined} markerEnd={m?`url(#${m})`:undefined}/>;
const SBox=({x,y,w=110,t,blue,down})=><g><rect x={x} y={y-12} width={w} height="24" fill={down?"#fff5f4":blue?"#f8faff":"#fff"} stroke={down?RED:blue?BLUE:GREY} strokeDasharray={down?"4 3":undefined}/><text x={x+w/2} y={y+4} textAnchor="middle" className="fb">{t}</text></g>;

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

// Coding judge, FIG: the path of a submission. The API saves the code and puts its id on a queue, then
// answers at once. Judge workers take ids, run the code in a sandbox against the tests, and save the
// verdict; the leaderboard updates and the candidate's screen gets the result.
function JudgeFlowFig({still,uid=""}){const M=`jf${uid}`,D="12s";
return <svg viewBox="0 0 640 260" role="img" aria-labelledby={`jft${uid}`}><title id={`jft${uid}`}>A submission's path. The candidate's code goes to the API, which saves it and puts its id on a queue, then answers straight away. Judge workers take ids from the queue, run the code in a sandbox against the test cases, and save the verdict. The leaderboard updates and the candidate's screen shows the result.</title><Mark m={M}/>
<SBox x={0} y={50} w={100} t="Candidate"/><SBox x={150} y={50} w={110} t="API" blue/><SBox x={320} y={50} w={110} t="Queue"/><SBox x={490} y={50} w={150} t="Judge workers"/>
<SBox x={150} y={140} w={110} t="Code store"/><SBox x={490} y={140} w={150} t="Sandbox · tests"/><SBox x={320} y={220} w={110} t="Verdicts"/><SBox x={490} y={220} w={150} t="Leaderboard"/>
<Line x1={102} y1={50} x2={146} y2={50} m={M}/><Line x1={262} y1={50} x2={316} y2={50} m={M}/><Line x1={432} y1={50} x2={486} y2={50} m={M}/><text x="289" y="42" textAnchor="middle" className="fl">id</text>
<Line x1={205} y1={62} x2={205} y2={126} m={M}/><text x="212" y="100" className="fl">save code</text>
<Line x1={565} y1={62} x2={565} y2={126} m={M}/><text x="572" y="100" className="fl">run</text>
<Line x1={540} y1={152} x2={434} y2={212} m={M}/><text x="484" y="198" className="fl">verdict</text>
<Line x1={432} y1={220} x2={486} y2={220} m={M}/><Line x1={318} y1={220} x2={50} y2={220} dash/><Line x1={50} y1={220} x2={50} y2={66} m={M} dash/><text x="60" y="210" className="fl">your result</text>
{!still&&<g aria-hidden="true"><Dot x1={104} x2={144} y={50} t0={.02} t1={.08} dur={D}/><Dot x1={205} x2={205} y={64} y2={124} t0={.1} t1={.16} dur={D}/><Dot x1={264} x2={314} y={50} t0={.18} t1={.24} dur={D}/>
<Dot x1={434} x2={484} y={50} t0={.3} t1={.36} dur={D}/><Dot x1={565} x2={565} y={64} y2={124} t0={.38} t1={.44} dur={D}/><Glow x={490} y={128} w={150} h={24} t0={.44} t1={.62} dur={D}/>
<Dot x1={538} x2={436} y={154} y2={210} t0={.62} t1={.7} dur={D}/><Dot x1={434} x2={484} y={220} t0={.72} t1={.78} dur={D}/><Glow x={490} y={208} w={150} h={24} t0={.78} t1={.9} dur={D}/><Dot x1={316} x2={52} y={220} t0={.8} t1={.88} dur={D}/><Dot x1={50} x2={50} y={218} y2={68} t0={.88} t1={.95} dur={D}/></g>}</svg>}

// Coding judge, FIG: inside one sandbox. The code runs with no network, capped memory, CPU time,
// processes and output, on a read-only copy of the code and test input. Tests run one after another; the first one that fails
// (here test 4, over the time limit) decides the verdict.
function SandboxFig({still,uid=""}){const D="10s";
const limits=["No network","256 MB memory","2 s CPU per test","64 processes","Output capped at 1 MB","Read-only code and input"];
const tests=[["Test 1","passed",0],["Test 2","passed",0],["Test 3","passed",0],["Test 4","over 2 s",1],["Test 5","not run",2]];
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`sbt${uid}`}><title id={`sbt${uid}`}>One sandbox. The candidate's code runs with no network, at most 256 MB of memory, 2 seconds of CPU per test, 64 processes and 1 MB of output, with a read-only copy of the code and the test input. Tests run one after another: tests 1 to 3 pass, test 4 goes over the time limit, so the verdict is "Time limit exceeded on test 4" and test 5 is not run.</title>
<rect x={0} y={20} width={250} height={200} fill="#f8faff" stroke={BLUE}/><text x={12} y={42} className="fb">Sandbox</text>
{limits.map((t,i)=><text key={t} x={12} y={70+i*26} className="fl">· {t}</text>)}
<text x={300} y={42} className="fb">Running the tests</text>
{tests.map(([t,r,bad],i)=>{const y=72+i*28,row=<g><text x={300} y={y} className="fl">{t}</text><text x={400} y={y} className="fb" style={{fill:bad===1?RED:bad===2?GREY:BLUE}}>{r}</text></g>;return still?<g key={t}>{row}</g>:<Show key={t} t0={.08+i*.13} t1={.98} dur={D}>{row}</Show>})}
{still?<text x={300} y={218} className="fb" style={{fill:RED}}>Time limit exceeded on test 4</text>:<Show t0={.66} t1={.98} dur={D}><text x={300} y={218} className="fb" style={{fill:RED}}>Time limit exceeded on test 4</text></Show>}</svg>}

// Chat app, FIG: a message's path. Ananya's phone holds a connection to gateway A. The chat service gives the
// message the conversation's next number, saves it, and asks the registry where Rohit is connected:
// gateway B, which pushes it down his open connection. If he's offline, a phone notification goes instead.
function ChatFlowFig({still,uid=""}){const M=`cf${uid}`,D="12s";
return <svg viewBox="0 0 640 270" role="img" aria-labelledby={`cft${uid}`}><title id={`cft${uid}`}>A message's path. Ananya's phone keeps a connection open to gateway A. The chat service gives the message the conversation's next number, saves it, and asks the registry which gateway Rohit is connected to, and hands it to gateway B, which sends it down Rohit's open connection. If Rohit is offline, a phone notification goes instead.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="Ananya's phone"/><SBox x={160} y={50} w={110} t="Gateway A"/><SBox x={320} y={50} w={130} t="Chat service" blue/><SBox x={500} y={50} w={140} t="Messages"/>
<SBox x={320} y={140} w={130} t="Registry"/><SBox x={160} y={230} w={110} t="Gateway B"/><SBox x={0} y={230} w={110} t="Rohit's phone"/><SBox x={500} y={230} w={140} t="Phone notification"/>
<Line x1={112} y1={50} x2={156} y2={50} m={M}/><Line x1={272} y1={50} x2={316} y2={50} m={M}/><Line x1={452} y1={50} x2={496} y2={50} m={M}/><text x="474" y="32" textAnchor="middle" className="fl">#45 saved</text>
<Line x1={385} y1={62} x2={385} y2={126} m={M}/><text x="392" y="100" className="fl">where is he?</text>
<Line x1={322} y1={62} x2={240} y2={216} m={M}/><text x="262" y="150" textAnchor="end" className="fl">to gateway B</text>
<Line x1={158} y1={230} x2={114} y2={230} m={M}/>
<Line x1={450} y1={62} x2={540} y2={216} m={M} dash/><text x="510" y="150" className="fl">if offline</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={50} t0={.02} t1={.08} dur={D}/><Dot x1={274} x2={314} y={50} t0={.1} t1={.16} dur={D}/><Dot x1={454} x2={494} y={50} t0={.18} t1={.24} dur={D}/><Glow x={500} y={38} w={140} h={24} t0={.24} t1={.34} dur={D}/>
<Dot x1={385} x2={385} y={64} y2={124} t0={.36} t1={.44} dur={D}/><Dot x1={320} x2={242} y={66} y2={214} t0={.46} t1={.56} dur={D}/><Dot x1={156} x2={116} y={230} t0={.58} t1={.64} dur={D}/><Glow x={0} y={218} w={110} h={24} t0={.64} t1={.76} dur={D}/>
<Dot x1={452} x2={538} y={66} y2={214} t0={.8} t1={.9} dur={D}/></g>}</svg>}

// Chat app, FIG: catching up. Every message in a conversation has the next number. Rohit's phone was
// offline after #42; when it reconnects it says "I have up to 42" and gets 43, 44 and 45, in order.
function ChatSyncFig({still,uid=""}){const D="10s";
const msgs=[[41,"Ananya: 8 pm?"],[42,"Rohit: done"],[43,"Meera: me too"],[44,"Ananya: booked"],[45,"Meera: 4 of us"]];
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`cst${uid}`}><title id={`cst${uid}`}>Catching up. Every message in a conversation gets the next number. Rohit's phone has messages up to number 42, then goes offline. When it reconnects, it says "I have up to 42", and the server sends 43, 44 and 45, in order.</title>
<text x="0" y="28" className="fb">The conversation, in order</text>
{msgs.map(([n,t],i)=><g key={n}><rect x={i*128} y={44} width={120} height={44} fill={n>42?"#f8faff":"#fff"} stroke={n>42?BLUE:GREY}/><text x={i*128+8} y={62} className="fb">#{n}</text><text x={i*128+8} y={80} className="fl">{t}</text></g>)}
<text x="0" y="128" className="fb">Rohit's phone</text>
<text x="0" y="150" className="fl">has up to #42, then offline</text>
{still?<text x="0" y="180" className="fl" style={{fill:BLUE}}>back online: "I have up to 42" → gets #43, #44, #45</text>:<Show t0={.2} t1={.98} dur={D}><text x="0" y="180" className="fl" style={{fill:BLUE}}>back online: "I have up to 42" → gets #43, #44, #45</text></Show>}
{!still&&<g aria-hidden="true">{[2,3,4].map((i,k)=><Dot key={i} x1={i*128+60} x2={300} y={92} y2={168} t0={.3+k*.15} t1={.42+k*.15} dur={D}/>)}</g>}
<text x="0" y="210" className="fl" style={{fill:GREY}}>a resend carries the phone's own message id, so it's saved once</text></svg>}

// Notifications, FIG: the path. Order, login and marketing services send events to the notification API,
// which checks preferences and devices, then puts each message in the lane for its priority. Channel
// workers send through push, SMS and email providers and record what happened.
function NotifyFlowFig({still,uid=""}){const M=`nf${uid}`,D="12s";
const lanes=[["Urgent: OTPs",70],["Normal: order updates",120],["Bulk: promos",170]];
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`nft${uid}`}><title id={`nft${uid}`}>Order, login and marketing services send events to the notification API. It checks the person's preferences, then puts each message in a lane for its priority: urgent for OTPs, normal for order updates, bulk for promotions. Channel workers take from the lanes, urgent first, and send through push, SMS and email providers.</title><Mark m={M}/>
<SBox x={0} y={70} w={100} t="Login"/><SBox x={0} y={120} w={100} t="Orders"/><SBox x={0} y={170} w={100} t="Marketing"/>
<SBox x={140} y={120} w={120} t="Notification API" blue/><SBox x={140} y={190} w={120} t="Preferences"/>
{lanes.map(([t,y])=><SBox key={t} x={300} y={y} w={170} t={t}/>)}
<SBox x={510} y={95} w={126} t="Channel workers" blue/><text x={573} y={140} textAnchor="middle" className="fl">push · SMS · email</text>
<Line x1={102} y1={70} x2={138} y2={114} m={M}/><Line x1={102} y1={120} x2={136} y2={120} m={M}/><Line x1={102} y1={170} x2={138} y2={126} m={M}/>
<Line x1={200} y1={132} x2={200} y2={176} m={M}/>
{lanes.map(([t,y])=><Line key={t} x1={262} y1={120} x2={296} y2={y} m={M}/>)}
{lanes.map(([t,y])=><Line key={t} x1={472} y1={y} x2={508} y2={y<95?90:y<150?98:104} m={M}/>)}
<text x={385} y={40} textAnchor="middle" className="fl">one lane per priority</text>
{!still&&<g aria-hidden="true"><Dot x1={104} x2={136} y={70} y2={114} t0={.02} t1={.1} dur={D}/><Dot x1={200} x2={200} y={134} y2={174} t0={.12} t1={.2} dur={D}/><Dot x1={264} x2={294} y={120} y2={70} t0={.24} t1={.32} dur={D}/><Glow x={300} y={58} w={170} h={24} t0={.32} t1={.42} dur={D}/><Dot x1={474} x2={506} y={70} y2={90} t0={.44} t1={.52} dur={D}/><Glow x={510} y={83} w={126} h={24} t0={.52} t1={.66} dur={D}/></g>}</svg>}

// Notifications, FIG: priority lanes. A promotion to 5 crore people fills the bulk lane, which drains at
// a steady rate for an hour. An OTP arrives in the middle of it, goes into the empty urgent lane and is
// sent in about 2 seconds, not after the promotion.
function LanesFig({still,uid=""}){const D="10s",X=150,W=360;
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`lnt${uid}`}><title id={`lnt${uid}`}>Two lanes. The bulk lane holds a promotion to 5 crore people and is drained at a steady rate over about an hour. An OTP arrives in the middle of it. It goes into the urgent lane, which is empty, and is sent in about 2 seconds instead of waiting behind the promotion.</title>
<text x={0} y={64} className="fb">Bulk lane</text><rect x={X} y={44} width={W} height={32} fill="#fff" stroke={GREY}/>
{Array.from({length:18},(_,i)=><rect key={i} x={X+6+i*19.5} y={50} width={14} height={20} fill="#e6eaf0"/>)}
<text x={X+W+10} y={58} className="fl">5 crore promos</text><text x={X+W+10} y={74} className="fl">drained over ~1 hour</text>
<text x={0} y={144} className="fb">Urgent lane</text><rect x={X} y={124} width={W} height={32} fill="#fff" stroke={BLUE}/>
{step(.25,<g><rect x={X+W-24} y={130} width={18} height={20} fill={BLUE}/><text x={X+W+10} y={138} className="fl" style={{fill:BLUE}}>OTP for Ananya</text></g>)}
{step(.5,<text x={X+W+10} y={154} className="fl" style={{fill:BLUE}}>sent in ~2 s</text>)}
{step(.65,<text x={0} y={200} className="fl">workers always empty the urgent lane first; the promo blast never slows an OTP</text>)}</svg>}

// Autocomplete, FIG: the two halves. Reading: the phone waits a moment after each keystroke, short prefixes
// come from a CDN, the rest from suggest servers that hold the whole prefix map in memory. Building: every
// hour, search logs and menus are turned into a new prefix map, which the servers swap in.
function SuggestFlowFig({still,uid=""}){const M=`sg2${uid}`,D="12s";
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`sgf${uid}`}><title id={`sgf${uid}`}>Reading: the phone waits a moment after each keystroke, then asks for suggestions. Short prefixes like "b" or "bi" are the same for everyone in a city, so a CDN answers them. Longer ones go to suggest servers that hold the whole prefix map in memory. Building: every hour, a builder turns search logs and menus into a new prefix map, and the servers swap it in.</title><Mark m={M}/>
<text x={0} y={24} className="fb">Reading, on every pause in typing</text>
<SBox x={0} y={60} w={110} t="Phone"/><SBox x={160} y={60} w={110} t="CDN"/><SBox x={320} y={60} w={160} t="Suggest servers" blue/>
<Line x1={112} y1={60} x2={156} y2={60} m={M}/><Line x1={272} y1={60} x2={316} y2={60} m={M}/><text x={134} y={88} textAnchor="middle" className="fl">"biry"</text><text x={215} y={88} textAnchor="middle" className="fl">"b", "bi" here</text>
<text x={380} y={88} textAnchor="middle" className="fl">prefix map in memory</text>
<text x={0} y={140} className="fb">Building, every hour</text>
<SBox x={0} y={180} w={110} t="Search logs"/><SBox x={0} y={220} w={110} t="Menus"/><SBox x={160} y={200} w={110} t="Builder"/><SBox x={320} y={200} w={160} t="New prefix map"/>
<Line x1={112} y1={180} x2={156} y2={196} m={M}/><Line x1={112} y1={220} x2={156} y2={204} m={M}/><Line x1={272} y1={200} x2={316} y2={200} m={M}/>
<Line x1={462} y1={186} x2={462} y2={76} m={M} dash/><text x={470} y={140} className="fl">swap in when checked</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={60} t0={.02} t1={.08} dur={D}/><Dot x1={274} x2={314} y={60} t0={.1} t1={.16} dur={D}/><Glow x={320} y={48} w={160} h={24} t0={.16} t1={.3} dur={D}/>
<Dot x1={114} x2={154} y={180} y2={196} t0={.45} t1={.52} dur={D}/><Dot x1={274} x2={314} y={200} t0={.56} t1={.62} dur={D}/><Dot x1={462} x2={462} y={184} y2={78} t0={.7} t1={.82} dur={D}/><Glow x={320} y={48} w={160} h={24} t0={.82} t1={.95} dur={D}/></g>}</svg>}

// Autocomplete, FIG: the prefix map. Each prefix already has its top suggestions worked out, so a keystroke
// is one lookup, not a search.
function PrefixMapFig({still,uid=""}){const D="9s";
const rows=[["b",["burger","biryani","butter chicken"]],["bi",["biryani","bisi bele bath","biscuit cake"]],["bir",["biryani","biryani near me","birthday cake"]],["biry",["biryani","biryani family pack","biryani rice"]]];
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`pmt${uid}`}><title id={`pmt${uid}`}>The prefix map: every prefix already has its top suggestions worked out. "b" gives burger, biryani, butter chicken. "bi" gives biryani, bisi bele bath, biscuit cake. "bir" gives biryani, biryani near me, birthday cake. "biry" gives biryani, biryani family pack, biryani rice. Each keystroke is one lookup, not a search.</title>
<text x={0} y={24} className="fb">Prefix</text><text x={110} y={24} className="fb">Top suggestions (worked out every hour)</text>
{rows.map(([k,v],i)=>{const y=60+i*40,row=<g><rect x={0} y={y-16} width={80} height={28} fill="#f8faff" stroke={BLUE}/><text x={12} y={y+3} className="fb">"{k}"</text>{v.map((t,j)=><g key={t}><rect x={110+j*176} y={y-16} width={168} height={28} fill="#fff" stroke={GREY}/><text x={118+j*176} y={y+3} className="fl">{j+1}. {t}</text></g>)}</g>;return still?<g key={k}>{row}</g>:<Show key={k} t0={.05+i*.18} t1={.98} dur={D}>{row}</Show>})}
<text x={0} y={222} className="fl">one lookup per keystroke; nothing is searched while you type</text></svg>}

// Payments, FIG: the path. The order service asks the payment service for a payment for order #91. It
// creates one with the order as its idempotency key and hands the app over to the payment gateway (UPI or
// card). The gateway tells us the result by a signed webhook; the payment service records it in the ledger
// and tells the order service. The app asks the payment service, never the gateway, whether it's paid.
function PayFlowFig({still,uid=""}){const M=`pf${uid}`,D="12s";
return <svg viewBox="0 0 640 210" role="img" aria-labelledby={`pft${uid}`}><title id={`pft${uid}`}>The order service asks the payment service for a payment for order 91. The payment service creates one, using the order as its idempotency key, and hands the app over to the payment gateway for UPI or card. The gateway sends the result back by a signed webhook. The payment service records it in the ledger and tells the order service. The app asks the payment service, not the gateway, whether it has paid.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="App"/><SBox x={160} y={50} w={130} t="Order service"/><SBox x={340} y={50} w={140} t="Payment service" blue/><SBox x={530} y={50} w={110} t="Gateway"/>
<SBox x={340} y={160} w={140} t="Ledger"/><text x={410} y={196} textAnchor="middle" className="fl">entries only added</text>
<Line x1={112} y1={50} x2={156} y2={50} m={M}/><Line x1={292} y1={50} x2={336} y2={50} m={M}/><text x={314} y={36} textAnchor="middle" className="fl">pay #91</text>
<Line x1={482} y1={44} x2={526} y2={44} m={M}/><Line x1={526} y1={58} x2={482} y2={58} m={M} dash/><text x={505} y={84} textAnchor="middle" className="fl">signed webhook</text>
<Line x1={410} y1={62} x2={410} y2={146} m={M}/><text x={418} y={110} className="fl">record</text>
<Line x1={55} y1={62} x2={55} y2={100} dash/><Line x1={55} y1={100} x2={400} y2={100} dash/><Line x1={400} y1={100} x2={400} y2={66} m={M} dash/><text x={60} y={118} className="fl">"paid yet?" asks us, not the gateway</text>
<text x={585} y={112} textAnchor="middle" className="fl" style={{fill:GREY}}>the app opens</text><text x={585} y={128} textAnchor="middle" className="fl" style={{fill:GREY}}>UPI or a card page</text>
{!still&&<g aria-hidden="true"><Dot x1={294} x2={334} y={50} t0={.02} t1={.1} dur={D}/><Dot x1={484} x2={524} y={44} t0={.14} t1={.22} dur={D}/><Dot x1={524} x2={484} y={58} t0={.4} t1={.48} dur={D}/><Dot x1={410} x2={410} y={64} y2={144} t0={.5} t1={.6} dur={D}/><Glow x={340} y={148} w={140} h={24} t0={.6} t1={.72} dur={D}/><Dot x1={338} x2={294} y={50} t0={.74} t1={.82} dur={D}/></g>}</svg>}

// Payments, FIG: a payment's states. Created, then pending while the person is in their UPI app. It ends
// succeeded or failed. If the gateway doesn't answer in time it's unknown, never "failed": we ask the
// gateway until it settles. A success can later be refunded.
function PayStatesFig({still,uid=""}){const M=`ps${uid}`,D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`pst${uid}`}><title id={`pst${uid}`}>A payment's states. It starts created, then becomes pending while the person approves it in their UPI app. It ends succeeded or failed. If the gateway doesn't answer in time, the payment is unknown, never failed: the payment service keeps asking the gateway until it is succeeded or failed. A succeeded payment can later be refunded.</title><Mark m={M}/>
<SBox x={0} y={110} w={90} t="created"/><SBox x={130} y={110} w={90} t="pending"/>
{step(.15,<SBox x={290} y={40} w={110} t="succeeded" blue/>)}{step(.15,<SBox x={290} y={110} w={110} t="failed"/>)}{step(.35,<SBox x={290} y={180} w={110} t="unknown" down/>)}
{step(.6,<SBox x={480} y={40} w={110} t="refunded"/>)}
<Line x1={92} y1={110} x2={126} y2={110} m={M}/>
{step(.15,<g><Line x1={222} y1={104} x2={286} y2={46} m={M}/><Line x1={222} y1={110} x2={286} y2={110} m={M}/></g>)}
{step(.35,<g><Line x1={222} y1={116} x2={286} y2={176} m={M} dash/><text x={236} y={160} textAnchor="end" className="fl">no answer</text></g>)}
{step(.45,<g><Line x1={402} y1={176} x2={440} y2={140} dash c={RED}/><Line x1={440} y1={140} x2={440} y2={50} dash c={RED}/><Line x1={440} y1={50} x2={404} y2={50} m={M} dash c={RED}/><Line x1={440} y1={120} x2={404} y2={116} m={M} dash c={RED}/><text x={450} y={150} className="fl" style={{fill:RED}}>ask the gateway</text><text x={450} y={166} className="fl" style={{fill:RED}}>until it settles</text></g>)}
{step(.6,<Line x1={402} y1={40} x2={476} y2={40} m={M}/>)}
{step(.75,<text x={0} y={214} className="fl">never show "failed" for an unknown payment, or the person pays again</text>)}</svg>}

// Job scheduler, FIG: the path. Services add jobs with a run time. Schedulers look only at minutes that are
// due, claim each job with a lease, and put them on a queue. Executors run them, record the
// result, retry failures later, and add the next run of a recurring job.
function SchedFlowFig({still,uid=""}){const M=`sc${uid}`,D="12s";
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`sct${uid}`}><title id={`sct${uid}`}>Services add jobs with a time to run. The jobs table is grouped by minute. Schedulers look only at minutes that are due, claim each job with a lease, and put it on a queue. Executors run the jobs, record the result, put failures back with a later time to retry, and add the next run of a recurring job.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="Services"/><SBox x={160} y={50} w={150} t="Jobs (by minute)" blue/><SBox x={160} y={150} w={150} t="Schedulers"/><SBox x={360} y={150} w={100} t="Queue"/><SBox x={510} y={150} w={130} t="Executors"/>
<Line x1={112} y1={50} x2={156} y2={50} m={M}/><text x={134} y={36} textAnchor="middle" className="fl">run at 21:00</text>
<Line x1={235} y1={136} x2={235} y2={64} m={M}/><text x={243} y={104} className="fl">claim due jobs, with a lease</text>
<Line x1={312} y1={150} x2={356} y2={150} m={M}/><Line x1={462} y1={150} x2={506} y2={150} m={M}/>
<Line x1={575} y1={136} x2={575} y2={56} dash/><Line x1={575} y1={56} x2={314} y2={56} m={M} dash/><text x={445} y={48} textAnchor="middle" className="fl">done · retry later · next run</text>
<text x={0} y={220} className="fl">nobody scans the whole table: only minutes that are due are looked at</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={50} t0={.02} t1={.1} dur={D}/><Glow x={160} y={38} w={150} h={24} t0={.1} t1={.2} dur={D}/><Dot x1={235} x2={235} y={134} y2={66} t0={.24} t1={.32} dur={D}/><Dot x1={314} x2={354} y={150} t0={.36} t1={.44} dur={D}/><Dot x1={464} x2={504} y={150} t0={.46} t1={.54} dur={D}/><Glow x={510} y={138} w={130} h={24} t0={.54} t1={.68} dur={D}/><Dot x1={575} x2={316} y={56} t0={.72} t1={.86} dur={D}/></g>}</svg>}

// Job scheduler, FIG: a lease runs out. Worker A claims the 21:00 payout job with a 30-second lease and dies
// at 21:00:10. Nobody touches the job until the lease ends at 21:00:30; then worker B claims it and runs it.
// If A was only paused, the job id stops its late work from counting twice.
function LeaseFig({still,uid=""}){const D="12s",X=110,W=500,T=60;const x=(s)=>X+s/T*W;
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`lst${uid}`}><title id={`lst${uid}`}>A lease running out. Worker A claims the 9 pm payout job with a 30-second lease and dies 10 seconds in, before its next heartbeat. Nobody else touches the job until the lease ends at 30 seconds. Then worker B claims it with a new lease and runs it to the end. If A was only paused and wakes up, the job's id makes its late work harmless.</title>
{[0,10,20,30,40,50,60].map(s=><g key={s}><line x1={x(s)} y1={40} x2={x(s)} y2={180} stroke="#e6eaf0"/><text x={x(s)} y={198} textAnchor="middle" className="fl">{s===60?"21:01:00":`21:00:${String(s).padStart(2,"0")}`}</text></g>)}
<text x={0} y={74} className="fb">Worker A</text><text x={0} y={144} className="fb">Worker B</text>
<rect x={x(0)} y={60} width={x(30)-x(0)} height={22} fill="#f8faff" stroke={BLUE} strokeDasharray="4 3"/><text x={x(15)} y={54} textAnchor="middle" className="fl">A's lease, 30 s</text>
<rect x={x(0)} y={64} width={x(10)-x(0)} height={14} fill={BLUE}/>{step(.2,<text x={x(10)+6} y={76} className="fb" style={{fill:RED}}>✕ dies</text>)}
{step(.5,<g><rect x={x(30)} y={130} width={x(60)-x(30)} height={22} fill="#f8faff" stroke={BLUE} strokeDasharray="4 3"/><rect x={x(30)} y={134} width={x(48)-x(30)} height={14} fill={BLUE}/><text x={x(45)} y={124} textAnchor="middle" className="fl">B claims when the lease ends, runs it</text></g>)}
{step(.75,<text x={x(48)+6} y={146} className="fb" style={{fill:BLUE}}>✓ done</text>)}</svg>}

// Web crawler, FIG: the loop. The frontier hands out URLs; fetchers check robots.txt and download pages;
// pages are saved and parsed; new links go through the seen filter, and only new ones join the frontier.
function CrawlFlowFig({still,uid=""}){const M=`cw${uid}`,D="12s";
return <svg viewBox="0 0 640 200" role="img" aria-labelledby={`cwt${uid}`}><title id={`cwt${uid}`}>The crawl loop. The frontier hands out URLs to fetchers, which check each site's robots.txt and download the page. Pages are saved and parsed for links. Each new link goes through the seen filter; only links never seen before join the frontier, and the loop continues.</title><Mark m={M}/>
<SBox x={0} y={60} w={120} t="Frontier" blue/><SBox x={170} y={60} w={130} t="Fetchers"/><SBox x={350} y={60} w={120} t="Page store"/><SBox x={520} y={60} w={120} t="Parser"/>
<SBox x={350} y={170} w={170} t="Seen filter"/>
<Line x1={122} y1={60} x2={166} y2={60} m={M}/><Line x1={302} y1={60} x2={346} y2={60} m={M}/><Line x1={472} y1={60} x2={516} y2={60} m={M}/>
<text x={235} y={92} textAnchor="middle" className="fl">robots.txt first</text>
<Line x1={580} y1={72} x2={580} y2={170} dash/><Line x1={580} y1={170} x2={524} y2={170} m={M} dash/><text x={588} y={124} className="fl">links</text>
<Line x1={348} y1={170} x2={60} y2={170} dash/><Line x1={60} y1={170} x2={60} y2={74} m={M} dash/><text x={200} y={162} textAnchor="middle" className="fl">only links never seen</text>
<text x={0} y={18} className="fl">seed: a list of known restaurant and food sites</text>
{!still&&<g aria-hidden="true"><Dot x1={124} x2={164} y={60} t0={.02} t1={.1} dur={D}/><Glow x={170} y={48} w={130} h={24} t0={.1} t1={.22} dur={D}/><Dot x1={304} x2={344} y={60} t0={.24} t1={.3} dur={D}/><Dot x1={474} x2={514} y={60} t0={.34} t1={.4} dur={D}/><Dot x1={580} x2={580} y={74} y2={168} t0={.44} t1={.52} dur={D}/><Glow x={350} y={158} w={170} h={24} t0={.54} t1={.66} dur={D}/><Dot x1={346} x2={62} y={170} t0={.68} t1={.8} dur={D}/><Dot x1={60} x2={60} y={168} y2={76} t0={.8} t1={.88} dur={D}/></g>}</svg>}

// Web crawler, FIG: politeness. The frontier keeps one queue per site and a "not before" time for each.
// Fetchers take the next URL only from sites whose time has come, so one big site's 10 lakh URLs never
// hammer it, and never block the small sites.
function PoliteFig({still,uid=""}){const D="10s";
const hosts=[["pune-foodie.example","10 lakh URLs","in 1 s"],["chennai-eats.example","4,200 URLs","now"],["dhaba-diaries.example","18 URLs","now"],["mumbai-menus.example","90,000 URLs","in 3 s"]];
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`plt${uid}`}><title id={`plt${uid}`}>Politeness. The frontier keeps one queue per site, each with a not-before time. Fetchers take the next URL only from sites whose time has come. A big food blog with 10 lakh URLs waits a second between pages, so it is never hammered, and small sites with a few URLs are not stuck behind it.</title>
<text x={0} y={24} className="fb">Site</text><text x={210} y={24} className="fb">Waiting</text><text x={340} y={24} className="fb">Next fetch</text>
{hosts.map(([h,n,t],i)=>{const y=60+i*36,ready=t==="now";const row=<g><rect x={0} y={y-16} width={200} height={26} fill={ready?"#f8faff":"#fff"} stroke={ready?BLUE:GREY}/><text x={10} y={y+2} className="fl">{h}</text><text x={210} y={y+2} className="fl">{n}</text><text x={340} y={y+2} className="fb" style={{fill:ready?BLUE:GREY}}>{t}</text>{ready&&<text x={410} y={y+2} className="fl" style={{fill:BLUE}}>→ a fetcher takes one</text>}</g>;return still?<g key={h}>{row}</g>:<Show key={h} t0={.05+i*.15} t1={.98} dur={D}>{row}</Show>})}
<text x={0} y={216} className="fl">one queue per site, one page at a time each; the big site never blocks the small ones</text></svg>}

// Leaderboard, FIG: the path. Answers are saved as they arrive. When a question closes, the scorer adds
// points for the right answers in batches to sorted sets split across several Redis shards. The leaderboard
// API serves the top 100 (cached for a second) and each player's own rank.
function LbFlowFig({still,uid=""}){const M=`lb${uid}`,D="12s";
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`lbt${uid}`}><title id={`lbt${uid}`}>Players' answers are saved as they arrive. When a question closes, the scorer adds points for every right answer, in batches, to sorted sets split across several Redis shards. The leaderboard API serves the top 100, cached for a second, and each player's own rank. The saved answers are the record; the shards can always be rebuilt from them.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="Players"/><SBox x={160} y={50} w={130} t="Answer service"/><SBox x={340} y={50} w={120} t="Answers (saved)"/>
<SBox x={340} y={130} w={120} t="Scorer"/><SBox x={510} y={100} w={130} t="Shard 1" blue/><SBox x={510} y={130} w={130} t="Shard 2" blue/><SBox x={510} y={160} w={130} t="Shard 3" blue/>
<SBox x={160} y={200} w={160} t="Leaderboard API"/>
<Line x1={112} y1={50} x2={156} y2={50} m={M}/><Line x1={292} y1={50} x2={336} y2={50} m={M}/><Line x1={400} y1={62} x2={400} y2={116} m={M}/><text x={408} y={94} className="fl">question closes</text>
<Line x1={462} y1={124} x2={506} y2={104} m={M}/><Line x1={462} y1={130} x2={506} y2={130} m={M}/><Line x1={462} y1={136} x2={506} y2={156} m={M}/><text x={484} y={196} textAnchor="middle" className="fl">points, in batches</text>
<Line x1={508} y1={168} x2={324} y2={198} m={M} dash/><Line x1={158} y1={200} x2={60} y2={66} m={M} dash/><text x={66} y={150} className="fl">top 100 · my rank</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={50} t0={.02} t1={.08} dur={D}/><Dot x1={294} x2={334} y={50} t0={.1} t1={.16} dur={D}/><Dot x1={400} x2={400} y={64} y2={114} t0={.24} t1={.32} dur={D}/><Glow x={510} y={88} w={130} h={84} t0={.36} t1={.5} dur={D}/><Dot x1={506} x2={326} y={170} y2={198} t0={.56} t1={.66} dur={D}/><Dot x1={156} x2={62} y={198} y2={68} t0={.7} t1={.82} dur={D}/></g>}</svg>}

// Leaderboard, FIG: rank from counts. Keep how many players have each score band. Ananya has 340 points:
// the 37,200 players in the bands above are ahead, plus those above her in her own band: about rank 80,000,
// the top 2%, without asking every shard.
function LbRankFig({still,uid=""}){const D="10s";
const bands=[["400+",1200],["350–399",36000],["300–349",173200],["250–299",410000],["200–249",820000]],max=820000,X=120,W=330;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`lrt${uid}`}><title id={`lrt${uid}`}>Rank from counts. The leaderboard keeps how many players have each band of scores: 1,200 have 400 or more, 36,000 have 350 to 399, 1,73,200 have 300 to 349, and so on. Ananya has 340 points. Everyone in the two bands above hers, 37,200 players, is ahead, plus those above her within her own band, so her rank, about 80,000th, the top 2% of 50 lakh, is found with one count inside her band instead of asking every shard.</title>
<text x={0} y={22} className="fb">Score band</text><text x={X} y={22} className="fb">Players</text>
{bands.map(([b,n],i)=>{const y=44+i*32,w=Math.max(4,n/max*W),me=i===2;return <g key={b}><text x={0} y={y+14} className="fl">{b}</text><rect x={X} y={y} width={w} height={20} fill={me?BLUE:"#b9c9ff"}/><text x={X+w+8} y={y+14} className="fl">{n.toLocaleString("en-IN")}</text></g>})}
{still?<g><text x={X} y={222} className="fb" style={{fill:BLUE}}>Ananya, 340: 37,200 ahead in higher bands, plus her place in her band</text></g>:<Show t0={.3} t1={.98} dur={D}><text x={X} y={222} className="fb" style={{fill:BLUE}}>Ananya, 340: 37,200 ahead in higher bands, plus her place in her band</text></Show>}</svg>}

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
"judge-flow":{C:JudgeFlowFig,ar:640/260,title:()=>"A SUBMISSION'S PATH"},
"sandbox":{C:SandboxFig,ar:640/240,title:()=>"INSIDE ONE SANDBOX"},
"chat-flow":{C:ChatFlowFig,ar:640/270,title:()=>"A MESSAGE'S PATH"},
"chat-sync":{C:ChatSyncFig,ar:640/220,title:()=>"CATCHING UP BY NUMBER"},
"notify-flow":{C:NotifyFlowFig,ar:640/230,title:()=>"ONE API, THREE LANES"},
"lanes":{C:LanesFig,ar:640/220,title:()=>"THE OTP DOESN'T WAIT"},
"suggest-flow":{C:SuggestFlowFig,ar:640/250,title:()=>"SERVED FROM MEMORY, BUILT EVERY HOUR"},
"prefix-map":{C:PrefixMapFig,ar:640/230,title:()=>"EVERY PREFIX, ANSWERED IN ADVANCE"},
"pay-flow":{C:PayFlowFig,ar:640/210,title:()=>"WHO TALKS TO THE GATEWAY"},
"pay-states":{C:PayStatesFig,ar:640/220,title:()=>"UNKNOWN IS NOT FAILED"},
"sched-flow":{C:SchedFlowFig,ar:640/240,title:()=>"DUE THIS MINUTE, CLAIMED ONCE"},
"lease":{C:LeaseFig,ar:640/220,title:()=>"WHEN A WORKER DIES MID-JOB"},
"crawl-flow":{C:CrawlFlowFig,ar:640/200,title:()=>"FETCH, PARSE, FILTER, REPEAT"},
"polite":{C:PoliteFig,ar:640/230,title:()=>"ONE QUEUE PER SITE"},
"lb-flow":{C:LbFlowFig,ar:640/230,title:()=>"SCORED WHEN THE QUESTION CLOSES"},
"lb-rank":{C:LbRankFig,ar:640/240,title:()=>"YOUR RANK FROM A FEW COUNTS"},
};

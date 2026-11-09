// Figures for the Networking tab. Same conventions as concepts.jsx and tools.jsx: 640-wide viewBox, Swiss
// colours, four captioned steps on a loop, the last step drawn when `still` (reduced motion), a `uid` for markers.
import React from"react";import{Dot,Glow,Show,Mk,Bx,Ar,Caps,Cap,Life,Msg,INK,GREY,RED,BLUE,LB,LR,FB,T,Steps,Fig,X}from"./parts.jsx";


// ---------- 01 Layers ----------

// FIG 1: a request is wrapped layer by layer on the phone and unwrapped on the server.
function StackFig({still,uid=""}){const M=`ns${uid}`,D="14s";
const L=[["Application","HTTP"],["Transport","TCP"],["Network","IP"],["Link","Wi-Fi, fibre"]],Y=[44,86,128,170];
const stack=(x,hi)=>L.map(([t,s],i)=><Bx key={i} x={x} y={Y[i]} w={150} h={34} t={t} s={s} c={hi?BLUE:GREY} fill={hi?LB:"#fff"}/>);
const pay=y=><Bx x={364} y={y} w={104} h={34} t="GET /menu/42" c={BLUE} fill={LB}/>;
const tcp=y=><Bx x={262} y={y} w={100} h={34} t="TCP" s="port 443, seq 1"/>,ip=y=><Bx x={164} y={y} w={96} h={34} t="IP" s="to 13.235.4.20"/>;
const caps=[["1 · the app writes a request. It knows nothing about cables or radio",INK],["2 · TCP wraps it with ports and a sequence number, so it can be ordered and resent",BLUE],["3 · IP wraps that with addresses, so routers can carry it between networks",BLUE],["4 · the link sends the bits; the server unwraps the layers in reverse, up to its app",BLUE]];
const s1=pay(Y[0]),s2=<g>{tcp(Y[1])}{pay(Y[1])}</g>,s3=<g>{ip(Y[2])}{tcp(Y[2])}{pay(Y[2])}</g>;
const s4=<g><Ar x1={162} y1={187} x2={476} y2={187} m={M} c={BLUE}/><T x={319} y={208} t="0100 0111 0100 0101 …" a="middle" c={BLUE}/>{stack(480,1)}<Ar x1={636} y1={196} x2={636} y2={52} m={M} c={BLUE}/>{!still&&<Dot x1={162} x2={476} y={187} t0={.78} t1={.9} dur={D}/>}</g>;
return <Fig still={still} h={222} id={`nst${uid}`} M={M} caps={caps} title="How a request is wrapped in layers. On the phone the app writes GET /menu/42. TCP wraps it with ports and a sequence number so it can be put in order and resent. IP wraps that with the source and destination addresses so routers can carry it between networks. The link layer sends the bits over Wi-Fi or fibre, and the server unwraps the layers in reverse order, up to its own application."
base={<g>{stack(10)}{stack(480)}<T x={85} y={216} t="phone" a="middle"/><T x={555} y={216} t="server" a="middle"/></g>} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: private addresses inside a network, public ones on the internet.
function IpFig({still,uid=""}){const M=`ni${uid}`,D="14s";
const base=<g><Bx x={10} y={96} w={120} h={44} t="Phone" s="192.168.1.23"/><Ar x1={132} y1={118} x2={186} y2={118} m={M}/><Bx x={190} y={96} w={130} h={44} t="Home router" s="public 49.36.80.14"/><Ar x1={322} y1={118} x2={366} y2={118} m={M}/><Bx x={370} y={96} w={90} h={44} t="Internet" s="many routers"/><Ar x1={462} y1={118} x2={486} y2={118} m={M}/><Bx x={490} y={96} w={140} h={44} t="Zotato LB" s="13.235.4.20"/>
<rect x={4} y={58} width={322} height={132} fill="none" stroke={GREY} strokeDasharray="3 3"/><T x={10} y={72} t="home Wi-Fi: private addresses"/><rect x={484} y={58} width={152} height={176} fill="none" stroke={GREY} strokeDasharray="3 3"/><T x={490} y={72} t="Zotato's network"/></g>;
const caps=[["1 · the home router lends the phone a private address with DHCP",INK],["2 · private addresses can't cross the internet: the router swaps in its public one (NAT)",BLUE],["3 · routers on the way forward it by the destination address's prefix",BLUE],["4 · inside Zotato, the load balancer passes it on to a server's private address",BLUE]];
const s1=<g><T x={70} y={160} t="DHCP lease:" a="middle"/><T x={70} y={174} t="192.168.1.23, 24 h" a="middle" c={BLUE}/></g>;
const s2=<g><T x={255} y={160} t="from 192.168.1.23" a="middle"/><T x={255} y={174} t="becomes 49.36.80.14" a="middle" c={BLUE}/>{!still&&<Dot x1={132} x2={366} y={118} t0={.27} t1={.4} dur={D}/>}</g>;
const s3=<g><T x={415} y={160} t="13.235.0.0/16" a="middle"/><T x={415} y={174} t="→ Mumbai" a="middle" c={BLUE}/>{!still&&<Dot x1={366} x2={486} y={118} t0={.52} t1={.62} dur={D}/>}</g>;
const s4=<g><Ar x1={560} y1={142} x2={560} y2={184} m={M} c={BLUE}/><Bx x={500} y={188} w={120} h={40} t="Server" s="10.0.1.5" c={BLUE} fill={LB}/></g>;
return <Fig still={still} h={240} id={`nit${uid}`} M={M} caps={caps} title="Private and public addresses. At home, the router lends the phone a private address, 192.168.1.23, with DHCP. Private addresses can't travel across the internet, so the router replaces the phone's address with its own public one, 49.36.80.14; this is NAT. Routers on the internet forward the packet by the prefix of the destination address, 13.235.4.20, toward Zotato in Mumbai. Inside Zotato's network the load balancer passes it to a server on a private address, 10.0.1.5."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 02 One request ----------

// FIG 1: one menu request on the wire: DNS, TCP, TLS, HTTP, then closing.
function JourneyFig({still,uid=""}){const M=`nj${uid}`,P=80,DN=300,S=540;
const base=<g><Life x={P} t="Phone" y0={44} y1={312}/><Life x={DN} t="DNS resolver" y0={44} y1={312}/><Life x={S} t="Zotato server" y0={44} y1={312}/></g>;
const ph=(y,t)=><T x={634} y={y} t={t} a="end" c={BLUE}/>;
const s1=<g><Msg x1={P} x2={DN} y={84} t="api.zotato.in?" m={M}/><Msg x1={DN} x2={P} y={102} t="13.235.4.20" m={M} c={BLUE}/>{ph(96,"DNS")}</g>;
const s2=<g><Msg x1={P} x2={S} y={126} t="SYN" tx={420} m={M}/><Msg x1={S} x2={P} y={142} t="SYN-ACK" tx={420} m={M}/><Msg x1={P} x2={S} y={158} t="ACK" tx={420} m={M}/><Msg x1={P} x2={S} y={180} t="TLS hello" tx={420} m={M}/><Msg x1={S} x2={P} y={196} t="TLS keys, certificate" tx={420} m={M}/>{ph(140,"TCP")}{ph(190,"TLS")}</g>;
const s3=<g><Msg x1={P} x2={S} y={220} t="GET /menu/42" tx={420} m={M} c={BLUE}/><rect x={S-4} y={224} width={8} height={18} fill={BLUE}/><T x={S-10} y={238} t="builds the menu: 40 ms" a="end"/><Msg x1={S} x2={P} y={254} t="200 OK, 18 KB" tx={190} m={M} c={BLUE}/>{ph(246,"HTTP")}</g>;
const s4=<g><Msg x1={P} x2={S} y={274} t="FIN" tx={420} m={M} c={GREY}/><Msg x1={S} x2={P} y={290} t="ACK, FIN" tx={420} m={M} c={GREY}/><Msg x1={P} x2={S} y={306} t="ACK" tx={420} m={M} c={GREY}/>{ph(292,"close")}</g>;
const caps=[["1 · DNS: the phone asks for api.zotato.in's address, then caches the answer",INK],["2 · TCP's three-way handshake, then TLS 1.3 agrees keys: two more round trips",INK],["3 · only now does the request go out; the server works and answers",BLUE],["4 · closing costs more messages, so apps keep the connection and reuse it",GREY]];
return <Fig still={still} h={320} id={`njt${uid}`} M={M} caps={caps} c={INK} title="One menu request on the wire, between the phone, a DNS resolver and Zotato's server. First DNS: the phone asks for api.zotato.in's address and gets 13.235.4.20, which it caches. Then TCP's three-way handshake: SYN, SYN-ACK, ACK. Then TLS 1.3 agrees keys in one more round trip. Only then does GET /menu/42 go out; the server spends 40 milliseconds building the menu and answers 200 OK with 18 kilobytes. Closing the connection takes more messages, a FIN and an ACK from each side, which is why apps keep connections open and reuse them."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: three requests on new connections, on one kept-alive connection, and over HTTP/2.
function KeepAliveFig({still,uid=""}){const u=38,x0=140;
const seg=(y,i,n,t,c,fill)=><g key={`${y}${i}`}><rect x={x0+i*u} y={y} width={n*u-2} height={24} fill={fill} stroke={c}/><T x={x0+i*u+(n*u-2)/2} y={y+16} t={t} a="middle" c={c===GREY?undefined:c}/></g>;
const hs=(y,i)=><g key={`h${y}${i}`}>{seg(y,i,1,"TCP",GREY,"#fff")}{seg(y,i+1,1,"TLS",GREY,"#fff")}</g>,rq=(y,i,k="GET")=>seg(y,i,1,k,BLUE,LB);
const r1=<g><T x={10} y={74} t="new connection"/><T x={10} y={86} t="for each request"/>{[0,3,6].map(i=><g key={i}>{hs(62,i)}{rq(62,i+2)}</g>)}<T x={x0+9*u+8} y={78} t="9 round trips" b/></g>;
const r2=<g><T x={10} y={128} t="one connection,"/><T x={10} y={140} t="kept alive"/>{hs(116,0)}{rq(116,2)}{rq(116,3)}{rq(116,4)}<T x={x0+5*u+8} y={132} t="5 round trips" b/></g>;
const r3=<g><T x={10} y={182} t="HTTP/2: all three"/><T x={10} y={194} t="at once"/>{hs(170,0)}{[0,1,2].map(k=><rect key={k} x={x0+2*u} y={170+k*8} width={u-2} height={7} fill={LB} stroke={BLUE}/>)}<T x={x0+3*u+8} y={186} t="3 round trips" b c={BLUE}/></g>;
const r4=<g><T x={x0} y={232} t="at 30 ms a round trip:  270 ms  ·  150 ms  ·  90 ms" b c={BLUE}/></g>;
const caps=[["1 · a new connection for every request: TCP, TLS, then the request, three times",INK],["2 · keep the connection alive: pay for the handshakes once, then send one by one",INK],["3 · HTTP/2 sends all three at once over that one connection",BLUE],["4 · same three requests: 270, 150 or 90 ms, decided by the round trips",BLUE]];
return <Fig still={still} h={246} id={`nkt${uid}`} caps={caps} title="Three API requests sent three ways, counted in round trips. With a new connection for every request, each one pays for a TCP handshake, a TLS handshake and the request itself: 9 round trips. With one connection kept alive, the handshakes are paid once and the requests follow one by one: 5 round trips. With HTTP/2 the three requests go at once over that single connection: 3 round trips. At 30 milliseconds a round trip that is 270, 150 or 90 milliseconds for the same work."
base={null} g={[r1,r2,r3,r4]} last={<g>{r1}{r2}{r3}{r4}</g>}/>}

// ---------- 03 TCP and UDP ----------

// FIG 1: a lost TCP segment is resent, and later segments wait for it.
function TcpFig({still,uid=""}){const M=`nt${uid}`,P=90,S=470;
const base=<g><Life x={P} t="Phone" s="sends an order" y0={44} y1={236}/><Life x={S} t="Server" y0={44} y1={236}/></g>;
const s1=<g><Msg x1={P} x2={S} y={86} t="segment 1" m={M}/><line x1={P} y1={104} x2={280} y2={104} stroke={RED}/><X x={286} y={104}/><T x={185} y={98} t="segment 2" a="middle"/><T x={296} y={100} t="lost" c={RED}/><Msg x1={P} x2={S} y={128} t="segment 3" m={M}/><Msg x1={P} x2={S} y={146} t="segment 4" m={M}/></g>;
const s2=<g><rect x={478} y={116} width={158} height={36} fill={LR} stroke={RED}/><T x={557} y={132} t="3 and 4 held back" a="middle" c={RED}/><T x={557} y={145} t="the app gets nothing yet" a="middle"/></g>;
const s3=<g><Msg x1={S} x2={P} y={170} t="ACK: still need 2" m={M}/><Msg x1={P} x2={S} y={192} t="segment 2, again" m={M} c={BLUE}/></g>;
const s4=<g><rect x={480} y={198} width={150} height={30} fill={LB} stroke={BLUE}/><T x={555} y={217} t="app reads 1 2 3 4" a="middle" c={BLUE} b/></g>;
const caps=[["1 · the phone sends four segments of an order; segment 2 is lost on the way",INK],["2 · 3 and 4 arrive, but TCP holds them: the app must get the bytes in order",RED],["3 · the server keeps acknowledging 'need 2', so the phone resends it",BLUE],["4 · the app reads 1, 2, 3, 4: correct, but 3 and 4 waited a round trip",BLUE]];
return <Fig still={still} h={244} id={`ntt${uid}`} M={M} caps={caps} title="How TCP handles a lost packet. The phone sends four segments of an order. Segment 2 is lost on the way. Segments 3 and 4 arrive, but TCP holds them back because the application must receive the bytes in order. The server keeps acknowledging that it still needs segment 2, so the phone sends it again. Now the app reads 1, 2, 3 and 4 in order: correct, but 3 and 4 waited an extra round trip."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: a voice call over UDP plays on through a lost frame; over TCP it freezes.
function UdpFig({still,uid=""}){const x0=120,st=62,w=56;
const fr=(y,i,t,c=INK,fill="#fff")=><g key={`${y}${i}`}><rect x={x0+i*st} y={y} width={w} height={26} fill={fill} stroke={c}/><T x={x0+i*st+w/2} y={y+17} t={t} a="middle" c={c===INK?undefined:c}/></g>;
const r1=<g><T x={10} y={70} t="sent: one frame"/><T x={10} y={82} t="every 20 ms"/>{[1,2,3,4,5,6].map((n,i)=>fr(58,i,`frame ${n}`))}</g>;
const r2=<g>{fr(58,2,"frame 3",RED,LR)}<X x={x0+2*st+w/2} y={100}/><T x={x0+2*st+w/2} y={118} t="lost" a="middle" c={RED}/></g>;
const r3=<g><T x={10} y={146} t="over UDP:"/><T x={10} y={158} t="plays on"/>{[1,2].map((n,i)=>fr(134,i,`${n}`,BLUE,LB))}<rect x={x0+2*st} y={134} width={w} height={26} fill="#fff" stroke={GREY} strokeDasharray="3 3"/><T x={x0+2*st+w/2} y={151} t="gap" a="middle"/>{[4,5,6].map((n,i)=>fr(134,i+3,`${n}`,BLUE,LB))}</g>;
const r4=<g><T x={10} y={204} t="over TCP:"/><T x={10} y={216} t="waits for 3"/>{[1,2].map((n,i)=>fr(192,i,`${n}`))}<rect x={x0+2*st} y={192} width={2*st-6} height={26} fill={LR} stroke={RED}/><T x={x0+3*st-3} y={209} t="frozen" a="middle" c={RED}/>{[3,4,5,6].map((n,i)=>fr(192,i+4,`${n}`))}</g>;
const caps=[["1 · a rider's voice call: one small audio frame every 20 ms",INK],["2 · frame 3 is lost somewhere between the phones",RED],["3 · over UDP the call plays on: 20 ms of near-silence, barely heard",BLUE],["4 · over TCP everything waits for frame 3 to be resent: the voice freezes",RED]];
return <Fig still={still} h={232} id={`nut${uid}`} caps={caps} title="Why live voice uses UDP. A rider's call sends one small audio frame every 20 milliseconds. Frame 3 is lost. Over UDP the call plays on: frames 4, 5 and 6 play on time and the listener hears 20 milliseconds of near-silence. Over TCP, frames 4, 5 and 6 wait until frame 3 has been resent, so the voice freezes for a round trip and then everything arrives late."
base={null} g={[r1,r2,r3,r4]} last={<g>{r1}{r2}{r3}{r4}</g>}/>}

// ---------- 04 HTTP ----------

// FIG 1: an HTTP request and its response, as the text that is actually sent.
function HttpFig({still,uid=""}){
const Q=["GET /restaurants/42/menu HTTP/1.1","Host: api.zotato.in","Accept: application/json","Accept-Encoding: gzip, br","Authorization: Bearer eyJhbGci…","","(no body)"];
const R=["HTTP/1.1 200 OK","Content-Type: application/json","Content-Encoding: br","Cache-Control: max-age=60","Content-Length: 4210","",'{"dishes":[{"id":9,"name":"Misal pav"…'];
const panel=(x,h,L)=><g><rect x={x} y={40} width={300} height={168} fill="#fbfcfd" stroke={GREY}/><T x={x+10} y={58} t={h} b/>{L.map((l,i)=><T key={i} x={x+10} y={82+i*18} t={l}/>)}</g>;
const hl=(x,i,n=1,c=BLUE)=><rect x={x+4} y={70+i*18} width={292} height={n*18} fill="none" stroke={c} strokeWidth="2"/>;
const caps=[["1 · the request line: a method, a path and the HTTP version",BLUE],["2 · headers carry the rest: the host, formats, compression accepted, who is asking",BLUE],["3 · the response starts with a status: 200 OK",BLUE],["4 · the server chose br from the client's list, says so, and sends the body",BLUE]];
const s=[hl(10,0),hl(10,1,4),hl(330,0),<g>{hl(10,3)}{hl(330,2)}{hl(330,6)}</g>];
return <Fig still={still} h={216} id={`nht${uid}`} caps={caps} title="An HTTP request and its response as the text that is sent. The request: GET /restaurants/42/menu HTTP/1.1, then headers: Host api.zotato.in, Accept application/json, Accept-Encoding gzip and br, and an Authorization bearer token; a GET has no body. The response: HTTP/1.1 200 OK, then headers: Content-Type application/json, Content-Encoding br, Cache-Control max-age 60, Content-Length 4210, then the JSON body with the dishes. The server picked br from the encodings the client offered and says so in Content-Encoding."
base={<g>{panel(10,"Request",Q)}{panel(330,"Response",R)}</g>} g={s} only={[0,1,2,3]} last={s[3]}/>}

// FIG 2: TLS protects a request on the way, but not from its own sender.
function TrustFig({still,uid=""}){const M=`nr${uid}`;
const base=<g><Bx x={10} y={96} w={120} h={44} t="Customer app" s="user 77"/><Bx x={260} y={96} w={130} h={44} t="Orders API"/><Bx x={480} y={96} w={150} h={44} t="Orders table"/><Ar x1={132} y1={112} x2={256} y2={112} m={M}/><Ar x1={392} y1={118} x2={476} y2={118} m={M}/></g>;
const s1=<g><rect x={150} y={104} width={90} height={16} fill={LB} stroke={BLUE}/><T x={195} y={116} t="TLS: sealed" a="middle" c={BLUE}/></g>;
const s2=<g><T x={10} y={166} t="GET /orders/9102" c={RED}/><T x={10} y={180} t="(edited from 9101)"/><T x={10} y={194} t="token: signed, user 77"/></g>;
const s3=<g><T x={325} y={166} t="user = 77, from the" a="middle" c={BLUE}/><T x={325} y={180} t="token's signature" a="middle" c={BLUE}/><T x={325} y={194} t="never from the path or body" a="middle"/></g>;
const s4=<g><T x={555} y={166} t="9102 belongs to user 88" a="middle"/><line x1={256} y1={128} x2={136} y2={128} stroke={RED} markerEnd={`url(#${M})`}/><T x={195} y={146} t="403 Forbidden" a="middle" c={RED} b/></g>;
const caps=[["1 · TLS seals the request on the way: nobody in between can read or change it",BLUE],["2 · but the sender can: a user edits their own request to ask for order 9102",RED],["3 · the server takes the user from the signed token, not from what the client typed",BLUE],["4 · order 9102 is someone else's, so the answer is 403 Forbidden",RED]];
return <Fig still={still} h={208} id={`nrt${uid}`} M={M} caps={caps} title="Encrypted is not the same as trusted. TLS seals the request between the customer app and the Orders API, so nobody in between can read or change it. But the sender can: a user edits their own request to ask for order 9102 instead of their own 9101. The server takes the user's identity, user 77, from the signed token, never from the path or body. Order 9102 belongs to user 88, so the server answers 403 Forbidden."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 05 REST, GraphQL, gRPC ----------

// FIG 1: under-fetching: one screen needs many REST calls; GraphQL asks once.
function UnderFetchFig({still,uid=""}){const M=`nf${uid}`,P=80,S=500;
const base=<g><Life x={P} t="Home screen" y0={44} y1={240}/><Life x={S} t="Zotato API" y0={44} y1={240}/></g>;
const s1=<g><Msg x1={P} x2={S} y={82} t="GET /restaurants?near=pune" m={M}/><Msg x1={S} x2={P} y={98} t="20 restaurant ids" m={M}/></g>;
const s2=<g>{[0,1].map(k=><g key={k}><Msg x1={P} x2={S} y={120+k*30} t={`GET /restaurants/${[42,57][k]}/offers`} m={M}/><Msg x1={S} x2={P} y={134+k*30} m={M}/></g>)}<T x={290} y={196} t="… and the same for ratings, ×20 each" a="middle"/></g>;
const s3=<g><rect x={512} y={120} width={122} height={60} fill={LR} stroke={RED}/><T x={573} y={140} t="41 calls" a="middle" c={RED} b/><T x={573} y={156} t="for one screen;" a="middle"/><T x={573} y={170} t="seconds on 4G" a="middle"/></g>;
const s4=<g><Msg x1={P} x2={S} y={218} t="POST /graphql: restaurants(near) { name rating offers }" m={M} c={BLUE}/><Msg x1={S} x2={P} y={234} t="exactly those fields, one round trip" m={M} c={BLUE}/></g>;
const caps=[["1 · the home screen first asks for nearby restaurants: 20 ids come back",INK],["2 · then one call per restaurant for its offers, and one more for its rating",INK],["3 · 41 calls for one screen: on a phone, the round trips add up to seconds",RED],["4 · with GraphQL the screen asks once, naming every field it needs",BLUE]];
return <Fig still={still} h={248} id={`nft${uid}`} M={M} caps={caps} title="Under-fetching. Zotato's home screen first calls GET /restaurants near Pune and gets 20 restaurant ids. Then it calls once per restaurant for its offers and once more for its rating: 41 calls for one screen, which on a phone adds up to seconds of round trips. With GraphQL the screen sends one query naming every field it needs, restaurants near Pune with name, rating and offers, and gets exactly those fields in one round trip."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: over-fetching: the card needs 4 fields; the full object has 40.
function OverFetchFig({still,uid=""}){const x0=150;
const f4=["name","rating","delivery time","photo"];
const s1=<g><T x={10} y={70} t="the card shows"/>{f4.map((f,i)=><Bx key={f} x={x0+i*102} y={56} w={96} h={26} t={f} c={BLUE} fill={LB}/>)}<T x={562} y={74} t="≈ 180 B"/></g>;
const s2=<g><T x={10} y={112} t="GET /restaurants/42"/><T x={10} y={124} t="returns 40 fields"/>{Array.from({length:40},(_,i)=><rect key={i} x={x0+i*10} y={102} width={8} height={22} fill={i<4?LB:"#fff"} stroke={i<4?BLUE:GREY}/>)}<T x={562} y={118} t="≈ 3.1 KB"/><T x={x0} y={140} t="address, hours, licence, owner, bank details, full menu …"/></g>;
const bar=(y,w,t,c,fill,l1,l2)=><g><T x={10} y={y+10} t={l1}/><T x={10} y={y+22} t={l2}/><rect x={x0} y={y} width={w} height={24} fill={fill} stroke={c}/><T x={x0+w+8} y={y+16} t={t} b c={c}/></g>;
const s3=bar(160,400,"62 KB",RED,LR,"20 cards, REST","(full objects)");
const s4=bar(198,23,"3.6 KB",BLUE,LB,"20 cards, GraphQL","(4 fields each)");
const caps=[["1 · a restaurant card shows four things",BLUE],["2 · the REST endpoint returns the whole restaurant: 40 fields",INK],["3 · twenty cards: 62 KB down a slow mobile connection, most of it unused",RED],["4 · a GraphQL query names the four fields: 3.6 KB for the same screen",BLUE]];
return <Fig still={still} h={232} id={`not${uid}`} caps={caps} title="Over-fetching. A restaurant card shows four things: name, rating, delivery time and photo, about 180 bytes. The REST endpoint for a restaurant returns all 40 of its fields, about 3.1 kilobytes, including address, hours, licence and full menu. For twenty cards that is 62 kilobytes down a slow mobile connection, most of it unused. A GraphQL query that names the four fields brings 3.6 kilobytes for the same screen."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 3: REST outside, gRPC between services.
function GrpcFig({still,uid=""}){const M=`ng${uid}`;
const base=<g><Bx x={10} y={52} w={120} h={40} t="Customer app"/><Bx x={10} y={132} w={120} h={40} t="Browser"/><Bx x={190} y={92} w={110} h={40} t="API gateway"/><Bx x={350} y={92} w={110} h={40} t="Orders"/><Bx x={510} y={42} w={120} h={36} t="Payments"/><Bx x={510} y={94} w={120} h={36} t="Dispatch"/><Bx x={510} y={146} w={120} h={36} t="Menu"/>
<Ar x1={132} y1={72} x2={186} y2={104} m={M}/><Ar x1={132} y1={152} x2={186} y2={120} m={M}/><Ar x1={302} y1={112} x2={346} y2={112} m={M}/>{[60,112,164].map(y=><Ar key={y} x1={462} y1={112} x2={506} y2={y} m={M}/>)}</g>;
const s1=<g><rect x={6} y={36} width={300} height={144} fill="none" stroke={INK} strokeDasharray="3 3"/><T x={160} y={198} t="REST + JSON over HTTPS" a="middle" b/></g>;
const s2=<g><rect x={342} y={34} width={294} height={156} fill="none" stroke={BLUE} strokeDasharray="3 3"/><T x={489} y={208} t="gRPC: protobuf over HTTP/2" a="middle" b c={BLUE}/></g>;
const s3=<g><T x={10} y={232} t="one order as JSON"/><rect x={150} y={222} width={196} height={14} fill="#fff" stroke={INK}/><T x={354} y={233} t="49 bytes"/><T x={10} y={252} t="as protobuf"/><rect x={150} y={242} width={72} height={14} fill={LB} stroke={BLUE}/><T x={230} y={253} t="18 bytes" c={BLUE}/></g>;
const s4=<g><T x={420} y={240} t="stubs generated from" c={BLUE}/><T x={420} y={254} t="orders.proto, both sides" c={BLUE}/></g>;
const caps=[["1 · outside, apps and browsers speak REST with JSON: easy to read, works everywhere",INK],["2 · inside, services call each other with gRPC: binary messages over HTTP/2",BLUE],["3 · the same order is 49 bytes as JSON and 18 as protobuf, and cheaper to parse",BLUE],["4 · both sides' code is generated from one schema, so a mismatch fails the build",BLUE]];
return <Fig still={still} h={262} id={`ngt${uid}`} M={M} caps={caps} title="REST outside, gRPC inside. The customer app and browsers call Zotato's API gateway with REST and JSON over HTTPS: easy to read and supported everywhere, including browsers. Behind the gateway, the Orders service calls Payments, Dispatch and Menu with gRPC, binary protobuf messages over HTTP/2. The same order is 49 bytes as JSON and 18 bytes as protobuf, and cheaper to parse. The client and server code on both sides is generated from one schema file, so a mismatch fails the build instead of production."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 06 Server push ----------

// FIG 1: server-sent events: one response, many events, and a reconnect that resumes.
function SseFig({still,uid=""}){const M=`ne${uid}`,P=80,S=520;
const base=<g><Life x={P} t="Customer app" y0={44} y1={222}/><Life x={S} t="Order tracker" y0={44} y1={222}/></g>;
const s1=<g><Msg x1={P} x2={S} y={82} t="GET /orders/9101/events  (Accept: text/event-stream)" m={M}/></g>;
const s2=<g>{[["1","accepted"],["2","cooking"],["3","picked up"]].map(([i,t],k)=><Msg key={i} x1={S} x2={P} y={104+k*18} t={`id: ${i}   data: {"status":"${t}"}`} m={M} c={BLUE}/>)}<rect x={528} y={92} width={6} height={50} fill={BLUE}/><T x={540} y={122} t="one response," c={BLUE}/><T x={540} y={134} t="still open" c={BLUE}/></g>;
const s3=<g><line x1={S} y1={164} x2={310} y2={164} stroke={RED} strokeDasharray="4 3"/><X x={300} y={164}/><T x={300} y={156} t="a proxy closes the idle connection" a="end" c={RED}/></g>;
const s4=<g><Msg x1={P} x2={S} y={190} t="GET …/events   Last-Event-ID: 3" m={M}/><Msg x1={S} x2={P} y={210} t={'id: 4   data: {"status":"arriving"}'} m={M} c={BLUE}/></g>;
const caps=[["1 · the app opens one request, and the server keeps the response open",INK],["2 · each change is written as an event, with an id, on that same response",BLUE],["3 · after a while a proxy drops the long-lived connection",RED],["4 · the app reconnects with the last id it saw, and the server carries on from 4",BLUE]];
return <Fig still={still} h={230} id={`net${uid}`} M={M} caps={caps} title="Server-sent events for order tracking. The customer app opens one request for order 9101's events and the server keeps the response open. Each status change is written to that response as an event with an id: 1 accepted, 2 cooking, 3 picked up. After a while a proxy closes the idle connection. The app reconnects and sends Last-Event-ID 3, and the server continues from event 4, arriving."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: a WebSocket: an HTTP upgrade, then messages both ways without requests.
function WsFig({still,uid=""}){const M=`nw${uid}`,C=80,S=320,R=560;
const base=<g><Life x={C} t="Customer app" y0={44} y1={226}/><Life x={S} t="Chat server" y0={44} y1={226}/><Life x={R} t="Rider app" y0={44} y1={226}/></g>;
const s1=<g><Msg x1={C} x2={S} y={84} t="GET /chat   Upgrade: websocket" m={M}/><Msg x1={S} x2={C} y={102} t="101 Switching Protocols" m={M}/></g>;
const s2=<g><Msg x1={C} x2={S} y={130} t={'{"type":"msg","text":"Gate 2"}'} m={M} c={BLUE}/><Msg x1={S} x2={R} y={146} t="Gate 2" m={M} c={BLUE}/></g>;
const s3=<g><Msg x1={R} x2={S} y={172} t="5 min away" m={M} c={BLUE}/><Msg x1={S} x2={C} y={188} t="5 min away (no request needed)" m={M} c={BLUE}/></g>;
const s4=<g><line x1={C} y1={210} x2={S} y2={210} stroke={BLUE} strokeWidth="4"/><T x={200} y={224} t="open for the whole 35-minute delivery" a="middle"/><T x={440} y={210} t="every proxy and LB on" a="middle" c={RED}/><T x={440} y={222} t="the path must allow it" a="middle" c={RED}/></g>;
const caps=[["1 · the app asks, over plain HTTP, to switch the connection to WebSocket",INK],["2 · it now sends messages whenever it likes, here a note for the rider",BLUE],["3 · and the server pushes the rider's reply without being asked",BLUE],["4 · the connection stays open for the whole delivery",BLUE]];
return <Fig still={still} h={232} id={`nwt${uid}`} M={M} caps={caps} title="A WebSocket for chat between customer and rider. The customer app sends an ordinary HTTP request asking to upgrade, and the chat server answers 101 Switching Protocols. From then on either side sends messages whenever it likes: the customer sends a JSON message, Gate 2, which the server passes to the rider app; the rider replies 5 minutes away, and the server pushes it to the customer without any request. The connection stays open for the whole 35-minute delivery, so every proxy and load balancer on the path must allow it."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 07 Peer to peer ----------

// FIG 1: setting up a WebRTC call: signalling, STUN, exchange, then direct (or TURN).
function WebRtcFig({still,uid=""}){const M=`nc${uid}`,D="14s";
const base=<g><Bx x={10} y={120} w={120} h={44} t="Customer" s="behind NAT"/><Bx x={510} y={120} w={120} h={44} t="Rider" s="behind NAT"/><Bx x={255} y={42} w={130} h={36} t="Signalling server"/><Bx x={170} y={214} w={120} h={34} t="STUN server"/></g>;
const s1=<g><line x1={110} y1={120} x2={265} y2={78} stroke={INK}/><line x1={530} y1={120} x2={375} y2={78} stroke={INK}/><T x={150} y={92} t="WebSocket" a="end"/><T x={490} y={92} t="WebSocket"/></g>;
const s2=<g><Ar x1={60} y1={166} x2={192} y2={212} m={M} c={BLUE} dash/><Ar x1={520} y1={166} x2={290} y2={212} m={M} c={BLUE} dash/><T x={10} y={268} t="you are 49.36.80.14:53012" c={BLUE}/><T x={630} y={268} t="you are 106.51.7.9:41877" a="end" c={BLUE}/></g>;
const s3=<g><rect x={255} y={42} width={130} height={36} fill="none" stroke={BLUE} strokeWidth="2"/><T x={320} y={98} t="swaps addresses, audio settings" a="middle" c={BLUE}/></g>;
const s4=<g><line x1={132} y1={142} x2={508} y2={142} stroke={BLUE} strokeWidth="3"/><T x={320} y={134} t="audio over UDP, phone to phone" a="middle" b c={BLUE}/><Bx x={350} y={214} w={120} h={34} t="TURN relay" c={RED}/><line x1={110} y1={166} x2={350} y2={214} stroke={RED} strokeDasharray="4 3"/><line x1={560} y1={166} x2={470} y2={231} stroke={RED} strokeDasharray="4 3"/><T x={410} y={264} t="if direct fails" a="middle" c={RED}/>{!still&&<Dot x1={134} x2={506} y={142} t0={.8} t1={.9} dur={D}/>}</g>;
const caps=[["1 · both phones connect to Zotato's signalling server, which knows who calls whom",INK],["2 · each asks a STUN server what its address looks like from the internet",BLUE],["3 · they swap those addresses and audio settings through the signalling server",BLUE],["4 · audio then flows phone to phone over UDP; if that fails, through a TURN relay",BLUE]];
return <Fig still={still} h={274} id={`nct${uid}`} M={M} caps={caps} title="Setting up a WebRTC call between a customer and a rider, both behind NAT. First both phones connect to Zotato's signalling server over a WebSocket. Each asks a STUN server what its address looks like from the internet: 49.36.80.14 port 53012 for the customer, 106.51.7.9 port 41877 for the rider. They exchange those addresses and audio settings through the signalling server. Then the audio flows directly from phone to phone over UDP; if a direct path can't be opened, it goes through a TURN relay instead."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 08 Spreading load ----------

// FIG 1: scaling up or out, and the question that scaling out raises.
function ScaleFig({still,uid=""}){const M=`nv${uid}`;
const s1=<Bx x={60} y={110} w={110} h={50} t="8 cores" s="≈ 2,000 req/s"/>;
const s2=<g><Bx x={30} y={66} w={170} h={140} t="96 cores" s="≈ 20,000 req/s" c={BLUE} fill={LB}/><T x={115} y={226} t="still one machine" a="middle"/></g>;
const sv=[52,100,148,196];
const s3=<g>{sv.map((y,i)=><Bx key={y} x={500} y={y} w={130} h={36} t={`server ${i+1}`} s="8 cores"/>)}</g>;
const s4=<g><Bx x={290} y={118} w={100} h={40} t="Clients"/>{sv.map(y=><Ar key={y} x1={392} y1={138} x2={496} y2={y+18} m={M} c={RED} dash/>)}<T x={445} y={232} t="which one?" a="middle" b c={RED}/></g>;
const caps=[["1 · one 8-core server answers about 2,000 menu requests a second",INK],["2 · scale up: a 96-core machine does about ten times more, but it is still one machine",BLUE],["3 · scale out: four 8-core servers, any of which can answer",INK],["4 · now each client has to be sent to one of them: that is load balancing",RED]];
return <Fig still={still} h={244} id={`nvt${uid}`} M={M} caps={caps} title="Scaling up or out. One 8-core server answers about 2,000 menu requests a second. Scaling up means a bigger machine: 96 cores handle about 20,000 a second, but it is still one machine that can fail and has a ceiling. Scaling out means more machines: four 8-core servers, any of which can answer. Then every client has to be sent to one of them, which is the job of load balancing."
base={<line x1={250} y1={44} x2={250} y2={240} stroke={GREY} strokeDasharray="3 3"/>} g={[s1,s2,s3,s4]} only={[0]} last={<g>{s2}{s3}{s4}</g>}/>}

// FIG 2: client-side load balancing with a service registry.
function ClientLbFig({still,uid=""}){const M=`nl${uid}`,D="14s",I=[["A",84],["B",134],["C",184]];
const base=<g><Bx x={250} y={42} w={140} h={36} t="Service registry"/><Bx x={10} y={126} w={160} h={50} t="Dispatch" s="calls Orders"/>{I.map(([n,y])=><Bx key={n} x={480} y={y} w={150} h={34} t={`Orders ${n}`}/>)}</g>;
const s1=<g>{I.map(([n,y])=><Ar key={n} x1={478} y1={y+17} x2={392} y2={70} m={M} dash/>)}<T x={436} y={58} t="I'm alive" a="middle"/></g>;
const s2=<g><Ar x1={262} y1={80} x2={140} y2={124} m={M} c={BLUE}/><T x={196} y={92} t="A, B, C" a="end" c={BLUE}/><T x={90} y={194} t="cached: A B C" a="middle" c={BLUE}/></g>;
const s3=<g>{I.map(([n,y])=><Ar key={n} x1={172} y1={151} x2={476} y2={y+17} m={M} c={BLUE}/>)}{!still&&I.map(([n,y],k)=><Dot key={n} x1={172} x2={476} y={151} y2={y+17} t0={.53+k*.06} t1={.6+k*.06} dur={D}/>)}<T x={320} y={226} t="Dispatch picks; no hop in between" a="middle" c={BLUE}/></g>;
const s4=<g><rect x={480} y={184} width={150} height={34} fill={LR} stroke={RED}/><T x={555} y={205} t="Orders C: down" a="middle" c={RED} b/><T x={90} y={208} t="list updates in seconds;" a="middle" c={RED}/><T x={90} y={220} t="calls to C fail until then" a="middle" c={RED}/></g>;
const caps=[["1 · every Orders instance registers itself and keeps sending heartbeats",INK],["2 · Dispatch fetches the list once and keeps a copy",BLUE],["3 · it picks an instance itself for every call: there is no box in the middle",BLUE],["4 · C dies: the registry pushes the change, but calls in the meantime still fail",RED]];
return <Fig still={still} h={236} id={`nlt${uid}`} M={M} caps={caps} title="Client-side load balancing. Each Orders instance, A, B and C, registers with a service registry and keeps sending heartbeats. The Dispatch service fetches the list once and keeps a copy. For every call, Dispatch itself picks an instance and connects to it directly, so there is no extra hop in the middle. When instance C dies, the registry pushes the change to Dispatch within seconds, but calls sent to C in the meantime fail."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 3: DNS returns the addresses in a different order to different users.
function DnsLbFig({still,uid=""}){const M=`nd${uid}`;
const base=<g><Bx x={10} y={60} w={140} h={40} t="Customer, Pune"/><Bx x={10} y={200} w={140} h={40} t="Customer, Chennai"/><Bx x={245} y={130} w={150} h={50} t="DNS" s="api.zotato.in"/><Bx x={470} y={60} w={160} h={40} t="LB 1" s="13.235.4.20"/><Bx x={470} y={200} w={160} h={40} t="LB 2" s="13.126.9.31"/></g>;
const s1=<g><Ar x1={110} y1={102} x2={250} y2={128} m={M} dash/><T x={168} y={126} t="LB 1, LB 2" a="end" c={BLUE}/><Ar x1={152} y1={76} x2={466} y2={76} m={M} c={BLUE}/></g>;
const s2=<g><Ar x1={110} y1={198} x2={250} y2={182} m={M} dash/><T x={168} y={182} t="LB 2, LB 1" a="end" c={BLUE}/><Ar x1={152} y1={224} x2={466} y2={224} m={M} c={BLUE}/></g>;
const s3=<g><rect x={470} y={60} width={160} height={40} fill={LR} stroke={RED}/><T x={550} y={84} t="LB 1: down" a="middle" c={RED} b/><path d="M152 92 H420 L520 196" fill="none" stroke={BLUE} markerEnd={`url(#${M})`}/><T x={300} y={108} t="next address in the answer" a="middle" c={BLUE}/></g>;
const s4=<g><T x={320} y={264} t="DNS stops giving out LB 1, but cached answers last until their TTL (60 s)" a="middle"/></g>;
const caps=[["1 · Pune's lookup returns LB 1 first, so that is where its requests go",BLUE],["2 · Chennai's returns the same two in the other order: traffic splits",BLUE],["3 · LB 1 fails: apps that got both addresses move on to the next one",RED],["4 · DNS drops LB 1, but answers already cached keep it until their TTL runs out",INK]];
return <Fig still={still} h={272} id={`ndt${uid}`} M={M} caps={caps} title="Load balancing with DNS. Looking up api.zotato.in from Pune returns LB 1 first and then LB 2, so Pune's requests go to LB 1. From Chennai the same two addresses come back in the other order, so traffic splits between the two. When LB 1 fails, apps that received both addresses move on to the next one. DNS stops giving out LB 1, but answers already cached keep it until their time to live, 60 seconds, runs out."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 4: a dedicated load balancer, health checks and a new server.
function DedicatedFig({still,uid=""}){const M=`nb${uid}`,D="14s",Y=[48,96,144,192];
const base=<g><Bx x={10} y={100} w={130} h={50} t="Apps, browsers" s="know one address"/><Ar x1={142} y1={125} x2={206} y2={125} m={M}/><Bx x={210} y={100} w={130} h={50} t="Load balancer" s="api.zotato.in"/>{Y.slice(0,3).map((y,i)=><Bx key={y} x={480} y={y} w={150} h={36} t={`server ${i+1}`}/>)}</g>;
const ln=(y,c=INK,dash)=><Ar key={y} x1={342} y1={125} x2={476} y2={y+18} m={M} c={c} dash={dash}/>;
const s2=<g>{Y.slice(0,3).map(y=>ln(y,BLUE))}{!still&&Y.slice(0,3).map((y,k)=><Dot key={y} x1={342} x2={476} y={125} y2={y+18} t0={.28+k*.06} t1={.34+k*.06} dur={D}/>)}</g>;
const s3=<g><rect x={480} y={144} width={150} height={36} fill={LR} stroke={RED}/><T x={555} y={166} t="server 3: failing" a="middle" c={RED}/>{ln(144,RED,1)}<X x={409} y={148}/></g>;
const s4=<g><Bx x={480} y={192} w={150} h={36} t="server 4: new" c={BLUE} fill={LB}/>{ln(192,BLUE)}<T x={275} y={176} t="health check every 5 s" a="middle"/></g>;
const caps=[["1 · every client knows one address: the load balancer's",INK],["2 · it spreads requests over the servers behind it",BLUE],["3 · server 3 fails two health checks in a row and gets no more requests",RED],["4 · a new server passes its checks and gets traffic at once; no client had to know",BLUE]];
return <Fig still={still} h={240} id={`nbt${uid}`} M={M} caps={caps} title="A dedicated load balancer. Apps and browsers know one address, api.zotato.in, which is the load balancer's. It spreads requests over the servers behind it. It checks every server every 5 seconds; server 3 fails two checks in a row and gets no more requests. A new server, server 4, passes its checks and starts getting traffic at once, and no client had to be told."
base={base} g={[null,s2,s3,s4]} last={<g>{s2}{s3}{s4}</g>}/>}

// FIG 5: choosing where the balancing happens: two questions.
function LbChooseFig({still,uid=""}){const M=`nh${uid}`;
const base=<g><Bx x={190} y={42} w={260} h={40} t="Do you deploy every caller yourself?"/></g>;
const s1=<g><Ar x1={230} y1={84} x2={120} y2={144} m={M} c={BLUE}/><T x={160} y={108} t="yes" a="end" c={BLUE}/><Bx x={20} y={148} w={200} h={48} t="Client-side balancing" s="gRPC, Redis Cluster clients" c={BLUE} fill={LB}/><T x={120} y={214} t="no extra hop; you push the list" a="middle"/></g>;
const s2=<g><Ar x1={410} y1={84} x2={470} y2={110} m={M}/><T x={452} y={92} t="no"/><Bx x={330} y={114} w={300} h={40} t="Can a change take a minute to reach them?"/></g>;
const s3=<g><Ar x1={420} y1={156} x2={400} y2={190} m={M} c={BLUE}/><T x={404} y={176} t="yes" a="end" c={BLUE}/><Bx x={330} y={194} w={140} h={48} t="DNS" s="users across regions" c={BLUE} fill={LB}/></g>;
const s4=<g><Ar x1={560} y1={156} x2={570} y2={190} m={M} c={BLUE}/><T x={574} y={176} t="no" c={BLUE}/><Bx x={490} y={194} w={140} h={48} t="Load balancer" s="apps, browsers" c={BLUE} fill={LB}/></g>;
const caps=[["1 · if every caller is a service you deploy, they can do the balancing themselves",BLUE],["2 · otherwise: can a change reach callers slowly?",INK],["3 · yes: DNS can spread them, as long as minutes-old answers are fine",BLUE],["4 · no, it must take effect now: put a load balancer in front",BLUE]];
return <Fig still={still} h={250} id={`nht${uid}`} M={M} caps={caps} title="Choosing where load balancing happens. First question: do you deploy every caller yourself? If yes, as with your own services, the callers can balance on the client side, as gRPC and Redis Cluster clients do, with no extra hop. If not, can a change take a minute or more to reach the callers? If yes, DNS can spread them, for example users across regions. If a change must take effect immediately, as with apps and browsers you don't control, put a dedicated load balancer in front."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 09 Layer 4 and layer 7 ----------

// FIG 1: a layer 4 load balancer passes a whole connection to one server.
function L4Fig({still,uid=""}){const M=`n4${uid}`,D="14s",S=[["A",48],["B",98],["C",148]];
const base=<g><Bx x={10} y={92} w={120} h={44} t="Rider app" s="port 51234"/><Bx x={220} y={88} w={150} h={52} t="Layer 4 LB" s="reads IP + port only"/>{S.map(([n,y])=><Bx key={n} x={480} y={y} w={150} h={36} t={`server ${n}`}/>)}<Ar x1={132} y1={114} x2={216} y2={114} m={M}/></g>;
const s1=<g><T x={174} y={106} t="SYN" a="middle"/><Ar x1={372} y1={114} x2={476} y2={116} m={M} c={BLUE}/><T x={424} y={108} t="hash → B" a="middle" c={BLUE}/></g>;
const s2=<g><T x={295} y={160} t="every packet of this connection → B" a="middle" c={BLUE}/><T x={295} y={174} t="contents: encrypted bytes, unread" a="middle"/>{!still&&[0,1,2].map(k=><Dot key={k} x1={132} x2={476} y={114} y2={116} t0={.3+k*.05} t1={.4+k*.05} dur={D}/>)}</g>;
const s3=<g><rect x={480} y={98} width={150} height={36} fill="none" stroke={BLUE} strokeWidth="2"/><T x={295} y={194} t="a WebSocket opened at 7:02 is still on B at 7:40" a="middle" c={BLUE}/></g>;
const s4=<g><T x={295} y={214} t="can't send /img and /api to different servers:" a="middle" c={RED}/><T x={295} y={228} t="it never sees the path" a="middle" c={RED}/></g>;
const caps=[["1 · a new connection arrives; the LB picks a server from the addresses and ports",BLUE],["2 · every packet of that connection then goes to B, unread",BLUE],["3 · so a long connection, like a WebSocket, stays on one server",BLUE],["4 · but it can't route by URL, header or cookie: it never reads them",RED]];
return <Fig still={still} h={238} id={`n4t${uid}`} M={M} caps={caps} title="A layer 4 load balancer. When the rider app opens a TCP connection, the load balancer picks a server from the addresses and ports alone, here server B by a hash. Every packet of that connection then goes to B without being read; the contents are encrypted bytes to it. So a long-lived connection such as a WebSocket opened at 7:02 is still on server B at 7:40. But it can't send /img and /api to different servers, because it never sees the path, headers or cookies."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: a layer 7 load balancer reads each request and routes it.
function L7Fig({still,uid=""}){const M=`n7${uid}`,P=[["API servers",48],["Image servers",104],["Orders v2 (canary)",160]];
const base=<g><Bx x={10} y={92} w={120} h={44} t="Customer app"/><Bx x={200} y={88} w={160} h={52} t="Layer 7 LB" s="ends TLS, reads HTTP"/>{P.map(([n,y])=><Bx key={n} x={480} y={y} w={150} h={36} t={n}/>)}<Ar x1={132} y1={114} x2={196} y2={114} m={M}/></g>;
const s1=<g><Ar x1={362} y1={106} x2={476} y2={66} m={M} c={BLUE}/><T x={410} y={78} t="/api/orders" a="end" c={BLUE}/></g>;
const s2=<g><Ar x1={362} y1={114} x2={476} y2={122} m={M} c={BLUE}/><T x={420} y={112} t="/img/9.webp" a="middle" c={BLUE}/></g>;
const s3=<g><Ar x1={362} y1={122} x2={476} y2={176} m={M} c={BLUE}/><T x={404} y={170} t="5% of users" a="end" c={BLUE}/></g>;
const s4=<g><T x={10} y={168} t="its own connections to the servers,"/><T x={10} y={182} t="kept warm and reused"/><T x={10} y={206} t="costs CPU per request: TLS + parsing" c={RED}/></g>;
const caps=[["1 · the LB ends TLS, reads the request, and sends /api to the API servers",BLUE],["2 · image paths go to a different pool",BLUE],["3 · it can also route by header or cookie, here 5% of users to a new version",BLUE],["4 · it opens its own connections to the servers, and pays CPU for each request",INK]];
return <Fig still={still} h={220} id={`n7t${uid}`} M={M} caps={caps} title="A layer 7 load balancer. It ends the TLS connection from the customer app and reads each HTTP request. Requests to /api go to the API servers; image paths such as /img/9.webp go to the image servers; and by header or cookie it can send 5 percent of users to a canary, Orders version 2. It opens its own connections to the servers, kept warm and reused, and pays CPU for every request it decrypts and parses."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 10 Distance ----------

// FIG 1: round trips from Mumbai: the speed-of-light floor and typical real numbers.
function LightFig({still,uid=""}){const x0=180,k=1.5;
const R=[["Pune","120 km",1.2,4],["Delhi","1,150 km",11.5,30],["Singapore","3,900 km",39,60],["London","7,200 km",72,115],["US east coast","13,000 km",130,200]];
const yy=i=>56+i*32;
const head=<g><T x={530} y={50} t="floor" a="end"/><T x={600} y={50} t="real" a="end" c={BLUE}/></g>;
const row=(i,typ)=>{const [n,d,mn,ty]=R[i],y=yy(i);return <g key={`${i}${typ}`}>{!typ&&<g><T x={10} y={y+12} t={n} b/><T x={110} y={y+12} t={d}/></g>}
{typ?<g><rect x={x0} y={y+9} width={ty*k} height={8} fill={LB} stroke={BLUE}/><T x={600} y={y+12} t={`≈ ${ty} ms`} a="end" c={BLUE}/></g>:<g><rect x={x0} y={y} width={Math.max(2,mn*k)} height={8} fill={INK}/><T x={530} y={y+12} t={`${mn} ms`} a="end"/></g>}</g>};
const s1=<g>{head}{R.map((_,i)=>row(i,0))}</g>,s2=<g>{R.map((_,i)=>row(i,1))}</g>;
const s3=<rect x={4} y={178} width={630} height={30} fill="none" stroke={RED} strokeWidth="2"/>;
const s4=<g><T x={10} y={232} t="app and database both in Mumbai: well under 1 ms per query" b c={BLUE}/></g>;
const caps=[["1 · light in fibre covers about 200 km a millisecond: the floor for a round trip",INK],["2 · real round trips are about twice that: cables bend, routers add time",BLUE],["3 · from Mumbai, a US server costs about 200 ms a round trip, whatever the code does",RED],["4 · so keep users, servers and data in the same region",BLUE]];
return <Fig still={still} h={244} id={`n9t${uid}`} caps={caps} title="Round trips from Mumbai. Light in fibre travels about 200 kilometres per millisecond, which sets a floor: Pune, 120 kilometres away, 1.2 milliseconds; Delhi, 1,150 kilometres, 11.5; Singapore, 3,900 kilometres, 39; London, 7,200 kilometres, 72; the US east coast, 13,000 kilometres, 130. Real round trips are roughly double: about 4, 30, 60, 115 and 200 milliseconds, because cables don't run straight and routers add time. A server in the US costs about 200 milliseconds per round trip whatever the code does; an app and database both in Mumbai take well under 1 millisecond per query."
base={null} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 2: regional partitioning: each region serves its own cities.
function RegionsFig({still,uid=""}){const D="14s";
const reg=(x,n,c,cities)=><g><rect x={x} y={42} width={300} height={130} fill="#fbfcfd" stroke={GREY}/><T x={x+10} y={60} t={n} b/><T x={x+10} y={76} t={cities}/><Bx x={x+16} y={92} w={130} h={36} t="Orders, Dispatch"/><Bx x={x+156} y={92} w={130} h={36} t={`Database (${c})`}/></g>;
const base=<g>{reg(10,"West region · Mumbai","west","Mumbai, Pune, Ahmedabad …")}{reg(330,"South region · Hyderabad","south","Bengaluru, Chennai, Hyderabad …")}</g>;
const s1=<g><T x={26} y={152} t="Pune order + Pune riders: all local" c={BLUE}/>{!still&&<Dot x1={80} x2={240} y={140} t0={.05} t1={.18} dur={D}/>}</g>;
const s2=<g><T x={346} y={152} t="Chennai order + Chennai riders" c={BLUE}/>{!still&&<Dot x1={400} x2={560} y={140} t0={.3} t1={.43} dur={D}/>}</g>;
const s3=<g><T x={320} y={192} t="no Pune order ever needs a Chennai rider: nothing crosses" a="middle" c={BLUE}/></g>;
const s4=<g><rect x={10} y={204} width={620} height={34} fill={LB} stroke={BLUE}/><T x={20} y={225} t="CDN edges in every big city: menu photos and app files from nearby" c={BLUE}/></g>;
const caps=[["1 · a Pune order is handled by servers and a database in the west region",BLUE],["2 · a Chennai order, by the south region's own servers and database",BLUE],["3 · deliveries are local, so the data splits cleanly by region",BLUE],["4 · a CDN brings the files every region shares, like photos, closer still",BLUE]];
return <Fig still={still} h={246} id={`n0t${uid}`} caps={caps} title="Splitting Zotato by region. The west region in Mumbai serves Mumbai, Pune and Ahmedabad with its own Orders and Dispatch services and its own database; the south region in Hyderabad serves Bengaluru, Chennai and Hyderabad the same way. A Pune order and Pune's riders are handled entirely in the west; a Chennai order entirely in the south. No Pune order ever needs a Chennai rider, so nothing has to cross regions. A CDN with edges in every big city brings shared files such as menu photos closer still."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// ---------- 11 Failures ----------

// FIG 1: retries every second, with exponential backoff, and with jitter.
function BackoffFig({still,uid=""}){const x0=170,k=14,base=y=><g><line x1={x0} y1={y} x2={x0+32*k} y2={y} stroke={GREY}/><line x1={x0} y1={y-18} x2={x0+32*k} y2={y-18} stroke={RED} strokeDasharray="3 3"/></g>;
const bar=(y,t,h,c,key)=><rect key={key} x={x0+t*k-2} y={y-h} width={4} height={h} fill={c}/>;
const rnd=i=>((i*7919)%97)/97;
const r1=<g><T x={10} y={76} t="retry every 1 s"/>{base(96)}{Array.from({length:31},(_,i)=>bar(96,i+1,44,RED,i))}</g>;
const r2=<g><T x={10} y={146} t="backoff: 1, 2, 4, 8, 16 s"/>{base(166)}{[1,3,7,15,31].map(t=>bar(166,t,44,RED,t))}</g>;
const r3=<g><T x={10} y={216} t="backoff + jitter"/>{base(236)}{Array.from({length:60},(_,i)=>bar(236,1+i*0.5+rnd(i)*0.4,6+rnd(i+3)*9,BLUE,i))}</g>;
const r4=<g><T x={x0+32*k} y={256} t="dashed line: what the service can take while it recovers" a="end" c={RED}/></g>;
const caps=[["1 · 1,000 phones retry a failed call every second: the service never gets a break",RED],["2 · exponential backoff waits 1, 2, 4, 8 s: fewer retries, but all at the same moment",RED],["3 · add jitter, a random part of each wait, and the retries spread out",BLUE],["4 · spread out, they stay under what the recovering service can take",BLUE]];
return <Fig still={still} h={264} id={`nxt${uid}`} caps={caps} title="Retries over 32 seconds from 1,000 phones whose call failed. Retrying every second hits the service with all 1,000 every second, so it never gets a break. Exponential backoff, waiting 1, 2, 4, 8 and 16 seconds, sends far fewer retries, but all phones still retry at the same moments, in tall spikes. Adding jitter, a random part of each wait, spreads the retries out so the load stays under what the recovering service can take, shown as a dashed line."
base={null} g={[r1,r2,r3,r4]} last={<g>{r1}{r2}{r3}{r4}</g>}/>}

// FIG 2: an idempotency key makes a retried payment charge once.
function IdemFig({still,uid=""}){const M=`nk${uid}`,A=70,P=330,K=560;
const base=<g><Life x={A} t="Customer app" y0={44} y1={226}/><Life x={P} t="Payments" y0={44} y1={226}/><Life x={K} t="Keys table" y0={44} y1={226}/></g>;
const s1=<g><Msg x1={A} x2={P} y={84} t="POST /payments  ₹349  key: o9101-1" m={M}/><Msg x1={P} x2={K} y={100} t="o9101-1: charging" m={M}/><T x={P+8} y={120} t="charges ₹349 once"/></g>;
const s2=<g><line x1={P} y1={138} x2={208} y2={138} stroke={RED} strokeDasharray="4 3"/><X x={200} y={138}/><T x={210} y={132} t="reply lost" c={RED}/><T x={A+6} y={158} t="no answer in 5 s" c={RED}/></g>;
const s3=<g><Msg x1={A} x2={P} y={178} t="retry: same key o9101-1" m={M} c={BLUE}/><Msg x1={P} x2={K} y={190} t="o9101-1?" m={M}/><Msg x1={K} x2={P} y={204} t="done: p_77" m={M} c={BLUE}/></g>;
const s4=<g><Msg x1={P} x2={A} y={220} t="200: payment p_77 (no second charge)" m={M} c={BLUE}/></g>;
const caps=[["1 · the app pays with a key that names this attempt; Payments records it and charges",INK],["2 · the charge worked, but the reply is lost: the app can't tell",RED],["3 · it retries with the same key, and Payments finds it already done",BLUE],["4 · so it returns the first result: the customer is charged once",BLUE]];
return <Fig still={still} h={232} id={`nkt${uid}`} M={M} caps={caps} title="A retried payment with an idempotency key. The customer app posts a payment of 349 rupees with the key o9101-1. Payments records the key in its keys table and charges once. The charge worked but the reply is lost, so after 5 seconds the app can't tell what happened. It retries with the same key. Payments finds the key already done, with payment p_77, and returns that result instead of charging again."
base={base} g={[s1,s2,s3,s4]} last={<g>{s1}{s2}{s3}{s4}</g>}/>}

// FIG 3: a circuit breaker's three states.
function BreakerFig({still,uid=""}){const M=`nz${uid}`;
const st=(x,t,s,c=GREY,fill="#fff")=><Bx x={x} y={92} w={140} h={50} t={t} s={s} c={c} fill={fill}/>;
const base=<g>{st(10,"Closed","calls go through")}{st(250,"Open","fail at once")}{st(490,"Half-open","one test call")}
<Ar x1={152} y1={106} x2={246} y2={106} m={M}/><T x={199} y={84} t="half fail in 10 s" a="middle"/><Ar x1={392} y1={106} x2={486} y2={106} m={M}/><T x={439} y={84} t="after 30 s" a="middle"/>
<path d="M560 144 V176 H80 V146" fill="none" stroke={INK} markerEnd={`url(#${M})`}/><T x={200} y={170} t="test call works" a="middle"/><path d="M540 144 V160 H330 V146" fill="none" stroke={INK} strokeDasharray="4 3" markerEnd={`url(#${M})`}/><T x={435} y={156} t="test fails" a="middle"/></g>;
const s1=st(10,"Closed","calls go through",BLUE,LB);
const s2=<g>{st(250,"Open","fail at once",RED,LR)}<T x={320} y={208} t="Dispatch shows an ETA from distance alone" a="middle" c={RED}/><T x={320} y={222} t="instead of waiting 5 s for the maps API" a="middle" c={RED}/></g>;
const s3=st(490,"Half-open","one test call",BLUE,LB);
const s4=<g>{st(10,"Closed","calls go through",BLUE,LB)}<path d="M560 144 V176 H80 V146" fill="none" stroke={BLUE} strokeWidth="2"/></g>;
const caps=[["1 · closed: Dispatch's calls to the maps API go through as normal",BLUE],["2 · half of them fail within 10 s, so it opens: calls fail at once, with a fallback",RED],["3 · after 30 s it lets one test call through",BLUE],["4 · the test works, so it closes again; had it failed, back to open",BLUE]];
return <Fig still={still} h={232} id={`nzt${uid}`} M={M} caps={caps} title="A circuit breaker around Dispatch's calls to a maps API, with three states. Closed: calls go through as normal. When half the calls fail within 10 seconds, it opens: calls fail at once, and Dispatch shows an arrival time estimated from distance alone instead of waiting 5 seconds for the maps API. After 30 seconds it becomes half-open and lets one test call through. The test works, so it closes again; had the test failed, it would have gone back to open."
base={base} g={[s1,s2,s3,s4]} only={[0,1,2,3]} last={s4}/>}

export const NETWORK_FIGS={
"nw-stack":{C:StackFig,ar:640/222,title:()=>"ONE REQUEST, WRAPPED IN LAYERS"},
"nw-ip":{C:IpFig,ar:640/240,title:()=>"PRIVATE ADDRESSES INSIDE, PUBLIC ONES OUTSIDE"},
"nw-journey":{C:JourneyFig,ar:640/320,title:()=>"ONE MENU REQUEST, ON THE WIRE"},
"nw-keepalive":{C:KeepAliveFig,ar:640/246,title:()=>"THREE REQUESTS, COUNTED IN ROUND TRIPS"},
"nw-tcp":{C:TcpFig,ar:640/244,title:()=>"A LOST SEGMENT, RESENT IN ORDER"},
"nw-udp":{C:UdpFig,ar:640/232,title:()=>"LATE AUDIO IS USELESS AUDIO"},
"nw-http":{C:HttpFig,ar:640/216,title:()=>"A REQUEST AND ITS RESPONSE, AS TEXT"},
"nw-trust":{C:TrustFig,ar:640/208,title:()=>"ENCRYPTED IS NOT TRUSTED"},
"nw-underfetch":{C:UnderFetchFig,ar:640/248,title:()=>"ONE SCREEN, 41 CALLS"},
"nw-overfetch":{C:OverFetchFig,ar:640/232,title:()=>"FOUR FIELDS NEEDED, FORTY SENT"},
"nw-grpc":{C:GrpcFig,ar:640/262,title:()=>"REST OUTSIDE, gRPC INSIDE"},
"nw-sse":{C:SseFig,ar:640/230,title:()=>"ONE RESPONSE, MANY EVENTS"},
"nw-ws":{C:WsFig,ar:640/232,title:()=>"UPGRADE, THEN BOTH SIDES TALK"},
"nw-webrtc":{C:WebRtcFig,ar:640/274,title:()=>"SETTING UP A CALL BETWEEN TWO PHONES"},
"nw-scale":{C:ScaleFig,ar:640/244,title:()=>"A BIGGER SERVER, OR MORE SERVERS"},
"nw-client-lb":{C:ClientLbFig,ar:640/236,title:()=>"THE CALLER PICKS THE SERVER"},
"nw-dns-lb":{C:DnsLbFig,ar:640/272,title:()=>"DNS HANDS OUT THE ADDRESSES"},
"nw-lb-choose":{C:LbChooseFig,ar:640/250,title:()=>"WHERE SHOULD THE BALANCING HAPPEN?"},
"nw-dedicated":{C:DedicatedFig,ar:640/240,title:()=>"ONE ADDRESS IN FRONT OF MANY SERVERS"},
"nw-lb-conn":{C:L4Fig,ar:640/238,title:()=>"LAYER 4: THE CONNECTION GOES STRAIGHT THROUGH"},
"nw-lb-request":{C:L7Fig,ar:640/220,title:()=>"LAYER 7: READ THE REQUEST, THEN ROUTE IT"},
"nw-light":{C:LightFig,ar:640/244,title:()=>"ROUND TRIPS FROM MUMBAI"},
"nw-regions":{C:RegionsFig,ar:640/246,title:()=>"EACH REGION SERVES ITS OWN CITIES"},
"nw-backoff":{C:BackoffFig,ar:640/264,title:()=>"RETRIES THAT DON'T ARRIVE TOGETHER"},
"nw-idem":{C:IdemFig,ar:640/232,title:()=>"THE SAME PAYMENT, SENT TWICE"},
"nw-breaker":{C:BreakerFig,ar:640/232,title:()=>"A CIRCUIT BREAKER'S THREE STATES"},
};

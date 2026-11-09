// Interview Questions › Medium: the figures this sub-tab's articles draw (site.json dashboard.groups.interview-questions, "medium").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Glow,Show,Mark,Line,SBox,INK,GREY,RED,BLUE}from"../parts.jsx";

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
<Line x1={462} y1={124} x2={506} y2={104} m={M}/><Line x1={462} y1={130} x2={506} y2={130} m={M}/><Line x1={462} y1={136} x2={506} y2={156} m={M}/><text x={400} y={162} textAnchor="middle" className="fl">points, in batches</text>
<Line x1={508} y1={168} x2={324} y2={198} m={M} dash/><Line x1={158} y1={200} x2={60} y2={66} m={M} dash/><text x={104} y={112} className="fl">top 100 · my rank</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={50} t0={.02} t1={.08} dur={D}/><Dot x1={294} x2={334} y={50} t0={.1} t1={.16} dur={D}/><Dot x1={400} x2={400} y={64} y2={114} t0={.24} t1={.32} dur={D}/><Glow x={510} y={88} w={130} h={84} t0={.36} t1={.5} dur={D}/><Dot x1={506} x2={326} y={170} y2={198} t0={.56} t1={.66} dur={D}/><Dot x1={156} x2={62} y={198} y2={68} t0={.7} t1={.82} dur={D}/></g>}</svg>}

// Leaderboard, FIG: rank from counts. Keep how many players have each score band. Ananya has 340 points:
// the 37,200 players in the bands above are ahead, plus those above her in her own band: about rank 80,000,
// the top 2%, without asking every shard.
function LbRankFig({still,uid=""}){const D="10s";
const bands=[["400+",1200],["350–399",36000],["300–349",173200],["250–299",410000],["200–249",820000]],max=820000,X=120,W=330;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`lrt${uid}`}><title id={`lrt${uid}`}>Rank from counts. The leaderboard keeps how many players have each band of scores: 1,200 have 400 or more, 36,000 have 350 to 399, 1,73,200 have 300 to 349, and so on. Ananya has 340 points. Everyone in the two bands above hers, 37,200 players, is ahead, plus those above her within her own band, so her rank, about 80,000th, the top 2% of 50 lakh, is estimated from these counts instead of asking every shard.</title>
<text x={0} y={22} className="fb">Score band</text><text x={X} y={22} className="fb">Players</text>
{bands.map(([b,n],i)=>{const y=44+i*32,w=Math.max(4,n/max*W),me=i===2;return <g key={b}><text x={0} y={y+14} className="fl">{b}</text><rect x={X} y={y} width={w} height={20} fill={me?BLUE:"#b9c9ff"}/><text x={X+w+8} y={y+14} className="fl">{n.toLocaleString("en-IN")}</text></g>})}
{still?<g><text x={0} y={222} className="fb" style={{fill:BLUE}}>Ananya, 340: 37,200 ahead in higher bands, plus her place in her band</text></g>:<Show t0={.3} t1={.98} dur={D}><text x={0} y={222} className="fb" style={{fill:BLUE}}>Ananya, 340: 37,200 ahead in higher bands, plus her place in her band</text></Show>}</svg>}

// Ad clicks, FIG: two paths for the same events. Fast: clicks go through a log to an aggregator that counts
// per ad per minute in memory and writes minute totals for dashboards. Exact: the same events are kept raw,
// and a nightly recount produces the numbers advertisers are billed on.
function ClickFlowFig({still,uid=""}){const M=`ck${uid}`,D="12s";
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`ckt${uid}`}><title id={`ckt${uid}`}>Two paths for the same click events. Fast path: the click service logs each click to an event log, an aggregator counts clicks per ad per minute in memory, and writes minute totals that dashboards read within a minute. Exact path: the same events are kept raw in storage, and a nightly recount produces the numbers advertisers are billed on.</title><Mark m={M}/>
<SBox x={0} y={60} w={100} t="App"/><SBox x={140} y={60} w={120} t="Click service"/><SBox x={300} y={60} w={100} t="Event log"/>
<SBox x={440} y={30} w={130} t="Aggregator" blue/><SBox x={440} y={90} w={130} t="Minute totals"/><text x={505} y={124} textAnchor="middle" className="fl">dashboards, in a minute</text>
<SBox x={300} y={170} w={100} t="Raw events"/><SBox x={440} y={170} w={130} t="Nightly recount"/><text x={505} y={204} textAnchor="middle" className="fl">the bill, next morning</text>
<Line x1={102} y1={60} x2={136} y2={60} m={M}/><Line x1={262} y1={60} x2={296} y2={60} m={M}/><text x={279} y={50} textAnchor="middle" className="fl">click id</text>
<Line x1={402} y1={54} x2={436} y2={36} m={M}/><Line x1={505} y1={42} x2={505} y2={76} m={M}/><Line x1={350} y1={72} x2={350} y2={156} m={M}/><Line x1={402} y1={170} x2={436} y2={170} m={M}/>
<text x={0} y={20} className="fb">Fast</text><text x={0} y={34} className="fl">for watching</text><text x={0} y={176} className="fb">Exact</text><text x={0} y={192} className="fl">for money</text>
{!still&&<g aria-hidden="true"><Dot x1={104} x2={134} y={60} t0={.02} t1={.08} dur={D}/><Dot x1={264} x2={294} y={60} t0={.1} t1={.16} dur={D}/><Dot x1={404} x2={434} y={54} y2={36} t0={.2} t1={.26} dur={D}/><Glow x={440} y={18} w={130} h={24} t0={.26} t1={.38} dur={D}/><Dot x1={505} x2={505} y={44} y2={74} t0={.4} t1={.46} dur={D}/>
<Dot x1={350} x2={350} y={74} y2={154} t0={.55} t1={.65} dur={D}/><Dot x1={404} x2={434} y={170} t0={.7} t1={.76} dur={D}/><Glow x={440} y={158} w={130} h={24} t0={.76} t1={.9} dur={D}/></g>}</svg>}

// Ad clicks, FIG: windows by event time. Clicks are counted in the minute they happened, not the minute
// they arrived. A click from 20:41 that arrives at 20:43 (a phone back in signal) still counts for 20:41.
// After a 5-minute allowance the minute is closed; anything later is left to the nightly recount.
function WindowsFig({still,uid=""}){const D="10s",X=60,W=110;
const mins=["20:40","20:41","20:42","20:43","20:44"];
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`wnt${uid}`}><title id={`wnt${uid}`}>Counting by the minute a click happened. Each minute from 20:40 to 20:44 is its own window. A click made at 20:41 that only arrives at 20:43, from a phone that was out of signal, is still counted in the 20:41 window. Each window stays open for 5 minutes after it ends; clicks later than that are left to the nightly recount.</title>
{mins.map((m,i)=><g key={m}><rect x={X+i*W} y={50} width={W-8} height={60} fill={i===1?"#f8faff":"#fff"} stroke={i===1?BLUE:GREY}/><text x={X+i*W+8} y={44} className="fl">{m}</text>{Array.from({length:[5,6,4,7,3][i]},(_,j)=><circle key={j} cx={X+i*W+14+j*12} cy={80} r={4} fill="#b9c9ff"/>)}</g>)}
<text x={0} y={84} className="fl">clicks</text>
{step(.3,<g><circle cx={X+3*W+40} cy={150} r={5} fill={BLUE}/><text x={X+3*W+52} y={154} className="fl" style={{fill:BLUE}}>arrives 20:43</text><path d={`M${X+3*W+34} 150 H${X+W+86} V86`} fill="none" stroke={BLUE} strokeDasharray="4 3"/><circle cx={X+W+86} cy={80} r={5} fill={BLUE}/></g>)}
{step(.55,<text x={X+W+8} y={172} className="fl" style={{fill:BLUE}}>counted in 20:41, when it happened</text>)}
{step(.75,<text x={0} y={204} className="fl">each minute stays open 5 more minutes; later clicks go to the nightly recount</text>)}</svg>}

// Key-value store, FIG: the ring. Machines sit at points on a ring of hash values. A key is hashed to a
// point and stored on the next three machines clockwise. Adding a machine takes over only the slice next to it.
function RingFig({still,uid=""}){const D="12s",CX=180,CY=120,RAD=88;
const nodes=[["A",20],["B",110],["C",200],["D",290]],pt=(deg,r=RAD)=>[CX+r*Math.cos((deg-90)*Math.PI/180),CY+r*Math.sin((deg-90)*Math.PI/180)];
const key=70,[kx,ky]=pt(key);
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`rgt${uid}`}><title id={`rgt${uid}`}>The ring. Four machines, A, B, C and D, sit at points on a ring of hash values. The key "cart:u_42" hashes to a point between A and B, so it is stored on the next three different machines clockwise: B, C and D. When a new machine E joins between A and B, it takes over only the slice of keys next to it; every other key stays where it was.</title>
<circle cx={CX} cy={CY} r={RAD} fill="none" stroke={GREY}/>
{nodes.map(([n,d])=>{const[x,y]=pt(d);const mine=n!=="A";return <g key={n}><circle cx={x} cy={y} r={14} fill={mine?"#f8faff":"#fff"} stroke={mine?BLUE:GREY}/><text x={x} y={y+4} textAnchor="middle" className="fb">{n}</text></g>})}
<circle cx={kx} cy={ky} r={5} fill={RED}/><text x={kx+10} y={ky-8} className="fl" style={{fill:RED}}>cart:u_42</text>
<text x={300} y={50} className="fb">cart:u_42 is stored on B, C and D</text><text x={300} y={68} className="fl">the next three machines clockwise from its point</text>
{step(.4,<g>{(()=>{const[x,y]=pt(45);return <g><circle cx={x} cy={y} r={14} fill="#fff" stroke={BLUE} strokeDasharray="4 3"/><text x={x} y={y+4} textAnchor="middle" className="fb">E</text></g>})()}<text x={300} y={120} className="fb">E joins between A and B</text><text x={300} y={138} className="fl">it takes over only the slice next to it;</text><text x={300} y={154} className="fl">every other key stays where it is</text></g>)}
<text x={300} y={200} className="fl">each machine also owns many small slices (vnodes),</text><text x={300} y={216} className="fl">so a new machine takes a little from everyone</text></svg>}

// Key-value store, FIG: quorums. Three copies (N = 3). A write waits for two (W = 2); C was slow and missed
// it. A read asks two (R = 2), C and B: B has version 8, C still has 7. The newer one wins, and C is fixed.
// Because 2 + 2 > 3, every read set overlaps every write set.
function QuorumFig({still,uid=""}){const M=`qr${uid}`,D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`qrt${uid}`}><title id={`qrt${uid}`}>Quorums with three copies. A write of version 8 waits for two of the three copies; A and B confirm it, C is slow and still has version 7. A read asks two copies, B and C. B answers version 8 and C answers version 7, so the newer version 8 is returned and C is fixed in the background. Because two plus two is more than three, every read overlaps at least one copy that took the write.</title><Mark m={M}/>
<SBox x={0} y={110} w={90} t="Client" blue/>
<SBox x={230} y={50} w={150} t="A · v8"/><SBox x={230} y={110} w={150} t="B · v8"/><SBox x={230} y={170} w={150} t="C · v7 (slow)" down/>
<text x={0} y={30} className="fb">N = 3 copies, W = 2, R = 2</text>
{step(.05,<g><Line x1={92} y1={104} x2={226} y2={56} m={M}/><Line x1={92} y1={110} x2={226} y2={110} m={M}/><text x={100} y={140} className="fl">write v8: wait for 2</text></g>)}
{step(.4,<g><Line x1={382} y1={110} x2={460} y2={110} m={M} dash/><Line x1={382} y1={170} x2={460} y2={126} m={M} dash/><SBox x={464} y={110} w={170} t="read 2: newest is v8" blue/></g>)}
{step(.65,<g><text x={464} y={148} className="fl">C is sent v8</text><text x={464} y={164} className="fl">in the background</text></g>)}
{step(.8,<text x={0} y={222} className="fl">2 + 2 &gt; 3: any 2 copies read include at least 1 that took the write</text>)}</svg>}

// Shared editor, FIG: the path. Everyone editing menu #214 is connected to the one doc server that owns it
// (a registry says which). The server puts each edit in order, appends it to the doc's log with the next
// number, and sends it to the other editors. Every few hundred edits it saves a snapshot.
function DocFlowFig({still,uid=""}){const M=`dc${uid}`,D="12s";
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`dct${uid}`}><title id={`dct${uid}`}>Everyone editing menu 214 is connected to the one doc server that owns it; a registry says which server that is. The server puts each edit in order, appends it to the document's log with the next number, and sends it to the other editors. Every few hundred edits it saves a snapshot of the whole document.</title><Mark m={M}/>
<SBox x={0} y={40} w={120} t="Ananya (laptop)"/><SBox x={0} y={100} w={120} t="Rohit (phone)"/><SBox x={0} y={160} w={120} t="Meera (tablet)"/>
<SBox x={190} y={100} w={170} t="Doc server: menu #214" blue/><SBox x={190} y={30} w={170} t="Registry"/>
<SBox x={430} y={70} w={210} t="Edit log: #41, #42, #43…"/><SBox x={430} y={150} w={210} t="Snapshots"/>
<Line x1={122} y1={46} x2={186} y2={94} m={M}/><Line x1={122} y1={100} x2={186} y2={100} m={M}/><Line x1={122} y1={154} x2={186} y2={106} m={M}/>
<Line x1={275} y1={88} x2={275} y2={44} dash/><text x={283} y={66} className="fl">who owns #214?</text>
<Line x1={362} y1={96} x2={426} y2={74} m={M}/><Line x1={362} y1={108} x2={426} y2={146} m={M} dash/><text x={370} y={180} className="fl">every few hundred edits</text>
<text x={0} y={220} className="fl">open connections: each edit reaches the others within half a second</text>
{!still&&<g aria-hidden="true"><Dot x1={124} x2={184} y={48} y2={94} t0={.02} t1={.12} dur={D}/><Glow x={190} y={88} w={170} h={24} t0={.12} t1={.24} dur={D}/><Dot x1={364} x2={424} y={96} y2={74} t0={.26} t1={.34} dur={D}/><Dot x1={186} x2={124} y={102} y2={102} t0={.38} t1={.46} dur={D}/><Dot x1={186} x2={124} y={106} y2={154} t0={.38} t1={.48} dur={D}/></g>}</svg>}

// Shared editor, FIG: two edits at once. The menu line reads "Tikka ₹220". Ananya adds "Paneer " at the start;
// Rohit, at the same moment, changes 220 to 240 (characters 7 to 9). The server takes Ananya's first (#41).
// Rohit's edit was made against #40, so the server moves it right by the 7 characters Ananya added: it now
// applies to 14 to 16. Everyone ends with "Paneer Tikka ₹240".
function TransformFig({still,uid=""}){const D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`tft${uid}`}><title id={`tft${uid}`}>Two edits at once. The menu line reads "Tikka ₹220". Ananya inserts "Paneer " at the start. At the same moment Rohit replaces the 3 characters at position 7, 220, with 240. The server takes Ananya's edit first, as number 41. Rohit's edit was made on number 40, so the server shifts it right by the 7 characters Ananya added, to position 14. Everyone ends with "Paneer Tikka ₹240".</title>
<text x={0} y={24} className="fb">Version #40</text><rect x={120} y={8} width={170} height={24} fill="#fff" stroke={GREY}/><text x={130} y={25} className="fb">Tikka ₹220</text>
{step(.1,<g><text x={0} y={66} className="fl">Ananya:</text><text x={70} y={66} className="fl" style={{fill:BLUE}}>insert "Paneer " at 0</text><text x={330} y={66} className="fl">→ #41</text></g>)}
{step(.1,<g><text x={0} y={92} className="fl">Rohit:</text><text x={70} y={92} className="fl" style={{fill:BLUE}}>replace 3 characters at 7 with "240", made on #40</text></g>)}
{step(.4,<g><text x={0} y={128} className="fb">Server</text><text x={70} y={128} className="fl">Rohit's edit came after #41, which added 7 characters before it:</text><text x={70} y={146} className="fl" style={{fill:BLUE}}>replace 3 characters at 14 with "240" → #42</text></g>)}
{step(.7,<g><text x={0} y={196} className="fb">Everyone</text><rect x={120} y={180} width={230} height={24} fill="#f8faff" stroke={BLUE}/><text x={130} y={197} className="fb">Paneer Tikka ₹240</text></g>)}</svg>}

// Rider dispatch, FIG: the path. Rider apps send their location every few seconds to a location service,
// which keeps only the latest one per rider in an in-memory map of the city. When an order is placed, the
// dispatcher asks the map for free riders near the restaurant, scores them, and offers the order to the best.
function DispatchFig({still,uid=""}){const M=`dp${uid}`,D="12s";
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`dpt${uid}`}><title id={`dpt${uid}`}>Rider apps send their location every few seconds to a location service, which keeps only each rider's latest location in an in-memory map of the city. When an order is placed, the dispatcher asks the map for free riders near the restaurant, scores each by how soon they can reach it compared with when the food will be ready, and offers the order to the best one.</title><Mark m={M}/>
<SBox x={0} y={50} w={110} t="Rider apps"/><SBox x={160} y={50} w={140} t="Location service"/><SBox x={350} y={50} w={170} t="City map (in memory)" blue/>
<SBox x={0} y={150} w={110} t="New order"/><SBox x={160} y={150} w={140} t="Dispatcher" blue/><SBox x={350} y={150} w={170} t="Offer to best rider"/>
<Line x1={112} y1={50} x2={156} y2={50} m={M}/><Line x1={302} y1={50} x2={346} y2={50} m={M}/><text x={134} y={36} textAnchor="middle" className="fl">every 4 s</text><text x={324} y={36} textAnchor="middle" className="fl">latest only</text>
<Line x1={112} y1={150} x2={156} y2={150} m={M}/><Line x1={250} y1={138} x2={400} y2={64} m={M} dash/><text x={340} y={110} className="fl">free riders near the restaurant?</text>
<Line x1={302} y1={150} x2={346} y2={150} m={M}/><text x={230} y={184} textAnchor="middle" className="fl">score: time to restaurant</text><text x={230} y={198} textAnchor="middle" className="fl">vs food ready time</text>
<text x={530} y={146} className="fl">20 s</text><text x={530} y={160} className="fl">to accept</text>
{!still&&<g aria-hidden="true"><Dot x1={114} x2={154} y={50} t0={.02} t1={.08} dur={D}/><Dot x1={304} x2={344} y={50} t0={.1} t1={.16} dur={D}/><Glow x={350} y={38} w={170} h={24} t0={.16} t1={.26} dur={D}/><Dot x1={114} x2={154} y={150} t0={.34} t1={.4} dur={D}/><Dot x1={252} x2={398} y={136} y2={66} t0={.44} t1={.56} dur={D}/><Glow x={160} y={138} w={140} h={24} t0={.58} t1={.7} dur={D}/><Dot x1={304} x2={344} y={150} t0={.72} t1={.8} dur={D}/><Glow x={350} y={138} w={170} h={24} t0={.8} t1={.95} dur={D}/></g>}</svg>}

// Rider dispatch, FIG: a rider's states. Free, then offered (held for this order for 20 seconds; nobody else
// can offer them anything), then assigned if they accept, then delivering, then free again. A decline or no
// answer in 20 seconds puts them back to free, and the order goes to the next rider.
function OfferStatesFig({still,uid=""}){const M=`of${uid}`,D="12s";
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 210" role="img" aria-labelledby={`oft${uid}`}><title id={`oft${uid}`}>A rider's states. Free, then offered: held for one order for 20 seconds, so no other order can be offered to them. If they accept, assigned, then delivering, then free again. If they decline or don't answer in 20 seconds, they go back to free and the order is offered to the next rider.</title><Mark m={M}/>
<SBox x={0} y={70} w={100} t="free" blue/><SBox x={150} y={70} w={110} t="offered (20 s)"/><SBox x={310} y={70} w={100} t="assigned"/><SBox x={460} y={70} w={110} t="delivering"/>
<Line x1={102} y1={70} x2={146} y2={70} m={M}/>{step(.25,<Line x1={262} y1={70} x2={306} y2={70} m={M}/>)}{step(.25,<text x={284} y={56} textAnchor="middle" className="fl">accepts</text>)}
{step(.4,<Line x1={412} y1={70} x2={456} y2={70} m={M}/>)}{step(.55,<g><Line x1={515} y1={82} x2={515} y2={140} dash/><Line x1={515} y1={140} x2={50} y2={140} dash/><Line x1={50} y1={140} x2={50} y2={84} m={M} dash/><text x={300} y={156} textAnchor="middle" className="fl">delivered: free again</text></g>)}
{step(.7,<g><Line x1={205} y1={58} x2={205} y2={30} dash c={RED}/><Line x1={205} y1={30} x2={60} y2={30} dash c={RED}/><Line x1={60} y1={30} x2={60} y2={56} m={M} dash c={RED}/><text x={215} y={26} className="fl" style={{fill:RED}}>declines or 20 s pass: free; order goes to the next rider</text></g>)}
{step(.85,<text x={0} y={196} className="fl">the move to "offered" only happens if the rider is still free: one order at a time, never two</text>)}</svg>}

// Video, FIG: the pipeline. The chef's app uploads the original straight to storage. A queue hands it to
// transcoders, which split it into chunks and encode each chunk in five sizes at once. The result is short
// segments plus a playlist, served through a CDN to viewers.
function VideoPipeFig({still,uid=""}){const M=`vp${uid}`,D="12s";
const sizes=["240p","360p","480p","720p","1080p"];
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`vpt${uid}`}><title id={`vpt${uid}`}>The chef's app uploads the original video straight to storage. A queue hands it to transcoders, which split it into chunks and encode each chunk in five sizes, from 240p to 1080p, at the same time. The result is 4-second segments for each size plus a playlist, served through a CDN to viewers.</title><Mark m={M}/>
<SBox x={0} y={50} w={100} t="Chef's app"/><SBox x={140} y={50} w={110} t="Storage"/><SBox x={290} y={50} w={80} t="Queue"/><SBox x={410} y={50} w={130} t="Transcoders" blue/>
<Line x1={102} y1={50} x2={136} y2={50} m={M}/><Line x1={252} y1={50} x2={286} y2={50} m={M}/><Line x1={372} y1={50} x2={406} y2={50} m={M}/><text x={120} y={36} textAnchor="middle" className="fl">original</text>
{sizes.map((z,i)=><g key={z}><rect x={410+i*46} y={84} width={40} height={20} fill="#f8faff" stroke={BLUE}/><text x={430+i*46} y={98} textAnchor="middle" className="fl">{z}</text></g>)}
<text x={475} y={122} textAnchor="middle" className="fl">every chunk, five sizes, in parallel</text>
<SBox x={410} y={170} w={130} t="Segments + playlist"/><SBox x={250} y={170} w={110} t="CDN"/><SBox x={90} y={170} w={110} t="Viewers"/>
<Line x1={475} y1={130} x2={475} y2={156} m={M}/><Line x1={408} y1={170} x2={364} y2={170} m={M}/><Line x1={248} y1={170} x2={204} y2={170} m={M}/>
<text x={305} y={206} textAnchor="middle" className="fl">most views served from the edge</text>
{!still&&<g aria-hidden="true"><Dot x1={104} x2={134} y={50} t0={.02} t1={.1} dur={D}/><Dot x1={254} x2={284} y={50} t0={.12} t1={.18} dur={D}/><Dot x1={374} x2={404} y={50} t0={.2} t1={.26} dur={D}/><Glow x={410} y={78} w={226} h={32} t0={.28} t1={.46} dur={D}/><Dot x1={475} x2={475} y={132} y2={154} t0={.5} t1={.56} dur={D}/><Dot x1={406} x2={366} y={170} t0={.6} t1={.68} dur={D}/><Dot x1={246} x2={206} y={170} t0={.72} t1={.8} dur={D}/></g>}</svg>}

// Video, FIG: changing quality. The player fetches 4-second segments and picks a size for each one from how
// fast the last few downloaded. Strong 4G: 720p. In a lift the speed drops, so the next segments are 240p
// and the video keeps playing. Out of the lift it climbs back to 480p, then 720p.
function AbrFig({still,uid=""}){const D="10s",X=110,SW=40;
const seg=[[720,"4G"],[720,"4G"],[720,"4G"],[240,"lift"],[240,"lift"],[480,"back"],[720,"4G"],[720,"4G"],[720,"4G"],[720,"4G"],[720,"4G"],[720,"4G"]];
const h=(q)=>q===720?70:q===480?46:22;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`abt${uid}`}><title id={`abt${uid}`}>The player fetches 4-second segments and picks a size for each one from how fast the last few downloaded. On strong 4G it fetches 720p. In a lift the speed drops, so the next two segments are 240p and the video keeps playing without a pause. Out of the lift it climbs back to 480p, then 720p.</title>
<text x={0} y={64} className="fl">720p</text><text x={0} y={88} className="fl">480p</text><text x={0} y={112} className="fl">240p</text>
<line x1={X} y1={130} x2={X+seg.length*SW+4} y2={130} stroke={GREY}/>
{seg.map(([q,n],i)=>{const el=<rect x={X+i*SW+2} y={130-h(q)} width={SW-6} height={h(q)} fill={q===240?"#f4c7c3":q===480?"#b9c9ff":BLUE}/>;return still?<g key={i}>{el}</g>:<Show key={i} t0={.03+i*.07} t1={.98} dur={D}>{el}</Show>})}
<text x={X+3*SW+2} y={150} className="fl" style={{fill:RED}}>in a lift</text><text x={X+5*SW+2} y={166} className="fl">back</text>
<text x={0} y={150} className="fl">each bar: 4 s</text>
<text x={0} y={200} className="fl">quality changes from one segment to the next; the picture never stops</text></svg>}

// Menu search, FIG: the path. A query is cleaned up (spelling, Hinglish, synonyms), sent to every shard of
// the city's index at once, each returns its best 20, and the merged list is re-ranked for this person.
// Separately, menu changes flow from the menus database through an indexer into the shards within a minute.
function SearchFlowFig({still,uid=""}){const M=`sr${uid}`,D="12s";
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`srt${uid}`}><title id={`srt${uid}`}>A search for "panir butter masala" goes to the query service, which fixes the spelling and adds synonyms. It asks every shard of the city's index at once; each shard returns its best 20 dishes, and the query service merges them and re-ranks the list for this person by distance, open now and past orders. Separately, menu changes flow from the menus database through an indexer into the shards within a minute.</title><Mark m={M}/>
<SBox x={0} y={60} w={120} t="Search box"/><SBox x={160} y={60} w={140} t="Query service" blue/>
<SBox x={360} y={30} w={130} t="Pune shard 1"/><SBox x={360} y={70} w={130} t="Pune shard 2"/><SBox x={360} y={110} w={130} t="Pune shard 3"/>
<SBox x={530} y={70} w={106} t="Top 20, ranked" blue/>
<Line x1={122} y1={60} x2={156} y2={60} m={M}/><text x={0} y={92} className="fl">"panir butter masala"</text><text x={230} y={92} textAnchor="middle" className="fl">→ paneer, makhani…</text>
<Line x1={302} y1={56} x2={356} y2={34} m={M}/><Line x1={302} y1={60} x2={356} y2={70} m={M}/><Line x1={302} y1={64} x2={356} y2={106} m={M}/>
<Line x1={492} y1={30} x2={526} y2={64} m={M}/><Line x1={492} y1={70} x2={526} y2={70} m={M}/><Line x1={492} y1={110} x2={526} y2={76} m={M}/>
<SBox x={0} y={200} w={130} t="Menus database"/><SBox x={180} y={200} w={120} t="Indexer"/>
<Line x1={132} y1={200} x2={176} y2={200} m={M}/><Line x1={302} y1={196} x2={420} y2={124} m={M} dash/><text x={150} y={186} textAnchor="middle" className="fl">changes</text><text x={372} y={176} className="fl">within a minute</text>
{!still&&<g aria-hidden="true"><Dot x1={124} x2={154} y={60} t0={.02} t1={.08} dur={D}/><Glow x={160} y={48} w={140} h={24} t0={.08} t1={.18} dur={D}/><Dot x1={304} x2={354} y={56} y2={34} t0={.2} t1={.28} dur={D}/><Dot x1={304} x2={354} y={60} y2={70} t0={.2} t1={.28} dur={D}/><Dot x1={304} x2={354} y={64} y2={106} t0={.2} t1={.28} dur={D}/><Glow x={530} y={58} w={106} h={24} t0={.34} t1={.48} dur={D}/><Dot x1={134} x2={174} y={200} t0={.6} t1={.66} dur={D}/><Dot x1={304} x2={418} y={196} y2={126} t0={.7} t1={.82} dur={D}/></g>}</svg>}

// Menu search, FIG: the inverted index. Each word points to the dishes that contain it. "paneer butter
// masala" reads three short lists and combines them: d12 has all three words, d40 has two, d55 and d77 one.
function InvertedFig({still,uid=""}){const D="10s";
const rows=[["paneer",["d12","d40","d77"]],["butter",["d12","d55"]],["masala",["d12","d40","d90"]]];
const res=[["d12","Paneer Butter Masala · 3 of 3",1],["d40","Paneer Masala Dosa · 2 of 3",0],["d55","Butter Naan · 1 of 3",0]];
const step=(t0,el)=>still?el:<Show t0={t0} t1={.98} dur={D}>{el}</Show>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`ivt${uid}`}><title id={`ivt${uid}`}>An inverted index: each word points to the dishes that contain it. paneer points to d12, d40 and d77; butter to d12 and d55; masala to d12, d40 and d90. A search for paneer butter masala reads these three short lists and combines them: d12, Paneer Butter Masala, has all three words and ranks first; d40, Paneer Masala Dosa, has two; d55, Butter Naan, has one.</title>
<text x={0} y={22} className="fb">Word</text><text x={100} y={22} className="fb">Dishes that contain it</text>
{rows.map(([w,ids],i)=>{const y=52+i*34;return <g key={w}><rect x={0} y={y-16} width={86} height={26} fill="#f8faff" stroke={BLUE}/><text x={10} y={y+2} className="fb">{w}</text>{ids.map((d,j)=><g key={d}><rect x={100+j*54} y={y-16} width={48} height={26} fill={d==="d12"?"#b9c9ff":"#fff"} stroke={GREY}/><text x={124+j*54} y={y+2} textAnchor="middle" className="fl">{d}</text></g>)}</g>})}
{step(.3,<text x={300} y={22} className="fb">"paneer butter masala"</text>)}
{res.map(([d,t,top],i)=><g key={d}>{step(.4+i*.15,<text x={300} y={52+i*34} className="fl" style={{fill:top?BLUE:INK}}>{i+1}. {t}</text>)}</g>)}
<text x={0} y={200} className="fl">three short lists instead of reading every dish in Pune; most words match a tiny share</text></svg>}

export const FIGS={
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
"click-flow":{C:ClickFlowFig,ar:640/230,title:()=>"FAST FOR WATCHING, EXACT FOR MONEY"},
"windows":{C:WindowsFig,ar:640/220,title:()=>"COUNTED WHEN IT HAPPENED"},
"ring":{C:RingFig,ar:640/240,title:()=>"WHERE A KEY LIVES"},
"quorum":{C:QuorumFig,ar:640/230,title:()=>"TWO CONFIRM, TWO ANSWER, ONE OVERLAP"},
"doc-flow":{C:DocFlowFig,ar:640/230,title:()=>"ONE SERVER ORDERS EACH DOCUMENT"},
"transform":{C:TransformFig,ar:640/230,title:()=>"TWO EDITS, ONE RESULT"},
"dispatch":{C:DispatchFig,ar:640/230,title:()=>"FROM PINGS TO AN OFFER"},
"offer-states":{C:OfferStatesFig,ar:640/210,title:()=>"ONE ORDER AT A TIME"},
"video-pipe":{C:VideoPipeFig,ar:640/240,title:()=>"ONE UPLOAD, FIVE SIZES"},
"abr":{C:AbrFig,ar:640/220,title:()=>"QUALITY FOLLOWS THE NETWORK"},
"search-flow":{C:SearchFlowFig,ar:640/240,title:()=>"FROM A TYPED QUERY TO TWENTY DISHES"},
"inverted":{C:InvertedFig,ar:640/230,title:()=>"WORDS POINT TO DISHES"},
};

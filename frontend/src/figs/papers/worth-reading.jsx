// Research Papers › Worth reading: the figures this sub-tab's articles draw (site.json dashboard.groups.papers, "worth-reading").
// Shared drawing parts and conventions are in ../parts.jsx. FIGS maps each figure id to { C, ar, title }.
import React from"react";import{Dot,Show,Mk,Bx,Ar,Caps,Cap,INK,GREY,RED,BLUE}from"../parts.jsx";

// Bloom filters, FIG 1: sixteen bits and three hash functions. Adding biryani sets bits 2, 5, 9; adding dosa
// sets 1, 5, 12. Asking for naan (3, 7, 12): bit 3 is 0, so definitely not. Asking for idli (1, 9, 12): all
// are 1, so "probably", but it was never added: a false positive.
function BloomBitsFig({still,uid=""}){const D="14s",X=i=>20+i*37,set1=[2,5,9],set2=[1,12];
const caps=[["1 · adding 'biryani': three hash functions pick bits 2, 5 and 9, set to 1",INK],["2 · adding 'dosa' sets bits 1, 5 and 12; sharing bit 5 is fine",INK],["3 · is 'naan' in? Its bits are 3, 7 and 12: bit 3 is 0, so definitely not",BLUE],["4 · is 'idli' in? Bits 1, 9 and 12 are all 1: 'probably', but it never was",RED]];
const cell=(i,fill="#fff",c=GREY,w)=><rect key={i} x={X(i)} y="110" width="33" height="34" fill={fill} stroke={c} strokeWidth={w}/>;
const bit=(i,v)=><text key={"b"+i} x={X(i)+16.5} y="132" textAnchor="middle" className="fb" style={v?{fill:BLUE}:{fill:GREY}}>{v}</text>;
const ones=s=>s.map(i=><g key={i}>{cell(i,"#dfe6fb",BLUE)}{bit(i,1)}</g>);
const base=<g>{Array.from({length:16},(_,i)=><g key={i}>{cell(i)}{bit(i,0)}<text x={X(i)+16.5} y="162" textAnchor="middle" className="fl">{i}</text></g>)}</g>;
const ring=(s,c)=>s.map(i=><rect key={i} x={X(i)-3} y="107" width="39" height="40" fill="none" stroke={c} strokeWidth="2"/>);
const say=(t,c=INK)=><text x="20" y="80" className="fl" style={{fill:c}}>{t}</text>;
return <svg viewBox="0 0 640 220" role="img" aria-labelledby={`bbt${uid}`}><title id={`bbt${uid}`}>A Bloom filter of sixteen bits and three hash functions. Adding the word biryani sets bits 2, 5 and 9 to one. Adding dosa sets bits 1, 5 and 12; sharing bit 5 is fine. Asking whether naan was added checks its bits, 3, 7 and 12: bit 3 is zero, so naan was definitely never added. Asking about idli checks bits 1, 9 and 12, which are all one, so the filter says probably, although idli was never added: a false positive.</title>
{base}{still?<g>{ones(set1)}{ones(set2)}{ring([1,9,12],RED)}{say("idli → bits 1, 9, 12: all 1 → 'probably yes', but it was never added (a false positive)",RED)}<Cap t={caps[3][0]} c={RED}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.06} t1={1} dur={D}>{ones(set1)}</Show><Show t0={0} t1={.25} dur={D}>{ring(set1,BLUE)}{say("biryani → h1 = 2, h2 = 5, h3 = 9")}</Show>
<Show t0={.31} t1={1} dur={D}>{ones(set2)}</Show><Show t0={.25} t1={.5} dur={D}>{ring([1,5,12],BLUE)}{say("dosa → h1 = 1, h2 = 5, h3 = 12")}</Show>
<Show t0={.5} t1={.75} dur={D}>{ring([3,7],RED)}{ring([12],BLUE)}{say("naan → bits 3, 7, 12: a 0 among them → definitely not added",BLUE)}</Show>
<Show t0={.75} t1={1} dur={D}>{ring([1,9,12],RED)}{say("idli → bits 1, 9, 12: all 1 → 'probably yes', but it was never added (a false positive)",RED)}</Show></g>}</svg>}

// Bloom filters, FIG 2: false positives against bits per item, with the best number of hash functions, on
// a log scale: 4 bits 14.6%, 6 bits 5.6%, 8 bits 2.1%, 10 bits 0.82%, 12 bits 0.31%, 16 bits 0.046%.
function BloomTradeFig({still,uid=""}){const D="12s",B=[[4,14.6],[6,5.6],[8,2.1],[10,0.82],[12,0.31],[16,0.046]],h=p=>(Math.log10(p)+2)/4*150,X=i=>90+i*88,Y0=210;
const caps=[["1 · more bits per item, fewer false positives: every 2 bits cuts them by more than half",INK],["2 · 10 bits per item (and about 7 hash functions) gives under 1 in 100",BLUE],["3 · a crawler that has seen 1 crore URLs needs about 12 MB for that",BLUE]];
const bar=(i,hl)=>{const[b,p]=B[i];return <g key={i}><rect x={X(i)} y={Y0-h(p)} width="56" height={h(p)} fill={hl?"#dfe6fb":"#fff"} stroke={hl?BLUE:GREY}/><text x={X(i)+28} y={Y0-h(p)-6} textAnchor="middle" className="fl" style={hl?{fill:BLUE}:undefined}>{p}%</text><text x={X(i)+28} y={Y0+16} textAnchor="middle" className="fl">{b} bits</text></g>};
const base=<g><line x1="80" y1={Y0} x2="620" y2={Y0} stroke={GREY}/><text x="10" y="60" className="fl">false positives</text><text x="10" y="74" className="fl">(log scale)</text>{B.map((_,i)=>bar(i,i===3))}</g>;
const note=<g><text x="380" y="70" className="fl" style={{fill:BLUE}}>1 crore URLs × 10 bits ≈ 12 MB,</text><text x="380" y="86" className="fl" style={{fill:BLUE}}>wrong about 1 time in 120</text></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`btf${uid}`}><title id={`btf${uid}`}>A bar chart on a log scale of a Bloom filter's false-positive rate against the bits used per item, with the best number of hash functions: 4 bits gives 14.6 percent, 6 bits 5.6 percent, 8 bits 2.1 percent, 10 bits 0.82 percent, 12 bits 0.31 percent and 16 bits 0.046 percent. Every two extra bits cut false positives by more than half. Ten bits per item, about 12 megabytes for ten million crawled URLs, is wrong about once in 120 checks.</title>
{base}{still?<g>{note}<Cap t={caps[2][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/><Show t0={2/3} t1={1} dur={D}>{note}</Show></g>}</svg>}

// Chubby, FIG 1: leader election with a lock. Three database servers try to take the lock file; server 2 gets
// it and writes its address in the file; it stops, and when its 12-second session lease runs out the lock is
// freed; server 3 takes it, and clients reading the file find the new primary.
function ChubbyElectFig({still,uid=""}){const D="14s",X=[20,250,480];
const caps=[["1 · three database servers each try to take the lock on /ls/zt/orders/primary",INK],["2 · server 2 gets it and writes its address into the file; the others wait",BLUE],["3 · server 2 stops; when its 12-second session lease runs out, the lock is freed",RED],["4 · server 3 takes the lock; clients read the file and find the new primary",BLUE]];
const cell=(t)=><Bx x={200} y={50} w={240} h={60} t="Chubby cell (5 replicas)" s={t}/>;
const sv=(i,c=GREY,fill="#fff",s="")=><Bx key={i} x={X[i]} y={180} w={140} h={44} t={`db server ${i+1}`} s={s} c={c} fill={fill}/>;
const base=<g>{[0,1,2].map(i=>sv(i))}</g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`cet${uid}`}><title id={`cet${uid}`}>Leader election with a Chubby lock. Three database servers each try to take the lock on a file in a Chubby cell of five replicas. Server 2 gets it and writes its address into the file, while the others wait. Server 2 then stops; when its 12-second session lease runs out, Chubby frees the lock. Server 3 takes it, and clients that read the file find the new primary.</title>
{base}{still?<g>{cell("holder: db server 3")}{sv(1,RED,"#fff5f4","stopped")}{sv(2,BLUE,"#f8faff","primary")}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.25} dur={D}>{cell("lock: free")}</Show>{X.map((x,i)=><Dot key={i} x1={x+70} x2={320} y={180} y2={110} t0={.05+i*.02} t1={.17+i*.02} dur={D}/>)}
<Show t0={.25} t1={.5} dur={D}>{cell("holder: db server 2")}{sv(1,BLUE,"#f8faff","primary")}</Show>
<Show t0={.5} t1={.75} dur={D}>{cell("session expired: lock free")}{sv(1,RED,"#fff5f4","stopped")}</Show>
<Show t0={.75} t1={1} dur={D}>{cell("holder: db server 3")}{sv(1,RED,"#fff5f4","stopped")}{sv(2,BLUE,"#f8faff","primary")}</Show><Dot x1={550} x2={330} y={180} y2={110} t0={.77} t1={.88} dur={D}/></g>}</svg>}

// Chubby, FIG 2: sequencers. Server 2 held the lock as generation 7 and paused for 20 seconds; server 3 took the
// lock as generation 8 and writes with it; server 2 wakes and sends a write with generation 7; the order store has
// seen 8, so it refuses 7.
function ChubbyFenceFig({still,uid=""}){const M=`cf${uid}`,D="12s";
const caps=[["1 · server 2 held the lock as generation 7, then froze for 20 seconds",INK],["2 · its lease ran out; server 3 took the lock as generation 8 and writes with it",BLUE],["3 · server 2 wakes, still believes it is primary, and sends a write with gen 7",RED],["4 · the store has already seen gen 8, so it refuses gen 7: no harm done",BLUE]];
const base=<g><Bx x={10} y={60} w={170} h={44} t="db server 2" s="lock gen 7, frozen"/><Bx x={10} y={170} w={170} h={44} t="db server 3" s="lock gen 8"/></g>;
const store=s=><Bx x={430} y={112} w={200} h={50} t="order store" s={s}/>;
const s2=<g><Ar x1={180} y1={192} x2={427} y2={146} m={M} c={BLUE}/><text x="250" y="196" className="fl" style={{fill:BLUE}}>write · gen 8 → ok</text></g>;
const s3=<g><Ar x1={180} y1={82} x2={427} y2={128} m={M} c={RED} dash/><text x="250" y="80" className="fl" style={{fill:RED}}>write · gen 7</text></g>;
const s4=<text x="430" y="186" className="fb" style={{fill:RED}}>gen 7 &lt; 8: refused</text>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`cft${uid}`}><title id={`cft${uid}`}>Why Chubby's sequencers matter. Database server 2 held the lock as generation 7 and then froze for 20 seconds. Its lease ran out, and server 3 took the lock as generation 8 and wrote to the order store with that generation. Server 2 wakes up, still believes it is the primary, and sends a write with generation 7. The store has already seen generation 8, so it refuses the write, and the old primary can do no harm.</title><Mk m={M}/>
{base}{still?<g>{store("latest gen seen: 8")}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.25} dur={D}>{store("latest gen seen: 7")}</Show><Show t0={.25} t1={1} dur={D}>{store("latest gen seen: 8")}{s2}</Show><Dot x1={180} x2={430} y={192} y2={146} t0={.3} t1={.42} dur={D}/>
<Show t0={.5} t1={1} dur={D}>{s3}</Show><Dot x1={180} x2={430} y={82} y2={128} t0={.55} t1={.67} dur={D}/><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Haystack, FIG 1: one photo, two ways. As its own file: the directory entry, the inode, then the photo, three
// disk reads. In Haystack: an in-memory index gives volume, offset and size, so one disk read.
function HaystackReadFig({still,uid=""}){const D="12s";
const caps=[["1 · a photo stored as its own file: the disk first reads the directory entry",INK],["2 · then the file's inode, then the photo: three disk reads for one photo",RED],["3 · Haystack keeps a compact index in memory: photo → volume, offset, size",BLUE],["4 · so serving a photo is one disk read at a known offset",BLUE]];
const step=(x,y,t,c=GREY,fill="#fff")=><Bx x={x} y={y} w={270} h={34} t={t} c={c} fill={fill}/>;
const base=<g><text x="10" y="58" className="fb">One file per photo</text><text x="340" y="58" className="fb">Haystack</text><line x1="320" y1="46" x2="320" y2="230" stroke={GREY} strokeDasharray="3 3"/></g>;
const a1=step(10,70,"disk read 1: the directory entry",RED,"#fff5f4"),a2=<g>{step(10,114,"disk read 2: the file's inode",RED,"#fff5f4")}{step(10,158,"disk read 3: the photo",RED,"#fff5f4")}<text x="10" y="220" className="fl" style={{fill:RED}}>3 disk reads; the metadata didn't fit in memory</text></g>;
const b1=step(340,70,"memory: photo 8812 → vol 41, 7.2 GB, 180 KB",BLUE,"#f8faff"),b2=<g>{step(340,114,"disk read 1: 180 KB at 7.2 GB",BLUE,"#f8faff")}<text x="340" y="220" className="fl" style={{fill:BLUE}}>1 disk read: the index is in memory</text></g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`hrt${uid}`}><title id={`hrt${uid}`}>Serving one photo, two ways. Stored as its own file, the photo needs a disk read for the directory entry, another for the file's inode, and a third for the photo itself: three disk reads, because the file-system metadata for billions of photos did not fit in memory. Haystack keeps a compact index in memory that maps the photo to its volume file, offset and size, so serving the photo takes a single disk read at a known offset.</title>
{base}{still?<g>{a1}{a2}{b1}{b2}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={.04} t1={1} dur={D}>{a1}</Show><Show t0={.28} t1={1} dur={D}>{a2}</Show><Show t0={.52} t1={1} dur={D}>{b1}</Show><Show t0={.77} t1={1} dur={D}>{b2}</Show></g>}</svg>}

// Haystack, FIG 2: a volume. Photos are appended as needles to a 100 GB volume file kept on three machines; a
// delete only sets a flag; compaction copies the live needles to a new volume, dropping deleted ones; the index
// points to the new offsets.
function HaystackVolumeFig({still,uid=""}){const D="14s",W=[70,50,90,60,80,55,75,60],del=[1,4],Y1=100,Y2=180;
const caps=[["1 · photos are appended as needles to a 100 GB volume file, kept on three machines",INK],["2 · a delete only sets a flag in the needle and the index; the bytes stay put",RED],["3 · compaction copies the live needles into a new volume and skips the deleted ones",BLUE],["4 · the new volume replaces the old one; the index now points at the new offsets",BLUE]];
const xs=a=>a.reduce((o,w,i)=>(o.push(i?o[i-1]+a[i-1]+4:20),o),[]),X1=xs(W),live=W.map((w,i)=>[w,i]).filter(([,i])=>!del.includes(i)),X2=xs(live.map(([w])=>w));
const needle=(x,y,w,i,c=GREY,fill="#fff",dash)=><g key={i}><rect x={x} y={y} width={w} height="40" fill={fill} stroke={c} strokeDasharray={dash?"4 3":undefined}/><text x={x+w/2} y={y+24} textAnchor="middle" className="fl">p{i+1}</text></g>;
const v1=(d)=><g><text x="20" y={Y1-10} className="fl">volume 41 (old)</text>{W.map((w,i)=>needle(X1[i],Y1,w,i,d&&del.includes(i)?RED:GREY,d&&del.includes(i)?"#fff5f4":"#fff",d&&del.includes(i)))}</g>;
const v2=<g><text x="20" y={Y2-10} className="fl" style={{fill:BLUE}}>volume 41 (compacted)</text>{live.map(([w,i],k)=>needle(X2[k],Y2,w,i,BLUE,"#f8faff"))}</g>;
return <svg viewBox="0 0 640 250" role="img" aria-labelledby={`hvt${uid}`}><title id={`hvt${uid}`}>A Haystack volume. Photos are appended one after another as needles to a 100 gigabyte volume file, kept on three machines. Deleting a photo only sets a flag in its needle and in the in-memory index; the bytes stay where they are. Compaction copies the live needles into a new volume file and skips the deleted ones, here photos 2 and 5. The new volume replaces the old one and the index points at the new offsets.</title>
{still?<g>{v1(1)}{v2}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
{W.map((w,i)=><Show key={i} t0={i*.025} t1={.25} dur={D}>{needle(X1[i],Y1,w,i)}</Show>)}<Show t0={.25} t1={1} dur={D}>{v1(1)}</Show>
<Show t0={.5} t1={1} dur={D}>{v2}</Show>{live.slice(0,3).map(([w,i],k)=><Dot key={i} x1={X1[i]+w/2} x2={X2[k]+w/2} y={Y1+40} y2={Y2} t0={.52+k*.04} t1={.64+k*.04} dur={D}/>)}</g>}</svg>}

// Spanner, FIG 1: TrueTime and commit wait. At real time 5 ms TrueTime says "between 1 and 9 ms"; the commit
// takes 9 as its timestamp and waits until TrueTime's earliest passes 9 (real 13 ms) before it is visible; a
// transaction that starts later, at 15 ms, gets an interval 11 to 19 and so a bigger timestamp, 19.
function SpannerTimeFig({still,uid=""}){const D="14s",x=t=>60+t*27,AX=210;
const caps=[["1 · T1 asks TrueTime the time and gets an interval: between 1 and 9 ms",INK],["2 · it takes the top of the interval, 9, as its commit timestamp",BLUE],["3 · it waits until TrueTime is sure 9 has passed (real time 13 ms), then commits",BLUE],["4 · any transaction that starts later gets a bigger timestamp: order matches real time",BLUE]];
const iv=(a,b,y,t,c)=><g><line x1={x(a)} y1={y} x2={x(b)} y2={y} stroke={c} strokeWidth="6" opacity=".35"/><line x1={x(a)} y1={y-8} x2={x(a)} y2={y+8} stroke={c}/><line x1={x(b)} y1={y-8} x2={x(b)} y2={y+8} stroke={c}/><text x={x(a)} y={y-12} className="fl" style={{fill:c}}>{t}</text></g>;
const base=<g><line x1={x(0)} y1={AX} x2={x(20)} y2={AX} stroke={GREY}/>{[0,5,10,15,20].map(t=><g key={t}><line x1={x(t)} y1={AX} x2={x(t)} y2={AX+5} stroke={GREY}/><text x={x(t)} y={AX+18} textAnchor="middle" className="fl">{t} ms</text></g>)}<text x="10" y={AX+4} className="fl">real</text></g>;
const s1=<g>{iv(1,9,90,"T1 at real 5 ms: TT.now() = [1, 9]",INK)}<circle cx={x(5)} cy={AX} r="4" fill={INK}/></g>;
const s2=<g><path d={`M${x(9)} 104l-5 9h10z`} fill={BLUE}/><text x={x(9)+8} y="116" className="fl" style={{fill:BLUE}}>commit timestamp 9</text></g>;
const s3=<g><line x1={x(5)} y1="132" x2={x(13)} y2="132" stroke={BLUE} strokeDasharray="4 3"/><text x={x(5)} y="126" className="fl" style={{fill:BLUE}}>commit wait</text><text x={x(13)+6} y="136" className="fl" style={{fill:BLUE}}>visible at 13</text><circle cx={x(13)} cy={AX} r="4" fill={BLUE}/></g>;
const s4=<g>{iv(11,19,184,"T2 starts at 15: [11, 19] → timestamp 19 > 9",BLUE)}</g>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`stt${uid}`}><title id={`stt${uid}`}>Spanner's commit wait on a time line in milliseconds. At real time 5 ms, transaction T1 asks TrueTime for the time and gets an interval, between 1 and 9 ms, because clocks have known uncertainty. It takes the top of the interval, 9, as its commit timestamp, and waits until TrueTime is sure that 9 has passed, at real time 13 ms, before making the commit visible. A transaction T2 that starts later, at 15 ms, gets the interval 11 to 19 and so a timestamp of 19, bigger than 9. Timestamp order therefore matches the real order of events.</title>
{base}{still?<g>{s1}{s2}{s3}{s4}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={1} dur={D}>{s1}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show><Show t0={.5} t1={1} dur={D}>{s3}</Show><Show t0={.75} t1={1} dur={D}>{s4}</Show></g>}</svg>}

// Spanner, FIG 2: a snapshot read. Every write keeps a version tagged with its commit timestamp; a read-only
// transaction picks timestamp 10 and asks up-to-date replicas; each returns the newest version at or before 10
// (₹250) without taking locks, while the write at 12 (₹280) carries on.
function SpannerSnapFig({still,uid=""}){const D="12s",X=[10,220,430];
const caps=[["1 · every write keeps a version, tagged with its commit timestamp",INK],["2 · a read-only transaction picks a timestamp, 10, and asks up-to-date replicas",BLUE],["3 · each returns the newest version at or before 10: ₹250, with no locks taken",BLUE],["4 · writes carry on meanwhile; the reader sees one consistent moment",BLUE]];
const rep=(i,hl)=><g key={i}><rect x={X[i]} y="60" width="200" height="86" fill="#fff" stroke={GREY}/><text x={X[i]+10} y="80" className="fb">{["Mumbai","Singapore","Frankfurt"][i]} replica</text><text x={X[i]+10} y="102" className="fl" style={hl?{fill:BLUE}:undefined}>biryani price @ t5 = ₹250</text><text x={X[i]+10} y="122" className="fl">biryani price @ t12 = ₹280</text>{hl&&<rect x={X[i]+4} y="90" width="192" height="17" fill="none" stroke={BLUE}/>}</g>;
const q=<Bx x={170} y={186} w={300} h={40} t="read-only transaction at t10" s="no locks, any up-to-date replica" c={BLUE}/>;
return <svg viewBox="0 0 640 240" role="img" aria-labelledby={`sst${uid}`}><title id={`sst${uid}`}>A Spanner snapshot read. Each replica, in Mumbai, Singapore and Frankfurt, keeps versions of the biryani price tagged with commit timestamps: 250 rupees at timestamp 5 and 280 rupees at timestamp 12. A read-only transaction picks timestamp 10 and asks replicas that are up to date to that point. Each returns the newest version at or before 10, 250 rupees, without taking any locks, while writes carry on. The reader sees the whole database as it was at one moment.</title>
{still?<g>{X.map((_,i)=>rep(i,1))}{q}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.5} dur={D}>{X.map((_,i)=>rep(i,0))}</Show><Show t0={.25} t1={1} dur={D}>{q}</Show>{X.map((x,i)=><Dot key={i} x1={320} x2={x+100} y={186} y2={146} t0={.3+i*.03} t1={.42+i*.03} dur={D}/>)}
<Show t0={.5} t1={1} dur={D}>{X.map((_,i)=>rep(i,1))}</Show></g>}</svg>}

// The Tail at Scale, FIG 1: fan-out. Each server is slow (over 1 s) on 1 request in 100. Waiting for all of 1,
// 10, 100 or 1,000 servers makes a request slow 1%, 9.6%, 63% or almost 100% of the time.
function TailFanFig({still,uid=""}){const D="12s",B=[[1,1],[10,9.6],[100,63.4],[1000,99.996]],X=i=>110+i*130,Y0=210,h=p=>p*1.4;
const caps=[["1 · one server is slow (over a second) on 1 request in 100",INK],["2 · wait for 10 such servers and 9.6% of requests are slow",INK],["3 · wait for 100 and 63% of requests are slow",RED],["4 · at 1,000, nearly every request waits for some slow server",RED]];
const bar=i=>{const[n,p]=B[i];const c=i>=2?RED:BLUE;return <g key={i}><rect x={X(i)} y={Y0-h(p)} width="70" height={h(p)} fill={i>=2?"#fff5f4":"#dfe6fb"} stroke={c}/><text x={X(i)+35} y={Y0-h(p)-6} textAnchor="middle" className="fb" style={{fill:c}}>{p>99?"≈100":p}%</text><text x={X(i)+35} y={Y0+16} textAnchor="middle" className="fl">{n.toLocaleString("en-IN")} server{n>1?"s":""}</text></g>};
const base=<g><line x1="90" y1={Y0} x2="630" y2={Y0} stroke={GREY}/><text x="10" y="60" className="fl">requests</text><text x="10" y="74" className="fl">slower than 1 s</text></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`tft${uid}`}><title id={`tft${uid}`}>A bar chart of how fan-out turns rare slowness into common slowness. Each server takes over a second on one request in a hundred. A request that waits for one server is slow 1 percent of the time; for 10 servers, 9.6 percent; for 100 servers, 63 percent; for 1,000 servers, almost always.</title>
{base}{still?<g>{B.map((_,i)=>bar(i))}<Cap t={caps[3][0]} c={RED}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>{B.map((_,i)=><Show key={i} t0={i/4} t1={1} dur={D}>{bar(i)}</Show>)}</g>}</svg>}

// The Tail at Scale, FIG 2: a hedged request. The request goes to replica A; at 10 ms (the 95th percentile)
// there is no answer, so it is also sent to replica B; B answers at 14 ms and A's copy, which would have taken
// 900 ms, is cancelled.
function TailHedgeFig({still,uid=""}){const D="12s",x=t=>120+t*12,Y=[100,160];
const caps=[["1 · the request goes to replica A; it usually answers within 10 ms",INK],["2 · 10 ms pass with no answer, so the same request also goes to replica B",BLUE],["3 · B answers at 14 ms, and A's copy is cancelled: it would have taken 900 ms",BLUE],["4 · only about 5% of requests send a second copy, but the slowest get much faster",BLUE]];
const base=<g><text x="10" y={Y[0]+4} className="fb">replica A</text><text x="10" y={Y[1]+4} className="fb">replica B</text><line x1={x(0)} y1="200" x2={x(40)} y2="200" stroke={GREY}/>{[0,10,20,30,40].map(t=><g key={t}><line x1={x(t)} y1="200" x2={x(t)} y2="205" stroke={GREY}/><text x={x(t)} y="218" textAnchor="middle" className="fl">{t} ms</text></g>)}</g>;
const a=(t1,c=GREY,dash)=><rect x={x(0)} y={Y[0]-12} width={x(t1)-x(0)} height="24" fill="#fff" stroke={c} strokeDasharray={dash?"4 3":undefined}/>;
const s2=<g><line x1={x(10)} y1="70" x2={x(10)} y2="200" stroke={BLUE} strokeDasharray="3 3"/><text x={x(10)+4} y="74" className="fl" style={{fill:BLUE}}>10 ms: 95th percentile, no answer yet</text></g>;
const s3=<g><rect x={x(10)} y={Y[1]-12} width={x(14)-x(10)} height="24" fill="#dfe6fb" stroke={BLUE}/><text x={x(14)+6} y={Y[1]+4} className="fl" style={{fill:BLUE}}>answered at 14 ms</text>{a(40,RED,1)}<text x={x(40)-4} y={Y[0]+4} textAnchor="end" className="fl" style={{fill:RED}}>cancelled (would take 900 ms) →</text></g>;
return <svg viewBox="0 0 640 230" role="img" aria-labelledby={`tht${uid}`}><title id={`tht${uid}`}>A hedged request on a time line in milliseconds. The request goes to replica A, which usually answers within 10 ms. At 10 ms, the 95th percentile, there is still no answer, so the same request is also sent to replica B. B answers at 14 ms, and the copy at A, which would have taken 900 ms, is cancelled. Because only requests slower than the 95th percentile send a second copy, about 5 percent of requests are duplicated, but the slowest ones get much faster.</title>
{base}{still?<g>{s2}{s3}<Cap t={caps[3][0]}/></g>:<g aria-hidden="true"><Caps caps={caps} D={D}/>
<Show t0={0} t1={.5} dur={D}>{a(25)}</Show><Show t0={.25} t1={1} dur={D}>{s2}</Show><Dot x1={x(10)} x2={x(10)} y={Y[0]} y2={Y[1]} t0={.3} t1={.38} dur={D}/><Show t0={.5} t1={1} dur={D}>{s3}</Show></g>}</svg>}

export const FIGS={
"bloom-bits":{C:BloomBitsFig,ar:640/220,title:()=>"SIXTEEN BITS, THREE HASHES"},
"bloom-trade":{C:BloomTradeFig,ar:640/240,title:()=>"MEMORY AGAINST MISTAKES"},
"chubby-elect":{C:ChubbyElectFig,ar:640/250,title:()=>"ELECTING A PRIMARY WITH A LOCK"},
"chubby-fence":{C:ChubbyFenceFig,ar:640/240,title:()=>"A STALE LOCK HOLDER, STOPPED"},
"haystack-read":{C:HaystackReadFig,ar:640/240,title:()=>"THREE DISK READS, OR ONE"},
"haystack-volume":{C:HaystackVolumeFig,ar:640/250,title:()=>"APPEND, FLAG, COMPACT"},
"spanner-time":{C:SpannerTimeFig,ar:640/240,title:()=>"COMMIT WAIT"},
"spanner-snap":{C:SpannerSnapFig,ar:640/240,title:()=>"A READ AT ONE MOMENT, WITHOUT LOCKS"},
"tail-fan":{C:TailFanFig,ar:640/230,title:()=>"FAN-OUT MAKES RARE SLOWNESS COMMON"},
"tail-hedge":{C:TailHedgeFig,ar:640/230,title:()=>"A HEDGED REQUEST"},
};

import {D,A,P99,COST,NOCRASH,REQ,RED,MAZ,HAS,NOLOST,calibrate,write} from './lib.mjs';
const slug='url-shortener';
const fixed={queriesPerRequest:1,hitPct:90,writePct:1};
const peak=35000;
const practice={
  brief:"The tests send redirects and new links in the mix the article works out: about 99 redirects for every new link. Every redirect makes one lookup; a cache in front of the database answers 9 in 10 of them. Your Clients' own rate is ignored: each test sends its own traffic.",
  fixed,
  start:D([["clients","client",{rps:peak,pattern:"steady"}],["lb","lb",{}],["app","server",{size:"m5.large",count:2,queriesPerRequest:1}]],"clients>lb,lb>app"),
  tests:[
    {id:"normal",name:"A normal afternoon",sample:true,desc:"20,000 requests a second for an hour at 3 pm. Redirects must stay fast.",hours:1,startHour:15,traffic:{rps:20000,pattern:"steady"},checks:[A(99.9,"At least 99.9% of redirects work"),P99(200,"p99 under 200 ms")]},
    {id:"peak",name:"The evening peak",sample:true,desc:"35,000 requests a second for an hour at 8 pm, the busiest hour of the day.",hours:1,startHour:20,traffic:{rps:peak,pattern:"steady"},checks:[A(99.9,"At least 99.9% of redirects work"),P99(200,"p99 under 200 ms"),NOCRASH(),REQ(["server","database"],"Every link is stored in a database")]},
    {id:"promo",name:"A promo SMS at 8 pm",desc:"Zotato texts a link to 10 crore phones: for 15 minutes at 8 pm traffic jumps to 60,000 a second, five times the rest of the evening. New servers take 4 minutes to boot.",hours:3,startHour:19,traffic:{rps:60000,pattern:"sale"},checks:[A(99.9,"At least 99.9% of redirects work"),NOCRASH()]},
    {id:"server-dies",name:"A server group dies",desc:"At the evening peak, the busiest group of servers crashes and is back 5 minutes later.",hours:1,startHour:20,traffic:{rps:peak,pattern:"steady"},chaos:[{minute:10,type:"server"}],checks:[A(99.5,"At least 99.5% of redirects still work"),RED("server","At least two server groups")]},
    {id:"db-failover",name:"The database fails",desc:"At the evening peak the database crashes. With a standby in another zone it fails over in 2 minutes; without one it is down for 30.",hours:1,startHour:20,traffic:{rps:peak,pattern:"steady"},chaos:[{minute:10,type:"database"}],checks:[A(99.8,"At least 99.8% of redirects still work"),MAZ()]},
    {id:"budget",name:"A sensible bill",desc:"A day of normal traffic (20,000 a second) on your design. Over-buying is a failure too.",hours:24,startHour:0,traffic:{rps:20000,pattern:"steady"},checks:[A(99.9),COST(15000,"Costs at most $15,000 a month")]},
  ],
  rubric:{
    fr:[
      {label:"Create a short link from a long URL",keys:["short","shorten"]},
      {label:"Redirect: opening the short link sends you to the long URL",keys:["redirect","302","301","sent to","takes you","goes to","open"]},
      {label:"Custom alias (a name you choose)",keys:["alias","custom","vanity","choose"]},
      {label:"Expiry date on a link",keys:["expir","ttl","valid until"]},
      {label:"Count clicks",keys:["click","count","analytic"]},
    ],
    nfr:{availability:[99.9,99.999],p99:[20,200],consistency:"eventual",readsPerWrite:[30,300]},
    est:[
      {id:"writes",label:"New links a second (average)",unit:"/s",answer:1200,tol:3,how:"10 crore a day ÷ 86,400 s ≈ 1,200"},
      {id:"reads",label:"Redirects a second at peak",unit:"/s",answer:350000,tol:3,how:"100 opens per link → 1.2 lakh a second on average, about 3× that at peak"},
      {id:"storage",label:"New storage a day",unit:"GB",answer:50,tol:3,how:"10 crore links × ~500 bytes ≈ 50 GB"},
    ],
    api:[
      {label:"Create a link",method:"POST",path:"^/(api/)?(v\\d+/)?(links|urls|short(en)?(-?urls)?|shortlinks)/?$"},
      {label:"Redirect by code",method:"GET",path:"^/(api/)?(v\\d+/)?(links/|r/)?(\\{[a-z_]+\\}|:[a-z_]+|<[a-z_]+>|[a-z0-9_]+)$"},
    ],
  },
  hints:[
    {step:"requirements",x:"Two things people do: make a short link (rare) and open one (constant). Which extras do marketing tools always ask for?"},
    {step:"estimates",x:"Start from 10 crore new links a day. Divide by 86,400 for writes a second, then multiply by opens per link for reads."},
    {step:"api",x:"One call creates a link and returns it. The other is the short link itself: a GET on the code that answers with a redirect."},
    {step:"design",x:"About 99 of every 100 requests are redirects that read the same popular links. What can answer repeated reads without touching the database?"},
    {step:"design",x:"Put a Cache between the servers and the database. At 90% hits only a tenth of the lookups reach the database."},
    {step:"design",x:"For the promo test, new servers arrive too late (4 minutes). Keep enough servers running before 8 pm, or the spike crashes them."},
    {step:"design",x:"Failures: two server groups behind the load balancer, and a database with Multi-AZ on, so a crash doesn't take every redirect down."},
  ],
  reference:D([
    ["clients","client",{rps:peak,pattern:"steady"}],["lb","lb",{}],
    ["app1","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],["app2","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],
    ["cache1","cache",{size:"cache.m5.large",hitPct:90,writePct:1,onDown:"database"}],["cache2","cache",{size:"cache.m5.large",hitPct:90,writePct:1,onDown:"database"}],
    ["db","database",{size:"db.r5.2xlarge",multiAz:true}]],
    "clients>lb,lb>app1,lb>app2,app1>cache1,app1>cache2,app2>cache1,app2>cache2,cache1>db,cache2>db"),
  wrong:[],
};
practice.wrong=[
  {name:"No cache",why:"Every redirect reads the database, which can't take 35,000 lookups a second.",fails:"peak",...D([["clients","client",{rps:peak}],["lb","lb",{}],["app1","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],["app2","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],["db","database",{size:"db.r5.2xlarge",multiAz:true}]],"clients>lb,lb>app1,lb>app2,app1>db,app2>db")},
  {name:"One server group",why:"When it crashes every redirect fails for 5 minutes.",fails:"server-dies",...D([["clients","client",{rps:peak}],["lb","lb",{}],["app1","server",{size:"c5.2xlarge",count:28,queriesPerRequest:1}],["cache1","cache",{size:"cache.m5.large",onDown:"database"}],["cache2","cache",{size:"cache.m5.large",onDown:"database"}],["db","database",{size:"db.r5.2xlarge",multiAz:true}]],"clients>lb,lb>app1,app1>cache1,app1>cache2,cache1>db,cache2>db")},
  {name:"Single-zone database",why:"A crash keeps it down for 30 minutes and every cache miss fails.",fails:"db-failover",...D([["clients","client",{rps:peak}],["lb","lb",{}],["app1","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],["app2","server",{size:"c5.2xlarge",count:14,queriesPerRequest:1}],["cache1","cache",{size:"cache.m5.large",onDown:"database"}],["cache2","cache",{size:"cache.m5.large",onDown:"database"}],["db","database",{size:"db.r5.2xlarge",multiAz:false}]],"clients>lb,lb>app1,lb>app2,app1>cache1,app1>cache2,app2>cache1,app2>cache2,cache1>db,cache2>db")},
  {name:"Sized for the average only",why:"Fine at 35,000 a second, but the 60,000 spike crashes the servers before autoscaling helps.",fails:"promo",...D([["clients","client",{rps:peak}],["lb","lb",{}],["app1","server",{size:"c5.2xlarge",count:9,queriesPerRequest:1}],["app2","server",{size:"c5.2xlarge",count:9,queriesPerRequest:1}],["cache1","cache",{size:"cache.m5.large",onDown:"database"}],["cache2","cache",{size:"cache.m5.large",onDown:"database"}],["db","database",{size:"db.r5.2xlarge",multiAz:true}]],"clients>lb,lb>app1,lb>app2,app1>cache1,app1>cache2,app2>cache1,app2>cache2,cache1>db,cache2>db")},
  {name:"Biggest everything",why:"Passes the load but costs far more than the traffic needs.",fails:"budget",...D([["clients","client",{rps:peak}],["lb","lb",{}],["app1","server",{size:"c5.2xlarge",count:50,queriesPerRequest:1}],["app2","server",{size:"c5.2xlarge",count:50,queriesPerRequest:1}],["cache1","cache",{size:"cache.r5.large",onDown:"database"}],["cache2","cache",{size:"cache.r5.large",onDown:"database"}],["db","database",{size:"db.r5.2xlarge",multiAz:true}]],"clients>lb,lb>app1,lb>app2,app1>cache1,app1>cache2,app2>cache1,app2>cache2,cache1>db,cache2>db")},
];
if(calibrate(slug,practice)&&process.argv[2]==='write'){write(slug,practice);console.log('written')}

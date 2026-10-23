const KEY = "tk-mock-interview-v1";
const stages = [
 {id:"requirements",label:"Requirements",title:"Clarify the problem",prompt:"Start by clarifying functional requirements, non-functional requirements, users, and scope. What will you explicitly leave out?",hint:"Ask clarifying questions before choosing components."},
 {id:"estimation",label:"Estimation",title:"Estimate the scale",prompt:"Estimate active users, average and peak requests per second, read/write ratio, data size, and growth. State your assumptions and show the arithmetic.",hint:"Use orders of magnitude and identify which assumptions most affect the design."},
 {id:"data-api",label:"Data & APIs",title:"Define the contract",prompt:"Identify core entities, access patterns, storage choices, and the main APIs. Include pagination, idempotency, and consistency where relevant.",hint:"Tie each data model and endpoint to a user journey."},
 {id:"architecture",label:"Architecture",title:"Draw the high-level design",prompt:"Describe the request path end to end. Explain the responsibility of each component and trace one critical read or write.",hint:"Start simple; add complexity only when a requirement justifies it."},
 {id:"deep-dive",label:"Deep dives",title:"Test the design",prompt:"Find the first bottleneck at 10× load. Discuss partial failures, retries, duplicate work, security, observability, and at least one alternative design.",hint:"Explain trade-offs rather than listing technologies."}
];
const scenarios = [
 {id:"url-shortener",title:"Design a URL shortener",minutes:35,brief:"Low-latency redirects, collision-safe link creation, expiry, and asynchronous click analytics."},
 {id:"news-feed",title:"Design a social news feed",minutes:45,brief:"Ranked feeds, high-follower creators, cursor pagination, and freshness."},
 {id:"chat",title:"Design real-time chat",minutes:45,brief:"Durable messages, persistent connections, delivery states, offline users, and ordering."},
 {id:"rate-limiter",title:"Design a distributed rate limiter",minutes:30,brief:"Distributed quotas, burst control, low-latency enforcement, and failure policy."},
 {id:"ride-hailing",title:"Design ride-hailing dispatch",minutes:50,brief:"Live location ingestion, geo queries, driver matching, and consistent trip state."}
];
const esc = value => String(value).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function load() {
 try {
  const value=JSON.parse(localStorage.getItem(KEY)||"null");
  if(value&&value.answers&&typeof value.answers==="object")return {...value,scenario:value.scenario||scenarios[0].id,stage:Math.max(0,Math.min(4,Number(value.stage)||0)),remainingMs:Number(value.remainingMs)||((scenarios.find(s=>s.id===value.scenario)||scenarios[0]).minutes*60000),running:false,runningSince:0,reviewMode:false};
 } catch {}
 return {scenario:scenarios[0].id,stage:0,answers:{},remainingMs:scenarios[0].minutes*60000,running:false,runningSince:0,reviewMode:false,completed:false};
}
let session=load();
let interval=null;
function currentScenario(){return scenarios.find(s=>s.id===session.scenario)||scenarios[0];}
function remaining(){return Math.max(0,session.remainingMs-(session.running?Date.now()-session.runningSince:0));}
function formatTime(ms){const sec=Math.ceil(ms/1000);return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0");}
function save(){try{localStorage.setItem(KEY,JSON.stringify({...session,remainingMs:remaining(),running:false,runningSince:0}));}catch{}}
function report(){
 const all=stages.map((stage,i)=>({stage,answer:String(session.answers[stage.id]||""),words:String(session.answers[stage.id]||"").trim().split(/\s+/).filter(Boolean).length}));
 const totalWords=all.reduce((n,x)=>n+x.words,0);
 const dimensions=all.map(x=>({label:x.stage.label,words:x.words,score:Math.min(100,Math.round(Math.min(1,x.words/90)*70+(x.answer.length>0?30:0)))}));
 return {totalWords,dimensions,completed:dimensions.filter(d=>d.words>=35).length,answered:dimensions.filter(d=>d.words>0).length};
}
export function mockInterviewPage(){
 const scenario=currentScenario(),r=report(),stage=stages[session.stage];
 return `<main class="page-main mi-page">
  <div class="page-hero mi-hero"><div><div class="eyebrow">MOCK INTERVIEW · PRACTICE MODE</div><h1>Think aloud.<br><em>Design with intent.</em></h1><p>A structured, timed system-design interview. Write your reasoning at each stage, move forward when ready, and review your session at the end.</p></div><div class="mi-timer-card"><span>TIME REMAINING</span><strong id="mi-clock">${formatTime(remaining())}</strong><small>${session.running?"Timer running":session.completed?"Session completed":"Timer paused"}</small><div class="mi-timer-actions"><button class="button-primary small" data-mi-timer>${session.running?"Pause timer":"Start timer"}</button><button class="button-secondary small" data-mi-reset-timer>Reset</button></div></div></div>
  <div class="mi-scenario"><label>INTERVIEW QUESTION<select id="mi-scenario">${scenarios.map(s=>`<option value="${s.id}" ${s.id===scenario.id?"selected":""}>${esc(s.title)}</option>`).join("")}</select></label><div><span>${scenario.minutes} MINUTES · SYSTEM DESIGN</span><p>${esc(scenario.brief)}</p></div></div>
  <div class="mi-layout"><aside class="mi-steps"><div class="mi-steps-title">INTERVIEW FLOW <span>0${session.stage+1}/05</span></div>${stages.map((s,i)=>`<button class="mi-step ${i===session.stage?"active":""} ${session.answers[s.id]?"has-answer":""}" data-mi-stage="${i}"><span>${session.answers[s.id]?"✓":String(i+1).padStart(2,"0")}</span><div><b>${s.label}</b><small>${session.answers[s.id]?"Notes captured":"Not answered yet"}</small></div></button>`).join("")}<div class="mi-progress"><span style="width:${r.answered/5*100}%"></span></div><small class="mi-progress-label">${r.answered} of 5 stages have notes</small></aside>
   <section class="mi-workspace">${session.reviewMode?reviewMarkup(r,scenario):`<div class="mi-question-head"><span class="eyebrow">STAGE 0${session.stage+1} · ${stage.label.toUpperCase()}</span><h2>${stage.title}</h2><p>${esc(stage.prompt)}</p></div><div class="mi-coach-tip"><b>Interviewer cue</b><span>${esc(stage.hint)}</span></div><label class="mi-answer-label">YOUR THINKING<textarea id="mi-answer" rows="12" placeholder="Write your assumptions, decisions, calculations, and reasoning here...">${esc(session.answers[stage.id]||"")}</textarea></label><div class="mi-work-actions"><button class="button-secondary" data-mi-prev ${session.stage===0?"disabled":""}>← Previous</button><span>Auto-saved on this device</span><button class="button-primary" data-mi-next>${session.stage===4?"Review session":"Save & continue"} →</button></div>`}</section></div>
 </main>`;
}
function reviewMarkup(r,scenario){
 return `<div class="mi-review-head"><span class="eyebrow">SESSION SUMMARY</span><h2>${esc(scenario.title)}</h2><p>${r.answered} of 5 stages contain notes · ${r.totalWords} words captured.</p><div class="mi-review-grid">${r.dimensions.map(d=>`<article><span>${esc(d.label)}</span><strong>${d.score}%</strong><div><i style="width:${d.score}%"></i></div><small>${d.words} words captured</small></article>`).join("")}</div><p class="mi-review-note">This is a completion-and-depth indicator based on note length, not an assessment of technical correctness. No AI evaluator is connected in this prototype.</p><div class="mi-review-actions"><button class="button-secondary" data-mi-edit>← Edit answers</button><button class="button-secondary" data-mi-export>Export session JSON</button><button class="button-primary" data-mi-finish>Finish session</button></div></div>`;
}
export function bindMockInterview(root){
 const page=root.querySelector(".mi-page");if(!page)return;
 if(interval){clearInterval(interval);interval=null;}
 const persist=()=>save();
 const updateClock=()=>{const clock=root.querySelector("#mi-clock");if(clock)clock.textContent=formatTime(remaining());if(session.running&&remaining()<=0){session.remainingMs=0;session.running=false;session.runningSince=0;save();if(interval){clearInterval(interval);interval=null;}const status=root.querySelector(".mi-timer-card small");if(status)status.textContent="Time is up";const btn=root.querySelector("[data-mi-timer]");if(btn)btn.textContent="Start timer";}};
 if(session.running){session.runningSince=Date.now();interval=setInterval(updateClock,1000);updateClock();}
 const answer=root.querySelector("#mi-answer");
 if(answer)answer.addEventListener("input",()=>{session.answers[stages[session.stage].id]=answer.value;persist();});
 const timer=root.querySelector("[data-mi-timer]");
 if(timer)timer.addEventListener("click",()=>{if(session.running){session.remainingMs=remaining();session.running=false;session.runningSince=0;if(interval)clearInterval(interval);interval=null;}else{if(remaining()<=0)session.remainingMs=currentScenario().minutes*60000;session.running=true;session.runningSince=Date.now();interval=setInterval(updateClock,1000);}persist();const status=root.querySelector(".mi-timer-card small");if(status)status.textContent=session.running?"Timer running":"Timer paused";timer.textContent=session.running?"Pause timer":"Start timer";});
 const reset=root.querySelector("[data-mi-reset-timer]");if(reset)reset.addEventListener("click",()=>{session.remainingMs=currentScenario().minutes*60000;session.running=false;session.runningSince=0;if(interval)clearInterval(interval);interval=null;save();renderAgain(root);});
 const choose=root.querySelector("#mi-scenario");if(choose)choose.addEventListener("change",()=>{session.scenario=choose.value;session.stage=0;session.answers={};session.remainingMs=currentScenario().minutes*60000;session.running=false;session.completed=false;session.reviewMode=false;save();renderAgain(root);});
 root.querySelectorAll("[data-mi-stage]").forEach(btn=>btn.addEventListener("click",()=>{if(answer)session.answers[stages[session.stage].id]=answer.value;session.stage=Number(btn.dataset.miStage);session.reviewMode=false;save();renderAgain(root);}));
 const next=root.querySelector("[data-mi-next]");if(next)next.addEventListener("click",()=>{if(answer)session.answers[stages[session.stage].id]=answer.value;if(session.stage<4)session.stage++;else session.reviewMode=true;save();renderAgain(root);});
 const prev=root.querySelector("[data-mi-prev]");if(prev)prev.addEventListener("click",()=>{if(answer)session.answers[stages[session.stage].id]=answer.value;session.stage=Math.max(0,session.stage-1);save();renderAgain(root);});
 const edit=root.querySelector("[data-mi-edit]");if(edit)edit.addEventListener("click",()=>{session.reviewMode=false;save();renderAgain(root);});
 const finish=root.querySelector("[data-mi-finish]");if(finish)finish.addEventListener("click",()=>{session.completed=true;session.reviewMode=false;session.stage=0;session.running=false;session.runningSince=0;if(interval)clearInterval(interval);interval=null;session.remainingMs=remaining();save();renderAgain(root);});
 const exp=root.querySelector("[data-mi-export]");if(exp)exp.addEventListener("click",()=>{const payload={product:"Tech Katta Mock Interview",exportedAt:new Date().toISOString(),scenario:currentScenario(),answers:session.answers,report:report()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="tech-katta-mock-interview.json";a.click();URL.revokeObjectURL(url);});
}
function renderAgain(root){const current=root.querySelector(".mi-page");if(!current)return;const temp=document.createElement("div");temp.innerHTML=mockInterviewPage();const fresh=temp.querySelector(".mi-page");current.replaceWith(fresh);bindMockInterview(root);}

// The landing: one evening told over the 3D world, chapter by chapter. Everything that moves is 3D: the system
// builds itself when the page opens, and each chapter's scroll drives its change (story.js). The parts wear the same
// pastels as everywhere else (palette.js); the "meet the parts" chapter introduces them.
import { mountStory, stageHtml } from '../story.js';
import { LEGEND, KIND_PASTEL } from '../palette.js';

/** the signature: a part named in the text carries its colour dot, the same as its 3D label */
const pd = (kind) => `<i class="pd" style="--c:var(--${KIND_PASTEL[kind]})" aria-hidden="true"></i>`;

const D = (o) => ({ apps: 3, cache: 1, replicas: 0, queue: 0, cdn: 0, ...o });
const FULL = D({ cache: 3, replicas: 2, queue: 1, cdn: 1 });
const allOk = (d) => Object.fromEntries(['app0', 'app1', 'app2', 'app3', 'cache0', 'cache1', 'cache2', 'db', 'rep0', 'rep1', 'queue', 'cdn'].map((k) => [k, 'ok']).filter(([k]) => k.startsWith('App server') ? Number(k.slice(3)) < d.apps : true));
const STEPS = [
  { design: D({}), cam: { side: false, cx: 0.7, sy: 0.56, zoom: 1.05, el: 30, phoneSy: 0.72, phoneZoom: 1.45 }, state: { labels: { cache0: ['hit 94%'], db: ['420 req/s'], lb: ['3 healthy'] }, speed: 0.6 } },
  { design: D({}), state: { parts: { app0: 'ok', app1: 'ok', app2: 'ok', cache0: 'ok' }, labels: { cache0: ['37,600 hits/s', 'ok'], db: ['2,400 req/s'], app1: ['p99 38 ms', 'ok'] }, speed: 1.5 } },
  { design: D({}), state: { parts: { cache0: 'alert', db: 'alert', client: 'dim' }, paths: { 'app0-cache': 'down', 'app1-cache': 'down', 'app2-cache': 'down', db: 'alert' }, labels: { cache0: ['down', 'alert'], db: ['37,600 req/s · overloaded', 'alert'], app1: ['p99 2,000 ms', 'alert'] }, speed: 1.6 } },
  { design: D({ cache: 3, replicas: 2 }), state: { parts: { cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok' }, labels: { cache1: ['3 nodes', 'ok'], db: ['1,200 req/s', 'ok'], rep0: ['sharing reads', 'ok'] }, speed: 1.2 } },
  // meet the parts: every kind, named, in its own pastel
  { design: FULL, cam: { zoom: 1.02, el: 34, az: 48 }, state: { labels: { app1: ['', '', 'App server'], lb: ['', '', 'Load balancer'], cache1: ['', '', 'Cache'], db: ['', '', 'Database'], queue: ['', '', 'Queue'], cdn: ['', '', 'CDN'] }, speed: 0.7 } },
  // simulate: the whole system under a spike; parts busy, then holding
  { design: FULL, cam: { zoom: 0.95, el: 40, az: 42 }, state: { parts: { app0: 'warn', app1: 'warn', app2: 'warn', cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok', queue: 'warn', cdn: 'ok' }, labels: { app1: ['89% busy', 'warn'], queue: ['holding 12,000', 'warn'], db: ['4k writes/s', 'ok'], cdn: ['70% answered', 'ok'] }, speed: 2.2 } },
  { design: FULL, cam: { side: false, sy: 0.93, zoom: 1.35, el: 42 }, state: { parts: allOk(FULL), speed: 0.7 } },
];
/** "what you will design": one real system in one figure, a chat app, built from the same parts and colours */
function chatApp() {
  const P = (kind, x, z, name, extra = {}) => ({ kind, x, z, name, ...extra });
  const parts = {
    users: P('laptop', 0, 0, 'Users'), cdn: P('globe', 2.8, 0, 'CDN'), lb: P('lb', 5.6, 0, 'Load balancer'),
    ws1: P('server', 8.6, -2.2, 'App server'), ws2: P('server', 8.6, 0, 'App server'), ws3: P('server', 8.6, 2.2, 'App server'),
    cache: P('cache', 11.8, -3.6, 'Cache'), queue: P('queue', 12.2, 2.4, 'Queue'),
    db: P('db', 15.2, -0.6, 'Database'), rep: P('db', 17.8, -0.6, 'Replica', { layers: 2 }),
  };
  const paths = { a: ['users', 'cdn'], b: ['cdn', 'lb'], c1: ['lb', 'ws1'], c2: ['lb', 'ws2'], c3: ['lb', 'ws3'],
    d1: ['ws1', 'cache'], d2: ['ws2', 'db'], d3: ['ws3', 'queue'], e: ['queue', 'db'], f: ['db', 'rep'] };
  const labels = { users: ['', '', 'Chat app'], ws2: ['messages · presence'], cache: ['online users'], queue: ['delivery'], db: ['chat history'] };
  return { system: { parts, paths }, labels };
}
const CHAT = chatApp();
STEPS.splice(6, 0, { system: CHAT.system, cam: { zoom: 1.0, el: 36, az: 44 }, state: { labels: CHAT.labels, parts: { ws1: 'ok', ws2: 'ok', ws3: 'ok', queue: 'warn' }, speed: 1.4 } });
const NAMES = ['Start', 'The spike', 'It breaks', 'Fix it', 'The parts', 'Learn and build', 'What you will design', 'Your turn'];

export function mount(view, _p, { reduced }) {
  const sim = '#/sim/ind-vs-pak';
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${STEPS.length - 1}</span><span class="segs">${STEPS.slice(1).map(() => '<i></i>').join('')}</span><span class="mono name">Start</span></div>`)}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Systems <span class="logword">break</span></span><span class="heavy accent">Learn to keep them up</span></h1>
      <p class="lead">Tech Katta is system design you can watch. Every idea is a moving system, and every system is yours to break and fix.</p>
      <div class="actions"><a class="btn dark" href="#/learn">Start learning<span class="chip">→</span></a><button class="btn light" type="button" data-next>See it break<span class="chip violet">↓</span></button></div>
      <p class="scroll-cue mono" aria-hidden="true">Scroll to play</p>
    </div>
    <div class="step" data-step="1">
      <p class="kicker"><span>01</span><i></i>The spike</p>
      <h2 class="headline"><span class="thin">IND vs PAK, 36,000 link opens a second</span><span class="heavy accent">Everything is green</span></h2>
      <p class="lead">The promo SMS reaches crores of fans at the toss. The ${pd("cache")}cache answers almost every open before the ${pd("db")}database hears.</p>
      <dl class="stats"><div><dt>Traffic</dt><dd>36k/s</dd></div><div><dt>Cache hit</dt><dd>94%</dd></div><div><dt>p99</dt><dd>38 ms</dd></div></dl>
    </div>
    <div class="step" data-step="2">
      <p class="kicker"><span>02</span><i></i>It breaks</p>
      <h2 class="headline"><span class="thin">The cache goes down</span><span class="heavy accent">The database takes it all</span></h2>
      <p class="lead">One ${pd("cache")}cache node, no spare. Every open falls through to a ${pd("db")}database that serves 6,000 reads a second. 37,600 arrive.</p>
      <dl class="stats"><div><dt>Errors</dt><dd class="alert">58%</dd></div><div><dt>Since</dt><dd>20:14 IST</dd></div><div><dt>Severity</dt><dd class="alert">SEV-1</dd></div></dl>
    </div>
    <div class="step" data-step="3">
      <p class="kicker"><span>03</span><i></i>Fix it</p>
      <h2 class="headline"><span class="thin">Three cache nodes, two replicas</span><span class="heavy accent">Run it again and it holds</span></h2>
      <p class="lead">Now a dead ${pd("cache")}cache node loses a third of the keys, not all of them, and two ${pd("db")}replicas share what falls through.</p>
    </div>
    <div class="step" data-step="4">
      <p class="kicker"><span>04</span><i></i>The parts</p>
      <h2 class="headline"><span class="thin">Every part has a colour</span><span class="heavy accent">The same one everywhere</span></h2>
      <p class="lead">Learn them once. In every lesson and every simulation on Tech Katta, a part looks like this.</p>
      <ul class="legend">${LEGEND.map(([kind, name, pastel]) => `<li><i style="background:var(--${pastel});border-color:var(--${pastel}-edge)"></i>${name}</li>`).join('')}</ul>
    </div>
    <div class="step" data-step="5">
      <p class="kicker"><span>05</span><i></i>Learn and build</p>
      <h2 class="headline"><span class="thin">Learn it as a story like this</span><span class="heavy accent">Then build your own and press Run</span></h2>
      <p class="lead">Every lesson moves like this page. Then add ${pd("server")}servers, ${pd("cache")}caches, ${pd("db")}replicas, a ${pd("queue")}queue, a ${pd("globe")}CDN. Send a real evening of traffic through it. Amber is busy, red is broken, and every result tells you why.</p>
      <div class="actions"><a class="btn light" href="#/learn">See the lessons<span class="chip violet">→</span></a><a class="btn light" href="${sim}">Open the simulator<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="6">
      <p class="kicker"><span>06</span><i></i>What you will design</p>
      <h2 class="headline"><span class="thin">Not toy diagrams</span><span class="heavy accent">The apps you use every day</span></h2>
      <p class="lead">Like this chat app: messages, who is online, delivery when a friend’s phone is off. Then URL shorteners, ticket booking, payments, news feeds and video, each built from the same six parts.</p>
      <p class="topics mono">Concepts · Components · Interview questions · Real systems</p>
    </div>
    <div class="step finale" data-step="7">
      <p class="kicker"><span>07</span><i></i>Your turn</p>
      <h2 class="headline"><span class="heavy">You will meet this night</span><span class="heavy accent">in an interview, or at work</span></h2>
      <p class="lead">Better to meet it here first. Free: sign in with Google and everything opens.</p>
      <div class="actions"><a class="btn violet" href="#/learn">Start learning, free<span class="chip">→</span></a><a class="btn light" href="${sim}">Open the simulator</a></div>
    </div>
  </section>

  <section class="page below">
    <div class="who">
      <h2 class="sub-h">Who it is for</h2>
      <div class="who-grid">
        <div style="--c:var(--sky)"><h3>Preparing for interviews</h3><p>System design rounds, answered the way interviewers expect, with the reasoning you can say out loud.</p></div>
        <div style="--c:var(--mint)"><h3>Already building backends</h3><p>The patterns behind the services you run: why a cache falls over, when a queue helps, what a replica costs.</p></div>
        <div style="--c:var(--peach)"><h3>Curious how apps work</h3><p>What happens when crores of people open the same link at once, in plain words and Indian examples.</p></div>
      </div>
    </div>
    <div class="teacher">
      <span class="face" aria-hidden="true">Y</span>
      <div><p class="mono">Taught by</p><p class="q">“Hi, I’m Yash. I build backend systems for a living, and I write these the way I wish someone had explained them to me.”</p></div>
    </div>
    <div class="faq">
      <h2 class="sub-h">Questions</h2>
      <details><summary>Is it free?</summary><p>Yes. Sign in with Google and every lesson and the simulator open. No card.</p></details>
      <details><summary>Do I need to know coding?</summary><p>Basic programming helps. Every idea is explained from scratch, in plain words, with a system you can watch.</p></details>
      <details><summary>How is this different from articles and videos?</summary><p>You watch systems run and break, then you build your own and the simulator tells you exactly what broke and why.</p></details>
      <details><summary>Is the simulator real?</summary><p>It is a teaching model: a few honest numbers for servers, caches, databases and queues, chosen so you can see how parts behave under load.</p></details>
      <details><summary>Does it work on a phone?</summary><p>Lessons do. The simulator is easier on a bigger screen.</p></details>
    </div>
  </section>
  ${footer()}`;

  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), name = root.querySelector('.progress .name'), segs = [...root.querySelectorAll('.segs i')];
  const story = mountStory(root, STEPS, { reduced, intro: true, onStep: (i) => { n.textContent = `0${i} / 0${STEPS.length - 1}`; name.textContent = NAMES[i]; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
  root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); scrollTo({ top: el.offsetTop + innerHeight * 0.02, behavior: reduced ? 'auto' : 'smooth' }); });
  return () => story.destroy();
}

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">System design you can watch. A prototype at prototype.katta.cc: sample data, nothing is saved but on this device.</p><nav><a href="#/learn">Learn</a><a href="#/sim/ind-vs-pak">Simulator</a><a href="#/me">You</a></nav></footer>`;

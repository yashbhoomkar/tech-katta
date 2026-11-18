// The landing: Tech Katta as one place for system design interview prep, told over one 3D pipeline, chapter by chapter. Everything that moves is 3D: the system
// builds itself when the page opens, and each chapter's scroll drives its change (story.js). The parts wear the same
// pastels as everywhere else (palette.js); the "meet the parts" chapter introduces them.
import { mountStory, stageHtml } from '../story.js';
import { KIND_PASTEL } from '../palette.js';

/** the parts of this page's system, for the colour key (colours from palette.js) */
const LEGEND = [['laptop', 'Users', 'mist'], ['server', 'App server', 'sky'], ['kafka', 'Kafka topic', 'lemon'], ['consumer', 'Consumer', 'lime'], ['db', 'SQL database', 'mint']];

/** the signature: a part named in the text carries its colour dot, the same as its 3D label */
const pd = (kind) => `<i class="pd" style="--c:var(--${KIND_PASTEL[kind]})" aria-hidden="true"></i>`;

/** The landing's system (owner: "servers producing to Kafka, then a Kafka consumer consuming that and putting it in an
 *  SQL db"): users → app servers (producers) → a Kafka topic (partitions) → a consumer group → an SQL database. */
function pipe({ producers = 3, partitions = 3, consumers = 3 } = {}) {
  const P = (kind, x, z, name, extra = {}) => ({ kind, x, z, name, ...extra });
  const rows = (n, gap) => Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap);
  const parts = { users: P('laptop', -3.4, 0, 'Users'), topic: P('kafka', 5.4, 0, 'Kafka topic', { partitions }), sql: P('db', 14.2, 0, 'SQL database') };
  const paths = {};
  rows(producers, 2.1).forEach((z, i) => { parts[`p${i}`] = P('server', 0, z, 'App server'); paths[`u-p${i}`] = ['users', `p${i}`]; paths[`p${i}-t`] = [`p${i}`, 'topic']; });
  rows(consumers, consumers > 4 ? 1.45 : 1.9).forEach((z, i) => { parts[`c${i}`] = P('consumer', 10.4, z, 'Consumer'); paths[`t-c${i}`] = ['topic', `c${i}`]; paths[`c${i}-s`] = [`c${i}`, 'sql']; });
  return { parts, paths };
}
const ids = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const all = (list, st) => Object.fromEntries(list.map((k) => [k, st]));
const PIPE = pipe(), PIPE6 = pipe({ partitions: 6, consumers: 6 });
// One chapter per part of interview prep (owner: "a one stop platform for all your system design interview"); every
// chapter shows the same pipeline doing what that part of the platform teaches.
const OK6 = { ...all(ids('p', 3), 'ok'), ...all(ids('c', 6), 'ok'), topic: 'ok', sql: 'ok' };
const STEPS = [
  { system: PIPE, cam: { side: false, cx: 0.7, sy: 0.56, zoom: 1.0, el: 30, phoneSy: 0.66, phoneZoom: 1.5 }, state: { labels: { topic: ['match-events'], sql: ['predictions'] }, speed: 0.7 } },
  // 01 concepts and components: every part named, in its own colour
  { system: PIPE6, cam: { el: 34, az: 48 }, state: { labels: { users: ['', '', 'Users'], p1: ['', '', 'App server'], topic: ['', '', 'Kafka topic'], c2: ['', '', 'Consumer'], sql: ['', '', 'SQL database'] }, speed: 0.8 } },
  // 02 lessons you watch: the database slows, the lag piles up in the topic
  { system: PIPE, state: { parts: { ...all(ids('p', 3), 'ok'), ...all(ids('c', 3), 'warn'), topic: 'warn', sql: 'alert' }, paths: { 'c0-s': 'alert', 'c1-s': 'alert', 'c2-s': 'alert' }, fill: { topic: 0.88 }, labels: { topic: ['lag 2.1M messages', 'warn'], c1: ['falling behind', 'warn'], sql: ['writes take 900 ms', 'alert'] }, speed: 1.4 } },
  // 03 interview questions: the questions an interviewer asks, pinned to the parts they are about
  { system: PIPE6, state: { parts: OK6, fill: { topic: 0.06 }, labels: { p1: ['', '', 'What if a server crashes mid-publish?'], topic: ['', '', 'Why a topic, not direct writes?'], c2: ['', '', 'How many consumers per partition?'], sql: ['', '', 'Batch writes or row by row?'] }, speed: 1.2 } },
  // 05 practice: the pipeline under a heavier evening, judged
  { system: PIPE6, cam: { el: 40, az: 42 }, state: { parts: { ...all(ids('p', 3), 'warn'), ...all(ids('c', 6), 'ok'), topic: 'warn', sql: 'ok' }, fill: { topic: 0.35 }, labels: { p1: ['92% busy', 'warn'], topic: ['absorbing the burst', 'warn'], sql: ['steady', 'ok'] }, speed: 2.2 } },
  { system: PIPE6, cam: { side: false, sy: 0.93, zoom: 1.35, el: 42 }, state: { parts: OK6, speed: 0.8 } },
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
STEPS.splice(4, 0, { system: CHAT.system, cam: { zoom: 1.0, el: 36, az: 44 }, state: { labels: CHAT.labels, parts: { ws1: 'ok', ws2: 'ok', ws3: 'ok', queue: 'warn' }, speed: 1.4 } });
const NAMES = ['Start', 'Concepts and components', 'Lessons you watch', 'Interview questions', 'Real systems', 'Practice', 'Your turn'];

export function mount(view, _p, { reduced }) {
  const sim = '#/sim/ind-vs-pak';
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${STEPS.length - 1}</span><span class="segs">${STEPS.slice(1).map(() => '<i></i>').join('')}</span><span class="mono name">Start</span></div>`)}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Your system design interview</span><span class="heavy accent">Everything for it, in one place</span></h1>
      <p class="lead">Learn the concepts and components, see how real apps are built, answer the questions interviewers ask, then design systems and get them judged. Free.</p>
      <div class="actions"><a class="btn dark" href="#/learn">Start preparing<span class="chip">→</span></a><button class="btn light" type="button" data-next>See what is inside<span class="chip violet">↓</span></button></div>
      <p class="scroll-cue mono" aria-hidden="true">Scroll to play</p>
    </div>
    <div class="step" data-step="1">
      <p class="kicker"><span>01</span><i></i>Concepts and components</p>
      <h2 class="headline"><span class="thin">Every building block</span><span class="heavy accent">Kafka, caches, queues, databases</span></h2>
      <p class="lead">21 concepts (caching, sharding, CAP, consistency) and 10 components interviewers name, like ${pd("kafka")}Kafka, Redis and PostgreSQL. Each part keeps one colour everywhere, so you can read any design at a glance.</p>
      <ul class="legend">${LEGEND.map(([kind, name, pastel]) => `<li><i style="background:var(--${pastel});border-color:var(--${pastel}-edge)"></i>${name}</li>`).join('')}</ul>
    </div>
    <div class="step" data-step="2">
      <p class="kicker"><span>02</span><i></i>Lessons you watch</p>
      <h2 class="headline"><span class="thin">See it work, then see it break</span><span class="heavy accent">The why sticks</span></h2>
      <p class="lead">Every lesson moves like this page. Here the ${pd("db")}database slows down, ${pd("consumer")}consumers fall behind and messages pile up in the ${pd("kafka")}topic. Nothing is lost, and you remember why.</p>
      <dl class="stats"><div><dt>Consumer lag</dt><dd class="alert">2.1M</dd></div><div><dt>Messages lost</dt><dd>0</dd></div><div><dt>Lesson length</dt><dd>6–12 min</dd></div></dl>
    </div>
    <div class="step" data-step="3">
      <p class="kicker"><span>03</span><i></i>Interview questions</p>
      <h2 class="headline"><span class="thin">The questions interviewers ask</span><span class="heavy accent">Answered the way they expect</span></h2>
      <p class="lead">29 real system design questions, each with the requirements to clarify, the numbers to estimate, the design, and the trade-offs to say out loud.</p>
      <div class="actions"><a class="btn light" href="#/learn">Browse the questions<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="4">
      <p class="kicker"><span>04</span><i></i>Real systems</p>
      <h2 class="headline"><span class="thin">How the apps you use are built</span><span class="heavy accent">Not toy diagrams</span></h2>
      <p class="lead">Like this chat app: messages, who is online, delivery when a friend’s phone is off. Real systems take the parts you learned and put them together at Indian scale.</p>
    </div>
    <div class="step" data-step="5">
      <p class="kicker"><span>05</span><i></i>Practice</p>
      <h2 class="headline"><span class="thin">Design it yourself</span><span class="heavy accent">A judge tells you if it holds</span></h2>
      <p class="lead">22 problems with tests. Draw your design, then a judge sends an evening of traffic through it, crashes a server and checks the bill. Every result says what broke and why.</p>
      <dl class="stats"><div><dt>Problems</dt><dd>22</dd></div><div><dt>Challenges</dt><dd>8</dd></div><div><dt>Score</dt><dd>out of 100</dd></div></dl>
      <div class="actions"><a class="btn light" href="${sim}">Open practice<span class="chip violet">→</span></a></div>
    </div>
    <div class="step finale" data-step="6">
      <p class="kicker"><span>06</span><i></i>Your turn</p>
      <h2 class="headline"><span class="heavy">One place for your whole</span><span class="heavy accent">system design preparation</span></h2>
      <p class="topics-row">${['Concepts', 'Components', 'Interview questions', 'Real systems', 'Practice'].map((t) => `<span>${t}</span>`).join('')}</p>
      <p class="lead">Free. Sign in with Google and everything opens.</p>
      <div class="actions"><a class="btn violet" href="#/learn">Start preparing, free<span class="chip">→</span></a><a class="btn light" href="${sim}">Try a problem</a></div>
    </div>
  </section>

  <section class="page below">
    <div class="inside">
      <h2 class="sub-h">Everything in one place</h2>
      <dl class="inside-grid">
        <div><dt>21</dt><dd><b>Concepts</b>The ideas every design rests on: caching, sharding, CAP, indexing, the numbers to know</dd></div>
        <div><dt>10</dt><dd><b>Components</b>The tools interviewers name, like Kafka, Redis, PostgreSQL and Cassandra, inside and out</dd></div>
        <div><dt>29</dt><dd><b>Interview questions</b>Answered step by step: requirements, estimates, design, trade-offs</dd></div>
        <div><dt>6</dt><dd><b>Real systems</b>How real apps are built, at Indian scale</dd></div>
        <div><dt>22</dt><dd><b>Practice problems</b>Design it, and a judge runs traffic, failures and a budget against it</dd></div>
        <div><dt>8</dt><dd><b>Challenges</b>Harder evenings, scored out of three stars</dd></div>
      </dl>
    </div>
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

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">System design you can watch. A prototype at prototype.katta.cc: sample data, nothing is saved but on this device.</p><nav><a href="#/me">Dashboard</a><a href="#/learn">Learn</a><a href="#/sim/ind-vs-pak">Practice</a></nav></footer>`;

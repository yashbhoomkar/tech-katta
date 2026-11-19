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
// Four sections (owner: "Maximum 4 sections"): the promise, learn, interview, practice; one 3D pipeline throughout.
const STEPS = [
  { system: PIPE, cam: { side: false, cx: 0.7, sy: 0.56, zoom: 1.0, el: 30, phoneSy: 0.76, phoneZoom: 1.3 }, state: { labels: { topic: ['match-events'], sql: ['predictions'] }, speed: 0.7 } },
  // learn: lessons you watch; the database slows and the lag piles up in the topic
  { system: PIPE, state: { parts: { ...all(ids('p', 3), 'ok'), ...all(ids('c', 3), 'warn'), topic: 'warn', sql: 'alert' }, paths: { 'c0-s': 'alert', 'c1-s': 'alert', 'c2-s': 'alert' }, fill: { topic: 0.88 }, labels: { topic: ['lag 2.1M messages', 'warn'], c1: ['falling behind', 'warn'], sql: ['writes take 900 ms', 'alert'] }, speed: 1.4 } },
  // interview: the questions an interviewer asks, pinned to the parts they are about
  { system: PIPE6, state: { parts: OK6, fill: { topic: 0.06 }, labels: { p1: ['', '', 'What if a server crashes mid-publish?'], topic: ['', '', 'Why a topic, not direct writes?'], c2: ['', '', 'How many consumers per partition?'], sql: ['', '', 'Batch writes or row by row?'] }, speed: 1.2 } },
  // practice: the pipeline under a heavier evening, holding
  { system: PIPE6, cam: { el: 40, az: 42 }, state: { parts: { ...all(ids('p', 3), 'warn'), ...all(ids('c', 6), 'ok'), topic: 'warn', sql: 'ok' }, fill: { topic: 0.35 }, labels: { p1: ['92% busy', 'warn'], topic: ['absorbing the burst', 'warn'], sql: ['steady', 'ok'] }, speed: 2.2 } },
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
void ({ system: CHAT.system, cam: { zoom: 1.0, el: 36, az: 44 }, state: { labels: CHAT.labels, parts: { ws1: 'ok', ws2: 'ok', ws3: 'ok', queue: 'warn' }, speed: 1.4 } });
const NAMES = ['Start', 'Learn', 'Interview', 'Practice'];

export function mount(view, _p, { reduced }) {
  const sim = '#/sim/ind-vs-pak';
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${STEPS.length - 1}</span><span class="segs">${STEPS.slice(1).map(() => '<i></i>').join('')}</span><span class="mono name">Start</span></div>`)}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Your system design interview</span><span class="heavy accent">Everything for it, in one place</span></h1>
      <p class="lead">Learn the concepts and components, see how real apps are built, answer the questions interviewers ask, then design systems and get them judged. Free.</p>
      <div class="actions"><a class="btn dark" href="#/home">Start preparing<span class="chip">→</span></a><button class="btn light" type="button" data-next>See what is inside<span class="chip violet">↓</span></button></div>
      <p class="scroll-cue mono" aria-hidden="true">Scroll to play</p>
    </div>
    <div class="step" data-step="1">
      <p class="kicker"><span>01</span><i></i>Learn</p>
      <h2 class="headline"><span class="thin">21 concepts, 10 components</span><span class="heavy accent">Lessons you watch, not read</span></h2>
      <p class="lead">Caching, sharding, CAP, ${pd("kafka")}Kafka, Redis, PostgreSQL. Every idea is a short story where the system changes as you scroll: here the ${pd("db")}database slows and messages pile up in the ${pd("kafka")}topic.</p>
      <ul class="legend">${LEGEND.map(([kind, name, pastel]) => `<li><i style="background:var(--${pastel});border-color:var(--${pastel}-edge)"></i>${name}</li>`).join('')}</ul>
      <div class="actions"><a class="btn light" href="#/learn/concepts">See the lessons<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="2">
      <p class="kicker"><span>02</span><i></i>Interview</p>
      <h2 class="headline"><span class="thin">29 questions interviewers ask</span><span class="heavy accent">And 6 real systems, explained</span></h2>
      <p class="lead">Each answer walks through what to clarify, the numbers to estimate, the design and the trade-offs to say out loud. Real systems show how apps you use are built at Indian scale.</p>
      <div class="actions"><a class="btn light" href="#/learn/interview-questions">Browse the questions<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="3">
      <p class="kicker"><span>03</span><i></i>Practice</p>
      <h2 class="headline"><span class="thin">22 problems, 8 challenges</span><span class="heavy accent">A judge tells you if it holds</span></h2>
      <p class="lead">Draw your design. A judge sends an evening of traffic through it, crashes a server and checks the bill, then tells you what broke and why. Free: sign in with Google and everything opens.</p>
      <div class="actions"><a class="btn violet" href="#/home">Start preparing, free<span class="chip">→</span></a><a class="btn light" href="${sim}">Try a problem</a></div>
    </div>
  </section>

  ${footer()}`;

  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), name = root.querySelector('.progress .name'), segs = [...root.querySelectorAll('.segs i')];
  const story = mountStory(root, STEPS, { reduced, intro: true, onStep: (i) => { n.textContent = `0${i} / 0${STEPS.length - 1}`; name.textContent = NAMES[i]; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
  root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); scrollTo({ top: el.offsetTop + innerHeight * 0.28, behavior: reduced ? 'auto' : 'smooth' }); });
  return () => story.destroy();
}

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">System design you can watch. A prototype at prototype.katta.cc: sample data, nothing is saved but on this device.</p><nav><a href="#/home">Home</a><a href="#/me">Dashboard</a><a href="#/learn">Learn</a><a href="#/sim/ind-vs-pak">Practice</a></nav></footer>`;

// The landing: Tech Katta as one place for system design interview prep, told over one 3D pipeline, chapter by chapter. Everything that moves is 3D: the system
// builds itself when the page opens, and each chapter's scroll drives its change (story.js). The parts wear the same
// pastels as everywhere else (palette.js); the "meet the parts" chapter introduces them.
import { mountStory, stageHtml, followTheme } from '../story.js';
import { KIND_PASTEL } from '../palette.js';
import { runTour, offerTour } from '../tour.js';
import { sectionsHtml, mountSections } from './landing-lab.js';

/** the parts of this page's system, for the colour key (colours from palette.js) */
const LEGEND = [['laptop', 'Users', 'mist'], ['server', 'App server', 'sky'], ['kafka', 'Kafka topic', 'lemon'], ['consumer', 'Consumer', 'lime'], ['db', 'SQL database', 'mint']];

/** the signature: a part named in the text carries its colour dot, the same as its 3D label */
const pd = (kind) => `<i class="pdot" style="--c:var(--${KIND_PASTEL[kind]})" aria-hidden="true"></i>`;

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
  // learn: concepts you watch; the database slows and the lag piles up in the topic
  // the camera dollies in low onto the database that is slowing down
  { system: PIPE, cam: { hold: true, t: [12.4, 0.2], dist: 17, az: 22, el: 20, phoneZoom: 1.35, phoneSy: 0.34 }, state: { parts: { ...all(ids('p', 3), 'ok'), ...all(ids('c', 3), 'warn'), topic: 'warn', sql: 'alert' }, paths: { 'c0-s': 'alert', 'c1-s': 'alert', 'c2-s': 'alert' }, fill: { topic: 0.88 }, labels: { topic: ['lag 2.1M messages', 'warn'], c1: ['falling behind', 'warn'], sql: ['writes take 900 ms', 'alert'] }, speed: 1.4 } },
  // interview: the questions an interviewer asks, pinned to the parts they are about
  // it swings round to the Kafka topic, the part most questions are about
  { system: PIPE6, cam: { hold: true, t: [6.2, 0], dist: 21, az: 64, el: 34, phoneZoom: 1.35, phoneSy: 0.34 }, state: { parts: OK6, fill: { topic: 0.06 }, labels: { p1: ['', '', 'What if a server crashes mid-publish?'], topic: ['', '', 'Why a topic, not direct writes?'], c2: ['', '', 'How many consumers per partition?'], sql: ['', '', 'Batch writes or row by row?'] }, speed: 1.2 } },
  // practice: the pipeline under a heavier evening, holding
  // then cranes up over the whole pipeline holding a heavy evening
  { system: PIPE6, cam: { hold: true, t: [5.6, 0], dist: 44, az: 36, el: 54, phoneZoom: 1.25, phoneSy: 0.34 }, state: { parts: { ...all(ids('p', 3), 'warn'), ...all(ids('c', 6), 'ok'), topic: 'warn', sql: 'ok' }, fill: { topic: 0.35 }, labels: { p1: ['92% busy', 'warn'], topic: ['absorbing the burst', 'warn'], sql: ['steady', 'ok'] }, speed: 2.2 } },
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
/** a click on a part: what it does here, and the article that teaches it (owner: an industry leader took the 3D for
 *  something clickable, so it is) */
const PART_INFO = {
  laptop: { name: 'Users', what: 'Fans predicting the score during IND vs PAK. Every tap is one request.', read: ['concepts', 'networking-essentials', 'Networking essentials'] },
  server: { name: 'App server', what: 'Checks each prediction and publishes it to Kafka, instead of writing to the database while the user waits.', read: ['concepts', 'scaling-writes', 'Scaling writes'] },
  kafka: { name: 'Kafka topic', what: 'An ordered log split into partitions. It holds every prediction until a consumer takes it, so a spike waits here instead of failing.', read: ['components', 'kafka-in-practice', 'Kafka in practice'] },
  consumer: { name: 'Consumer', what: 'Reads one partition at a time and writes predictions to the database in batches. More consumers, up to one per partition, read faster.', read: ['concepts', 'long-jobs', 'Jobs that run for minutes'] },
  db: { name: 'SQL database', what: 'The source of truth for every prediction. Batched writes keep it inside what one machine can take.', read: ['components', 'postgresql', 'PostgreSQL'] },
};
const KIND_OF = (id) => (id === 'users' ? 'laptop' : id === 'topic' ? 'kafka' : id === 'sql' ? 'db' : id[0] === 'p' ? 'server' : 'consumer');
const STATE_WORD = { ok: 'healthy', warn: 'busy', alert: 'failing', dim: 'idle' };

export function mount(view, _p, { reduced }) {
  const sim = '/simulator/ind-vs-pak';
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${STEPS.length - 1}</span><span class="segs">${STEPS.slice(1).map(() => '<i></i>').join('')}</span><span class="mono name">Start</span></div>`, 'landing')}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Your system design interview</span><span class="heavy accent">Everything for it, in one place</span></h1>
      <p class="lead">Learn the concepts and components, see how real apps are built, answer the questions interviewers ask, then design systems and get them judged. Free.</p>
      <div class="actions"><a class="btn dark" href="/home">Start preparing<span class="chip">→</span></a><button class="btn light" type="button" data-next>See what is inside<span class="chip violet">↓</span></button></div>
      <p class="explore-hint"><span class="eh-tap"><i class="eh-dot" aria-hidden="true"></i>Tap any part to see what it does</span><span class="eh-scroll"><i class="eh-arrow" aria-hidden="true">↓</i>Scroll to play</span><button type="button" class="eh-tour" data-tour>Take the tour</button></p>
    </div>
    <div class="step" data-step="1">
      <p class="kicker"><span>01</span><i></i>Learn</p>
      <h2 class="headline"><span class="thin">21 concepts, 10 components</span><span class="heavy accent">Concepts you watch, not read</span></h2>
      <p class="lead">Caching, sharding, CAP, ${pd("kafka")}Kafka, Redis, PostgreSQL. Every idea is a short story where the system changes as you scroll: here the ${pd("db")}database slows and messages pile up in the ${pd("kafka")}topic.</p>
      <ul class="legend">${LEGEND.map(([kind, name, pastel]) => `<li><button type="button" data-part-kind="${kind}"><i style="background:var(--${pastel});border-color:var(--${pastel}-edge)"></i>${name}</button></li>`).join('')}</ul>
      <div class="actions"><a class="btn light" href="/learn/concepts">See the concepts<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="2">
      <p class="kicker"><span>02</span><i></i>Interview</p>
      <h2 class="headline"><span class="thin">29 questions interviewers ask</span><span class="heavy accent">And 6 real systems, explained</span></h2>
      <p class="lead">Each answer walks through what to clarify, the numbers to estimate, the design and the trade-offs to say out loud. For example, on this pipeline:</p>
      <ul class="qs">
        <li>${pd("server")}What if a server crashes mid-publish?</li>
        <li>${pd("kafka")}Why a topic, not direct writes?</li>
        <li>${pd("consumer")}How many consumers per partition?</li>
        <li>${pd("db")}Batch writes or row by row?</li>
      </ul>
      <div class="actions"><a class="btn light" href="/learn/interview-questions">Browse the questions<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="3">
      <p class="kicker"><span>03</span><i></i>Practice</p>
      <h2 class="headline"><span class="thin">Problems to design</span><span class="heavy accent">A judge tells you if it holds</span></h2>
      <p class="lead">Draw your design. A judge sends an evening of traffic through it, crashes a server and checks the bill, then tells you what broke and why. Free: sign in with Google and everything opens.</p>
      <div class="actions"><a class="btn violet" href="/problems">Open the problems<span class="chip">→</span></a><a class="btn light" href="${sim}">Or play one evening in the simulator</a></div>
    </div>
  </section>

  ${sectionsHtml()}
  ${footer()}`;

  const offLab = mountSections(view, { reduced });
  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), name = root.querySelector('.progress .name'), segs = [...root.querySelectorAll('.segs i')];
  let cur = 0;
  const offTheme = followTheme(root);
  const story = mountStory(root, STEPS, { reduced, intro: true, label: 'A system in 3D: users, app servers, a Kafka topic, consumers and a database. Tap a part to learn what it does; the colour key in the first chapter does the same.', onStep: (i, frac = 0) => { cur = Math.max(0, Math.min(STEPS.length - 1, Math.round(frac))); n.textContent = `0${i} / 0${STEPS.length - 1}`; name.textContent = NAMES[i]; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
  // click (or tap) a part: a card beside it says what it does, what is happening to it now, and where to learn it
  let openId = null, openY = 0;
  const stage = root.querySelector('.stage'), w = story.world;
  const pc = document.createElement('div'); pc.className = 'part-card'; pc.hidden = true; pc.setAttribute('role', 'dialog'); pc.setAttribute('aria-live', 'polite');
  document.body.appendChild(pc); // above the words and the bars, not inside the 3D layer beneath them
  const close = () => { pc.hidden = true; openId = null; };
  const open = (id) => {
    if (!id) return close();
    const kind = KIND_OF(id), info = PART_INFO[kind], st = STEPS[cur].state, now = st.labels?.[id], tone = st.parts?.[id];
    const ask = now && now[2] && /\?$/.test(now[2]) ? now[2] : '';
    // the opening screen's labels are names (the topic, the table), not a state, so they get no Now line
    const nowText = ask || cur === 0 ? '' : now && now[0] ? now[0] : tone ? STATE_WORD[tone] : '';
    pc.innerHTML = `<button type="button" class="pc-x" aria-label="Close">×</button>
      <p class="pc-name">${pd(kind)}${info.name}</p>
      <p class="pc-what">${info.what}</p>
      ${nowText ? `<p class="pc-now ${tone || ''}"><span class="mono">Now</span>${nowText}</p>` : ''}
      ${ask ? `<p class="pc-now"><span class="mono">Interviewers ask</span>${ask}</p>` : ''}
      <a class="pc-go" href="/learn/${info.read[0]}/${info.read[1]}">Learn it: ${info.read[2]} →</a>`;
    pc.hidden = false; openId = id; openY = scrollY;
    // wide screens: beside the part; phones: a sheet that rises above the bottom bar
    const xy = w?.screenOf(id), r = stage.querySelector('canvas').getBoundingClientRect();
    pc.classList.toggle('sheet', innerWidth <= 760 || !xy);
    if (!pc.classList.contains('sheet')) { const x = Math.min(Math.max(r.left + xy[0] + 24, 16), innerWidth - 316), y = Math.min(Math.max(r.top + xy[1] - 60, 16), innerHeight - 280); pc.style.left = `${x}px`; pc.style.top = `${y}px`; }
    else { pc.style.left = ''; pc.style.top = ''; }
    pc.querySelector('.pc-x').addEventListener('click', close);
  };
  w?.onPick((id) => { if (id) dismissRing(); open(id); if (id && tour?.waiting) setTimeout(() => tour?.next(), 450); });
  // the first hint, in the 3D itself: a ring pulsing on the Kafka topic until you tap a part or start scrolling
  const ring = document.createElement('i'); ring.className = 'tap-ring'; ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  let ringRaf = 0, ringOn = !!w;
  const dismissRing = () => { ringOn = false; ring.classList.add('gone'); };
  const placeRing = () => {
    ringRaf = 0;
    if (!ringOn) return;
    if (scrollY > innerHeight * 0.25) { dismissRing(); return; }
    const xy = w.screenOf('topic'), c = stage.querySelector('canvas').getBoundingClientRect();
    if (xy) {
      const x = c.left + xy[0], y = c.top + xy[1] + 10;
      ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      // never half under the hint or the tour card: where it would touch them it is not drawn
      const under = ['.explore-hint', '.tour-offer'].some((q) => { const r = document.querySelector(q)?.getBoundingClientRect(); return r && r.width && x + 26 > r.left && x - 26 < r.right && y + 26 > r.top && y - 26 < r.bottom; });
      ring.style.opacity = under ? '0' : '';
    }
    ringRaf = requestAnimationFrame(placeRing);
  };
  if (w) ringRaf = requestAnimationFrame(placeRing); else ring.remove();
  root.querySelectorAll('[data-part-kind]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.partKind; open(k === 'laptop' ? 'users' : k === 'kafka' ? 'topic' : k === 'db' ? 'sql' : k === 'server' ? 'p1' : 'c1'); }));
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onScroll2 = () => { if (openId && Math.abs(scrollY - openY) > 80) close(); }; // scrolling moves the story on
  addEventListener('keydown', onKey); addEventListener('scroll', onScroll2, { passive: true });
  // the tour: offered once on a first visit, and always one tap away in the hint under the hero
  let tour = null;
  const canvas = () => stage.querySelector('canvas').getBoundingClientRect();
  const pad = (r, p) => r && ({ x: r.left - p, y: r.top - p, w: r.width + p * 2, h: r.height + p * 2 });
  // a box round some words: round what they actually fill (their children), not the full width of their column
  const el = (sel) => {
    const e = root.querySelector(sel); if (!e) return null;
    const rs = [...e.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    if (!rs.length) return null;
    const r = { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)) };
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    return r.bottom > 0 && r.top < innerHeight ? pad(r, 12) : null;
  };
  // a box round some parts of the 3D, from where the camera draws them this frame
  const parts = (list, min = 96) => {
    if (!w) return null;
    const c = canvas(), pts = list.map((id) => w.screenOf(id)).filter(Boolean).map(([x, y]) => [c.left + x, c.top + y]);
    if (!pts.length) return null;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const grow = (a, b) => (b - a < min ? [(a + b) / 2 - min / 2, (a + b) / 2 + min / 2] : [a - 36, b + 36]);
    [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1); y1 += 14;
    x0 = Math.max(x0, c.left + 4); x1 = Math.min(x1, c.right - 4); y0 = Math.max(y0, 4); y1 = Math.min(y1, innerHeight - 4);
    return x1 - x0 > 20 && y1 - y0 > 20 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, round: list.length === 1 } : null;
  };
  const how = reduced ? 'auto' : 'smooth';
  // the opening steps: on phones the hero's words sit over the 3D, so they fade back and let taps through to the parts
  // (scrolling them away would start chapter one); wide screens have the 3D beside the words
  const clear = (on) => root.classList.toggle('tour-clear', on && innerWidth <= 760);
  const toHero = () => { clear(true); scrollTo({ top: 0, behavior: how }); };
  const toStep = (k) => { clear(false); const s = root.querySelector(`[data-step="${k}"]`); scrollTo({ top: s.offsetTop + innerHeight * 0.28, behavior: how }); };
  // a step about words in a chapter: bring them on screen, low on phones (the card takes the top), centred elsewhere
  const toEl = (k, sel) => {
    clear(false); const e = root.querySelector(`[data-step="${k}"] ${sel}`), s = root.querySelector(`[data-step="${k}"]`);
    const r = e.getBoundingClientRect(), want = innerWidth <= 760 ? innerHeight * 0.62 : innerHeight / 2;
    scrollTo({ top: Math.max(s.offsetTop, scrollY + r.top + r.height / 2 - want), behavior: how });
  };
  const TOUR = [
    { title: 'This is a real backend', body: `Fans tap in, ${pd('server')}app servers send each prediction to ${pd('kafka')}Kafka, and ${pd('consumer')}consumers write them to a ${pd('db')}database. All of it is live.`,
      enter: () => { close(); toHero(); }, at: () => parts(['users', 'p0', 'p2', 'topic', 'c0', 'c2', 'sql']) },
    { title: 'Every part is clickable', body: `Tap the yellow ${pd('kafka')}Kafka topic now. Any part works.`, wait: true,
      enter: () => { close(); toHero(); }, show: () => { open('topic'); setTimeout(() => tour?.next(), 450); }, at: () => parts(['topic']) },
    { title: 'Each part explains itself', body: 'What it does in this app, and a link to the article that teaches it. Tap any other part later the same way.',
      enter: () => { clear(true); if (!openId) open('topic'); }, at: () => (pc.hidden ? null : pad(pc.getBoundingClientRect(), 8)) },
    { title: 'Scroll and the story plays', body: `Each chapter changes the system. Here the ${pd('db')}database slows down and messages pile up in the ${pd('kafka')}topic.`,
      enter: () => { close(); toStep(1); }, at: () => parts(['sql'], 150) },
    { title: 'The questions interviewers ask', body: 'Every question and real system has a full answer: what to clarify, the numbers, the design and the trade-offs.',
      enter: () => { close(); toEl(2, '.qs'); }, at: () => el('[data-step="2"] .qs') },
    { title: 'Then design it yourself', body: 'Draw a design and a judge runs real traffic through it, then tells you what broke and why.',
      enter: () => { close(); toEl(3, '.actions'); }, at: () => el('[data-step="3"] .actions'), cta: { href: '/home', label: 'Start preparing' } },
  ];
  const startTour = () => {
    if (tour) return;
    dismissRing(); stopOffer();
    tour = runTour(TOUR, { reduced, onEnd: () => { tour = null; clear(false); } });
  };
  const stopOffer = offerTour({ start: startTour });
  root.querySelector('[data-tour]').addEventListener('click', startTour);
  root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); scrollTo({ top: el.offsetTop + innerHeight * 0.28, behavior: reduced ? 'auto' : 'smooth' }); });
  return () => { offLab(); tour?.end(); stopOffer(); cancelAnimationFrame(ringRaf); ring.remove(); pc.remove(); removeEventListener('keydown', onKey); removeEventListener('scroll', onScroll2); offTheme(); story.destroy(); };
}

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">Everything for your system design interview, in one place. Learn, practise and get judged, free.</p><nav><a href="/home">Home</a><a href="/learn">Learn</a><a href="/problems">Problems</a><a href="/simulator">Simulator</a><a href="/start">Start here</a><a href="/free">Free</a><a href="/changelog">What's new</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>`;

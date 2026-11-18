// The landing: one evening told over the 3D world, chapter by chapter. Everything that moves is 3D: the system
// builds itself when the page opens, and each chapter's scroll drives its change (story.js). The parts wear the same
// pastels as everywhere else (palette.js); the "meet the parts" chapter introduces them.
import { mountStory, stageHtml } from '../story.js';
import { LEGEND } from '../palette.js';

const D = (o) => ({ apps: 3, cache: 1, replicas: 0, queue: 0, cdn: 0, ...o });
const FULL = D({ cache: 3, replicas: 2, queue: 1, cdn: 1 });
const allOk = (d) => Object.fromEntries(['app0', 'app1', 'app2', 'app3', 'cache0', 'cache1', 'cache2', 'db', 'rep0', 'rep1', 'queue', 'cdn'].map((k) => [k, 'ok']).filter(([k]) => k.startsWith('app') ? Number(k.slice(3)) < d.apps : true));
const STEPS = [
  { design: D({}), cam: { side: false, sy: 0.9, zoom: 1.25, el: 26 }, state: { labels: { cache0: ['hit 94 %'], db: ['420 req/s'], lb: ['3 healthy'] }, speed: 0.6 } },
  { design: D({}), state: { parts: { app0: 'ok', app1: 'ok', app2: 'ok', cache0: 'ok' }, labels: { cache0: ['37,600 hits/s', 'ok'], db: ['2,400 req/s'], app1: ['p99 38 ms', 'ok'] }, speed: 1.5 } },
  { design: D({}), state: { parts: { cache0: 'alert', db: 'alert', client: 'dim' }, paths: { 'app0-cache': 'down', 'app1-cache': 'down', 'app2-cache': 'down', db: 'alert' }, labels: { cache0: ['down', 'alert'], db: ['37,600 req/s · overloaded', 'alert'], app1: ['p99 2,000 ms', 'alert'] }, speed: 1.6 } },
  { design: D({}), cam: { zoom: 0.62, t: [14.4, 1.2], az: 36, el: 24 }, state: { parts: { cache0: 'alert', db: 'alert', client: 'dim', lb: 'dim', app0: 'dim', app1: 'dim', app2: 'dim' }, labels: { db: ['6,000 max · 37,600 in', 'alert'] }, explode: ['db'], speed: 0.9 } },
  { design: D({ cache: 3, replicas: 2 }), state: { parts: { cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok' }, labels: { cache1: ['3 nodes', 'ok'], db: ['1,200 req/s', 'ok'], rep0: ['sharing reads', 'ok'] }, speed: 1.2 } },
  // meet the parts: every kind, named, in its own pastel
  { design: FULL, cam: { zoom: 1.02, el: 34, az: 48 }, state: { labels: { app1: ['', '', 'app server'], lb: ['', '', 'load balancer'], cache1: ['', '', 'cache'], db: ['', '', 'database'], queue: ['', '', 'queue'], cdn: ['', '', 'cdn'] }, speed: 0.7 } },
  // learn by watching: close on the cache; the rest steps back
  { design: FULL, cam: { zoom: 0.5, t: [13.5, -3.9], az: 30, el: 28 }, state: { parts: { client: 'hidden', cdn: 'hidden', lb: 'hidden', app0: 'hidden', app1: 'hidden', app2: 'hidden', queue: 'hidden', rep0: 'hidden', rep1: 'hidden', db: 'hidden', cache1: 'alert' }, labels: { cache1: ['one node dies', 'alert'], cache0: ['⅓ of the keys'], cache2: ['⅓ of the keys'] }, speed: 0.8 } },
  // simulate: the whole system under a spike; parts busy, then holding
  { design: FULL, cam: { zoom: 0.95, el: 40, az: 42 }, state: { parts: { app0: 'warn', app1: 'warn', app2: 'warn', cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok', queue: 'warn', cdn: 'ok' }, labels: { app1: ['89 % busy', 'warn'], queue: ['holding 12,000', 'warn'], db: ['4k writes/s', 'ok'], cdn: ['70 % answered', 'ok'] }, speed: 2.2 } },
  { design: FULL, cam: { side: false, sy: 0.93, zoom: 1.35, el: 42 }, state: { parts: allOk(FULL), speed: 0.7 } },
];
const NAMES = ['START', 'THE SPIKE', 'IT BREAKS', 'FIND THE CAUSE', 'FIX IT', 'THE PARTS', 'LEARN', 'SIMULATE', 'YOUR TURN'];

export function mount(view, _p, { reduced }) {
  // phones: the legend under the words names the parts, so the six labels would only crowd the small scene
  if (innerWidth <= 760) STEPS[5].state = { ...STEPS[5].state, labels: {} };
  const sim = '#/sim/ind-vs-pak';
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml(`<div class="progress"><span class="mono n">00 / 0${STEPS.length - 1}</span><span class="segs">${STEPS.slice(1).map(() => '<i></i>').join('')}</span><span class="mono name">START</span></div>`)}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Systems <span class="logword">break.</span></span><span class="heavy accent">Learn to keep them up.</span></h1>
      <p class="lead">Tech Katta is system design you can watch. Every idea is a moving system, and every system is yours to break and fix.</p>
      <div class="actions"><a class="btn dark" href="#/learn">Start learning<span class="chip">→</span></a><button class="btn light" type="button" data-next>See it break<span class="chip violet">↓</span></button></div>
      <p class="scroll-cue mono" aria-hidden="true">SCROLL TO PLAY</p>
    </div>
    <div class="step" data-step="1">
      <p class="kicker"><span>01</span><i></i>THE SPIKE</p>
      <h2 class="headline"><span class="thin">IND vs PAK. 36,000 link opens a second.</span><span class="heavy accent">Everything is green.</span></h2>
      <p class="lead">The promo SMS reaches crores of fans at the toss. The cache answers almost every open before the database hears.</p>
      <dl class="stats"><div><dt>Traffic</dt><dd>36k /s</dd></div><div><dt>Cache hit</dt><dd>94 %</dd></div><div><dt>p99</dt><dd>38 ms</dd></div></dl>
    </div>
    <div class="step" data-step="2">
      <p class="kicker"><span>02</span><i></i>IT BREAKS</p>
      <h2 class="headline"><span class="thin">The cache goes down.</span><span class="heavy accent">The database takes it all.</span></h2>
      <p class="lead">One cache node, no spare. Every open falls through to a database built for a sixth of that.</p>
      <dl class="stats"><div><dt>Errors</dt><dd class="alert">58 %</dd></div><div><dt>Since</dt><dd>20:14 IST</dd></div><div><dt>Severity</dt><dd class="alert">SEV-1</dd></div></dl>
    </div>
    <div class="step" data-step="3">
      <p class="kicker"><span>03</span><i></i>FIND THE CAUSE</p>
      <h2 class="headline"><span class="thin">The database isn’t broken.</span><span class="heavy accent">It is outnumbered.</span></h2>
      <p class="lead">It serves 6,000 reads a second, exactly as built. 37,600 arrived. The real question: why did one cache node hold everything?</p>
    </div>
    <div class="step" data-step="4">
      <p class="kicker"><span>04</span><i></i>FIX IT</p>
      <h2 class="headline"><span class="thin">Three cache nodes, two replicas.</span><span class="heavy ok">Run it again. It holds.</span></h2>
      <p class="lead">Now a dead node loses a third of the keys, not all of them, and two replicas share what falls through.</p>
    </div>
    <div class="step" data-step="5">
      <p class="kicker"><span>05</span><i></i>THE PARTS</p>
      <h2 class="headline"><span class="thin">Every part has a colour.</span><span class="heavy accent">The same one everywhere.</span></h2>
      <p class="lead">Learn them once. In every lesson and every simulation on Tech Katta, a part looks like this.</p>
      <ul class="legend">${LEGEND.map(([kind, name, pastel]) => `<li><i style="background:var(--${pastel});border-color:var(--${pastel}-edge)"></i>${name}</li>`).join('')}</ul>
    </div>
    <div class="step" data-step="6">
      <p class="kicker"><span>06</span><i></i>LEARN</p>
      <h2 class="headline"><span class="thin">Every lesson is a story</span><span class="heavy accent">like the one you just scrolled.</span></h2>
      <p class="lead">Caching, replicas, queues, load balancing: the system on screen changes with every paragraph, so you see why each part exists.</p>
      <div class="actions"><a class="btn light" href="#/learn">Open the lessons<span class="chip violet">→</span></a></div>
    </div>
    <div class="step" data-step="7">
      <p class="kicker"><span>07</span><i></i>SIMULATE</p>
      <h2 class="headline"><span class="thin">Then build your own.</span><span class="heavy accent">Press Run. Watch it hold.</span></h2>
      <p class="lead">Add servers, caches, replicas, a queue, a CDN. Send a real evening of traffic through it. Amber is busy, red is broken, and every result tells you why.</p>
      <div class="actions"><a class="btn light" href="${sim}">Open the simulator<span class="chip violet">→</span></a></div>
    </div>
    <div class="step finale" data-step="8">
      <p class="kicker"><span>08</span><i></i>YOUR TURN</p>
      <h2 class="headline"><span class="heavy">You will meet this night</span><span class="heavy accent">in an interview, or at work.</span></h2>
      <p class="lead">Better to meet it here first.</p>
      <div class="actions"><a class="btn violet" href="#/learn">Start learning<span class="chip">→</span></a><a class="btn light" href="${sim}">Open the simulator</a></div>
    </div>
  </section>
  ${footer()}`;

  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), name = root.querySelector('.progress .name'), segs = [...root.querySelectorAll('.segs i')];
  const story = mountStory(root, STEPS, { reduced, intro: true, onStep: (i) => { n.textContent = `0${i} / 0${STEPS.length - 1}`; name.textContent = NAMES[i]; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
  root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); scrollTo({ top: el.offsetTop + innerHeight * 0.45, behavior: reduced ? 'auto' : 'smooth' }); });
  return () => story.destroy();
}

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">System design you can watch. A prototype at prototype.katta.cc: sample data, nothing is saved but on this device.</p><nav><a href="#/learn">Learn</a><a href="#/sim/ind-vs-pak">Simulator</a><a href="#/me">You</a></nav></footer>`;

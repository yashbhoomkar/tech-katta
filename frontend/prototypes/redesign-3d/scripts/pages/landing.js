// The landing: one incident told in six steps over the 3D world, then the three ways in.
import { mountStory, stageHtml } from '../story.js';
import { INCIDENTS, rupees, perSec } from '../sim.js';
import { sparkline } from '../ui.js';

const D = (o) => ({ apps: 3, cache: 1, replicas: 0, queue: 0, cdn: 0, ...o });
const STEPS = [
  { design: D({}), cam: { side: false, sy: 0.9, zoom: 1.25, el: 26 }, state: { labels: { cache0: ['hit 94 %'], db: ['420 req/s'], lb: ['3 healthy'] }, speed: 0.6 } },
  { design: D({}), state: { parts: { app0: 'ok', app1: 'ok', app2: 'ok', cache0: 'ok' }, labels: { cache0: ['37,600 hits/s', 'ok'], db: ['2,400 req/s'], app1: ['p99 38 ms', 'ok'] }, speed: 1.5 } },
  { design: D({}), state: { parts: { cache0: 'alert', db: 'alert', client: 'dim' }, paths: { 'app0-cache': 'down', 'app1-cache': 'down', 'app2-cache': 'down', db: 'alert' }, labels: { cache0: ['down', 'alert'], db: ['37,600 req/s · overloaded', 'alert'], app1: ['p99 2,000 ms', 'alert'] }, speed: 1.6 } },
  { design: D({}), cam: { zoom: 0.62, t: [14.4, 1.2], az: 36, el: 24 }, state: { parts: { cache0: 'alert', db: 'alert', client: 'dim', lb: 'dim', app0: 'dim', app1: 'dim', app2: 'dim' }, labels: { db: ['6,000 max · 37,600 in', 'alert'] }, explode: ['db'], speed: 0.9 } },
  { design: D({ cache: 3, replicas: 2 }), state: { parts: { cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok' }, labels: { cache1: ['3 nodes', 'ok'], db: ['1,200 req/s', 'ok'], rep0: ['sharing reads', 'ok'] }, speed: 1.2 } },
  { design: D({ cache: 3, replicas: 2, cdn: 1 }), cam: { side: false, sy: 0.82, zoom: 1.2, el: 40 }, state: { parts: { cache0: 'ok', cache1: 'ok', cache2: 'ok', db: 'ok', rep0: 'ok', rep1: 'ok' }, speed: 0.7 } },
];

export function mount(view, _p, { reduced }) {
  const inc = INCIDENTS[0];
  view.innerHTML = `
  <section class="story landing-story">
    ${stageHtml('<div class="progress"><span class="mono n">00 / 05</span><span class="segs"><i></i><i></i><i></i><i></i><i></i></span><span class="mono name">START</span></div>')}
    <div class="step hero" data-step="0">
      <h1 class="headline"><span class="thin">Systems <span class="logword">break.</span></span><span class="heavy accent">Learn to keep them up.</span></h1>
      <p class="lead">Tech Katta is system design you can watch. Read ideas as moving systems, then run real Indian evenings against your own design: IND vs PAK, ticket sales, salary day.</p>
      <div class="actions"><a class="btn dark" href="#/sim/${inc.id}">Run your first incident<span class="chip">→</span></a><button class="btn light" type="button" data-next>See it break<span class="chip violet">↓</span></button></div>
      <div class="scroll-cue" aria-hidden="true"><span>SCROLL TO PLAY</span><i></i></div>
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
      <p class="lead">It serves 6,000 reads a second, exactly as built. 37,600 arrived. The question was never “why is the database slow”, but “why did one cache node hold everything”.</p>
    </div>
    <div class="step" data-step="4">
      <p class="kicker"><span>04</span><i></i>FIX IT</p>
      <h2 class="headline"><span class="thin">Three cache nodes, two replicas.</span><span class="heavy ok">Run it again. It holds.</span></h2>
      <p class="lead">Now a dead node loses a third of the keys, not all of them, and two replicas share what falls through. Same evening, errors 0.15 %.</p>
    </div>
    <div class="step finale" data-step="5">
      <p class="kicker"><span>05</span><i></i>YOUR TURN</p>
      <h2 class="headline"><span class="heavy">You will meet this night</span><span class="heavy accent">in an interview, or at work.</span></h2>
      <p class="lead">Better to meet it here first.</p>
      <div class="actions"><a class="btn violet" href="#/sim/${inc.id}">Run it yourself<span class="chip">→</span></a><a class="btn light" href="#/learn">Learn the ideas first</a></div>
    </div>
  </section>

  <section class="page ways">
    <p class="kicker"><span>HOW IT WORKS</span></p>
    <h2 class="headline sm"><span class="thin">Three ways in.</span><span class="heavy">One system the whole way.</span></h2>
    <div class="ways-grid">
      <a class="way" href="#/learn"><span class="way-n mono">01 · LEARN</span><h3>Lessons you watch</h3><p>Each idea is a short scroll story: the system on screen rebuilds itself as you read.</p><span class="way-go">4 stories, more each week →</span></a>
      <a class="way" href="#/incidents"><span class="way-n mono">02 · INCIDENTS</span><h3>Real Indian evenings</h3><p>A match, a sale, salary day. Each comes with its traffic, its failures and a budget in rupees.</p><span class="way-go">${INCIDENTS.length} incidents →</span></a>
      <a class="way" href="#/sim/${inc.id}"><span class="way-n mono">03 · SIMULATE</span><h3>Design, run, fix</h3><p>Add servers, caches, replicas, a queue. Press Run and watch every request. Orange means it broke.</p><span class="way-go">Open the simulator →</span></a>
    </div>
  </section>

  <section class="page featured">
    <a class="feat" href="#/sim/${inc.id}">
      <div><p class="kicker"><span>INCIDENT ${inc.no}</span><i></i>${inc.level.toUpperCase()}</p><h3>${inc.title}</h3><p class="muted">${inc.brief}</p>
      <div class="feat-facts"><span><b>${perSec(Math.max(...inc.curve.map((c) => c[1])))}</b> peak</span><span><b>${rupees(inc.budget)}</b> a month</span><span><b>p99 &lt; ${inc.p99} ms</b></span></div></div>
      <div class="feat-chart">${sparkline(inc, { w: 420, h: 150 })}</div>
    </a>
  </section>
  ${footer()}`;

  const root = view.querySelector('.story');
  const n = root.querySelector('.progress .n'), name = root.querySelector('.progress .name'), segs = [...root.querySelectorAll('.segs i')];
  const NAMES = ['START', 'THE SPIKE', 'IT BREAKS', 'FIND THE CAUSE', 'FIX IT', 'YOUR TURN'];
  const story = mountStory(root, STEPS, { reduced, onStep: (i) => { n.textContent = `0${i} / 05`; name.textContent = NAMES[i]; segs.forEach((s, k) => s.classList.toggle('on', k < i)); } });
  root.querySelector('[data-next]').addEventListener('click', () => { const el = root.querySelector('[data-step="1"]'); scrollTo({ top: el.offsetTop + innerHeight * 0.45, behavior: reduced ? 'auto' : 'smooth' }); });
  const stopLogs = logFill(root.querySelector('.logword'));
  return () => { story.destroy(); stopLogs(); };
}

export const footer = () => `<footer class="foot page"><div class="logo"><span class="logo-mark" aria-hidden="true"><i></i><i></i></span>tech katta</div><p class="muted">System design you can watch. A prototype at prototype.katta.cc: sample data, nothing is saved but on this device.</p><nav><a href="#/learn">Learn</a><a href="#/incidents">Incidents</a><a href="#/me">You</a></nav></footer>`;

/** "break." filled with log lines (a canvas pattern; the CSP allows data: images) */
export function logFill(el) {
  if (!el) return () => {};
  const draw = () => {
    const c = document.createElement('canvas'), W = 900, H = 380; c.width = W; c.height = H;
    const g = c.getContext('2d'); if (!g) return;
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6D3FE0'; g.fillRect(0, 0, W, H);
    g.font = '600 15px "IBM Plex Mono", monospace'; g.fillStyle = 'rgba(255,255,255,.5)';
    const L = ['cache ERROR node unreachable', 'db WARN connections 500/500', 'api ERROR upstream timeout 2000ms', 'lb WARN 5xx rate 31%', 'links.open 36,112/s', 'db queries 37,600/s', 'cache.hit 0% was=94%'];
    for (let y = 18, i = 0; y < H; y += 19, i++) g.fillText(`${L[i % 7]} · ${L[(i + 3) % 7]} · ${L[(i + 5) % 7]}`, -((i * 37) % 160), y);
    el.style.backgroundImage = `url(${c.toDataURL()})`;
  };
  draw(); document.fonts?.ready.then(draw);
  const mo = new MutationObserver(draw); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

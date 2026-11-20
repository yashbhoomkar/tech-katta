// The simulator: the incident's brief on the left, your system in 3D in the middle, the parts dock at the bottom.
// Press Run: the evening plays at two ticks a second; parts glow amber when busy and orange when they fail; the
// chart fills in, errors and p99 count live; failures land as alerts. Then the verdict, with what broke and why.
//
// Phones (owner: "The simulator, rebuilt for portrait") go through four stages, one thing on screen at a time, all
// within thumb reach (`data-phase` on .sim; wide screens keep everything on screen at once and ignore it):
//   brief  the problem as a full card: story, the evening's traffic, the three targets, "Start building"
//   build  the 3D in the top half; a bottom sheet of parts (name, price, what it does, a 40 px stepper); the cost
//          against the budget and "Run the evening" stay at the bottom; a slim bar at the top reopens the brief
//   run    the 3D full screen, live numbers at the top, the evening as a timeline at the bottom
//   done   the verdict as a bottom sheet; "Replay the evening" lets you drag along the timeline and watch any moment
import { createWorld } from '../world.js';
import { INCIDENTS, layout, run, cost, rupees, perSec, LIMITS, PARTS_INFO, PRICE, APP_CAP, DB_READ } from '../sim.js';
import { sparkline, esc } from '../ui.js';
// what to read when a part fails: the simulator's lesson ids → the real concept articles
const READ = { caching: ['caching', 'Caching'], replicas: ['scaling-reads', 'Scaling reads'], queues: ['scaling-writes', 'Scaling writes'], 'load-balancing': ['networking-essentials', 'Networking essentials'] };
import { store } from '../store.js';

const KEYS = ['apps', 'cache', 'replicas', 'queue', 'cdn'];
const clock = (t) => { const s = 14 * 60 + t * 5; return `20:${String(Math.floor(s / 60) - 0).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const TARGETS = (inc) => [['errors', 'Errors under 1 %', 'Errors'], ['p99', `p99 under ${inc.p99} ms`, 'p99'], ['budget', `Within ${rupees(inc.budget)} a month`, 'Budget']];

export function mount(view, [id], { reduced, go }) {
  const inc = INCIDENTS.find((x) => x.id === id) || INCIDENTS[0];
  const saved = store.get().best[inc.id];
  let design = { ...(saved?.design || inc.start) };
  let playing = null, result = null, endParts = null;

  view.innerHTML = `
  <section class="sim" data-phase="brief">
    <div class="sim-stage"><canvas role="img" aria-label="Your system in 3D: users, load balancer, app servers, cache and database"></canvas><div class="overlay"></div></div>
    <aside class="brief glass" aria-label="The problem">
      <nav class="crumbs mono" aria-label="Breadcrumb"><a href="#/me">Dashboard</a><span>/</span><a href="#/sim">Practice</a></nav>
      <p class="kicker"><span>Problem ${Number(inc.no)}</span><i></i>${inc.level} · ${inc.system}</p>
      <h1>${inc.title}</h1>
      <p class="muted">${inc.brief}</p>
      <div class="chart">${sparkline(inc, { w: 300, h: 92 })}<div class="chart-axis mono"><span>${clock(0)}</span><span>${clock(inc.length - 1)}</span></div></div>
      <p class="brief-k mono">To pass, by the end of the evening</p>
      <ul class="targets">${TARGETS(inc).map(([k, label]) => `<li data-check="${k}"><i></i>${label}<b>—</b></li>`).join('')}</ul>
      <button type="button" class="btn dark brief-go">${saved ? 'Back to your design' : 'Start building'}<span class="chip">→</span></button>
    </aside>
    <div class="mhead glass">
      <button type="button" class="mh-open" aria-label="Show the problem again"><span class="mono">Problem ${Number(inc.no)} · ${inc.level}</span><b>${esc(inc.title)}</b></button>
      <ul class="mh-targets" aria-label="Targets">${TARGETS(inc).map(([k, , short]) => `<li data-check="${k}"><i></i>${short}<b>—</b></li>`).join('')}</ul>
    </div>
    <div class="hud glass" aria-live="polite">
      <span><small>Time</small><b class="h-time">${clock(0)}</b></span>
      <span><small>Traffic</small><b class="h-rps">—</b></span>
      <span><small>Errors</small><b class="h-err">—</b></span>
      <span><small>p99</small><b class="h-p99">—</b></span>
    </div>
    <div class="alerts" aria-live="assertive"></div>
    <div class="dock glass">
      <button type="button" class="sheet-handle" aria-expanded="true" aria-label="Show or hide the parts"><i></i><span class="mono">Parts</span></button>
      <div class="parts">${KEYS.map((k) => `
        <div class="part" data-k="${k}">
          <span class="p-name"><b>${PARTS_INFO[k].name}</b><small>${rupees(PRICE[k])}/mo</small><span class="p-what">${PARTS_INFO[k].what}</span></span>
          <span class="stepper"><button type="button" data-d="-1" aria-label="Remove a ${PARTS_INFO[k].short}">−</button><output>0</output><button type="button" data-d="1" aria-label="Add a ${PARTS_INFO[k].short}">+</button></span>
        </div>`).join('')}</div>
      <div class="dock-right">
        <span class="cost"><small>Cost a month</small><b class="c-val">—</b><small class="c-of">of ${rupees(inc.budget)}</small></span>
        <button class="btn dark run" type="button">Run the evening<span class="chip">→</span></button>
      </div>
    </div>
    <div class="timeline glass">
      <div class="tl-chart">${sparkline(inc, { w: 300, h: 56, cls: 'tl' })}</div>
      <input class="tl-range" type="range" min="0" max="${inc.length - 1}" value="0" step="1" aria-label="Move through the evening" disabled>
      <div class="tl-row"><span class="mono tl-a">${clock(0)}</span><button type="button" class="tl-btn">Skip to the end</button><span class="mono tl-b">${clock(inc.length - 1)}</span></div>
    </div>
    <div class="tip glass" hidden></div>
    <div class="verdict glass" hidden></div>
  </section>`;

  const $ = (s) => view.querySelector(s);
  const sim = $('.sim'), stage = $('.sim-stage');
  let world = null;
  try { world = createWorld(stage.querySelector('canvas'), stage.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; }
  sim.classList.toggle('flat', !world);
  const phone = () => innerWidth <= 760;
  const phase = (p) => { sim.dataset.phase = p; reframe(); };

  function idleState() {
    const labels = { client: ['', '', 'users'] };
    for (let i = 0; i < design.apps; i++) if (i === 0) labels[`app${i}`] = [`× ${design.apps} · ${perSec(APP_CAP * design.apps)} max`];
    if (design.cache) labels.cache0 = [`× ${design.cache} · hit ${Math.round(inc.hitRate * 100)} %`];
    labels.db = [`${perSec(DB_READ)} reads max`];
    if (design.replicas) labels.rep0 = [`× ${design.replicas}`];
    if (design.queue) labels.queue = ['empty'];
    if (design.cdn) labels.cdn = [`${Math.round(inc.staticShare * 100)} % static`];
    return { labels, parts: endParts || {}, speed: 0.5 };
  }
  // phones: the system sits in the band the current stage leaves free (between the bar at the top and the sheet or
  // timeline at the bottom), and is drawn smaller when that band is short, so no part hides behind a panel
  function frameCam() {
    if (!world) return;
    const f = world.frame();
    if (!phone()) { world.setLabelTop(76); world.setCamera({ t: f.t, dist: f.dist * 0.95, az: 40, el: 34, sx: 0.6, sy: 0.47 }); return; }
    const H = innerHeight, vis = (s) => { const e = view.querySelector(s); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; return e.getBoundingClientRect(); };
    const top = Math.max(document.querySelector('.top')?.getBoundingClientRect().bottom || 0, ...['.mhead', '.hud'].map(vis).filter(Boolean).map((r) => r.bottom)) + 8;
    const bottom = Math.min(H, ...['.dock', '.timeline', '.verdict', '.brief'].map(vis).filter(Boolean).map((r) => r.top)) - 8;
    const band = Math.max(120, bottom - top), sy = (top + band / 2) / H;
    world.setLabelTop(Math.max(10, top + 4));
    world.setCamera({ t: f.t, dist: f.dist * Math.max(1.05, Math.min(2.6, (H / band) * 0.5)), az: 40, el: 34, sx: 0.5, sy, phoneSy: sy });
  }
  const reframe = () => requestAnimationFrame(() => requestAnimationFrame(frameCam)); // after the stage's panels have laid out
  function apply() {
    if (world) { world.setSystem(layout(design)); frameCam(); if (!playing) world.setState({ ...idleState(), avoid: phone() ? 0 : 0.27 }); }
    view.querySelectorAll('.part').forEach((p) => {
      const k = p.dataset.k, [lo, hi] = LIMITS[k];
      p.querySelector('output').textContent = design[k];
      p.querySelector('[data-d="-1"]').disabled = design[k] <= lo || !!playing;
      p.querySelector('[data-d="1"]').disabled = design[k] >= hi || !!playing;
      p.classList.toggle('has', design[k] > 0);
    });
    const c = cost(design);
    const cv = $('.c-val'); cv.textContent = rupees(c); cv.classList.toggle('alert', c > inc.budget);
    setTarget('budget', c <= inc.budget, rupees(c));
  }
  function setTarget(k, ok, v) {
    view.querySelectorAll(`[data-check="${k}"]`).forEach((li) => {
      li.classList.toggle('ok', ok === true); li.classList.toggle('bad', ok === false);
      li.querySelector('b').textContent = v;
    });
  }

  view.querySelectorAll('.part button').forEach((b) => b.addEventListener('click', () => {
    const k = b.closest('.part').dataset.k, [lo, hi] = LIMITS[k];
    design[k] = Math.max(lo, Math.min(hi, design[k] + Number(b.dataset.d)));
    endParts = null; hideVerdict(); apply();
  }));

  // the stages
  $('.brief-go').addEventListener('click', () => phase('build'));
  $('.mh-open').addEventListener('click', () => phase('brief'));
  const handle = $('.sheet-handle');
  handle.addEventListener('click', () => { const min = sim.classList.toggle('sheet-min'); handle.setAttribute('aria-expanded', String(!min)); reframe(); });

  // click a part in 3D: what it is, and add or remove one
  const tip = $('.tip');
  world?.onPick((pid) => {
    if (!pid || playing || sim.dataset.phase === 'brief') { tip.hidden = true; return; }
    const k = pid.startsWith('app') ? 'apps' : pid.startsWith('cache') ? 'cache' : pid.startsWith('rep') ? 'replicas' : pid === 'queue' ? 'queue' : pid === 'cdn' ? 'cdn' : null;
    const info = k ? PARTS_INFO[k] : { db: { name: 'Primary database', what: `Takes every write (4k a second) and ${perSec(DB_READ)} reads. Included in the base price.` }, lb: { name: 'Load balancer', what: 'One address for your users; it spreads requests over the app servers. Included.' }, client: { name: 'Users', what: 'Everyone opening the app tonight.' } }[pid];
    if (!info) return;
    tip.innerHTML = `<b>${info.name}</b><p>${info.what}</p>${k ? `<p class="mono">${rupees(PRICE[k])} a month each · you have ${design[k]}</p>` : ''}<button type="button" class="x" aria-label="Close">×</button>`;
    tip.hidden = false;
    tip.querySelector('.x').addEventListener('click', () => { tip.hidden = true; });
  });

  // ---- run ----
  const runBtn = $('.run'), alerts = $('.alerts'), range = $('.tl-range'), tlBtn = $('.tl-btn');
  function liveState(k) {
    const parts = {}, paths = {}, labels = {};
    const uState = (u) => (u > 1 ? 'alert' : u > 0.8 ? 'warn' : 'ok');
    for (let i = 0; i < design.apps; i++) parts[`app${i}`] = uState(k.uApp);
    labels.app0 = [`${perSec(k.R - k.fromCdn)} · ${Math.round(k.uApp * 100)} %`, uState(k.uApp)];
    for (let i = 0; i < design.cache; i++) parts[`cache${i}`] = i >= k.live ? 'alert' : 'ok';
    if (design.cache) {
      if (k.live < design.cache) { labels[`cache${design.cache - 1}`] = ['down', 'alert']; for (let i = 0; i < design.apps; i++) if (i % design.cache === design.cache - 1) paths[`app${i}-cache`] = 'down'; }
      labels.cache0 = [`hit ${Math.round(k.hit * 100)} %`, k.hit < inc.hitRate * 0.8 ? 'warn' : 'ok'];
      if (k.live < design.cache && design.cache - 1 === 0) delete labels.cache0;
    }
    const dbS = k.primaryDown ? 'alert' : uState(k.uDb);
    parts.db = dbS;
    labels.db = k.primaryDown ? ['down', 'alert'] : [`${perSec(k.dbReads)} reads · ${perSec(k.writeOk)} writes`, dbS];
    for (let i = 0; i < design.replicas; i++) parts[`rep${i}`] = k.promoted && i === 0 ? 'ok' : uState(k.uDb);
    if (design.replicas) labels.rep0 = k.promoted ? ['promoted', 'ok', 'new primary'] : [`× ${design.replicas}`, uState(k.uDb)];
    if (design.queue) { parts.queue = k.backlog > 1 ? 'warn' : 'ok'; labels.queue = [k.backlog > 1 ? `holding ${Math.round(k.backlog).toLocaleString('en-IN')}` : 'empty', parts.queue]; }
    if (design.cdn) { parts.cdn = 'ok'; labels.cdn = [`${perSec(k.fromCdn)} answered`, 'ok']; }
    return { parts, paths, labels, speed: 0.5 + Math.min(2.4, k.R / 15000), avoid: phone() ? 0 : 0.27 };
  }
  function toast(text, tone = 'alert') {
    const d = document.createElement('div'); d.className = `alert-toast ${tone}`; d.innerHTML = `<i></i>${esc(text)}`;
    alerts.prepend(d); setTimeout(() => d.classList.add('out'), 3600); setTimeout(() => d.remove(), 4200);
    while (alerts.children.length > (phone() ? 2 : 4)) alerts.lastChild.remove();
  }
  // one moment of the evening on screen: the 3D, the live numbers (errors counted from the start), both charts' heads
  function show(t) {
    const k = result.ticks[t];
    let errSum = 0, total = 0;
    for (let i = 0; i <= t; i++) { errSum += result.ticks[i].err; total += result.ticks[i].R; }
    world?.setState(liveState(k));
    $('.h-time').textContent = clock(t); $('.h-rps').textContent = perSec(k.R);
    const er = $('.h-err'); er.textContent = `${((errSum / total) * 100).toFixed(1)} %`; er.className = `h-err ${errSum / total >= 0.01 ? 'alert' : ''}`;
    const pp = $('.h-p99'); pp.textContent = `${k.p99 >= 9999 ? '> 9,999' : k.p99.toLocaleString('en-IN')} ms`; pp.className = `h-p99 ${k.p99 >= inc.p99 ? 'alert' : ''}`;
    view.querySelectorAll('.spark .head').forEach((head) => {
      const svg = head.ownerSVGElement, w = +svg.viewBox.baseVal.width, x = (t / (inc.length - 1)) * w;
      head.style.display = ''; head.setAttribute('x1', x); head.setAttribute('x2', x);
    });
    range.value = String(t);
    $('.tl-a').textContent = clock(t);
  }
  function markBad(t) {
    if (!(result.ticks[t].errRate > 0.01)) return;
    view.querySelectorAll('.chart svg, .tl-chart svg').forEach((s) => {
      const w = +s.viewBox.baseVal.width, h = +s.viewBox.baseVal.height, n = inc.length - 1, x = (t / n) * w;
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('class', 'bad'); r.setAttribute('x', x - w / n / 2); r.setAttribute('y', 0); r.setAttribute('width', w / n); r.setAttribute('height', h); s.prepend(r);
    });
  }
  let t = 0;
  function start() {
    if (playing) return;
    hideVerdict(); tip.hidden = true; endParts = null;
    result = run(inc, design);
    view.querySelector('.chart').innerHTML = `${sparkline(inc, { w: 300, h: 92 })}<div class="chart-axis mono"><span>${clock(0)}</span><span>${clock(inc.length - 1)}</span></div>`;
    $('.tl-chart').innerHTML = sparkline(inc, { w: 300, h: 56, cls: 'tl' });
    t = 0;
    sim.classList.add('running'); sim.classList.remove('sheet-min');
    phase('run');
    range.disabled = true; tlBtn.textContent = 'Skip to the end'; tlBtn.hidden = false;
    const step = () => {
      const k = result.ticks[t];
      show(t); markBad(t);
      for (const e of inc.events) if (e.at === t) toast(`${clock(t)} · ${e.label}`);
      if (k.promoted && !result.ticks[t - 1]?.promoted) toast(`${clock(t)} · replica promoted to primary`, 'ok');
      if (k.uApp > 1 && !(result.ticks[t - 1]?.uApp > 1)) toast(`${clock(t)} · app servers full`, 'warn');
      if (k.dbReads > k.readCap && !(result.ticks[t - 1] && result.ticks[t - 1].dbReads > result.ticks[t - 1].readCap)) toast(`${clock(t)} · database overloaded`);
      t++;
      if (t >= result.ticks.length) { finish(); return; }
      playing = setTimeout(step, reduced ? 120 : 500);
    };
    playing = setTimeout(step, 50);
    apply();
    runBtn.disabled = true; runBtn.firstChild.textContent = 'Running…';
  }
  function finish() {
    clearTimeout(playing); playing = null;
    // skipped: draw the rest of the evening at once
    for (let i = t; i < result.ticks.length; i++) markBad(i);
    t = result.ticks.length - 1; show(t);
    sim.classList.remove('running');
    runBtn.disabled = false; runBtn.firstChild.textContent = 'Run again';
    for (const c of result.checks) setTarget(c.id, c.ok, c.value);
    store.saveRun(inc.id, result, design);
    endParts = {};
    for (const k of Object.keys(layout(design).parts)) if (!['client', 'lb'].includes(k)) endParts[k] = result.passed ? 'ok' : '';
    range.disabled = false;
    showVerdict();
    apply();
  }
  tlBtn.addEventListener('click', () => { if (playing) finish(); else showVerdict(); });
  // after the run: drag along the evening to see any moment again
  range.addEventListener('input', () => { if (!playing && result) show(Number(range.value)); });

  const verdict = $('.verdict');
  function showVerdict() {
    const r = result;
    const nextInc = INCIDENTS[INCIDENTS.indexOf(inc) + 1];
    verdict.innerHTML = `
      <p class="kicker"><span>${r.passed ? 'Survived' : 'It broke'}</span><i></i>Score ${r.score} of 100</p>
      <h2 class="${r.passed ? 'ok' : 'alert'}">${r.passed ? 'The evening held' : 'The evening did not hold'}</h2>
      <ul class="checks">${r.checks.map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><i></i>${c.label}<b>${c.value}</b></li>`).join('')}</ul>
      ${r.why.length ? `<div class="why"><p class="mono">What happened</p>${r.why.map((w) => `<p>${w.text}${w.lesson && READ[w.lesson] ? ` <a href="#/learn/concepts/${READ[w.lesson][0]}">Read: ${READ[w.lesson][1]} →</a>` : ''}</p>`).join('')}</div>` : '<div class="why"><p>Nothing failed, nothing was wasted. That is the whole job</p></div>'}
      <div class="v-actions">${r.passed && nextInc ? `<a class="btn dark" href="#/sim/${nextInc.id}">Next problem<span class="chip">→</span></a>` : ''}<button type="button" class="btn ${r.passed && nextInc ? 'light' : 'dark'} v-close">${r.passed ? 'Look at the design' : 'Change the design'}</button><button type="button" class="btn light v-replay">Replay the evening</button></div>`;
    verdict.hidden = false; sim.classList.add('verdict-open');
    $('.brief').style.visibility = phone() ? '' : 'hidden';
    phase('done');
    verdict.querySelector('.v-close').addEventListener('click', () => { hideVerdict(); phase('build'); });
    verdict.querySelector('.v-replay').addEventListener('click', () => { verdict.hidden = true; sim.classList.remove('verdict-open'); tlBtn.textContent = 'Back to the verdict'; phase('replay'); range.focus({ preventScroll: true }); });
    verdict.scrollTop = 0;
  }
  function hideVerdict() { verdict.hidden = true; sim.classList.remove('verdict-open'); $('.brief').style.visibility = ''; }
  runBtn.addEventListener('click', start);
  const onResize = () => reframe();
  addEventListener('resize', onResize);
  // wide screens never use the stages: they start building straight away
  if (!phone()) sim.dataset.phase = 'build';
  apply();
  if (world) world.setCamera({ ...world.frame(), az: 40, el: 34, sx: phone() ? 0.5 : 0.6, sy: phone() ? 0.2 : 0.47 }, { instant: true });
  frameCam();
  void go;
  return () => { clearTimeout(playing); removeEventListener('resize', onResize); world?.destroy(); };
}

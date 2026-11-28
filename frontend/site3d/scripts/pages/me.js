// Dashboard: your prep, on this device. The centre is one 3D system whose parts are the 21 concepts: a part turns
// amber when you have started its concepts and green when all are done, so the system you can explain grows
// as you learn. Tap a part (or its row) to open its next concept. No streaks, no badges.
import { solveState } from '../solving.js';
import { createWorld } from '../world-lazy.js';
import { posterHtml, followTheme } from '../story.js';
import { INCIDENTS } from '../sim.js';
import { listArticles, listNow, splitTitle, SECTIONS } from '../articles.js';
import { store } from '../store.js';
import { KIND_PASTEL } from '../palette.js';
import { footer } from './landing.js';
import { PLACES, icon, tally } from '../shell.js';
import { gateNow, watchGate } from '../gating.js';
import { signInCard, wireSignInCard } from '../signin.js';
import { summary, chosenPath } from '../paths.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const P = (kind, x, z, name, concepts, extra = {}) => ({ kind, x, z, name, concepts, ...extra });
/** the system you learn to explain: each part carries the concepts that teach it */
const MAP = {
  users: P('laptop', -2.6, 0.4, 'Users', ['networking-essentials']),
  cdn: P('globe', 0.6, -2.8, 'CDN', ['big-files']),
  gw: P('lb', 1.8, 0.4, 'API gateway', ['api-design']),
  a1: P('server', 5.2, -0.8, 'App servers', ['numbers-to-know', 'contention']),
  a2: P('server', 5.2, 1.6, 'App servers', []),
  cache: P('cache', 8.6, -2.8, 'Cache', ['caching', 'scaling-reads']),
  db: P('db', 9.4, 0.4, 'Database', ['data-modelling', 'database-indexing']),
  shards: P('db', 12.8, -1.6, 'Shards', ['sharding', 'consistent-hashing'], { layers: 2 }),
  rep: P('db', 12.8, 1.8, 'Replica', ['cap-theorem'], { layers: 2 }),
  kafka: P('kafka', 8.8, 4.6, 'Kafka', ['real-time-updates', 'change-capture', 'scaling-writes'], { partitions: 3 }),
  workers: P('consumer', 12.8, 5.2, 'Workers', ['long-jobs', 'workflows']),
  special: P('db', 16, 3.6, 'Special stores', ['nearby-search', 'vector-search', 'time-series', 'sketches'], { layers: 1 }),
};
const SYSTEM = {
  parts: Object.fromEntries(Object.entries(MAP).map(([id, p]) => [id, { kind: p.kind, x: p.x, z: p.z, name: p.name, layers: p.layers, partitions: p.partitions }])),
  paths: { u1: ['users', 'cdn'], u2: ['users', 'gw'], g1: ['gw', 'a1'], g2: ['gw', 'a2'], c1: ['a1', 'cache'], d1: ['a1', 'db'], d2: ['a2', 'db'],
    s: ['db', 'shards'], r: ['db', 'rep'], k: ['a2', 'kafka'], w: ['kafka', 'workers'], x: ['workers', 'special'] },
};
const pd = (kind) => `<i class="pdot" style="--c:var(--${KIND_PASTEL[kind]})" aria-hidden="true"></i>`;

export function mount(view, _p, { reduced, go }) {
  let world = null, alive = true, offWire = null, offGate = null; let offTheme = null;
  // signed out (or not known yet): no progress, no recent work, no counts; the sign-in card stands in their place
  const draw = (list) => {
    const locked = gateNow('personal') !== 'open';
    offWire?.(); offWire = null;
    const { read, best } = locked ? { read: {}, best: {} } : store.get();
    const isRead = (a) => !!read[`${a.section}/${a.slug}`];
    const bySlug = Object.fromEntries(list.filter((a) => a.section === 'concepts').map((a) => [a.slug, a]));
    const concepts = list.filter((a) => a.section === 'concepts');
    const conceptsRead = concepts.filter(isRead).length;
    const nextConcept = concepts.find((a) => !isRead(a));
    const partInfo = (id) => { const cs = MAP[id].concepts.map((s) => bySlug[s]).filter(Boolean); const r = cs.filter(isRead).length; return { cs, r, tone: !cs.length ? '' : r === cs.length ? 'ok' : r ? 'warn' : '' }; };
    const recent = store.recent().map((id) => { const [section, slug] = id.split('/'); return list.find((a) => a.section === section && a.slug === slug); }).filter(Boolean).slice(0, 5);
    const passed = INCIDENTS.filter((i) => best[i.id]?.passed).length;
    const rowsIds = Object.keys(MAP).filter((id) => MAP[id].concepts.length);
    // the canvas is the heart of the site: Home always points at the problem to open next (signed out: the first one, no progress shown)
    const sv = locked ? solveState(list, {}, {}) : solveState(list);
    const solveCard = sv.total ? `<a class="solve-card" href="${sv.next ? `/problems/${esc(sv.next.slug)}` : '/problems'}"><span class="mono">${sv.next ? (sv.started ? 'Continue solving' : 'Solve your first problem') : 'Every problem solved'}${sv.solved ? ` · ${sv.solved} of ${sv.total} solved` : ` · ${sv.total} problems`}</span><b>${esc(sv.next ? splitTitle(sv.next.title)[0] : 'See all problems')}</b><span class="muted">Draw it on the canvas, run the traffic, get judged.</span><span class="go">${sv.next ? (sv.started ? 'Continue' : 'Start') : 'Open'} →</span></a>` : '';
    // your progress, from this browser only: problems solved, best scores, articles read, what to do next, and the test you fail most
    const pg = locked ? null : summary(list, { read, chosen: chosenPath() });
    const progPanel = !pg || !pg.total ? '' : `<section class="prog-panel" aria-label="Your progress">
        <dl class="prog-stats"><div><dt class="mono">Problems solved</dt><dd><b>${pg.solved}</b> of ${pg.total}</dd></div><div><dt class="mono">Articles read</dt><dd><b>${pg.read}</b> of ${pg.articles}</dd></div>
          <div><dt class="mono">Best score${pg.best.length > 1 ? 's' : ''}</dt><dd>${pg.best.length ? pg.best.slice(0, 3).map((b) => `<a href="/problems/${esc(b.a.slug)}" title="${esc(splitTitle(b.a.title)[0])}"><b>${b.score}</b></a>`).join(' · ') : '<span class="muted">none yet</span>'}</dd></div></dl>
        ${pg.next ? `<p class="prog-row"><span class="mono">Next recommended</span><a href="${pg.next.a.section === 'interview-questions' && pg.next.a.group !== 'start' ? `/problems/${esc(pg.next.a.slug)}` : `/learn/${esc(pg.next.a.section)}/${esc(pg.next.a.slug)}`}"><b>${esc(splitTitle(pg.next.a.title)[0])}</b></a><span class="muted">${esc(pg.next.why)}</span></p>` : ''}
        ${pg.weakest ? `<p class="prog-row"><span class="mono">Weakest area</span><a href="/problems/${esc(pg.weakest.slug)}"><b>${esc(pg.weakest.name)}</b></a><span class="muted">failed in ${pg.weakest.count} of your latest submission${pg.weakest.count === 1 ? '' : 's'}</span></p>` : ''}
        ${pg.path ? '' : '<p class="prog-row"><a href="/start"><b>Not sure where to start?</b></a><span class="muted">Pick a path by experience</span></p>'}
      </section>`;
    view.innerHTML = `
    <section class="dash">
      <div class="dash-stage">${posterHtml('home')}<canvas></canvas><div class="overlay" aria-hidden="true"></div></div>
      <div class="dash-copy">
        <div class="dash-head">
        <h1 class="headline"><span class="thin">The system you can explain</span><span class="heavy accent">${conceptsRead ? `${conceptsRead} of ${concepts.length} concepts done` : 'Grows as you learn'}</span></h1></div>
        ${solveCard}
        ${progPanel}
        ${locked ? `<div class="dash-body"><p class="lead">Every part here is taught by a concept. Sign in and it turns amber as you start its concepts and green when you have finished them all.</p>${signInCard('dashboard')}</div>` : `<div class="dash-body"><p class="lead">Every part here is taught by a concept. It turns amber when you start its concepts and green when you have finished them all. Tap a part to open its next concept. Progress is saved on this device.</p>
        ${nextConcept ? `<a class="next-card" href="/learn/concepts/${nextConcept.slug}"><span class="mono">${conceptsRead ? 'Continue' : 'Start here'} · Concept ${(nextConcept.no.match(/\d+/) || [''])[0]}</span><b>${esc(splitTitle(nextConcept.title)[0])}</b><span class="muted">${esc(nextConcept.dek)}</span><span class="go">Start →</span></a>`
          : `<a class="next-card" href="/learn/components"><span class="mono">All concepts done</span><b>Components next</b><span class="muted">The tools interviewers name, and when to pick each.</span><span class="go">Open →</span></a>`}</div>`}
      </div>
    </section>
    ${locked ? '' : `<section class="page dash-more">
      <h2 class="sub-h">Everything here</h2>
      <ul class="places">
        ${PLACES.filter((p) => p.section || p.id === 'practice').map((p, i) => { const t = tally(p.id, list), n = p.id === 'practice' ? INCIDENTS.find((x) => !best[x.id]?.passed) : list.find((a) => a.section === p.id && !isRead(a));
          return `<li style="--c:var(--${p.colour}); --i:${i}"><a class="place" href="${p.href}">
            <span class="place-icon">${icon(p)}</span>
            <span class="place-main"><b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span></span>
            <span class="place-prog"><span class="place-count mono">${t.done} of ${t.total}</span><span class="place-bar"><i style="width:${t.total ? (t.done / t.total) * 100 : 0}%"></i></span></span>
            <span class="place-meta mono">${n ? `Next: ${esc(n.title ? splitTitle(n.title)[0] : '')}` : 'All done'}</span></a></li>`; }).join('')}
      </ul>
      <div class="dash-recent">
        <h2 class="sub-h">Recently completed</h2>
        ${recent.length ? `<ol class="recent">${recent.map((a) => `<li><a href="/learn/${a.section}/${a.slug}"><span class="mono">${esc(SECTIONS.find((s) => s.id === a.section)?.name || '')}</span><b>${esc(splitTitle(a.title)[0])}</b></a></li>`).join('')}</ol>` : '<p class="muted empty">Nothing yet. Articles count once you mark them complete at the end.</p>'}
        <p><button type="button" class="btn light sm reset">Clear my progress</button></p>
      </div>
    </section>`}
    ${footer()}`;
    if (locked) offWire = wireSignInCard(view);

    const resetBtn = view.querySelector('.reset');
    let armTimer = 0;
    resetBtn?.addEventListener('click', () => {
      if (resetBtn.dataset.armed) { clearTimeout(armTimer); store.reset(); draw(list); return; }
      resetBtn.dataset.armed = '1'; resetBtn.textContent = 'Tap again to clear what you have done';
      armTimer = setTimeout(() => { delete resetBtn.dataset.armed; resetBtn.textContent = 'Clear my progress'; }, 4000);
    });
    const stage = view.querySelector('.dash-stage');
    offTheme?.(); offTheme = followTheme(stage);
    world?.destroy(); world = null;
    try { world = createWorld(stage.querySelector('canvas'), stage.querySelector('.overlay'), { reduced, label: 'Your system, part by part. Tap a part to open its next concept; the list under it does the same.', onFail: () => stage.classList.add('flat') }); } catch { world = null; }
    stage.classList.toggle('flat', !world);
    if (!world) return;
    world.setSystem(SYSTEM);
    const f = world.frame(), phone = innerWidth < 1000; // tablets stack the figure under the words, like phones
    world.setCamera({ t: f.t, dist: f.dist * (phone ? (innerWidth < 380 ? 0.86 : 0.78) : 0.9), az: 40, el: 34, sx: phone ? 0.5 : (innerWidth >= 1700 ? 0.74 : 0.7), sy: phone ? 0.4 : 0.54, phoneSy: 0.47 }, { instant: true });
    world.setLabelBand(phone ? 0.98 : 0.94); world.setLabelTop(10); world.setLabelMode(phone ? 'edge' : 'free');
    const parts = {}, labels = {};
    for (const id of rowsIds) { const { cs, r, tone } = partInfo(id); parts[id] = tone; labels[id] = [innerWidth < 380 ? '' : `${r}/${cs.length}`, tone]; /* 320 px phones: counts live in the list below, so the pills stay short */ }
    parts.a2 = parts.a1;
    // wide screens: every label stays, but none may sit left of the intro text's right edge (the laptop's "Users" pill shifts right instead of over the words)
    world.setLabelMinX(phone ? 0 : (view.querySelector('.dash-body')?.getBoundingClientRect().right || 0) + 8 - stage.getBoundingClientRect().left); // overlay coordinates start at the stage's left edge
    world.setState({ parts, labels, speed: 0.6 + (conceptsRead / Math.max(1, concepts.length)) * 1.4 });
    world.onPick((id) => {
      const key = id === 'a2' ? 'a1' : id;
      if (!key || !MAP[key]?.concepts.length) return;
      const { cs } = partInfo(key);
      const a = cs.find((x) => !isRead(x)) || cs[0];
      if (a) go(`/learn/concepts/${a.slug}`);
    });
  };
  const first = listNow();
  draw(first);
  listArticles().then((l) => { if (alive && JSON.stringify(l) !== JSON.stringify(first)) draw(l); });
  offGate = watchGate('personal', () => { if (alive) window.tkRefresh?.(); });
  return () => { alive = false; offGate?.(); offWire?.(); offTheme?.(); world?.destroy(); };
}

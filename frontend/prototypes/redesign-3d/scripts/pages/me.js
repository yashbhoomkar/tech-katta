// Dashboard: your prep, on this device. The centre is one 3D system whose parts are the 21 concepts: a part turns
// amber when you have started its concepts and green when you have read them all, so the system you can explain grows
// as you learn. Tap a part (or its row) to open its next concept. No streaks, no badges.
import { createWorld } from '../world.js';
import { INCIDENTS } from '../sim.js';
import { listArticles, listNow, splitTitle, SECTIONS } from '../articles.js';
import { store } from '../store.js';
import { KIND_PASTEL } from '../palette.js';
import { footer } from './landing.js';
import { PLACES, icon, tally } from '../shell.js';

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
const pd = (kind) => `<i class="pd" style="--c:var(--${KIND_PASTEL[kind]})" aria-hidden="true"></i>`;

export function mount(view, _p, { reduced, go }) {
  let world = null, alive = true;
  const draw = (list) => {
    const { read, best } = store.get();
    const isRead = (a) => !!read[`${a.section}/${a.slug}`];
    const bySlug = Object.fromEntries(list.filter((a) => a.section === 'concepts').map((a) => [a.slug, a]));
    const concepts = list.filter((a) => a.section === 'concepts');
    const conceptsRead = concepts.filter(isRead).length;
    const nextConcept = concepts.find((a) => !isRead(a));
    const partInfo = (id) => { const cs = MAP[id].concepts.map((s) => bySlug[s]).filter(Boolean); const r = cs.filter(isRead).length; return { cs, r, tone: !cs.length ? '' : r === cs.length ? 'ok' : r ? 'warn' : '' }; };
    const recent = store.recent().map((id) => { const [section, slug] = id.split('/'); return list.find((a) => a.section === section && a.slug === slug); }).filter(Boolean).slice(0, 5);
    const passed = INCIDENTS.filter((i) => best[i.id]?.passed).length;
    const rowsIds = Object.keys(MAP).filter((id) => MAP[id].concepts.length);
    view.innerHTML = `
    <section class="dash">
      <div class="dash-stage" aria-hidden="true"><canvas></canvas><div class="overlay"></div></div>
      <div class="dash-copy">
        <div class="dash-head"><p class="kicker"><span>Dashboard</span><i></i>On this device</p>
        <h1 class="headline"><span class="thin">The system you can explain</span><span class="heavy accent">${conceptsRead ? `${conceptsRead} of ${concepts.length} concepts read` : 'Grows as you learn'}</span></h1></div>
        <div class="dash-body"><p class="lead">Every part here is taught by a concept. It turns amber when you start its concepts and green when you have read them all. Tap a part to open its next one.</p>
        ${nextConcept ? `<a class="next-card" href="#/learn/concepts/${nextConcept.slug}"><span class="mono">${conceptsRead ? 'Continue' : 'Start here'} · Concept ${(nextConcept.no.match(/\d+/) || [''])[0]}</span><b>${esc(splitTitle(nextConcept.title)[0])}</b><span class="muted">${esc(nextConcept.dek)}</span><span class="go">Play the story →</span></a>`
          : `<a class="next-card" href="#/learn/components"><span class="mono">All concepts read</span><b>Components next</b><span class="muted">The tools interviewers name, and when to pick each.</span><span class="go">Open →</span></a>`}</div>
      </div>
    </section>
    <section class="page dash-more">
      <h2 class="sub-h">Everything here</h2>
      <div class="deck" role="list">
        ${PLACES.filter((p) => p.id !== 'me').map((p, i) => { const t = tally(p.id, list), n = p.id === 'practice' ? INCIDENTS.find((x) => !best[x.id]?.passed) : list.find((a) => a.section === p.id && !isRead(a));
          return `<a class="place" role="listitem" href="${p.href}" style="--c:var(--${p.colour}); --i:${i}">
            <span class="place-icon">${icon(p)}</span><b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span>
            <span class="place-bar"><i style="width:${t.total ? (t.done / t.total) * 100 : 0}%"></i></span>
            <span class="place-meta mono">${t.done} of ${t.total}${n ? ` · next: ${esc(n.title ? splitTitle(n.title)[0] : '')}` : ''}</span></a>`; }).join('')}
      </div>
      <p class="deck-dots" aria-hidden="true">${PLACES.filter((p) => p.id !== 'me').map(() => '<i></i>').join('')}</p>
      <div class="dash-grid">
        <div>
          <h2 class="sub-h">Recently read</h2>
          ${recent.length ? `<ol class="recent">${recent.map((a) => `<li><a href="#/learn/${a.section}/${a.slug}"><span class="mono">${esc(SECTIONS.find((s) => s.id === a.section)?.name || '')}</span><b>${esc(splitTitle(a.title)[0])}</b></a></li>`).join('')}</ol>` : '<p class="muted empty">Nothing yet. Articles count once you mark them complete at the end.</p>'}
        </div>
        <div>
          <h2 class="sub-h">Parts and their concepts</h2>
          <ul class="parts-map">
            ${rowsIds.map((id) => { const { cs, r, tone } = partInfo(id); return `<li data-part="${id}" class="${tone}"><div class="pm-head">${pd(MAP[id].kind)}<b>${esc(MAP[id].name)}</b><span class="mono pm-v ${tone}">${r} / ${cs.length}</span></div>
              <p>${cs.map((a) => `<a href="#/learn/concepts/${a.slug}" class="${isRead(a) ? 'done' : ''}">${isRead(a) ? '✓ ' : ''}${esc(splitTitle(a.title)[0])}</a>`).join('')}</p></li>`; }).join('')}
          </ul>
          <p><button type="button" class="btn light sm reset">Clear my progress</button></p>
        </div>
      </div>
    </section>
    ${footer()}`;

    const deck = view.querySelector('.deck'), dots = [...view.querySelectorAll('.deck-dots i')];
    const onDeck = () => { const w = deck.firstElementChild?.offsetWidth || 1; const k = Math.round(deck.scrollLeft / (w + 12)); dots.forEach((d, j) => d.classList.toggle('on', j === k)); };
    deck.addEventListener('scroll', onDeck, { passive: true }); onDeck();
    view.querySelector('.reset').addEventListener('click', () => { if (confirm('Clear what you have read and run on this device?')) { store.reset(); draw(list); } });
    const stage = view.querySelector('.dash-stage');
    world?.destroy(); world = null;
    try { world = createWorld(stage.querySelector('canvas'), stage.querySelector('.overlay'), { reduced }); } catch { world = null; }
    stage.classList.toggle('flat', !world);
    if (!world) return;
    world.setSystem(SYSTEM);
    const f = world.frame(), phone = innerWidth <= 760;
    world.setCamera({ t: f.t, dist: f.dist * (phone ? 0.6 : 0.9), az: 40, el: 34, sx: phone ? 0.5 : 0.66, sy: phone ? 0.52 : 0.54 }, { instant: true });
    world.setLabelBand(phone ? 0.98 : 0.94);
    const parts = {}, labels = {};
    for (const id of rowsIds) { const { cs, r, tone } = partInfo(id); parts[id] = tone; labels[id] = [`${r}/${cs.length}`, tone]; }
    parts.a2 = parts.a1;
    world.setState({ parts, labels, speed: 0.6 + (conceptsRead / Math.max(1, concepts.length)) * 1.4 });
    world.onPick((id) => {
      const key = id === 'a2' ? 'a1' : id;
      if (!key || !MAP[key]?.concepts.length) return;
      const { cs } = partInfo(key);
      const a = cs.find((x) => !isRead(x)) || cs[0];
      if (a) go(`#/learn/concepts/${a.slug}`);
    });
  };
  const first = listNow();
  draw(first);
  listArticles().then((l) => { if (alive && JSON.stringify(l) !== JSON.stringify(first)) draw(l); });
  return () => { alive = false; world?.destroy(); };
}

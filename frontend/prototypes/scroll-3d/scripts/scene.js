// The isometric scene: a URL shortener drawn as one SVG, with a camera that moves per chapter.
// World units: x runs down-right, y runs down-left, z runs up. iso() turns a world point into screen pixels.
// Everything is drawn once; a chapter only changes classes, labels and the camera transform.

const NS = 'http://www.w3.org/2000/svg';
const U = 46;
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
export const iso = (x, y, z = 0) => [(x - y) * U * C30, (x + y) * U * S30 - z * U];

const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const pts = (list) => list.map((p) => iso(...p).map((v) => v.toFixed(1)).join(',')).join(' ');

// ---- the system -------------------------------------------------------------------------------------------------
const PARTS = {
  client:  { kind: 'laptop', x: 0,    y: 5,    name: 'clients' },
  cdn:     { kind: 'globe',  x: 2.6,  y: 3.9,  name: 'edge' },
  lb:      { kind: 'flat',   x: 5,    y: 3,    name: 'load balancer' },
  api1:    { kind: 'server', x: 7.6,  y: 0.6,  name: 'api' },
  api2:    { kind: 'server', x: 7.6,  y: 3,    name: 'api' },
  api3:    { kind: 'server', x: 7.6,  y: 5.4,  name: 'api' },
  ids:     { kind: 'small',  x: 10.2, y: 6.2,  name: 'ids' },
  cache:   { kind: 'cache',  x: 11,   y: 0.2,  name: 'cache' },
  cache2:  { kind: 'cache',  x: 11,   y: -2.2, name: 'cache' },
  db:      { kind: 'db',     x: 12.4, y: 3.4,  name: 'db' },
  replica: { kind: 'db',     x: 15,   y: 3.4,  name: 'replica', layers: 2 },
};
const PATHS = {
  in:       ['client', 'cdn'],
  edge:     ['cdn', 'lb'],
  lb1:      ['lb', 'api1'],
  lb2:      ['lb', 'api2'],
  lb3:      ['lb', 'api3'],
  c1:       ['api1', 'cache'],
  c2:       ['api2', 'cache'],
  d2:       ['api2', 'db'],
  d3:       ['api3', 'db'],
  i3:       ['api3', 'ids'],
  c1b:      ['api1', 'cache2'],
  rep:      ['db', 'replica'],
};

// ---- what each chapter shows --------------------------------------------------------------------------------------
// part classes: alert | ok | hidden | dim. path classes: down | hot | ok | hidden. label: [value, tone].
const BASE_LABELS = { cdn: ['cdn · waf'], api2: ['× 3 · p99 38 ms'], ids: ['snowflake'] };
const CHAPTERS = [
  { cam: { at: [8, 3], zoom: 0.74, sx: 0.5, sy: 0.86 }, speed: 0.10,
    parts: { cache2: 'hidden', replica: 'hidden' }, paths: { c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['hit 94 %'], db: ['420 req/s'] } },
  { cam: { at: [8.6, 2.6], zoom: 0.95, sx: 0.7, sy: 0.55 }, speed: 0.34,
    parts: { cache2: 'hidden', replica: 'hidden' }, paths: { c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['37,600 hits/s'], db: ['2,400 req/s'], api2: ['× 3 · p99 38 ms', 'ok'] } },
  { cam: { at: [10.8, 2.4], zoom: 1.15, sx: 0.7, sy: 0.55 }, speed: 0.34, sev: true,
    parts: { cache: 'alert', db: 'alert', cache2: 'hidden', replica: 'hidden' },
    paths: { c1: 'down', c2: 'down', d2: 'hot', d3: 'hot', c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['down', 'alert'], db: ['37,600 req/s · overloaded', 'alert'], api2: ['× 3 · p99 2,000 ms', 'alert'] } },
  { cam: { at: [12.4, 3.2], zoom: 1.4, sx: 0.66, sy: 0.62, phoneAt: [13.9, 2.7] }, speed: 0.2, explode: true, logs: true,
    parts: { cache: 'alert', db: 'alert', cache2: 'hidden', replica: 'hidden', client: 'dim', cdn: 'dim', lb: 'dim', api1: 'dim', api3: 'dim', ids: 'dim' },
    paths: { c1: 'down', c2: 'down', d2: 'hot', d3: 'hot', c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['down', 'alert'], db: null, api2: null } },
  { cam: { at: [11.6, 2.2], zoom: 1.0, sx: 0.7, sy: 0.55 }, speed: 0.28,
    parts: { cache: 'ok', cache2: 'ok', db: 'ok', replica: 'ok' },
    paths: { c1: 'ok', c2: 'ok', d2: 'ok', d3: 'ok', c1b: 'ok', rep: 'ok' },
    labels: { cache: ['restored', 'ok'], cache2: ['new node', 'ok'], db: ['1,200 req/s · healthy', 'ok'], replica: ['1,100 req/s', 'ok'], api2: ['× 3 · p99 41 ms', 'ok'] } },
  { cam: { at: [8.5, 2], zoom: 0.5, sx: 0.5, sy: 0.9 }, speed: 0.14,
    parts: { cache: 'ok', cache2: 'ok', db: 'ok', replica: 'ok' },
    paths: { c1: 'ok', c2: 'ok', d2: 'ok', d3: 'ok', c1b: 'ok', rep: 'ok' },
    labels: {} },
];

// ---- shapes ---------------------------------------------------------------------------------------------------------
function box(g, x, y, w, d, z0, h, cls = '') {
  const z1 = z0 + h;
  el('polygon', { class: `left ${cls}`, points: pts([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]) }, g);
  el('polygon', { class: `right ${cls}`, points: pts([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]) }, g);
  el('polygon', { class: `top ${cls}`, points: pts([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]]) }, g);
}
function shade(g, x, y, r = 1) {
  const [cx, cy] = iso(x, y);
  el('ellipse', { class: 'shade', cx, cy: cy + 4, rx: r * U * 1.25, ry: r * U * 0.62, opacity: 0.5 }, g);
}
function disc(g, cx, cy, z, h, r) {
  const rx = r * U * 1.2247, ry = r * U * 0.7071;
  const [px, pyb] = iso(cx, cy, z), pyt = pyb - h * U;
  el('path', { class: 'left', d: `M${px - rx},${pyt} L${px - rx},${pyb} A${rx},${ry} 0 0 0 ${px + rx},${pyb} L${px + rx},${pyt} A${rx},${ry} 0 0 1 ${px - rx},${pyt} Z` }, g);
  el('ellipse', { class: 'top', cx: px, cy: pyt, rx, ry }, g);
}

function drawPart(layer, id, p) {
  const g = el('g', { class: 'part', 'data-part': id }, layer);
  const { x, y } = p;
  if (p.kind === 'server') {
    shade(g, x, y, 0.95);
    for (let i = 0; i < 3; i++) {
      box(g, x - 0.7, y - 0.7, 1.4, 1.4, i * 0.42, 0.32);
      const [a, b] = [iso(x + 0.7, y - 0.35, i * 0.42 + 0.16), iso(x + 0.7, y + 0.1, i * 0.42 + 0.16)];
      el('line', { class: 'mark', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, g);
    }
    p.top = 3 * 0.42;
  } else if (p.kind === 'cache') {
    shade(g, x, y, 0.85);
    box(g, x - 0.6, y - 0.6, 1.2, 1.2, 0, 0.7);
    const [cx, cy] = iso(x, y, 0.7);
    el('path', { class: 'mark', d: `M${cx + 3},${cy - 9} L${cx - 5},${cy + 1} L${cx + 2},${cy + 1} L${cx - 3},${cy + 9}` }, g);
    el('ellipse', { class: 'ring', cx, cy: iso(x, y)[1], rx: U * 1.3, ry: U * 0.65 }, g);
    p.top = 0.7;
  } else if (p.kind === 'db') {
    shade(g, x, y, 0.9);
    const n = p.layers || 3;
    for (let i = 0; i < n; i++) {
      const lg = el('g', { class: 'layer', 'data-layer': i }, g);
      disc(lg, x, y, i * 0.44, 0.36, 0.78);
    }
    if (!p.layers) el('ellipse', { class: 'ring', cx: iso(x, y)[0], cy: iso(x, y)[1], rx: U * 1.4, ry: U * 0.7 }, g);
    p.top = n * 0.44;
  } else if (p.kind === 'globe') {
    shade(g, x, y, 0.7);
    const [cx, cy] = iso(x, y, 0.75);
    el('circle', { class: 'top', cx, cy, r: U * 0.62 }, g);
    el('ellipse', { class: 'mark', cx, cy, rx: U * 0.62, ry: U * 0.2, style: 'stroke: var(--blk-edge)' }, g);
    el('ellipse', { class: 'mark', cx, cy, rx: U * 0.24, ry: U * 0.62, style: 'stroke: var(--blk-edge)' }, g);
    p.top = 1.4;
  } else if (p.kind === 'laptop') {
    shade(g, x, y, 0.8);
    box(g, x - 0.8, y - 0.55, 1.6, 1.1, 0, 0.08);
    el('polygon', { class: 'left', points: pts([[x - 0.8, y - 0.55, 0.08], [x + 0.8, y - 0.55, 0.08], [x + 0.8, y - 0.55, 1.0], [x - 0.8, y - 0.55, 1.0]]) }, g);
    p.top = 1.0;
  } else if (p.kind === 'flat') {
    shade(g, x, y, 0.8);
    box(g, x - 0.75, y - 0.75, 1.5, 1.5, 0, 0.22);
    const [cx, cy] = iso(x, y, 0.22);
    el('path', { class: 'mark', d: `M${cx - 12},${cy - 2} L${cx + 12},${cy - 2} M${cx + 7},${cy - 6} L${cx + 12},${cy - 2} L${cx + 7},${cy + 2}` }, g);
    p.top = 0.22;
  } else {
    shade(g, x, y, 0.55);
    box(g, x - 0.45, y - 0.45, 0.9, 0.9, 0, 0.5);
    p.top = 0.5;
  }
  p.g = g;
}

// An L-shaped path along the grid, from part a to part b.
function route(a, b) { return [[a.x, a.y], [b.x, a.y], [b.x, b.y]]; }
function pathD(r) { return 'M' + r.map(([x, y]) => iso(x, y).map((v) => v.toFixed(1)).join(',')).join(' L'); }

function pill(layer, id) {
  const g = el('g', { class: 'pill', 'data-pill': id }, layer);
  el('rect', { rx: 11, height: 22 }, g);
  el('circle', { class: 'led', r: 3, cx: 12, cy: 11 }, g);
  const t = el('text', { x: 21, y: 15 }, g);
  el('tspan', { class: 'name' }, t);
  el('tspan', { class: 'v', dx: 6 }, t);
  return g;
}

// ---- the scene object -----------------------------------------------------------------------------------------------
export function createScene(svg, { reduced }) {
  const cam = el('g', { class: 'cam' }, svg);
  const grid = el('g', {}, cam);
  let d = '', dm = '';
  for (let i = -24; i <= 40; i++) {
    const a = iso(i, -24), b = iso(i, 40), c = iso(-24, i), e = iso(40, i);
    const line = `M${a[0]},${a[1]} L${b[0]},${b[1]} M${c[0]},${c[1]} L${e[0]},${e[1]} `;
    if (i % 4 === 0) dm += line; else d += line;
  }
  el('path', { class: 'grid', d }, grid);
  el('path', { class: 'grid-major', d: dm }, grid);

  const pathLayer = el('g', {}, cam);
  const reqLayer = el('g', {}, cam);
  const partLayer = el('g', {}, cam);
  const labelLayer = el('g', {}, cam);

  // parts, drawn back to front so nearer blocks overlap farther ones
  Object.entries(PARTS).sort(([, a], [, b]) => (a.x + a.y) - (b.x + b.y)).forEach(([id, p]) => drawPart(partLayer, id, p));

  const paths = {};
  for (const [id, [a, b]] of Object.entries(PATHS)) {
    const r = route(PARTS[a], PARTS[b]);
    const node = el('path', { class: 'path', d: pathD(r) }, pathLayer);
    const segs = [];
    let len = 0;
    for (let i = 1; i < r.length; i++) {
      const p0 = iso(...r[i - 1]), p1 = iso(...r[i]), l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      segs.push({ p0, p1, l }); len += l;
    }
    const count = Math.max(2, Math.round(len / 70));
    const dots = Array.from({ length: count }, (_, k) => ({ t: k / count, n: el('circle', { class: 'req', r: 2.6 }, reqLayer) }));
    paths[id] = { node, segs, len, dots };
  }

  const pills = {};
  for (const id of Object.keys(PARTS)) pills[id] = pill(labelLayer, id);

  // the SEV-1 tag over the cache
  const sev = el('g', { class: 'sev hidden' }, labelLayer);
  el('rect', { rx: 11, height: 22, width: 104 }, sev);
  el('text', { x: 12, y: 15 }, sev).textContent = '▲ Alert · SEV-1';

  // chapter 3: readings beside the database layers, and log lines
  const db = PARTS.db;
  const readings = el('g', { class: 'reading hidden' }, labelLayer);
  const readingText = [['L2', 'queries', '37,600 /s'], ['L1', 'connections', '500 / 500'], ['L0', 'disk', '98 % busy']];
  readingText.forEach(([lv, k, v], i) => {
    const g = el('g', { 'data-row': i }, readings);
    el('rect', { rx: 6, height: 24, width: 196 }, g);
    const t = el('text', { x: 10, y: 16 }, g);
    el('tspan', { fill: 'var(--ink-3)' }, t).textContent = `${lv}  `;
    el('tspan', {}, t).textContent = `${k}  `;
    el('tspan', { class: 'v' }, t).textContent = v;
  });
  const logs = el('g', { class: 'logs hidden' }, labelLayer);
  [['20:14:02', 'cache', 'ERROR node unreachable'], ['20:14:03', 'api', 'WARN cache miss → db'], ['20:14:07', 'db', 'WARN too many connections'], ['20:14:09', 'api', 'ERROR upstream timeout 2000 ms'], ['20:14:11', 'lb', 'WARN 5xx rate 31 %']]
    .forEach(([ts, who, msg], i) => {
      const t = el('text', { y: i * 17 }, logs);
      el('tspan', {}, t).textContent = `${ts}  ${who.padEnd(5)} `;
      el('tspan', { class: /ERROR|WARN/.test(msg) ? 'warn' : '' }, t).textContent = msg;
    });

  // ---- placing labels (screen space, upright) ----
  function placePill(id, value, tone) {
    const g = pills[id], p = PARTS[id];
    if (value === null || value === undefined) { g.classList.add('hidden'); return; }
    g.classList.remove('hidden', 'alert', 'ok');
    if (tone) g.classList.add(tone);
    const [name, v] = g.querySelectorAll('tspan');
    name.textContent = p.name; v.textContent = value;
    const w = 21 + p.name.length * 7.2 + 6 + value.length * 6.7 + 12;
    g.querySelector('rect').setAttribute('width', w.toFixed(0));
    const [sx, sy] = iso(p.x, p.y, p.top);
    g.setAttribute('transform', `translate(${(sx - w / 2).toFixed(1)},${(sy - 40).toFixed(1)})`);
  }

  let chapter = -1, speed = 0.1, W = 0, H = 0;
  function layout() {
    W = svg.clientWidth; H = svg.clientHeight;
    if (chapter >= 0) moveCam(CHAPTERS[chapter].cam);
  }
  function moveCam({ at: atDesk, zoom, sx, sy, phoneAt }) {
    const phone = W <= 760;
    const at = phone && phoneAt ? phoneAt : atDesk;
    const base = phone ? Math.min(W / 760, H / 520) : Math.min(W / 1440, H / 900) * 1.08;
    const s = zoom * base * (phone ? 1.05 : 1);
    const [fx, fy] = iso(at[0], at[1], 0.6);
    const tx = (phone ? 0.5 : sx) * W - fx * s, ty = (phone ? 0.56 : sy) * H - fy * s;
    cam.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${s.toFixed(3)})`;
  }

  function setChapter(n) {
    if (n === chapter) return;
    chapter = n;
    const c = CHAPTERS[n];
    speed = c.speed;
    for (const [id, p] of Object.entries(PARTS)) {
      p.g.classList.remove('alert', 'ok', 'hidden', 'dim');
      const cls = c.parts?.[id];
      if (cls) p.g.classList.add(cls);
    }
    for (const [id, p] of Object.entries(paths)) {
      p.node.classList.remove('down', 'hot', 'ok', 'hidden');
      const cls = c.paths?.[id];
      if (cls) p.node.classList.add(cls);
      p.state = cls || '';
      for (const dot of p.dots) {
        dot.n.setAttribute('class', `req ${cls === 'hot' ? 'hot' : cls === 'ok' ? 'ok' : ''}`);
        dot.n.style.display = cls === 'down' || cls === 'hidden' ? 'none' : '';
      }
    }
    const labels = { ...BASE_LABELS, ...c.labels };
    for (const id of Object.keys(PARTS)) {
      const hidden = c.parts?.[id] === 'hidden' || c.parts?.[id] === 'dim';
      const l = labels[id];
      if (hidden || !l || id === 'api1' || id === 'api3' || id === 'client') placePill(id, null);
      else placePill(id, l[0], l[1]);
    }
    // the SEV tag sits above the cache
    sev.classList.toggle('hidden', !c.sev);
    sev.classList.toggle('on', !!c.sev && !reduced);
    const [kx, ky] = iso(PARTS.cache.x, PARTS.cache.y, PARTS.cache.top);
    sev.setAttribute('transform', `translate(${(kx - 52).toFixed(1)},${(ky - 70).toFixed(1)})`);
    // the database pulls apart, and its readings and the logs appear
    const layers = PARTS.db.g.querySelectorAll('.layer');
    layers.forEach((lg, i) => { lg.style.transform = c.explode ? `translateY(${-i * 30}px)` : ''; });
    const [dx, dy] = iso(db.x, db.y, 0);
    readings.querySelectorAll('[data-row]').forEach((r, i) => {
      const layerY = dy - (2 - i) * 0.44 * U - (2 - i) * 30 - 30;
      r.setAttribute('transform', `translate(${(dx + 64).toFixed(1)},${layerY.toFixed(1)})`);
    });
    readings.classList.toggle('hidden', !c.explode);
    logs.setAttribute('transform', `translate(${(dx - 120).toFixed(1)},${(dy - 300).toFixed(1)})`);
    logs.classList.toggle('hidden', !c.logs);
    moveCam(c.cam);
  }

  // ---- moving requests ----
  function placeDots() {
    for (const p of Object.values(paths)) {
      if (p.state === 'down' || p.state === 'hidden') continue;
      for (const dot of p.dots) {
        let at = dot.t * p.len;
        for (const s of p.segs) {
          if (at <= s.l) {
            const k = at / s.l;
            dot.n.setAttribute('cx', (s.p0[0] + (s.p1[0] - s.p0[0]) * k).toFixed(1));
            dot.n.setAttribute('cy', (s.p0[1] + (s.p1[1] - s.p0[1]) * k).toFixed(1));
            break;
          }
          at -= s.l;
        }
      }
    }
  }
  let last = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    for (const p of Object.values(paths)) {
      const v = (speed * 300) / p.len;
      for (const dot of p.dots) dot.t = (dot.t + v * dt) % 1;
    }
    placeDots();
    requestAnimationFrame(tick);
  }

  layout();
  addEventListener('resize', layout);
  setChapter(0);
  if (reduced) placeDots(); else requestAnimationFrame(tick);
  return { setChapter, count: CHAPTERS.length };
}

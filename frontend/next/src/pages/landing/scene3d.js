// The scroll story's scene in real 3D (WebGL, three.js vendored in ./vendor: the site's CSP allows only same-site
// scripts). A URL shortener on a perspective grid: translucent stacked servers, a cache, a database of discs, soft
// shadows, fog that melts the far grid into the page, and a camera that glides between chapters as you scroll.
// Labels, readings and log lines are HTML laid over the canvas (crisp text at any zoom).
// createScene3d returns null when WebGL is not available (Story3d.tsx then shows the story without the scene).
// Ported from frontend/prototypes/scroll-3d/scripts/scene3d.js; this copy adds destroy() for the single-page app.
import * as THREE from 'three';

// ---- the system (world units; x right-down, z left-down on screen, y up) -----------------------------------------
const C = { x: 7.5, z: 2 };
const at = (x, z) => [x - C.x, z - C.z];
const PARTS = {
  client:  { kind: 'laptop', p: at(0, 5),     name: 'clients' },
  cdn:     { kind: 'globe',  p: at(2.6, 3.9), name: 'edge' },
  lb:      { kind: 'lb',     p: at(5, 3),     name: 'load balancer' },
  api1:    { kind: 'server', p: at(7.6, 0.6), name: 'api' },
  api2:    { kind: 'server', p: at(7.6, 3),   name: 'api' },
  api3:    { kind: 'server', p: at(7.6, 5.4), name: 'api' },
  ids:     { kind: 'small',  p: at(10.2, 6.2), name: 'ids' },
  cache:   { kind: 'cache',  p: at(11, 0.2),  name: 'cache' },
  cache2:  { kind: 'cache',  p: at(11, -2.2), name: 'cache' },
  db:      { kind: 'db',     p: at(12.4, 3.4), name: 'db' },
  replica: { kind: 'db',     p: at(15, 3.4),  name: 'replica', layers: 2 },
};
const PATHS = {
  in: ['client', 'cdn'], edge: ['cdn', 'lb'], lb1: ['lb', 'api1'], lb2: ['lb', 'api2'], lb3: ['lb', 'api3'],
  c1: ['api1', 'cache'], c2: ['api2', 'cache'], d2: ['api2', 'db'], d3: ['api3', 'db'], i3: ['api3', 'ids'],
  c1b: ['api1', 'cache2'], rep: ['db', 'replica'],
};

// ---- the chapters: camera and state ------------------------------------------------------------------------------
// cam: target [x, z], dist, az/el in degrees, where the target sits on screen (sx, sy, 0..1); phone: its own target/dist
const BASE_LABELS = { cdn: ['cdn · waf'], api2: ['× 3 · p99 38 ms'], ids: ['snowflake'] };
const CHAPTERS = [
  { cam: { t: [0.4, 0.6], dist: 54, az: 45, el: 27, sx: 0.5, sy: 0.9 }, speed: 0.5,
    parts: { cache2: 'hidden', replica: 'hidden' }, paths: { c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['hit 94 %'], db: ['420 req/s'] } },
  { cam: { t: [-0.4, 0.6], dist: 33, az: 47, el: 33, sx: 0.68, sy: 0.54 }, speed: 1.4,
    parts: { cache2: 'hidden', replica: 'hidden' }, paths: { c1b: 'hidden', rep: 'hidden' },
    labels: { cache: ['37,600 hits/s'], db: ['2,400 req/s'], api2: ['× 3 · p99 38 ms', 'ok'] } },
  { cam: { t: [3.2, 0.2], dist: 24, az: 40, el: 32, sx: 0.68, sy: 0.54 }, speed: 1.4, sev: true,
    parts: { cache: 'alert', db: 'alert', cache2: 'hidden', replica: 'hidden', client: 'dim', cdn: 'dim' },
    paths: { c1: 'down', c2: 'down', d2: 'hot', d3: 'hot', c1b: 'hidden', rep: 'hidden', in: 'dim', edge: 'dim' },
    labels: { cache: ['down', 'alert'], db: ['37,600 req/s · overloaded', 'alert'], api2: ['× 3 · p99 2,000 ms', 'alert'] } },
  { cam: { t: [4.9, 1.4], dist: 18, az: 34, el: 23, sx: 0.64, sy: 0.6, phone: { t: [5.6, 1.0], dist: 19 } }, speed: 0.8, explode: true, logs: true,
    parts: { cache: 'alert', db: 'alert', cache2: 'hidden', replica: 'hidden', client: 'dim', cdn: 'dim', lb: 'dim', api1: 'dim', api3: 'dim', ids: 'dim', api2: 'dim' },
    paths: { c1: 'down', c2: 'down', d2: 'hot', d3: 'hot', c1b: 'hidden', rep: 'hidden', in: 'dim', edge: 'dim', lb1: 'dim', lb2: 'dim', lb3: 'dim', i3: 'dim' },
    labels: { cache: ['down', 'alert'], db: null, api2: null } },
  { cam: { t: [4.6, -0.2], dist: 26, az: 52, el: 36, sx: 0.68, sy: 0.54 }, speed: 1.1,
    parts: { cache: 'ok', cache2: 'ok', db: 'ok', replica: 'ok', client: 'dim', cdn: 'dim' },
    paths: { c1: 'ok', c2: 'ok', d2: 'ok', d3: 'ok', c1b: 'ok', rep: 'ok', in: 'dim', edge: 'dim' },
    labels: { cache: ['restored', 'ok'], cache2: ['new node', 'ok'], db: ['1,200 req/s · healthy', 'ok'], replica: ['1,100 req/s', 'ok'], api2: ['× 3 · p99 41 ms', 'ok'] } },
  { cam: { t: [0.6, 0.0], dist: 62, az: 45, el: 46, sx: 0.5, sy: 0.84 }, speed: 0.5,
    parts: { cache: 'ok', cache2: 'ok', db: 'ok', replica: 'ok' },
    paths: { c1: 'ok', c2: 'ok', d2: 'ok', d3: 'ok', c1b: 'ok', rep: 'ok' },
    labels: {} },
];

// ---- colours, per theme ---------------------------------------------------------------------------------------
const PALETTE = {
  light: { page: '#F8F7FB', grid: '#1C1825', gridOp: 0.06, shadow: 0.11, block: '#CDBEFB', blockE: '#6D3FE0', blockEI: 0.05, edge: '#8B6CF0',
    disc: '#F7F5FF', discEdge: '#B7A8F0', alert: '#F7A374', alertE: '#E8692E', alertEI: 0.45, alertEdge: '#E0632A',
    ok: '#93E3C0', okE: '#1E9E6A', okEI: 0.18, okEdge: '#25A872', path: '#1C1825', pathOp: 0.32, dot: '#6D3FE0', hemi: 1.55, sun: 1.25 },
  dark: { page: '#0F0D16', grid: '#ECE9F5', gridOp: 0.05, shadow: 0.35, block: '#5B47B8', blockE: '#3B2A8F', blockEI: 0.35, edge: '#B49CFF',
    disc: '#3B3159', discEdge: '#9F88F5', alert: '#F28A55', alertE: '#E8692E', alertEI: 0.6, alertEdge: '#FF9A62',
    ok: '#3FBF88', okE: '#1E9E6A', okEI: 0.35, okEdge: '#4ED39A', path: '#ECE9F5', pathOp: 0.3, dot: '#B49CFF', hemi: 0.9, sun: 0.9 },
};

// ---- geometry helpers -------------------------------------------------------------------------------------------
function roundedSlab(w, d, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, 0);
  return g;
}
const glowTexture = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    tex = new THREE.CanvasTexture(c); return tex;
  };
})();

// ---- the scene object -------------------------------------------------------------------------------------------
export function createScene3d(canvas, overlay, { reduced }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d0f5, 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(-7, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  scene.fog = new THREE.Fog(0xf8f7fb, 20, 60);

  // the ground: shadows only, and a grid the fog dissolves
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.11 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(160, 160, 0x1c1825, 0x1c1825);
  grid.material.transparent = true; grid.material.opacity = 0.06; grid.material.depthWrite = false;
  grid.position.y = 0.002;
  scene.add(grid);

  // shared materials per state; each part gets its own copies so it can fade on its own
  const mats = [];
  const blockMat = () => { const m = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, transparent: true, opacity: 0.9 }); mats.push(m); return m; };
  const edgeMat = () => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });

  const parts = {};
  for (const [id, def] of Object.entries(PARTS)) {
    const g = new THREE.Group();
    g.position.set(def.p[0], 0, def.p[1]);
    const mBlock = blockMat(), mEdge = edgeMat(), mWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const layers = [];
    const addSolid = (geo, y, parent = g, mat = mBlock) => {
      const mesh = new THREE.Mesh(geo, mat); mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), mEdge); e.position.y = y; parent.add(e);
      return mesh;
    };
    let top = 0;
    if (def.kind === 'server') {
      for (let i = 0; i < 3; i++) {
        addSolid(roundedSlab(1.5, 1.5, 0.3, 0.14), i * 0.42);
        for (let k = 0; k < 2; k++) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.34), mWhite);
          slot.position.set(0.78, i * 0.42 + 0.15, -0.15 + k * 0.4); g.add(slot);
        }
      }
      top = 1.2;
    } else if (def.kind === 'cache') {
      addSolid(roundedSlab(1.3, 1.3, 0.7, 0.14), 0);
      const bolt = new THREE.Shape(); bolt.moveTo(0.06, 0.3); bolt.lineTo(-0.14, -0.02); bolt.lineTo(0.0, -0.02); bolt.lineTo(-0.08, -0.3); bolt.lineTo(0.16, 0.04); bolt.lineTo(0.02, 0.04); bolt.closePath();
      const b = new THREE.Mesh(new THREE.ShapeGeometry(bolt), mWhite); b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI / 4; b.position.y = 0.78; g.add(b);
      top = 0.78;
    } else if (def.kind === 'db') {
      const n = def.layers || 3;
      for (let i = 0; i < n; i++) {
        const lg = new THREE.Group(); g.add(lg); layers.push(lg);
        addSolid(new THREE.CylinderGeometry(0.78, 0.78, 0.34, 48, 1), i * 0.42 + 0.17, lg);
      }
      top = n * 0.42;
    } else if (def.kind === 'globe') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16), mBlock); s.position.y = 0.95; s.castShadow = true; g.add(s);
      const w = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(0.61, 10, 6)), mEdge); w.position.y = 0.95; g.add(w);
      const base = addSolid(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 32), 0.06); void base;
      top = 1.55;
    } else if (def.kind === 'laptop') {
      addSolid(roundedSlab(1.6, 1.1, 0.06, 0.08), 0);
      const scr = new THREE.Group(); scr.position.set(0, 0.08, -0.55); scr.rotation.x = -0.22; g.add(scr);
      addSolid(roundedSlab(1.6, 0.05, 1.0, 0.03).rotateX(0), 0, scr);
      top = 1.05;
    } else if (def.kind === 'lb') {
      addSolid(new THREE.CylinderGeometry(0.85, 0.85, 0.24, 6), 0.12);
      top = 0.3;
    } else {
      addSolid(roundedSlab(0.9, 0.9, 0.5, 0.1), 0);
      top = 0.55;
    }
    // the glow and the pulsing ring of an alert, and the soft green glow of a fixed part
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xf07b3f, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
    glow.rotation.x = -Math.PI / 2; glow.scale.set(5, 5, 1); glow.position.y = 0.015; g.add(glow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.2, 64), new THREE.MeshBasicMaterial({ color: 0xf07b3f, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; g.add(ring);
    scene.add(g);
    parts[id] = { def, g, mBlock, mEdge, mWhite, layers, top, glow, ring, state: '', vis: 1, rise: 0, explode: 0 };
  }

  // paths: L-shaped dashed lines on the ground, with requests (instanced dots) moving along them
  const paths = {};
  const dotGeo = new THREE.SphereGeometry(0.06, 12, 8);
  let dotCount = 0;
  for (const [id, [a, b]] of Object.entries(PATHS)) {
    const A = PARTS[a].p, B = PARTS[b].p;
    const pts = [new THREE.Vector3(A[0], 0.03, A[1]), new THREE.Vector3(B[0], 0.03, A[1]), new THREE.Vector3(B[0], 0.03, B[1])];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({ color: 0x1c1825, dashSize: 0.07, gapSize: 0.22, transparent: true, opacity: 0.32 });
    const line = new THREE.Line(geo, mat); line.computeLineDistances(); scene.add(line);
    const curve = new THREE.CurvePath(); curve.add(new THREE.LineCurve3(pts[0], pts[1])); curve.add(new THREE.LineCurve3(pts[1], pts[2]));
    const len = curve.getLength(), n = Math.max(2, Math.round(len / 1.6));
    paths[id] = { line, mat, curve, len, dots: Array.from({ length: n }, (_, k) => ({ t: k / n, i: dotCount + k })), state: '' };
    dotCount += n;
  }
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), dotCount);
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(dots);

  // ---- HTML overlay: labels, the SEV tag, readings and logs ----
  const pill = (cls = '') => { const d = document.createElement('div'); d.className = `p3 ${cls}`; overlay.appendChild(d); return d; };
  const pills = Object.fromEntries(Object.keys(PARTS).map((id) => [id, pill()]));
  const sev = pill('p3-sev'); sev.textContent = '▲ Alert · SEV-1';
  const readings = [['L2', 'queries', '37,600 /s'], ['L1', 'connections', '500 / 500'], ['L0', 'disk', '98 % busy']].map(([lv, k, v]) => {
    const d = pill('p3-read'); d.innerHTML = `<span class="lv">${lv}</span> ${k} <span class="v">${v}</span>`; return d;
  });
  const logs = document.createElement('div'); logs.className = 'p3-logs';
  logs.innerHTML = [['20:14:02', 'cache', 'ERROR node unreachable'], ['20:14:03', 'api', 'WARN cache miss → db'], ['20:14:07', 'db', 'WARN too many connections'], ['20:14:09', 'api', 'ERROR upstream timeout 2000 ms'], ['20:14:11', 'lb', 'WARN 5xx rate 31 %']]
    .map(([t, w, m]) => `<div><span>${t}  ${w.padEnd(5, ' ')}</span> <b>${m}</b></div>`).join('');
  overlay.appendChild(logs);

  // ---- theme ----
  let pal = PALETTE.light;
  function applyTheme() {
    pal = document.documentElement.dataset.theme === 'dark' ? PALETTE.dark : PALETTE.light;
    scene.fog.color.set(pal.page);
    grid.material.color.set(pal.grid); grid.material.opacity = pal.gridOp;
    ground.material.opacity = pal.shadow;
    hemi.intensity = pal.hemi; sun.intensity = pal.sun;
    hemi.groundColor.set(pal === PALETTE.dark ? '#1a1530' : '#d8d0f5');
    for (const p of Object.values(paths)) p.mat.color.set(pal.path);
  }
  const themeObs = new MutationObserver(applyTheme);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();

  // ---- chapter state ----
  let chapter = 0, speed = 0.5, labels = {};
  const target = { sev: 0, explode: 0, logs: 0 };
  function setChapter(n) {
    chapter = n;
    const c = CHAPTERS[n];
    speed = c.speed;
    for (const [id, p] of Object.entries(parts)) p.state = c.parts?.[id] || '';
    for (const [id, p] of Object.entries(paths)) p.state = c.paths?.[id] || '';
    labels = { ...BASE_LABELS, ...c.labels };
    target.sev = c.sev ? 1 : 0; target.explode = c.explode ? 1 : 0; target.logs = c.logs ? 1 : 0;
  }

  // ---- camera: follows the scroll between chapter keyframes, damped ----
  let camGoal = { ...CHAPTERS[0].cam }, cam = { ...CHAPTERS[0].cam };
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => x * x * (3 - 2 * x);
  function camFor(c, phone) { return phone && c.phone ? { ...c, ...c.phone } : c; }
  function setProgress(f) { // f: a fractional chapter index from the scroll position
    const phone = W <= 760;
    const i = Math.max(0, Math.min(CHAPTERS.length - 1, Math.floor(f))), j = Math.min(CHAPTERS.length - 1, i + 1), k = ease(Math.max(0, Math.min(1, f - i)));
    const a = camFor(CHAPTERS[i].cam, phone), b = camFor(CHAPTERS[j].cam, phone);
    camGoal = { t: [lerp(a.t[0], b.t[0], k), lerp(a.t[1], b.t[1], k)], dist: lerp(a.dist, b.dist, k), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), sx: lerp(a.sx, b.sx, k), sy: lerp(a.sy, b.sy, k) };
    if (reduced) cam = { ...camGoal };
  }

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W <= 760 ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
  }
  addEventListener('resize', resize);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  ro?.observe(canvas);
  resize();

  const tmpV = new THREE.Vector3(), mtx = new THREE.Matrix4(), col = new THREE.Color(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const colOf = (state) => state === 'alert' ? [pal.alert, pal.alertE, pal.alertEI, pal.alertEdge] : state === 'ok' ? [pal.ok, pal.okE, pal.okEI, pal.okEdge] : null;

  function placeCamera(t) {
    const phone = W <= 760;
    const d = cam.dist * (phone ? 0.98 : 1) * Math.max(1, 1.45 / Math.max(camera.aspect, 0.6));
    const drift = reduced ? 0 : Math.sin(t * 0.00015) * (chapter === 0 || chapter === 5 ? 3 : 0.8);
    const az = THREE.MathUtils.degToRad(cam.az + drift), el = THREE.MathUtils.degToRad(cam.el);
    const tx = cam.t[0], tz = cam.t[1];
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, 0.5, tz);
    // place the target where the layout wants it on screen (text on the left, scene on the right)
    const sx = phone ? 0.5 : cam.sx, sy = phone ? 0.6 : cam.sy;
    camera.setViewOffset(W, H, (0.5 - sx) * W, (0.5 - sy) * H, W, H);
    camera.updateProjectionMatrix();
    scene.fog.near = d * 0.75; scene.fog.far = d * 1.9;
    sun.target.position.set(tx, 0, tz); sun.position.set(tx - 7, 16, tz + 9);
  }

  function project(x, y, z) {
    tmpV.set(x, y, z).project(camera);
    return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H, tmpV.z];
  }
  function placeHtml(el, x, y, z, dx = 0, dy = 0, show = true) {
    const [sx, sy, sz] = project(x, y, z);
    const side = W > 760 && cam.sx > 0.56;
    const on = show && sz < 1 && sx > (side ? W * 0.46 : -200) && sx < W - 40 && sy > 60 && sy < H - 40;
    el.style.opacity = on ? '' : '0';
    if (on) el.style.transform = `translate(${(sx + dx).toFixed(1)}px, ${(sy + dy).toFixed(1)}px)`;
  }

  // ---- frame ----
  let last = performance.now(), running = true, raf = 0, dead = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 4.5);
    for (const key of ['dist', 'az', 'el', 'sx', 'sy']) cam[key] = lerp(cam[key], camGoal[key], k);
    cam.t = [lerp(cam.t[0], camGoal.t[0], k), lerp(cam.t[1], camGoal.t[1], k)];
    placeCamera(now);
    canvas.style.setProperty('--side', W > 760 ? Math.max(0, Math.min(1, (cam.sx - 0.52) / 0.14)).toFixed(3) : '0');
    const s = reduced ? 1 : 1 - Math.exp(-dt * 5);

    for (const [id, p] of Object.entries(parts)) {
      const hiddenNow = p.state === 'hidden', dim = p.state === 'dim';
      p.vis = lerp(p.vis, hiddenNow ? 0 : dim ? 0.22 : 1, s);
      p.rise = lerp(p.rise, hiddenNow ? -1.4 : 0, s);
      p.g.position.y = p.rise; p.g.visible = p.vis > 0.02;
      const c = colOf(p.state);
      const base = p.def.kind === 'db' ? pal.disc : pal.block;
      col.set(c ? c[0] : base); p.mBlock.color.lerp(col, s);
      col.set(c ? c[1] : pal.blockE); p.mBlock.emissive.lerp(col, s);
      p.mBlock.emissiveIntensity = lerp(p.mBlock.emissiveIntensity, c ? c[2] : pal.blockEI, s);
      p.mBlock.opacity = 0.9 * p.vis;
      col.set(c ? c[3] : p.def.kind === 'db' ? pal.discEdge : pal.edge); p.mEdge.color.lerp(col, s);
      p.mEdge.opacity = 0.55 * p.vis; p.mWhite.opacity = 0.9 * p.vis;
      const alert = p.state === 'alert', ok = p.state === 'ok';
      p.glow.material.color.set(ok ? '#2DBA7F' : '#F07B3F');
      p.glow.material.opacity = lerp(p.glow.material.opacity, (alert ? 0.42 + 0.1 * Math.sin(now * 0.004) : ok ? 0.22 : 0) * p.vis, s);
      if (alert && !reduced) { const ph = (now * 0.0006) % 1; p.ring.scale.setScalar(0.8 + ph * 0.9); p.ring.material.opacity = 0.7 * (1 - ph); }
      else { p.ring.material.opacity = lerp(p.ring.material.opacity, alert ? 0.5 : 0, s); p.ring.scale.setScalar(1); }
      if (id === 'db') { p.explode = lerp(p.explode, target.explode, s); p.layers.forEach((lg, i) => { lg.position.y = i * 0.62 * p.explode; }); }
    }

    let di = 0;
    for (const p of Object.values(paths)) {
      const st = p.state;
      const op = st === 'hidden' ? 0 : st === 'down' ? 0.12 : st === 'dim' ? 0.08 : st === 'ok' ? 0.75 : pal.pathOp;
      p.mat.opacity = lerp(p.mat.opacity, op, s);
      col.set(st === 'hot' ? '#F07B3F' : st === 'ok' ? '#2DBA7F' : pal.path); p.mat.color.lerp(col, s);
      p.mat.dashSize = st === 'ok' ? 10 : 0.07;
      const show = st !== 'hidden' && st !== 'down' && st !== 'dim';
      for (const d of p.dots) {
        if (!reduced) d.t = (d.t + dt * speed / p.len) % 1;
        if (!show) { dots.setMatrixAt(d.i, hidden); continue; }
        p.curve.getPointAt(d.t, tmpV);
        mtx.makeTranslation(tmpV.x, 0.08, tmpV.z); dots.setMatrixAt(d.i, mtx);
        dots.setColorAt(d.i, col.set(st === 'hot' ? '#F07B3F' : st === 'ok' ? '#2DBA7F' : pal.dot));
        di++;
      }
    }
    dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;

    // labels
    for (const [id, p] of Object.entries(parts)) {
      const l = labels[id], show = !!l && p.state !== 'hidden' && p.state !== 'dim' && !['api1', 'api3', 'client', 'lb'].includes(id)
        && (W > 760 || p.state === 'alert' || p.state === 'ok' || chapter === 0 || chapter === 5);
      const el = pills[id];
      if (show) {
        const html = `<i class="led ${l[1] || ''}"></i><b>${p.def.name}</b> <span class="v ${l[1] || ''}">${l[0]}</span>`;
        if (el._h !== html) { el.innerHTML = html; el._h = html; }
      }
      placeHtml(el, p.g.position.x, p.top + 0.45 + p.rise, p.g.position.z, 0, 0, show);
    }
    const ca = parts.cache;
    placeHtml(sev, ca.g.position.x, ca.top + 1.3, ca.g.position.z, 0, 0, target.sev > 0);
    sev.classList.toggle('blink', target.sev > 0 && !reduced);
    const db = parts.db;
    readings.forEach((r, i) => placeHtml(r, db.g.position.x + 0.95, (2 - i) * (0.42 + 0.62 * db.explode) + 0.2, db.g.position.z - 0.95, 16, 0, target.explode > 0 && db.explode > 0.6));
    placeHtml(logs, db.g.position.x - 2.6, 3.4, db.g.position.z - 2.6, 0, 0, target.logs > 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const onVis = () => {
    if (dead) return;
    if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVis);
  setChapter(0);
  raf = requestAnimationFrame(frame);
  function destroy() {
    dead = true; running = false; cancelAnimationFrame(raf);
    removeEventListener('resize', resize); ro?.disconnect(); themeObs.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    renderer.dispose();
    overlay.replaceChildren();
  }
  return { setChapter, setProgress, destroy, count: CHAPTERS.length, kind: 'webgl' };
}

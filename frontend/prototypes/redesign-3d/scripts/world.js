// The 3D world every page uses (three.js, vendored: the site's CSP allows only same-site scripts).
// A system is data: parts { id: { kind, x, z, name, layers } } and paths { id: [from, to] }. setSystem() adds parts that
// are new (they rise out of the floor), removes parts that are gone (they sink), and keeps the rest where they are.
// setState() colours them (alert = orange and pulsing, warn = amber, ok = green, dim, hidden), sets labels and the
// request speed; setCamera() glides the camera. Labels are HTML pills laid over the canvas (crisp at any zoom).
// createWorld returns null without WebGL; pages then show their words without the scene.
import * as THREE from './vendor/three.module.min.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { kindColours } from './palette.js';

// Tech Katta's own look: soft matte models, one pastel per kind of part, taken from the app's six section colours
// (sky, lilac, peach, mint, lemon, rose), with marigold indicator lights. Status: a coral-red glow when a part fails,
// amber when it is busy; a healthy part keeps its own colour and gets a green halo.
const PALETTE = {
  light: { page: '#FAF8F5', grid: '#3A3550', gridOp: 0.05, shadow: 0.14, blockE: '#000000', blockEI: 0, path: '#3A3550', pathOp: 0.32, dot: '#2F4BB3', hemi: 1.05, sun: 1.15, ground: '#ece6f2', led: '#FFC233' },
  dark: { page: '#121218', grid: '#EDEAF5', gridOp: 0.045, shadow: 0.38, blockE: '#000000', blockEI: 0, path: '#EDEAF5', pathOp: 0.28, dot: '#A9BCFF', hemi: 0.95, sun: 1.0, ground: '#1d1a26', led: '#FFC233' },
};
const TONE = {
  alert: { c: '#F23B3B', e: '#D92626', ei: 0.4, edge: '#9E1414', glow: '#EF3B3B', dot: '#E5383B' },
  warn: { e: '#F5A524', ei: 0.05, glow: '#F5A524', dot: '#D98A00' },
  ok: { e: '#2FA36B', ei: 0.06, glow: '#2FA36B', dot: '#2FA36B' },
};
const TONE_DARK = { alert: { c: '#F04646', ei: 0.5, edge: '#FFB0B0' }, warn: { ei: 0.25 }, ok: { ei: 0.12 } };

function roundedSlab(w, d, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  return g;
}
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); return glowTex;
}

// shared geometry, built once
const GEO = {};
function geo(key, make) { return GEO[key] || (GEO[key] = make()); }

export function createWorld(canvas, overlay, { reduced = false, still = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { return null; }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the pastels' hue and saturation (ACES washes light colours out)
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.5, 400);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8d0f5, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0xf8f7fb, 20, 60);
  { const pm = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment(); scene.environment = pm.fromScene(room, 0.04).texture; scene.environmentIntensity = 0.35; room.dispose(); pm.dispose(); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.11 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(160, 160, 0x1c1825, 0x1c1825);
  grid.material.transparent = true; grid.material.opacity = 0.06; grid.material.depthWrite = false; grid.position.y = 0.002; scene.add(grid);

  let pal = PALETTE.light, dark = false;
  const parts = new Map(), paths = new Map();
  let labels = {}, speed = 0.6, explodeIds = new Set(), avoidLeft = 0, pickCb = null, hoverId = null;

  // ---- parts ----
  function buildPart(id, def) {
    const g = new THREE.Group(); g.position.set(def.x, -1.4, def.z);
    const mBlock = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, transparent: true, opacity: 0 });
    const mEdge = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
    const mWhite = new THREE.MeshBasicMaterial({ color: def.kind === 'kafka' ? 0x1B1A22 : pal.led, transparent: true, opacity: 0, toneMapped: false });
    { const kc = kindColours(def.kind, dark); mBlock.color.set(kc[0]); mEdge.color.set(kc[1]); }
    const layers = [], hits = [], layersBack = [];
    let backMat = null, backLen = 0;
    const add = (geom, edgeGeom, y, parent = g, mat = mBlock) => {
      const mesh = new THREE.Mesh(geom, mat); mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); hits.push(mesh);
      if (edgeGeom) { const e = new THREE.LineSegments(edgeGeom, mEdge); e.position.y = y; parent.add(e); }
      return mesh;
    };
    const slab = (w, d, h, r) => { const k = `slab${w},${d},${h},${r}`; return [geo(k, () => roundedSlab(w, d, h, r)), geo(k + 'e', () => new THREE.EdgesGeometry(GEO[k], 30))]; };
    let top = 0;
    const k = def.kind;
    if (k === 'server') {
      const [sg, se] = slab(1.4, 1.4, 1.05, 0.12); add(sg, se, 0);
      const led = geo('led', () => new THREE.BoxGeometry(0.02, 0.07, 0.5));
      for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(led, mWhite); m.position.set(0.735, 0.3 + j * 0.38, 0); g.add(m); }
      top = 1.1;
    } else if (k === 'cache') {
      const [sg, se] = slab(1.3, 1.3, 0.7, 0.14); add(sg, se, 0);
      const bolt = geo('bolt', () => { const b = new THREE.Shape(); b.moveTo(0.06, 0.3); b.lineTo(-0.14, -0.02); b.lineTo(0, -0.02); b.lineTo(-0.08, -0.3); b.lineTo(0.16, 0.04); b.lineTo(0.02, 0.04); b.closePath(); return new THREE.ShapeGeometry(b); });
      const m = new THREE.Mesh(bolt, mWhite); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 4; m.position.y = 0.78; g.add(m);
      top = 0.78;
    } else if (k === 'db') {
      const n = def.layers || 3;
      const cg = geo('disc', () => new THREE.CylinderGeometry(0.78, 0.78, 0.34, 48, 1)), ce = geo('disce', () => new THREE.EdgesGeometry(GEO.disc, 30));
      for (let i = 0; i < n; i++) { const lg = new THREE.Group(); g.add(lg); layers.push(lg); add(cg, ce, i * 0.42 + 0.17, lg); }
      top = n * 0.42;
    } else if (k === 'globe') {
      const s = new THREE.Mesh(geo('sphere', () => new THREE.SphereGeometry(0.6, 32, 16)), mBlock); s.position.y = 0.95; s.castShadow = true; g.add(s); hits.push(s);
      const w = new THREE.LineSegments(geo('wire', () => new THREE.WireframeGeometry(new THREE.SphereGeometry(0.61, 10, 6))), mEdge); w.position.y = 0.95; g.add(w);
      add(geo('gbase', () => new THREE.CylinderGeometry(0.42, 0.5, 0.12, 32)), geo('gbasee', () => new THREE.EdgesGeometry(GEO.gbase, 30)), 0.06);
      top = 1.55;
    } else if (k === 'laptop') {
      const [bg, be] = slab(1.6, 1.1, 0.06, 0.08); add(bg, be, 0);
      const scr = new THREE.Group(); scr.position.set(0, 0.08, -0.55); scr.rotation.x = -0.22; g.add(scr);
      const [sg, se] = slab(1.6, 0.05, 1.0, 0.03); add(sg, se, 0, scr);
      top = 1.05;
    } else if (k === 'lb') {
      add(geo('hex', () => new THREE.CylinderGeometry(0.85, 0.85, 0.24, 6)), geo('hexe', () => new THREE.EdgesGeometry(GEO.hex, 30)), 0.12);
      top = 0.3;
    } else if (k === 'kafka') {
      // a Kafka topic: N partition logs side by side, segment ticks across each, and a backlog bar inside that
      // grows from the consumer end when consumers fall behind (state.fill)
      const n = def.partitions || 3, L = 3.4;
      const [pg, pe] = slab(L, 0.56, 0.34, 0.1);
      const tick = geo('tick', () => new THREE.BoxGeometry(0.03, 0.012, 0.5));
      const back = geo('backlog', () => new THREE.BoxGeometry(1, 0.1, 0.4));
      const zs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * 0.72);
      const mBack = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.5, emissive: 0xF97316, emissiveIntensity: 0.25, transparent: true, opacity: 0 });
      for (const z of zs) {
        const m = add(pg, pe, 0); m.position.z = z; g.children[g.children.length - 1].position.z = z;
        for (let t = 1; t < 8; t++) { const tk = new THREE.Mesh(tick, mWhite); tk.position.set(-L / 2 + t * (L / 8), 0.36, z); g.add(tk); }
        const b = new THREE.Mesh(back, mBack); b.position.set(L / 2 - 0.05, 0.4, z); b.scale.x = 0.001; g.add(b); layersBack.push(b);
      }
      backMat = mBack; backLen = L - 0.1;
      top = 0.55;
    } else if (k === 'consumer') {
      // a consumer: an octagonal worker with a status band
      add(geo('oct', () => new THREE.CylinderGeometry(0.62, 0.62, 0.72, 8)), geo('octe', () => new THREE.EdgesGeometry(GEO.oct, 30)), 0.36);
      const band = new THREE.Mesh(geo('band', () => new THREE.CylinderGeometry(0.635, 0.635, 0.06, 8)), mWhite); band.position.y = 0.5; g.add(band);
      top = 0.8;
    } else if (k === 'queue') {
      const [qg, qe] = slab(0.5, 1.4, 0.5, 0.1);
      for (let i = 0; i < 4; i++) { const m = add(qg, qe, 0); m.position.x = -0.9 + i * 0.6; g.children[g.children.length - 1].position.x = -0.9 + i * 0.6; }
      top = 0.6;
    } else {
      const [sg, se] = slab(0.9, 0.9, 0.5, 0.1); add(sg, se, 0);
      top = 0.55;
    }
    const glow = new THREE.Mesh(geo('plane', () => new THREE.PlaneGeometry(1, 1)), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xf07b3f, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
    glow.rotation.x = -Math.PI / 2; glow.scale.set(5, 5, 1); glow.position.y = 0.015; g.add(glow);
    const ring = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(1.15, 1.2, 64)), new THREE.MeshBasicMaterial({ color: 0xf07b3f, transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; g.add(ring);
    scene.add(g);
    const pill = document.createElement('div'); pill.className = 'p3'; pill.style.opacity = '0'; overlay.appendChild(pill);
    hits.forEach((h) => { h.userData.part = id; });
    return { id, def, g, mBlock, mEdge, mWhite, layers, hits, top, glow, ring, pill, layersBack, backMat, backLen, fill: 0, state: '', vis: 0, rise: -1.4, explode: 0, gone: false };
  }
  function disposePart(p) {
    scene.remove(p.g); p.backMat?.dispose(); p.mBlock.dispose(); p.mEdge.dispose(); p.mWhite.dispose(); p.glow.material.dispose(); p.ring.material.dispose(); p.pill.remove();
  }

  // ---- paths: L-shaped dashed lines on the floor, requests moving along them (instanced dots from one pool) ----
  const MAX_DOTS = 900;
  const dots = new THREE.InstancedMesh(geo('dot', () => new THREE.BoxGeometry(0.1, 0.1, 0.1)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_DOTS);
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const hiddenM = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < MAX_DOTS; i++) { dots.setMatrixAt(i, hiddenM); dots.setColorAt(i, new THREE.Color(1, 1, 1)); }
  scene.add(dots);
  const freeDots = Array.from({ length: MAX_DOTS }, (_, i) => MAX_DOTS - 1 - i);
  function buildPath(id, a, b) {
    const A = parts.get(a).def, B = parts.get(b).def;
    const pts = [new THREE.Vector3(A.x, 0.03, A.z), new THREE.Vector3(B.x, 0.03, A.z), new THREE.Vector3(B.x, 0.03, B.z)];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({ color: pal.path, dashSize: 0.07, gapSize: 0.22, transparent: true, opacity: 0 });
    const line = new THREE.Line(g, mat); line.computeLineDistances(); scene.add(line);
    const curve = new THREE.CurvePath(); curve.add(new THREE.LineCurve3(pts[0], pts[1])); curve.add(new THREE.LineCurve3(pts[1], pts[2]));
    const len = Math.max(0.5, curve.getLength()), n = Math.min(8, Math.max(2, Math.round(len / 1.6)));
    const ds = [];
    for (let k = 0; k < n && freeDots.length; k++) ds.push({ t: k / n, i: freeDots.pop() });
    return { id, a, b, line, mat, curve, len, dots: ds, state: '', op: 0, gone: false };
  }
  function disposePath(p) {
    scene.remove(p.line); p.line.geometry.dispose(); p.mat.dispose();
    for (const d of p.dots) { dots.setMatrixAt(d.i, hiddenM); freeDots.push(d.i); }
  }

  function setSystem({ parts: P = {}, paths: L = {} }, { instant = false } = {}) {
    for (const [id, def] of Object.entries(P)) {
      const old = parts.get(id);
      if (old && !old.gone && old.def.kind === def.kind && (old.def.layers || 3) === (def.layers || 3) && (old.def.partitions || 3) === (def.partitions || 3)) {
        old.def = { ...old.def, ...def }; old.target = [def.x, def.z];
        continue;
      }
      if (old) { disposePart(old); parts.delete(id); }
      const p = buildPart(id, def); p.target = [def.x, def.z];
      if (instant || reduced) { p.vis = 1; p.rise = 0; }
      parts.set(id, p);
    }
    for (const [id, p] of parts) if (!(id in P)) p.gone = true;
    // paths are rebuilt when their ends move (cheap)
    for (const [id, p] of paths) { disposePath(p); paths.delete(id); }
    for (const [id, [a, b]] of Object.entries(L)) if (parts.has(a) && parts.has(b) && !parts.get(a).gone && !parts.get(b).gone) paths.set(id, buildPath(id, a, b));
    for (const p of parts.values()) if (!p.gone) p.g.position.x = p.target[0], p.g.position.z = p.target[1];
    if (instant || reduced) for (const p of paths.values()) p.op = 1;
  }

  // A state, optionally blended from another: mix 0 shows `from`, 1 shows this state, in between the colours, glows,
  // visibility and request paths blend. Scroll stories drive mix from the scroll position. reveal (id → 0..1) raises
  // parts out of the floor one by one; rate sets how tightly the picture follows (higher = closer to the scroll).
  let mix = 1, fromLabels = null, explodePrev = new Set(), fillNow = {}, fillPrev = {};
  function setState({ parts: S = {}, paths: L = {}, labels: B = {}, speed: sp, explode = [], fill = {}, avoid = 0 } = {}, { from = null, mix: m = 1, reveal = null, rate = 5 } = {}) {
    for (const [id, p] of parts) { p.state = S[id] || ''; p.prev = from ? (from.parts?.[id] || '') : p.state; p.reveal = reveal?.[id] ?? 1; }
    for (const [id, p] of paths) {
      const gone = (st, k) => st?.[k] === 'hidden';
      p.state = gone(S, p.a) || gone(S, p.b) ? 'hidden' : L[id] || L[p.b] || '';
      p.prev = from ? (gone(from.parts, p.a) || gone(from.parts, p.b) ? 'hidden' : from.paths?.[id] || from.paths?.[p.b] || '') : p.state;
      p.reveal = Math.min(reveal?.[p.a] ?? 1, reveal?.[p.b] ?? 1);
    }
    mix = Math.max(0, Math.min(1, m)); fromLabels = from ? (from.labels || {}) : null;
    labels = B; if (sp != null) speed = from && from.speed != null ? from.speed + (sp - from.speed) * mix : sp;
    fillNow = fill; fillPrev = from ? (from.fill || {}) : fill;
    explodeIds = new Set(explode); explodePrev = new Set(from ? from.explode || [] : explode); avoidLeft = avoid; stateRate = rate;
  }
  let stateRate = 5, camRate = 4.5;

  // ---- camera ----
  const camGoal = { t: [0, 0], dist: 40, az: 45, el: 30, sx: 0.5, sy: 0.5 };
  const cam = { ...camGoal, t: [0, 0] };
  function setCamera(c, { instant = false, rate = 4.5 } = {}) {
    camRate = rate;
    Object.assign(camGoal, c, { t: [...(c.t || camGoal.t)] });
    if (instant || reduced) Object.assign(cam, camGoal, { t: [...camGoal.t] });
  }
  /** the camera target and distance that frame the current parts */
  function frame(pad = 1) {
    const live = [...parts.values()].filter((p) => !p.gone);
    if (!live.length) return { t: [0, 0], dist: 30 };
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of live) { x0 = Math.min(x0, p.target[0]); x1 = Math.max(x1, p.target[0]); z0 = Math.min(z0, p.target[1]); z1 = Math.max(z1, p.target[1]); }
    const span = Math.max(x1 - x0, z1 - z0, 4);
    return { t: [(x0 + x1) / 2, (z0 + z1) / 2], dist: (span * 2.2 + 12) * pad };
  }

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W <= 760 ? 1.5 : 2));
    renderer.setSize(W, H, false); camera.aspect = W / H;
  }
  addEventListener('resize', resize);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  resize();

  function placeCamera(now) {
    const phone = W <= 760;
    // phones: the scene fills the screen and comes close (parts may run off the edges), as the words sit over it
    const d = cam.dist * (phone ? Math.min(1.3, 1.45 / Math.max(camera.aspect, 0.6)) : Math.max(1, 1.45 / Math.max(camera.aspect, 0.6)));
    const drift = reduced || still ? 0 : Math.sin(now * 0.00015) * 1.2;
    const az = THREE.MathUtils.degToRad(cam.az + drift), el = THREE.MathUtils.degToRad(cam.el);
    const [tx, tz] = cam.t;
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, 0.5, tz);
    const sx = phone && cam.phoneCentre !== false ? 0.5 : cam.sx, sy = phone ? (cam.phoneSy ?? 0.55) : cam.sy;
    camera.setViewOffset(W, H, (0.5 - sx) * W, (0.5 - sy) * H, W, H);
    camera.updateProjectionMatrix();
    scene.fog.near = d * 0.8; scene.fog.far = d * 2;
    sun.target.position.set(tx, 0, tz); sun.position.set(tx - 7, 16, tz + 9);
  }

  // ---- theme ----
  function applyTheme() {
    dark = document.documentElement.dataset.theme === 'dark';
    pal = dark ? PALETTE.dark : PALETTE.light;
    scene.fog.color.set(pal.page); grid.material.color.set(pal.grid); grid.material.opacity = pal.gridOp;
    ground.material.opacity = pal.shadow; hemi.intensity = pal.hemi; sun.intensity = pal.sun; hemi.groundColor.set(pal.ground);
  }
  const themeObs = new MutationObserver(applyTheme);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();
  const tone = (st) => { const t = TONE[st]; if (!t) return null; return dark ? { ...t, ...TONE_DARK[st] } : t; };

  // ---- picking (the simulator: click a part) ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const all = [...parts.values()].filter((p) => !p.gone).flatMap((p) => p.hits);
    return ray.intersectObjects(all, false)[0]?.object.userData.part || null;
  }
  const onClick = (ev) => { if (pickCb) pickCb(hit(ev)); };
  const onMove = (ev) => { if (!pickCb) return; const h = hit(ev); hoverId = h; canvas.style.cursor = h ? 'pointer' : ''; };
  canvas.addEventListener('click', onClick); canvas.addEventListener('pointermove', onMove);

  // ---- labels ----
  const tmpV = new THREE.Vector3(), mtx = new THREE.Matrix4(), col = new THREE.Color();
  function project(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x + 1) / 2 * W, (1 - tmpV.y) / 2 * H, tmpV.z]; }
  // Labels never overlap: each frame they are collected (place), then laid out together (layoutLabels). A label
  // tries its own spot just above its part first, then spots further up and to either side; if it had to move, a thin
  // leader line ties it back to its part. Positions ease toward their target so labels do not jump.
  const queue = [];
  let labelMaxY = 0.52;
  const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leaders.setAttribute('class', 'p3-leaders'); overlay.appendChild(leaders);
  const lines = [];
  function place(el, x, y, z, show) {
    const [sx, sy, sz] = project(x, y, z);
    const on = show && sz < 1 && sx > (W > 760 ? W * avoidLeft : -200) && sx < W - 30 && sy > 40 && sy < (W > 760 ? H - 20 : H * labelMaxY);
    if (on) queue.push({ el, ax: sx, ay: sy }); else { el.style.opacity = '0'; el._placed = false; }
  }
  function layoutLabels() {
    const boxes = [];
    const hit = (b) => boxes.some((o) => b.x < o.x + o.w + 6 && b.x + b.w + 6 > o.x && b.y < o.y + o.h + 4 && b.y + b.h + 4 > o.y);
    queue.sort((a, b) => a.ay - b.ay);
    let used = 0;
    for (const q of queue) {
      const { el, ax, ay } = q;
      if (el._wh?.h0 !== el._h) el._wh = { w: el.offsetWidth || 80, h: el.offsetHeight || 22, h0: el._h };
      const w = el._wh.w, h = el._wh.h;
      const home = { x: ax - w / 2, y: ay - h - 6, w, h };
      let best = null;
      for (let k = 0; k < 7 && !best; k++) {
        for (const dx of k === 0 ? [0] : [0, -(w / 2 + 14), w / 2 + 14]) {
          const b = { x: Math.max(8, Math.min(W - w - 8, home.x + dx)), y: Math.max(76, home.y - k * (h + 6)), w, h };
          if (!hit(b)) { best = b; break; }
        }
      }
      best = best || home;
      boxes.push(best);
      const e = reduced || !el._placed ? 1 : 0.25;
      el._x = el._placed ? el._x + (best.x - el._x) * e : best.x;
      el._y = el._placed ? el._y + (best.y - el._y) * e : best.y;
      el._placed = true;
      el.style.opacity = '';
      el.style.translate = '0 0';
      el.style.transform = `translate(${el._x.toFixed(1)}px, ${el._y.toFixed(1)}px)`;
      // leader line when the label sits away from its part
      const cx = Math.max(el._x + 6, Math.min(el._x + w - 6, ax)), cy = el._y + h;
      if (Math.hypot(cx - ax, cy - ay) > 12) {
        let ln = lines[used];
        if (!ln) { ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leaders.appendChild(ln); lines.push(ln); }
        ln.setAttribute('x1', ax.toFixed(1)); ln.setAttribute('y1', ay.toFixed(1)); ln.setAttribute('x2', cx.toFixed(1)); ln.setAttribute('y2', cy.toFixed(1));
        ln.style.display = ''; used++;
      }
    }
    for (let i = used; i < lines.length; i++) lines[i].style.display = 'none';
    queue.length = 0;
  }

  // ---- how a state looks (targets the loop blends between) ----
  const colA = new THREE.Color(), colB = new THREE.Color();
  const kindCol = (kind) => kindColours(kind, dark);
  const cmix = (m) => { const x = Math.max(0, Math.min(1, (m - 0.3) / 0.35)); return x * x * (3 - 2 * x); };
  function look(state, p, now) {
    const t = tone(state), k = kindCol(p.def.kind);
    return {
      hidden: state === 'hidden' ? 1 : 0, vis: state === 'dim' ? 0.22 : 1,
      c: t?.c || k[0], e: t ? t.e : pal.blockE, ei: t ? t.ei : pal.blockEI, edge: t?.edge || k[1],
      glow: t ? t.glow : '#F07B3F', glowOp: state === 'alert' ? 0.42 + 0.1 * Math.sin(now * 0.004) : state === 'warn' ? 0.34 : t ? 0.22 : 0,
    };
  }
  function pathLook(st) {
    const t = tone(st);
    return { op: st === 'hidden' ? 0 : st === 'down' ? 0.12 : st === 'dim' ? 0.08 : st === 'ok' ? 0.75 : st === 'alert' || st === 'warn' ? 0.7 : pal.pathOp,
      col: t ? t.dot : pal.path, dot: t ? t.dot : pal.dot, solid: st === 'ok', show: st !== 'hidden' && st !== 'down' && st !== 'dim' };
  }

  // ---- the loop ----
  const lerp = (a, b, k) => a + (b - a) * k;
  let last = performance.now(), running = true, raf = 0, dead = false;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * camRate);
    for (const key of ['dist', 'az', 'el', 'sx', 'sy']) cam[key] = lerp(cam[key], camGoal[key], k);
    cam.t = [lerp(cam.t[0], camGoal.t[0], k), lerp(cam.t[1], camGoal.t[1], k)];
    cam.phoneSy = camGoal.phoneSy; cam.phoneCentre = camGoal.phoneCentre;
    placeCamera(now);
    const s = reduced ? 1 : 1 - Math.exp(-dt * stateRate);

    for (const [id, p] of parts) {
      const A = look(p.prev ?? p.state, p, now), B = look(p.state, p, now);
      const hiddenF = lerp(A.hidden, B.hidden, mix), reveal = p.gone ? 0 : (p.reveal ?? 1) * (1 - hiddenF);
      p.vis = lerp(p.vis, reveal * lerp(A.vis, B.vis, mix), s);
      p.rise = lerp(p.rise, -1.4 * (1 - reveal), s);
      if (p.gone && p.vis < 0.02) { disposePart(p); parts.delete(id); continue; }
      p.g.position.y = p.rise; p.g.visible = p.vis > 0.02;
      const hover = id === hoverId;
      // colours change in the middle of the blend, so the in-between (a muddy mix of two hues) stays short
      const cm = cmix(mix);
      p.mBlock.color.lerp(colA.set(A.c).lerp(colB.set(B.c), cm), s);
      p.mBlock.emissive.lerp(colA.set(A.e).lerp(colB.set(B.e), cm), s);
      p.mBlock.emissiveIntensity = lerp(p.mBlock.emissiveIntensity, lerp(A.ei, B.ei, cm) + (hover ? 0.25 : 0), s);
      p.mBlock.opacity = p.vis; p.mBlock.transparent = p.vis < 0.99; p.mBlock.depthWrite = p.vis > 0.5;
      p.mEdge.color.lerp(colA.set(A.edge).lerp(colB.set(B.edge), cm), s);
      p.mEdge.opacity = 0.7 * p.vis; p.mWhite.opacity = p.vis;
      p.glow.material.color.copy(colA.set(A.glow).lerp(colB.set(B.glow), cm));
      p.glow.material.opacity = lerp(p.glow.material.opacity, lerp(A.glowOp, B.glowOp, mix) * p.vis, s);
      const alertNow = (mix >= 0.5 ? p.state : p.prev) === 'alert';
      if (alertNow && !reduced) { const ph = (now * 0.0006) % 1; p.ring.material.color.set(TONE.alert.glow); p.ring.scale.setScalar(0.8 + ph * 0.9); p.ring.material.opacity = 0.7 * (1 - ph) * Math.abs(mix - 0.5) * 2; }
      else { p.ring.material.opacity = lerp(p.ring.material.opacity, 0, s); p.ring.scale.setScalar(1); }
      if (p.layersBack.length) {
        p.fill = lerp(p.fill, lerp(fillPrev[id] || 0, fillNow[id] || 0, mix), s);
        p.backMat.opacity = p.fill > 0.01 ? p.vis : 0;
        for (const b of p.layersBack) { const w = Math.max(0.001, p.fill * p.backLen); b.scale.x = w; b.position.x = p.backLen / 2 - w / 2; }
      }
      if (p.layers.length) { p.explode = lerp(p.explode, lerp(explodePrev.has(id) ? 1 : 0, explodeIds.has(id) ? 1 : 0, mix), s); p.layers.forEach((lg, i) => { lg.position.y = i * 0.62 * p.explode; }); }
      // labels: the new state's once the blend is nearly done, the old one's near its start, none in between
      const useNew = mix >= 0.8, useOld = fromLabels && mix <= 0.2;
      const l = useNew || !fromLabels ? labels[id] : useOld ? fromLabels[id] : null;
      const st = useNew || !fromLabels ? p.state : p.prev;
      if (l) { const html = `<i class="led ${l[1] || ''}" style="${l[1] ? '' : `background:var(--k-${p.def.kind})`}"></i><b>${l[2] ?? p.def.name}</b>${l[0] ? ` <span class="v ${l[1] || ''}">${l[0]}</span>` : ''}`; if (p.pill._h !== html) { p.pill.innerHTML = html; p.pill._h = html; } }
      place(p.pill, p.g.position.x, p.top + 0.45 + p.rise + (p.layers.length ? p.explode * 1.2 : 0), p.g.position.z, !!l && st !== 'hidden' && st !== 'dim' && p.vis > 0.6 && (p.reveal ?? 1) > 0.95);
    }

    for (const p of paths.values()) {
      p.op = lerp(p.op, 1, s);
      const pa = pathLook(p.prev ?? p.state), pb = pathLook(p.state);
      p.mat.opacity = lerp(p.mat.opacity, lerp(pa.op, pb.op, mix) * p.op * (p.reveal ?? 1), s);
      p.mat.color.lerp(colA.set(pa.col).lerp(colB.set(pb.col), cmix(mix)), s);
      const cur = mix >= 0.5 ? pb : pa;
      p.mat.dashSize = cur.solid ? 10 : 0.07;
      const show = cur.show && speed > 0 && p.op > 0.5 && (p.reveal ?? 1) > 0.9;
      for (const d of p.dots) {
        if (!reduced) d.t = (d.t + dt * speed / p.len) % 1;
        if (!show) { dots.setMatrixAt(d.i, hiddenM); continue; }
        p.curve.getPointAt(d.t, tmpV);
        mtx.makeTranslation(tmpV.x, 0.08, tmpV.z); dots.setMatrixAt(d.i, mtx);
        dots.setColorAt(d.i, col.set(cur.dot));
      }
    }
    dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    layoutLabels();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  // draw only while it can be seen: a hidden tab, or a canvas scrolled off screen, costs no GPU time or battery
  let onScreen = true;
  const onVis = () => {
    if (dead) return;
    const want = !document.hidden && onScreen;
    if (!want) running = false; else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  const seen = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onVis(); }, { rootMargin: '120px' }) : null;
  seen?.observe(canvas);
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(loop);

  function destroy() {
    dead = true; running = false; cancelAnimationFrame(raf); seen?.disconnect();
    removeEventListener('resize', resize); ro?.disconnect(); themeObs.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('click', onClick); canvas.removeEventListener('pointermove', onMove);
    for (const p of parts.values()) disposePart(p);
    for (const p of paths.values()) disposePath(p);
    dots.material.dispose(); scene.environment?.dispose(); ground.geometry.dispose(); ground.material.dispose(); grid.geometry.dispose(); grid.material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); overlay.replaceChildren();
  }
  return { setSystem, setState, setCamera, frame, setLabelBand: (y) => { labelMaxY = y; }, onPick: (cb) => { pickCb = cb; }, destroy };
}

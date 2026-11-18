// The 3D world every page uses (three.js, vendored: the site's CSP allows only same-site scripts).
// A system is data: parts { id: { kind, x, z, name, layers } } and paths { id: [from, to] }. setSystem() adds parts that
// are new (they rise out of the floor), removes parts that are gone (they sink), and keeps the rest where they are.
// setState() colours them (alert = orange and pulsing, warn = amber, ok = green, dim, hidden), sets labels and the
// request speed; setCamera() glides the camera. Labels are HTML pills laid over the canvas (crisp at any zoom).
// createWorld returns null without WebGL; pages then show their words without the scene.
import * as THREE from './vendor/three.module.min.js';

const PALETTE = {
  light: { page: '#F8F7FB', grid: '#1C1825', gridOp: 0.06, shadow: 0.11, block: '#CDBEFB', blockE: '#6D3FE0', blockEI: 0.05, edge: '#8B6CF0',
    disc: '#F7F5FF', discEdge: '#B7A8F0', path: '#1C1825', pathOp: 0.3, dot: '#6D3FE0', hemi: 1.55, sun: 1.25, ground: '#d8d0f5' },
  dark: { page: '#0F0D16', grid: '#ECE9F5', gridOp: 0.05, shadow: 0.35, block: '#5B47B8', blockE: '#3B2A8F', blockEI: 0.35, edge: '#B49CFF',
    disc: '#3B3159', discEdge: '#9F88F5', path: '#ECE9F5', pathOp: 0.28, dot: '#B49CFF', hemi: 0.9, sun: 0.9, ground: '#1a1530' },
};
const TONE = {
  alert: { c: '#F7A374', e: '#E8692E', ei: 0.45, edge: '#E0632A', glow: '#F07B3F', dot: '#F07B3F' },
  warn: { c: '#F9D27A', e: '#D99A12', ei: 0.3, edge: '#C98A0A', glow: '#F2B53A', dot: '#E0A21E' },
  ok: { c: '#93E3C0', e: '#1E9E6A', ei: 0.18, edge: '#25A872', glow: '#2DBA7F', dot: '#2DBA7F' },
};
const TONE_DARK = { alert: { c: '#F28A55', ei: 0.6, edge: '#FF9A62' }, warn: { c: '#E8B54A', ei: 0.45, edge: '#FFC85C' }, ok: { c: '#3FBF88', ei: 0.35, edge: '#4ED39A' } };

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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
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
    const mBlock = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0, transparent: true, opacity: 0 });
    const mEdge = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
    const mWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    mBlock.color.set(def.kind === 'db' ? pal.disc : pal.block); mEdge.color.set(pal.edge);
    const layers = [], hits = [];
    const add = (geom, edgeGeom, y, parent = g, mat = mBlock) => {
      const mesh = new THREE.Mesh(geom, mat); mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); hits.push(mesh);
      if (edgeGeom) { const e = new THREE.LineSegments(edgeGeom, mEdge); e.position.y = y; parent.add(e); }
      return mesh;
    };
    const slab = (w, d, h, r) => { const k = `slab${w},${d},${h},${r}`; return [geo(k, () => roundedSlab(w, d, h, r)), geo(k + 'e', () => new THREE.EdgesGeometry(GEO[k], 30))]; };
    let top = 0;
    const k = def.kind;
    if (k === 'server') {
      const [sg, se] = slab(1.5, 1.5, 0.3, 0.14);
      const slot = geo('slot', () => new THREE.BoxGeometry(0.02, 0.05, 0.34));
      for (let i = 0; i < 3; i++) {
        add(sg, se, i * 0.42);
        for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(slot, mWhite); m.position.set(0.78, i * 0.42 + 0.15, -0.15 + j * 0.4); g.add(m); }
      }
      top = 1.2;
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
    return { id, def, g, mBlock, mEdge, mWhite, layers, hits, top, glow, ring, pill, state: '', vis: 0, rise: -1.4, explode: 0, gone: false };
  }
  function disposePart(p) {
    scene.remove(p.g); p.mBlock.dispose(); p.mEdge.dispose(); p.mWhite.dispose(); p.glow.material.dispose(); p.ring.material.dispose(); p.pill.remove();
  }

  // ---- paths: L-shaped dashed lines on the floor, requests moving along them (instanced dots from one pool) ----
  const MAX_DOTS = 900;
  const dots = new THREE.InstancedMesh(geo('dot', () => new THREE.SphereGeometry(0.06, 12, 8)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_DOTS);
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
      if (old && !old.gone && old.def.kind === def.kind && (old.def.layers || 3) === (def.layers || 3)) {
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

  function setState({ parts: S = {}, paths: L = {}, labels: B = {}, speed: sp, explode = [], avoid = 0 } = {}) {
    for (const [id, p] of parts) p.state = S[id] || '';
    for (const [id, p] of paths) p.state = L[id] || L[p.b] || '';
    labels = B; if (sp != null) speed = sp; explodeIds = new Set(explode); avoidLeft = avoid;
  }

  // ---- camera ----
  const camGoal = { t: [0, 0], dist: 40, az: 45, el: 30, sx: 0.5, sy: 0.5 };
  const cam = { ...camGoal, t: [0, 0] };
  function setCamera(c, { instant = false } = {}) {
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
    const d = cam.dist * (phone ? 1.05 : 1) * Math.max(1, 1.45 / Math.max(camera.aspect, 0.6));
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
  function place(el, x, y, z, show) {
    const [sx, sy, sz] = project(x, y, z);
    const on = show && sz < 1 && sx > (W > 760 ? W * avoidLeft : -200) && sx < W - 30 && sy > 40 && sy < H - 20;
    el.style.opacity = on ? '' : '0';
    if (on) el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  }

  // ---- the loop ----
  const lerp = (a, b, k) => a + (b - a) * k;
  let last = performance.now(), running = true, raf = 0, dead = false;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 4.5);
    for (const key of ['dist', 'az', 'el', 'sx', 'sy']) cam[key] = lerp(cam[key], camGoal[key], k);
    cam.t = [lerp(cam.t[0], camGoal.t[0], k), lerp(cam.t[1], camGoal.t[1], k)];
    cam.phoneSy = camGoal.phoneSy; cam.phoneCentre = camGoal.phoneCentre;
    placeCamera(now);
    const s = reduced ? 1 : 1 - Math.exp(-dt * 5);

    for (const [id, p] of parts) {
      const hidden = p.gone || p.state === 'hidden', dim = p.state === 'dim';
      p.vis = lerp(p.vis, hidden ? 0 : dim ? 0.22 : 1, s);
      p.rise = lerp(p.rise, hidden ? -1.4 : 0, s);
      if (p.gone && p.vis < 0.02) { disposePart(p); parts.delete(id); continue; }
      p.g.position.y = p.rise; p.g.visible = p.vis > 0.02;
      const t = tone(p.state), hover = id === hoverId;
      col.set(t ? t.c : p.def.kind === 'db' ? pal.disc : pal.block); p.mBlock.color.lerp(col, s);
      col.set(t ? t.e : pal.blockE); p.mBlock.emissive.lerp(col, s);
      p.mBlock.emissiveIntensity = lerp(p.mBlock.emissiveIntensity, (t ? t.ei : pal.blockEI) + (hover ? 0.25 : 0), s);
      p.mBlock.opacity = 0.9 * p.vis;
      col.set(t ? t.edge : p.def.kind === 'db' ? pal.discEdge : pal.edge); p.mEdge.color.lerp(col, s);
      p.mEdge.opacity = 0.55 * p.vis; p.mWhite.opacity = 0.9 * p.vis;
      const alert = p.state === 'alert';
      if (t) p.glow.material.color.set(t.glow);
      p.glow.material.opacity = lerp(p.glow.material.opacity, (alert ? 0.42 + 0.1 * Math.sin(now * 0.004) : t ? 0.22 : 0) * p.vis, s);
      if (alert && !reduced) { const ph = (now * 0.0006) % 1; p.ring.material.color.set(t.glow); p.ring.scale.setScalar(0.8 + ph * 0.9); p.ring.material.opacity = 0.7 * (1 - ph); }
      else { p.ring.material.opacity = lerp(p.ring.material.opacity, 0, s); p.ring.scale.setScalar(1); }
      if (p.layers.length) { p.explode = lerp(p.explode, explodeIds.has(id) ? 1 : 0, s); p.layers.forEach((lg, i) => { lg.position.y = i * 0.62 * p.explode; }); }
      const l = labels[id];
      if (l) { const html = `<i class="led ${l[1] || ''}"></i><b>${l[2] ?? p.def.name}</b>${l[0] ? ` <span class="v ${l[1] || ''}">${l[0]}</span>` : ''}`; if (p.pill._h !== html) { p.pill.innerHTML = html; p.pill._h = html; } }
      place(p.pill, p.g.position.x, p.top + 0.45 + p.rise + (p.layers.length ? p.explode * 1.2 : 0), p.g.position.z, !!l && !hidden && !dim && p.vis > 0.6);
    }

    for (const p of paths.values()) {
      const st = p.state;
      p.op = lerp(p.op, 1, s);
      const op = (st === 'hidden' ? 0 : st === 'down' ? 0.12 : st === 'dim' ? 0.08 : st === 'ok' ? 0.75 : st === 'alert' || st === 'warn' ? 0.7 : pal.pathOp) * p.op;
      p.mat.opacity = lerp(p.mat.opacity, op, s);
      const t = tone(st);
      col.set(t ? t.dot : pal.path); p.mat.color.lerp(col, s);
      p.mat.dashSize = st === 'ok' ? 10 : 0.07;
      const show = st !== 'hidden' && st !== 'down' && st !== 'dim' && speed > 0 && p.op > 0.5;
      for (const d of p.dots) {
        if (!reduced) d.t = (d.t + dt * speed / p.len) % 1;
        if (!show) { dots.setMatrixAt(d.i, hiddenM); continue; }
        p.curve.getPointAt(d.t, tmpV);
        mtx.makeTranslation(tmpV.x, 0.08, tmpV.z); dots.setMatrixAt(d.i, mtx);
        dots.setColorAt(d.i, col.set(t ? t.dot : pal.dot));
      }
    }
    dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  const onVis = () => { if (dead) return; if (document.hidden) running = false; else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(loop);

  function destroy() {
    dead = true; running = false; cancelAnimationFrame(raf);
    removeEventListener('resize', resize); ro?.disconnect(); themeObs.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    canvas.removeEventListener('click', onClick); canvas.removeEventListener('pointermove', onMove);
    for (const p of parts.values()) disposePart(p);
    for (const p of paths.values()) disposePath(p);
    dots.material.dispose(); ground.geometry.dispose(); ground.material.dispose(); grid.geometry.dispose(); grid.material.dispose();
    renderer.dispose(); renderer.forceContextLoss(); overlay.replaceChildren();
  }
  return { setSystem, setState, setCamera, frame, onPick: (cb) => { pickCb = cb; }, destroy };
}

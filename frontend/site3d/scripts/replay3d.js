// The learner's own design as a 3D system, and its state at each minute of a replay (phase 3 of tech-katta-context 49).
// Plain functions, so a test can import them: the canvas side (src/solve/replay3d.jsx) feeds them to world.js.

// design: { nodes: [{ id, type, name, x, y, config }], edges: [{ from, to }] }, positions in the canvas's units
const KIND = { client: 'laptop', cdn: 'globe', lb: 'lb', apigw: 'lb', server: 'server', processor: 'server', realtime: 'server', scheduler: 'server',
  cache: 'cache', database: 'db', coord: 'db', queue: 'queue', stream: 'kafka', pubsub: 'kafka', external: 'small' };
export const kindOf = (type) => KIND[type] || 'small';
/** world units per 60 canvas units: a design of 5-12 parts fills the view like the simulator's systems */
export const SCALE = 60;

/** `nameOf(id)` gives a part its catalogue name when the learner has not named it */
export function systemOf(design, nameOf) {
  const nodes = design?.nodes || [];
  if (!nodes.length) return { parts: {}, paths: {} };
  const xs = nodes.map((n) => n.x || 0), ys = nodes.map((n) => n.y || 0);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const parts = Object.fromEntries(nodes.map((n) => [n.id, {
    kind: kindOf(n.type), x: ((n.x || 0) - cx) / SCALE, z: ((n.y || 0) - cy) / SCALE, name: n.name || nameOf?.(n.id) || undefined,
    ...(n.type === 'database' && n.config?.replicas ? { layers: 2 } : {}) }]));
  const paths = Object.fromEntries((design.edges || []).filter((e) => parts[e.from] && parts[e.to]).map((e, i) => [`e${i}`, [e.from, e.to]]));
  return { parts, paths };
}

const OK_BELOW = 0.7;
/** the state of every part at one minute of a replay. `at` is replayAt(rep, P) (src/solve/v2.jsx): per node { rho, up, inst, backlog, held, peak, fo, warm,
 *  fresh }, and arrows['from>to'] (calls a second). Colour comes only from state: ok, warn (busy, load of 70 % or more) and alert (down, or
 *  over its limit). `explode` lists the parts that crashed in this very minute (the picture takes them apart once; a scrub inside the
 *  outage, or back before it, does not repeat it). */
export function stateAt(at, design) {
  const parts = {}, labels = {}, fill = {}, explode = [], paths = {};
  for (const n of design?.nodes || []) {
    const r = at?.nodes?.[n.id];
    if (!r) { parts[n.id] = 'dim'; continue; }
    const down = r.up === 0;
    parts[n.id] = down || r.rho > 1 ? 'alert' : r.rho >= OK_BELOW ? 'warn' : 'ok';
    if (down && r.fresh?.includes('crashed')) explode.push(n.id);
    if (r.backlog > 0 && r.peak > 0) fill[n.id] = Math.min(1, r.backlog / r.peak);
    const load = `${Math.round((r.rho || 0) * 100)}%${r.inst ? ` · ${r.inst}×` : ''}`;
    labels[n.id] = down ? ['DOWN', 'alert']
      : r.fo ? ['standby took over', 'warn']
      : n.type === 'cache' && r.warm < 1 ? [`warming ${Math.round(r.warm * 100)}%`, 'warn']
      : [load, parts[n.id]];
  }
  let busiest = 1;
  for (const e of design?.edges || []) {
    const calls = at?.arrows?.[`${e.from}>${e.to}`] || 0;
    busiest = Math.max(busiest, calls);
  }
  (design?.edges || []).forEach((e, i) => {
    const calls = at?.arrows?.[`${e.from}>${e.to}`] || 0;
    paths[`e${i}`] = calls > 0 && parts[e.from] !== 'alert' && parts[e.to] !== 'alert' ? 'ok' : 'dim';
  });
  return { parts, paths, labels, fill, explode, speed: 0.6 + 1.6 * Math.min(1, busiest / 50000) };
}

/** a watched request: the part it is at now is lit, the others dimmed, the path it travels runs */
export function stateOfHop(design, hop) {
  const parts = {}, labels = {}, paths = {};
  for (const n of design?.nodes || []) parts[n.id] = hop && n.id === hop.at ? 'warn' : 'dim';
  (design?.edges || []).forEach((e, i) => { paths[`e${i}`] = hop && (e.to === hop.at || e.from === hop.at) ? 'ok' : 'dim'; });
  return { parts, paths, labels, fill: {}, explode: [], speed: 1.2 };
}

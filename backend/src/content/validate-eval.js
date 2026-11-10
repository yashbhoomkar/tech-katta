// Checks content/eval.json, the v2 evaluator's catalogue (tech-katta-context/evaluator.md §5.4, §5.6), against
// lab.json. Every number the evaluator reads must be a finite value of the right sign and every setting the right
// shape, so a typo fails at deploy instead of judging designs wrongly.

export const CAPS = new Set(['get', 'range', 'index', 'unique', 'cas', 'tx', 'geo', 'text', 'agg', 'scan', 'ttl', 'blob', 'counter', 'zset', 'cdc', 'durable']);
export const SETTING_KINDS = new Set(['number', 'choice', 'bool', 'size', 'fields', 'engine', 'schema', 'structures']);
const WORK_KEYS = ['pass', 'handle', 'enqueue', 'consume', 'get', 'put', 'update', 'incr', 'rank', 'indexRead', 'indexWrite', 'geo', 'text', 'rowsPerUnit', 'scanRowsPerUnit', 'txFactor', 'casFactorCassandra', 'blobPerMB', 'cpuMsPerUnit'];
const LIMIT_KEYS = ['nodes', 'hopsPerOperation', 'operations', 'ticks'];
const KEY = /^[a-z][A-Za-z0-9]{0,30}$/;
const OPTION = /^[a-z][A-Za-z0-9-]{0,30}$/;

const obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pos = (v) => num(v) && v > 0;
const text = (v) => typeof v === 'string' && v.trim() !== '';
const posInt = (v) => Number.isInteger(v) && v > 0;

function checkSetting(s, at, comp, problems) {
  if (!obj(s)) { problems.push(`${at}: must be an object`); return; }
  if (typeof s.key !== 'string' || !KEY.test(s.key)) problems.push(`${at}: key must be a short camelCase name`);
  if (!text(s.label)) problems.push(`${at}: needs a label`);
  if (s.help !== undefined && !text(s.help)) problems.push(`${at}: help must be text`);
  if (!SETTING_KINDS.has(s.kind)) { problems.push(`${at}: kind must be one of ${[...SETTING_KINDS].join(', ')}`); return; }
  if (s.kind === 'number') {
    if (!num(s.min) || !num(s.max) || !num(s.default) || s.min > s.default || s.default > s.max) problems.push(`${at}: a number needs min ≤ default ≤ max`);
    if (s.step !== undefined && s.step !== 1) problems.push(`${at}: step can only be 1 (whole numbers)`);
  }
  if (s.kind === 'bool' && typeof s.default !== 'boolean') problems.push(`${at}: a bool needs a true or false default`);
  if (s.kind === 'choice') {
    const ids = Array.isArray(s.options) ? s.options.map((o) => o && o.id) : [];
    if (!ids.length || !ids.every((id) => typeof id === 'string' && OPTION.test(id)) || new Set(ids).size !== ids.length) problems.push(`${at}: a choice needs options with unique ids`);
    else if (!s.options.every((o) => text(o.label) && (o.desc === undefined || text(o.desc)))) problems.push(`${at}: every option needs a label`);
    if (!ids.includes(s.default)) problems.push(`${at}: default must be one of the options`);
  }
  if (s.kind === 'size' && !Array.isArray(comp?.sizes)) problems.push(`${at}: a size setting needs sizes on the lab.json component`);
  if (s.kind === 'engine' && !Array.isArray(comp?.engines)) problems.push(`${at}: an engine setting needs engines on the lab.json component`);
}

// problems: the list to add to. Returns it.
export function validateEval(ev, lab, problems = []) {
  const at = 'eval.json';
  if (!obj(ev)) { problems.push(`${at}: must be an object`); return problems; }
  if (ev.v !== 2) problems.push(`${at}: v must be 2`);
  for (const k of ['tickMinutes', 'longTickMinutes']) if (!posInt(ev[k]) || 60 % ev[k]) problems.push(`${at}: ${k} must be a whole number of minutes that divides an hour`);
  if (!(Number.isInteger(ev.retries) && ev.retries >= 0 && ev.retries <= 5)) problems.push(`${at}: retries must be a whole number from 0 to 5`);
  for (const k of ['clientTimeoutMs', 'scanLimit', 'sortLimit']) if (!pos(ev[k])) problems.push(`${at}: ${k} must be above 0`);
  if (!(num(ev.egressPerGb) && ev.egressPerGb >= 0)) problems.push(`${at}: egressPerGb must be 0 or more`);
  for (const k of LIMIT_KEYS) if (!posInt(ev.limits?.[k])) problems.push(`${at}: limits.${k} must be a whole number above 0`);
  for (const k of WORK_KEYS) if (!pos(ev.work?.[k])) problems.push(`${at}: work.${k} must be above 0`);

  const labTypes = new Map((lab?.components || []).filter((c) => c && typeof c.type === 'string').map((c) => [c.type, c]));
  const engines = labTypes.get('database')?.engines || [];
  const engineIds = new Set(engines.map((e) => e.id));
  if (!obj(ev.engines)) problems.push(`${at}: engines must be an object`);
  else {
    for (const id of engineIds) if (!obj(ev.engines[id])) problems.push(`${at}: engines.${id} is missing (every lab.json engine needs capabilities)`);
    for (const [id, e] of Object.entries(ev.engines)) {
      const w = `${at}: engines.${id}`;
      if (!engineIds.has(id)) { problems.push(`${w} is not an engine in lab.json`); continue; }
      if (!obj(e)) { problems.push(`${w} must be an object`); continue; }
      if (!Array.isArray(e.caps) || !e.caps.length || !e.caps.every((c) => CAPS.has(c)) || new Set(e.caps).size !== e.caps.length) problems.push(`${w}.caps must list known capabilities once each`);
      if (!(num(e.storagePerGbMonth) && e.storagePerGbMonth >= 0)) problems.push(`${w}.storagePerGbMonth must be 0 or more`);
      if (!(e.maxStorageGb === null || pos(e.maxStorageGb))) problems.push(`${w}.maxStorageGb must be above 0, or null for no limit`);
      for (const k of ['replicaLagSec', 'refreshSec']) if (e[k] !== undefined && !(num(e[k]) && e[k] >= 0)) problems.push(`${w}.${k} must be 0 or more`);
      if (e.uniqueOnKey !== undefined && typeof e.uniqueOnKey !== 'boolean') problems.push(`${w}.uniqueOnKey must be true or false`);
    }
  }

  if (!Array.isArray(ev.components) || !ev.components.length) { problems.push(`${at}: components must be a non-empty list`); return problems; }
  const types = ev.components.map((c) => c && c.type);
  if (new Set(types).size !== types.length) problems.push(`${at}: components has a duplicate type`);
  // a type is known when lab.json has it, or eval.json defines it on its own (v2only: phase 4's new types)
  const known = new Set(ev.components.filter((c) => c && (labTypes.has(c.type) || c.v2only === true)).map((c) => c.type));
  ev.components.forEach((c, i) => {
    const w = `${at}: components[${i}]${c && c.type ? ` (${c.type})` : ''}`;
    if (!obj(c)) { problems.push(`${w}: must be an object`); return; }
    if (c.v2only !== undefined && c.v2only !== true) problems.push(`${w}: v2only must be true when given`);
    if (c.palette !== undefined && typeof c.palette !== 'boolean') problems.push(`${w}: palette must be true or false`);
    if (c.v2only && labTypes.has(c.type)) { problems.push(`${w}: v2only, but lab.json has this type`); return; }
    // a v2-only type brings its own name, description and numbers (it is its own lab.json entry)
    const lc = c.v2only ? c : labTypes.get(c.type);
    if (!lc) { problems.push(`${w}: type is not a component in lab.json (mark a new type v2only and give its numbers)`); return; }
    if (c.v2only) {
      if (!text(c.name) || !text(c.desc)) problems.push(`${w}: a v2only type needs a name and a desc`);
      if (!(num(c.latencyMs) && c.latencyMs >= 0)) problems.push(`${w}: a v2only type needs latencyMs (0 or more)`);
      if (c.limitRps !== undefined && !pos(c.limitRps)) problems.push(`${w}: limitRps must be above 0`);
      if (c.sizes !== undefined && !(Array.isArray(c.sizes) && c.sizes.length && c.sizes.every((z) => obj(z) && text(z.id) && text(z.label) && num(z.hourly) && z.hourly >= 0))) problems.push(`${w}: sizes need id, label and hourly`);
      if (c.sizes && !c.sizes.some((z) => z.id === c.defaultSize)) problems.push(`${w}: defaultSize must be one of its sizes`);
    }
    if (!text(c.group)) problems.push(`${w}: needs a group`);
    if (c.managed !== undefined && typeof c.managed !== 'boolean') problems.push(`${w}: managed must be true or false`);
    if (!Array.isArray(c.to) || !c.to.every((t) => known.has(t)) || new Set(c.to).size !== c.to.length) problems.push(`${w}: to must list known types once each`);
    if (c.toIf !== undefined) {
      if (!obj(c.toIf)) problems.push(`${w}: toIf must be an object`);
      else for (const [t, cond] of Object.entries(c.toIf)) {
        if (!(c.to || []).includes(t)) problems.push(`${w}: toIf.${t} is not in to`);
        if (!obj(cond) || !Object.values(cond).every((v) => Array.isArray(v) && v.length && v.every(text))) problems.push(`${w}: toIf.${t} must map setting keys to lists of allowed values`);
      }
    }
    if (c.toCdc !== undefined && (c.toCdc !== true || c.type !== 'database')) problems.push(`${w}: toCdc is only for the database, and must be true`);
    if (!Array.isArray(c.settings)) { problems.push(`${w}: settings must be a list`); return; }
    c.settings.forEach((s, j) => checkSetting(s, `${w} settings[${j}]`, lc, problems));
    const keys = c.settings.map((s) => s && s.key);
    if (new Set(keys).size !== keys.length) problems.push(`${w}: two settings have the same key`);
    if (c.sizeExtras !== undefined) {
      const ids = new Set((lc.sizes || []).map((s) => s.id));
      if (!obj(c.sizeExtras)) problems.push(`${w}: sizeExtras must be an object`);
      else for (const [id, x] of Object.entries(c.sizeExtras)) {
        if (!ids.has(id)) problems.push(`${w}: sizeExtras.${id} is not a size of ${c.type}`);
        if (!obj(x) || !Object.values(x).every(pos)) problems.push(`${w}: sizeExtras.${id} must hold numbers above 0`);
      }
    }
    // a cache's hit rate needs its memory (evaluator.md §8.6)
    if (c.type === 'cache') for (const s of lc.sizes || []) if (!pos(c.sizeExtras?.[s.id]?.memoryGb)) problems.push(`${w}: sizeExtras.${s.id}.memoryGb is needed for the hit rate`);
  });
  return problems;
}

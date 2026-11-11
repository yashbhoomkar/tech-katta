// Checks a v2 problem (practice.v === 2; tech-katta-context/evaluator.md §6, §12.2): entities, operations,
// tests, designs. Rubric and hints are checked by the same code as v1 (validate.js passes it in).
// `lab` here is the Lab catalogue with the v2 catalogue on `lab.eval`.
import { TYPES, schemaIssues } from '../../../frontend/src/lab/schema.js';
import { cleanDesign2, configOf } from '../../../frontend/src/eval/design.js';
import { engineOfNode, stepFields, isWrite } from '../../../frontend/src/eval/access.js';

const obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim() !== '';
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const list = (v) => (Array.isArray(v) ? v : []);
const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const ENTITY = /^[a-z][a-z0-9_]{0,30}$/;
const FIELD_TYPES = new Set(TYPES.map((t) => t[0]));
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export const STEP_OPS2 = new Set(['get', 'query', 'sum', 'put', 'update', 'tx', 'blob', 'incr', 'rank', 'compute', 'publish', 'call']);
const READING = new Set(['get', 'query', 'sum', 'rank', 'compute', 'call']);
export const FAULT_KINDS = new Set(['crash', 'instanceCrash', 'groupDown', 'zoneDown', 'slow', 'spike', 'cacheFlush', 'externalDown', 'hotKey', 'poison', 'abuse']);
export const CHECK_KINDS2 = new Set(['slo', 'completes', 'fresh', 'noCrash', 'noLostWrites', 'noDuplicates', 'ordered', 'atomic', 'fits', 'cost', 'has']);
const V1_ONLY = new Set(['availability', 'p99', 'requires', 'redundant', 'multiAz', 'role']);

// The design as validation compares it: the keys cleanDesign2 keeps, in the same order.
const normal = (d) => ({
  nodes: list(d?.nodes).map((n) => ({ id: n?.id, type: n?.type, x: n?.x ?? 0, y: n?.y ?? 0, ...(n?.name ? { name: n.name } : {}), config: n?.config ?? {} })),
  edges: list(d?.edges).map((e) => ({ from: e?.from, to: e?.to, ...(e?.carries ? { carries: e.carries } : {}) })),
});

// JSON with object keys sorted: the order a setting was written in does not matter
const canon = (v) => JSON.stringify(v, (k, x) => (obj(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));

function checkDesign(d, lab, opIds, w, problems, { schemas = false } = {}) {
  if (!obj(d) || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) { problems.push(`${w}: needs nodes and edges`); return; }
  const clean = cleanDesign2(d, lab, opIds);
  if (canon(clean) !== canon(normal(d))) problems.push(`${w}: cleaning it changes it (an unknown type, a bad setting, an arrow the canvas refuses, or a duplicate)`);
  if (!d.nodes.some((n) => n?.type === 'client')) problems.push(`${w}: needs the Clients`);
  if (schemas) for (const n of clean.nodes) {
    if (n.type !== 'database') continue;
    for (const x of schemaIssues(engineOfNode(n, lab), configOf(n, lab).schema).filter((y) => y.level === 'error')) problems.push(`${w}: ${n.id}: ${x.text}`);
  }
}

function checkStep(s, entities, w, problems, ids, inTx = false) {
  if (!obj(s) || !ID.test(s.id || '') || !STEP_OPS2.has(s.op)) { problems.push(`${w}: a step needs an id and an op (${[...STEP_OPS2].join(', ')})`); return; }
  if (ids.has(s.id)) problems.push(`${w}: duplicate step ${s.id}`);
  ids.add(s.id);
  if (s.times !== undefined && !(num(s.times) && s.times > 0)) problems.push(`${w}: step ${s.id}: times must be above 0`);
  if (s.timing !== undefined && !['sync', 'defer'].includes(s.timing)) problems.push(`${w}: step ${s.id}: timing is sync or defer`);
  if (s.withinSec !== undefined && !(num(s.withinSec) && s.withinSec > 0)) problems.push(`${w}: step ${s.id}: withinSec must be above 0`);
  if (s.op === 'tx') {
    if (inTx || !list(s.steps).length) problems.push(`${w}: step ${s.id}: a transaction lists put and update steps`);
    else for (const x of s.steps) { if (!['put', 'update'].includes(x?.op)) problems.push(`${w}: step ${s.id}: a transaction holds only put and update steps`); checkStep(x, entities, w, problems, ids, true); }
    return;
  }
  if (s.op === 'compute') { if (!(num(s.cpuMs) && s.cpuMs >= 0) || !text(s.label)) problems.push(`${w}: step ${s.id}: compute needs cpuMs and a label`); return; }
  if (s.op === 'call') { if (!text(s.preset) || !text(s.label)) problems.push(`${w}: step ${s.id}: call needs a preset and a label`); return; }
  if (s.op === 'publish') { if (!obj(s.audience) || !num(s.audience.avg)) problems.push(`${w}: step ${s.id}: publish needs audience.avg`); return; }
  const e = entities[s.entity];
  if (!e) { problems.push(`${w}: step ${s.id}: entity ${s.entity} is not in entities`); return; }
  const need = { get: ['by', 'fields'], query: ['fields'], put: ['values'], update: ['by'], blob: ['key', 'field', 'mode'], sum: ['field'], incr: ['by', 'field'], rank: ['order'] }[s.op];
  for (const k of need) if (s[k] === undefined) problems.push(`${w}: step ${s.id}: ${s.op} needs ${k}`);
  for (const k of ['by', 'where', 'values', 'set', 'add', 'key', 'cond', 'of']) if (s[k] !== undefined && !obj(s[k])) problems.push(`${w}: step ${s.id}: ${k} must be an object`);
  if (s.mode !== undefined && !['put', 'get'].includes(s.mode)) problems.push(`${w}: step ${s.id}: mode is put or get`);
  if (s.limit !== undefined && !(Number.isInteger(s.limit) && s.limit > 0)) problems.push(`${w}: step ${s.id}: limit must be a whole number`);
  if (s.matches !== undefined && !(num(s.matches) && s.matches > 0)) problems.push(`${w}: step ${s.id}: matches must be above 0`);
  if (s.unique !== undefined && !(Array.isArray(s.unique) && s.unique.length && s.unique.every(text))) problems.push(`${w}: step ${s.id}: unique must list fields`);
  const missing = stepFields(s).filter((f) => !Object.hasOwn(e.fields || {}, f));
  if (missing.length) problems.push(`${w}: step ${s.id}: ${missing.join(', ')} not among ${s.entity}'s fields`);
}

export function validatePractice2(p, lab, at, problems, validateRubricHints) {
  if (!obj(lab?.eval)) { problems.push(`${at}: v 2 needs content/eval.json`); return; }
  if (!text(p.brief)) problems.push(`${at}: needs brief`);
  if (p.referenceNote !== undefined && !text(p.referenceNote)) problems.push(`${at}: referenceNote must be text`);

  // entities
  const entities = obj(p.entities) ? p.entities : {};
  if (!Object.keys(entities).length) problems.push(`${at}: entities must name the problem's data`);
  for (const [k, e] of Object.entries(entities)) {
    const w = `${at} entity ${k}`;
    if (!ENTITY.test(k)) problems.push(`${w}: name must be lowercase letters, digits and _`);
    if (!obj(e)) { problems.push(`${w}: must be an object`); continue; }
    if (!(num(e.rows) && e.rows > 0)) problems.push(`${w}: rows must be above 0`);
    if (!(num(e.rowBytes) && e.rowBytes > 0)) problems.push(`${w}: rowBytes must be above 0`);
    if (e.growthPerDay !== undefined && !(num(e.growthPerDay) && e.growthPerDay >= 0)) problems.push(`${w}: growthPerDay must be 0 or more`);
    if (e.expires !== undefined && typeof e.expires !== 'boolean') problems.push(`${w}: expires must be true or false`);
    if (!obj(e.fields) || !Object.keys(e.fields).length || !Object.values(e.fields).every((t) => FIELD_TYPES.has(t))) problems.push(`${w}: fields must map names to types (${[...FIELD_TYPES].join(', ')})`);
    const rows = list(e.sample);
    if (rows.length < 2 || !rows.every(obj)) problems.push(`${w}: sample needs at least 2 rows`);
    else if (obj(e.fields) && rows.some((r) => Object.keys(r).some((f) => !Object.hasOwn(e.fields, f)))) problems.push(`${w}: sample rows use fields not in fields`);
  }
  if (p.aliases !== undefined && !(obj(p.aliases) && Object.values(p.aliases).every((a) => Array.isArray(a) && a.every(text)))) problems.push(`${at}: aliases must map fields to lists of names`);

  // operations
  const ops = list(p.operations), opIds = new Set();
  if (!ops.length) problems.push(`${at}: operations must be a non-empty list`);
  if (ops.length > (lab.eval.limits?.operations || 12)) problems.push(`${at}: at most ${lab.eval.limits?.operations || 12} operations`);
  let shares = 0;
  for (const [i, o] of ops.entries()) {
    const w = `${at} operation ${o?.id || i}`;
    if (!obj(o) || !ID.test(o.id || '')) { problems.push(`${w}: needs an id`); continue; }
    if (opIds.has(o.id)) problems.push(`${w}: duplicate id`);
    opIds.add(o.id);
    if (!text(o.name)) problems.push(`${w}: needs a name`);
    if (!['read', 'write', 'connect'].includes(o.kind)) problems.push(`${w}: kind is read, write or connect`);
    if (o.source !== undefined && !['clients', 'external', 'schedule'].includes(o.source)) problems.push(`${w}: source is clients, external or schedule`);
    if (!obj(o.request) || !METHODS.has(o.request.method) || typeof o.request.path !== 'string' || !o.request.path.startsWith('/') || (o.request.body !== undefined && !obj(o.request.body))) problems.push(`${w}: request needs a method, a path starting with / and an optional JSON body`);
    if (!(num(o.share) && o.share >= 0)) problems.push(`${w}: share must be 0 or more`);
    else if (!o.source || o.source === 'clients') shares += o.share;
    if (o.perSec !== undefined && !(o.source === 'schedule' && num(o.perSec) && o.perSec > 0)) problems.push(`${w}: perSec (jobs a second) is only for a scheduled operation, and must be above 0`);
    for (const k of ['bytesIn', 'bytesOut']) if (o[k] !== undefined && !(num(o[k]) && o[k] > 0)) problems.push(`${w}: ${k} must be above 0`);
    if (o.keys !== undefined && !(obj(o.keys) && Object.hasOwn(entities, o.keys.entity) && ['zipf', 'uniform'].includes(o.keys.skew) && (o.keys.active === undefined || (num(o.keys.active) && o.keys.active > 0)))) problems.push(`${w}: keys needs a known entity, skew zipf or uniform, and active above 0`);
    if (obj(o.keys) && o.keys.hot !== undefined && !(num(o.keys.hot) && o.keys.hot > 0 && o.keys.hot <= 1)) problems.push(`${w}: keys.hot (the share of calls for one item) must be above 0 and at most 1`);
    if (o.cacheable !== undefined && !(obj(o.cacheable) && num(o.cacheable.ttlSec) && o.cacheable.ttlSec > 0)) problems.push(`${w}: cacheable needs ttlSec above 0`);
    if (o.slo !== undefined && !(obj(o.slo) && (o.slo.availability === undefined || (num(o.slo.availability) && o.slo.availability > 0 && o.slo.availability <= 100)) && (o.slo.p99Ms === undefined || (num(o.slo.p99Ms) && o.slo.p99Ms > 0)))) problems.push(`${w}: slo needs availability (0–100] and p99Ms above 0`);
    if (o.consistency !== undefined && o.consistency !== 'strong' && !(obj(o.consistency) && num(o.consistency.maxStalenessSec) && o.consistency.maxStalenessSec > 0)) problems.push(`${w}: consistency is "strong" or {maxStalenessSec}`);
    if (o.effect !== undefined && o.effect !== 'once') problems.push(`${w}: effect can only be "once"`);
    for (const k of ['durable', 'live', 'sample']) if (o[k] !== undefined && typeof o[k] !== 'boolean') problems.push(`${w}: ${k} must be true or false`);
    if (!obj(o.respond) || !(Number.isInteger(o.respond.status) && o.respond.status >= 100 && o.respond.status < 600) || o.respond.body === undefined) problems.push(`${w}: respond needs a status and a body`);
    const steps = list(o.steps), ids = new Set();
    if (!steps.length) problems.push(`${w}: steps must be a non-empty list`);
    for (const s of steps) checkStep(s, entities, w, problems, ids);
    if (o.kind === 'read' && steps.some((s) => s && (isWrite(s) || (!READING.has(s.op) && !(s.op === 'blob' && s.mode === 'get'))))) problems.push(`${w}: a read operation may only read`);
  }
  if (ops.length && Math.abs(shares - 1) > 0.001) problems.push(`${at}: the shares of the Clients' operations must add up to 1 (they add up to ${+shares.toFixed(4)})`);

  // tests
  const tests = list(p.tests), testIds = new Set(), patterns = new Set(list(lab.components?.find((c) => c?.type === 'client')?.patterns).map((x) => x?.id));
  const types = new Set(list(lab.eval.components).map((c) => c?.type));
  if (!tests.length) problems.push(`${at}: tests must be a non-empty list`);
  for (const [i, t] of tests.entries()) {
    const w = `${at} test ${t?.id || i}`;
    if (!obj(t) || !ID.test(t.id || '')) { problems.push(`${w}: needs an id`); continue; }
    if (testIds.has(t.id)) problems.push(`${w}: duplicate id`);
    testIds.add(t.id);
    for (const k of ['name', 'desc']) if (!text(t[k])) problems.push(`${w}: needs ${k}`);
    if (t.sample !== undefined && typeof t.sample !== 'boolean') problems.push(`${w}: sample must be true or false`);
    if (t.op !== undefined) { if (!opIds.has(t.op)) problems.push(`${w}: op ${t.op} is not an operation`); continue; }
    if (!(num(t.hours) && t.hours > 0 && t.hours <= 48)) { problems.push(`${w}: hours must be above 0 and at most 48 (or give op for a trace test)`); continue; }
    if (!(num(t.startHour) && t.startHour >= 0 && t.startHour < 24)) problems.push(`${w}: startHour must be from 0 to under 24`);
    if (!obj(t.traffic) || !(num(t.traffic.rps) && t.traffic.rps > 0) || !patterns.has(t.traffic.pattern)) problems.push(`${w}: traffic needs rps above 0 and a Clients pattern`);
    const tick = t.hours <= 6 ? lab.eval.tickMinutes : lab.eval.longTickMinutes, end = t.hours * 60;
    const inside = (m) => num(m) && m >= 0 && m % tick === 0 && m < end;
    for (const f of list(t.faults)) {
      if (!obj(f) || !FAULT_KINDS.has(f.kind)) { problems.push(`${w}: unknown fault ${f?.kind}`); continue; }
      if (!inside(f.minute)) problems.push(`${w}: fault ${f.kind}: minute must be a multiple of ${tick} inside the test`);
      if (f.minutes !== undefined && !(num(f.minutes) && f.minutes >= tick)) problems.push(`${w}: fault ${f.kind}: minutes must be at least ${tick}`);
      if (['crash', 'instanceCrash', 'groupDown', 'slow'].includes(f.kind) && f.type !== undefined && !types.has(f.type)) problems.push(`${w}: fault ${f.kind}: type ${f.type} is not a component type`);
      if (['crash', 'groupDown'].includes(f.kind) && f.type === undefined) problems.push(`${w}: fault ${f.kind} needs a type`);
      if (['slow', 'spike'].includes(f.kind) && f.factor !== undefined && !(num(f.factor) && f.factor > 0)) problems.push(`${w}: fault ${f.kind}: factor must be above 0`);
      if (f.op !== undefined && !opIds.has(f.op)) problems.push(`${w}: fault ${f.kind}: op ${f.op} is not an operation`);
      if (['hotKey', 'poison'].includes(f.kind) && f.share !== undefined && !(num(f.share) && f.share > 0 && f.share <= 1)) problems.push(`${w}: fault ${f.kind}: share must be above 0 and at most 1`);
    }
    for (const c of list(t.chaos)) if (!(obj(c) && inside(c.minute) && types.has(c.type))) problems.push(`${w}: a chaos event needs a minute (a multiple of ${tick} inside the test) and a component type`);
    if (!list(t.checks).length) problems.push(`${w}: checks must be a non-empty list`);
    for (const c of list(t.checks)) {
      if (!obj(c) || !CHECK_KINDS2.has(c.kind)) { problems.push(`${w}: ${V1_ONLY.has(c?.kind) ? `check ${c.kind} is v1 only (use slo, or a fault)` : `unknown check ${c?.kind}`}`); continue; }
      if (c.op !== undefined && !opIds.has(c.op)) problems.push(`${w}: check ${c.kind}: op ${c.op} is not an operation`);
      if (c.availability !== undefined && !(num(c.availability) && c.availability > 0 && c.availability <= 100)) problems.push(`${w}: check ${c.kind}: availability must be above 0 and at most 100`);
      for (const k of ['p99Ms', 'withinSec']) if (c[k] !== undefined && !(num(c[k]) && c[k] > 0)) problems.push(`${w}: check ${c.kind}: ${k} must be above 0`);
      if ((c.from !== undefined || c.to !== undefined) && !(inside(c.from ?? 0) && num(c.to ?? end) && (c.to ?? end) > (c.from ?? 0) && (c.to ?? end) <= end && (c.to ?? end) % tick === 0)) problems.push(`${w}: check ${c.kind}: a window needs from < to, multiples of ${tick} inside the test`);
      if (c.kind === 'cost' && !(num(c.max) && c.max > 0)) problems.push(`${w}: cost needs max above 0`);
      if (['has', 'noCrash'].includes(c.kind) && c.type !== undefined && !types.has(c.type)) problems.push(`${w}: check ${c.kind}: type ${c.type} is not a component type`);
      if (c.kind === 'has' && c.type === undefined) problems.push(`${w}: has needs a type`);
    }
  }
  for (const o of ops) if (o && ID.test(o.id || '') && !tests.some((t) => t?.op === o.id)) problems.push(`${at}: operation ${o.id} has no trace test`);
  if (!tests.some((t) => t?.op && t.sample === true)) problems.push(`${at}: at least one trace test needs sample: true`);
  if (!tests.some((t) => t && !t.op && t.sample === true)) problems.push(`${at}: at least one load test needs sample: true`);

  // designs
  const ids = [...opIds];
  checkDesign(p.start, lab, ids, `${at} start`, problems);
  checkDesign(p.reference, lab, ids, `${at} reference`, problems, { schemas: true });
  for (const [i, w] of list(p.wrong).entries()) {
    if (!obj(w) || !text(w.name) || !text(w.why) || !testIds.has(w.fails)) { problems.push(`${at} wrong design ${i}: needs name, why and fails (a test id)`); continue; }
    checkDesign(w, lab, ids, `${at} wrong design ${w.name}`, problems);
  }
  if (!list(p.wrong).length) problems.push(`${at}: needs at least one wrong design to calibrate the tests`);
  if (p.locked !== undefined && !(Array.isArray(p.locked) && p.locked.every((id) => list(p.start?.nodes).some((n) => n?.id === id)))) problems.push(`${at}: locked must list ids of nodes in start`);
  if (p.mutantsAllowed !== undefined && !(Array.isArray(p.mutantsAllowed) && p.mutantsAllowed.every(text))) problems.push(`${at}: mutantsAllowed must list mutant ids`);
  if (p.mutantsAllowedWhy !== undefined && !(obj(p.mutantsAllowedWhy) && Object.values(p.mutantsAllowedWhy).every(text))) problems.push(`${at}: mutantsAllowedWhy must map mutant ids to reasons`);
  validateRubricHints(p, at, problems);
}

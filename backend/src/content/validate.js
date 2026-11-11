import { cleanSchema, schemaIssues } from '../../../frontend/src/lab/schema.js';
import { validateEval } from './validate-eval.js';
import { validatePractice2 } from './validate-practice2.js';
import { FIGS } from './figs/index.js';
// Checks loaded content before the API serves it, so a typo in a JSON file is rejected at deploy
// (and at startup) instead of breaking the site. Returns a list of problems; empty means valid.
const BLOCKS = new Set(['tldr', 'example', 'fig', 'h2', 'h3', 'p', 'list', 'type', 'code', 'table', 'more', 'analogy', 'lab']);
// Figure ids the frontend can draw: one list per sub-tab in ./figs/<tab>/<sub-tab>.js (see ./figs/index.js).
export { FIGS };
export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const list = (v) => (Array.isArray(v) ? v : []);
const isText = (value) => typeof value === 'string' && value.trim() !== '';

// targets: the challenge ids and the problem slugs (articles with practice) a card may open.
function checkBlocks(blocks, where, problems, targets = { challenges: new Set(), problems: new Set() }) {
  if (!Array.isArray(blocks) || blocks.length === 0) { problems.push(`${where}: body must be a non-empty array`); return; }
  blocks.forEach((b, i) => {
    const at = `${where}[${i}]`;
    if (!b || !BLOCKS.has(b.t)) { problems.push(`${at}: unknown block type ${b && b.t}`); return; }
    if (['h2', 'h3', 'p', 'analogy'].includes(b.t) && !isText(b.x)) problems.push(`${at}: needs text x`);
    if (['list', 'tldr'].includes(b.t) && !(Array.isArray(b.items) && b.items.length && b.items.every(isText))) problems.push(`${at}: needs items`);
    if (b.t === 'fig') { if (!FIGS.has(b.id)) problems.push(`${at}: unknown figure ${b.id}`); if (!isText(b.cap)) problems.push(`${at}: needs cap`); }
    if (b.t === 'type') {
      for (const key of ['name', 'kind', 'what', 'use', 'avoid', 'ex']) if (!isText(b[key])) problems.push(`${at}: needs ${key}`);
      if (b.like !== undefined && !isText(b.like)) problems.push(`${at}: like must be text`);
      if (b.more !== undefined && !(Array.isArray(b.more) && b.more.length && b.more.every(isText))) problems.push(`${at}: more must be a list of paragraphs`);
    }
    if (b.t === 'code') for (const key of ['label', 'x', 'say']) if (!isText(b[key])) problems.push(`${at}: needs ${key}`);
    if (b.t === 'table') {
      if (!(Array.isArray(b.head) && b.head.length && b.head.every(isText))) problems.push(`${at}: head must be a list of column names`);
      if (!(Array.isArray(b.rows) && b.rows.length && b.rows.every((r) => Array.isArray(r) && r.length === list(b.head).length))) problems.push(`${at}: every row needs ${list(b.head).length} cells`);
      else if (!b.rows.every((r) => r.every(isText))) problems.push(`${at}: every cell needs text`);
    }
    if (b.t === 'table' && b.label !== undefined && !isText(b.label)) problems.push(`${at}: label must be text`);
    // "Try it on the canvas": to is "problems/<problem slug>" or "problems/challenge/<challenge id>" (dashboard routes)
    if (b.t === 'lab') {
      if (!isText(b.x)) problems.push(`${at}: needs text x`);
      if (b.go !== undefined && !isText(b.go)) problems.push(`${at}: go must be text`);
      const m = /^problems\/(?:challenge\/([a-z0-9-]+)|([a-z0-9][a-z0-9-]*))$/.exec(typeof b.to === 'string' ? b.to : '');
      if (!m) problems.push(`${at}: to must be "problems/<problem slug>" or "problems/challenge/<challenge id>"`);
      else if (m[1] && !targets.challenges.has(m[1])) problems.push(`${at}: unknown challenge ${m[1]}`);
      else if (m[2] && !targets.problems.has(m[2])) problems.push(`${at}: unknown problem ${m[2]}`);
    }
    if (b.t === 'more') { if (!isText(b.label)) problems.push(`${at}: needs label`); checkBlocks(b.body, `${at}.body`, problems, targets); }
  });
}

// A small shape checker for the JSON the frontend renders. A spec is 'text', 'number', 'bool',
// [spec] (a non-empty list), {tuple: [spec, ...]} (a fixed-length list), {oneOf: Set} or an object
// of specs (a key ending in '?' is optional). Everything the frontend reads is described here, so
// a missing or mistyped field fails at deploy instead of crashing the page.
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
function shape(value, spec, at, problems) {
  if (spec === 'text') { if (!isText(value)) problems.push(`${at}: needs text`); return; }
  if (spec === 'number') { if (!isNumber(value)) problems.push(`${at}: needs a number`); return; }
  if (spec === 'bool') { if (typeof value !== 'boolean') problems.push(`${at}: needs true or false`); return; }
  if (spec === 'textOrNull') { if (value !== null && !isText(value)) problems.push(`${at}: needs text or null`); return; }
  if (Array.isArray(spec)) {
    if (!Array.isArray(value) || value.length === 0) { problems.push(`${at}: needs a non-empty list`); return; }
    value.forEach((v, i) => shape(v, spec[0], `${at}[${i}]`, problems)); return;
  }
  if (spec.tuple) {
    if (!Array.isArray(value) || value.length !== spec.tuple.length) { problems.push(`${at}: needs a list of ${spec.tuple.length} values`); return; }
    spec.tuple.forEach((s, i) => shape(value[i], s, `${at}[${i}]`, problems)); return;
  }
  if (spec.oneOf) { if (!spec.oneOf.has(value)) problems.push(`${at}: must be one of ${[...spec.oneOf].join(', ')}`); return; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) { problems.push(`${at}: needs an object`); return; }
  for (const [rawKey, s] of Object.entries(spec)) {
    const optional = rawKey.endsWith('?'); const key = optional ? rawKey.slice(0, -1) : rawKey;
    if (optional && value[key] === undefined) continue;
    shape(value[key], s, `${at}.${key}`, problems);
  }
}
// Small animated diagrams on the landing page cards (Mini in frontend/src/main.jsx).
export const VISUALS = new Set(['cap', 'path', 'steps']);
const SITE = {
  brand: { name: 'text', descriptor: 'text', footer: 'text', footerNote: 'text' },
  nav: [{ tuple: ['text', 'text'] }],
  hero: { eyebrow: 'text', title: 'text', description: 'text', primary: 'text', 'primaryHref?': 'text', secondary: 'text', 'secondaryHref?': 'text', figure: 'text', status: 'text', caption: 'text' },
  // IND vs PAK on the landing page: a problem (an article with practice) on a canvas, judged by its example
  // traffic tests; phones get three controls instead of the canvas (lite).
  'landingLab?': { eyebrow: 'text', title: 'text', desc: 'text', problem: 'text', loading: 'text', run: 'text', running: 'text', pass: 'text', fail: 'text', open: 'text', openHref: 'text', note: 'text',
    'lock?': { title: 'text', text: 'text' },
    'lite?': Object.fromEntries(['diagram', 'viewers', 'viewersSub', 'cdnBox', 'cdnSub', 'lbBox', 'lbSub', 'lbSubCdn', 'serversBox', 'prewarmShort', 'autoShort', 'cdn', 'cdnHelp', 'servers', 'serversHelp', 'fewer', 'more', 'scaling', 'prewarm', 'auto', 'run', 'needCdn', 'full'].map((k) => [k, 'text'])) },
  'account?': { ...Object.fromEntries(['signedIn', 'saved', 'syncing', 'syncFailed', 'signInFailed', 'signOut', 'delete', 'deleteConfirm', 'privacy', 'menu'].map((k) => [k, 'text'])), 'keepStars?': 'text', 'googleBlocked?': 'text', 'signOutAll?': 'text', 'signOutAllConfirm?': 'text', 'adsMenu?': 'text', 'termsLink?': 'text', 'privacyLink?': 'text', 'agree?': 'text', 'and?': 'text', 'agreeFirst?': 'text', 'signIn?': 'text', 'pageLock?': { title: 'text', text: 'text' } },
  'privacy?': { eyebrow: 'text', title: 'text', updated: 'text', sections: [{ tuple: ['text', 'text'] }] },
  'terms?': { eyebrow: 'text', title: 'text', updated: 'text', sections: [{ tuple: ['text', 'text'] }] },
  'tour?': { button: 'text', next: 'text', back: 'text', skip: 'text', done: 'text', 'close?': 'text', dashboard: [{ target: 'text', title: 'text', text: 'text', 'click?': 'text', 'cta?': { label: 'text', href: 'text' } }], 'problem?': [{ target: 'text', title: 'text', text: 'text', 'click?': 'text', 'cta?': { label: 'text', href: 'text' } }], 'lab?': [{ target: 'text', title: 'text', text: 'text', 'click?': 'text', 'cta?': { label: 'text', href: 'text' } }] },
  'inside?': { eyebrow: 'text', title: 'text', desc: 'text', items: [{ kind: 'text', title: 'text', text: 'text', link: 'text', href: 'text' }], cta: 'text', ctaHref: 'text' },
  'problems?': { ...Object.fromEntries(['label', 'eyebrow', 'title', 'desc', 'summary', 'filterLabel', 'all', 'todo', 'questions', 'questionsDesc', 'challenges', 'challengesDesc', 'practised', 'notYet', 'starsLabel', 'allDone', 'labError', 'lab?', 'next?', 'allProblems?', 'backToProblems?'].map((k) => [k, 'text'])), 'solve?': { ...Object.fromEntries(['eyebrow', 'button', 'how', 'answer', 'scored', 'next', 'back', 'hide', 'show', 'missing', 'designed', 'solved', 'tabQ', 'tabA', 'tabCanvas', 'resize', 'howV2?'].map((k) => [k, 'text'])), cols: ['text'] } },
  topics: { eyebrow: 'text', title: 'text', index: 'text', cards: [{ id: 'text', no: 'text', kind: 'text', title: 'text', desc: 'text', foot: 'text', link: 'text', visual: { oneOf: VISUALS } }] },
  notes: { eyebrow: 'text', title: 'text', desc: 'text', items: [{ tuple: ['text', 'text', 'text', 'text'] }], all: 'text' },
  numbers: { eyebrow: 'text', title: 'text', desc: 'text', figure: 'text', items: [{ tuple: ['text', 'text', 'number', 'text'] }], ticks: [{ tuple: ['text', 'number'] }], notice: 'number', noticeLabel: 'text', rulesTitle: 'text', rules: [{ tuple: ['text', 'text'] }], exampleTitle: 'text', example: [{ tuple: ['text', 'text', 'text'] }], note: 'text' },
  dashboard: { label: 'text', back: 'text', empty: 'text', 'groupEmpty?': 'text', sections: [{ tuple: ['text', 'text', 'textOrNull'] }] },
  footer: { label: 'text', updated: 'text', links: ['text'] },
  example: 'text',
};
const EXAMPLE = { name: 'text', kind: 'text', text: 'text', parts: [{ tuple: ['text', 'text'] }] };
export function validateSite(site, examples, problems = []) {
  if (!site) { problems.push('site.json: missing'); return problems; }
  shape(site, SITE, 'site.json', problems);
  const sections = list(site.dashboard?.sections).map((s) => s && s[0]);
  if (new Set(sections).size !== sections.length) problems.push('site.json: dashboard.sections has a duplicate id');
  const cards = new Set(list(site.topics?.cards).map((c) => c && c.id));
  // A section without a library card can have its own header: dashboard.heads[section id] = { eyebrow, desc }.
  const heads = site.dashboard?.heads;
  if (heads !== undefined) {
    if (!heads || typeof heads !== 'object' || Array.isArray(heads)) problems.push('site.json: dashboard.heads must be an object');
    else for (const [id, h] of Object.entries(heads)) {
      if (!sections.includes(id)) problems.push(`site.json: dashboard.heads.${id} is not a dashboard section`);
      shape(h, { eyebrow: 'text', desc: 'text' }, `site.json: dashboard.heads.${id}`, problems);
    }
  }
  for (const s of list(site.dashboard?.sections)) if (Array.isArray(s) && s[2] && !cards.has(s[2])) problems.push(`site.json: dashboard section ${s[0]} points at unknown card ${s[2]}`);
  const navNames = new Set(list(site.nav).map((n) => n && n[0]));
  for (const l of list(site.footer?.links)) if (!navNames.has(l)) problems.push(`site.json: footer link ${l} is not in nav`);
  if (!examples || !examples[site.example]) problems.push(`site.json: example "${site.example}" has no examples/<id>.json`);
  for (const [id, ex] of Object.entries(examples || {})) shape(ex, EXAMPLE, `examples/${id}.json`, problems);
  return problems;
}

// The Lab's component catalogue (content/lab.json): the frontend simulates designs with these numbers,
// so every number must be a finite value of the right sign and every setting the right shape.
const positive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonNegative = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const percent = (r) => r && typeof r === 'object' && isText(r.label) && [r.min, r.max, r.default].every(nonNegative) && r.max <= 100 && r.min <= r.default && r.default <= r.max;
const range = (r) => r && typeof r === 'object' && isText(r.label) && [r.min, r.max, r.default].every(positive) && r.min <= r.default && r.default <= r.max;
// For each type: the required fields and a check of each one's shape. Server sizes are rated in
// requests per second (rps), database sizes in queries per second (qps).
const sizesOf = (unit) => (sizes) => Array.isArray(sizes) && sizes.length > 0 && sizes.every((s) => s && isText(s.id) && isText(s.label) && positive(s.hourly) && positive(s[unit]));
// Crash policy: above `above` × capacity for `minutes` simulated minutes → down for `downMinutes`
// (a Multi-AZ database fails over after `failoverMinutes`).
const crashPolicy = (failover) => (c) => c && typeof c === 'object' && c.above >= 1 && Number.isFinite(c.above) && positive(c.minutes) && positive(c.downMinutes) && (!failover || positive(c.failoverMinutes));
const LAB_TYPES = {
  client: { rps: range },
  apigw: { latencyMs: positive, limitRps: positive, pricePerMillion: nonNegative },
  server: { latencyMs: positive, sizes: sizesOf('rps'), count: range, defaultSize: isText, crash: crashPolicy(false) },
  database: { latencyMs: positive, sizes: sizesOf('qps'), defaultSize: isText, crash: crashPolicy(true), multiAz: (m) => m && typeof m === 'object' && isText(m.label) && typeof m.default === 'boolean' && typeof m.priceFactor === 'number' && Number.isFinite(m.priceFactor) && m.priceFactor >= 1 },
  // Phase 2. Cache sizes are rated in operations per second (ops). Percentages run 0 to 100.
  lb: { latencyMs: positive, limitRps: positive, hourly: positive, lcuHourly: nonNegative, rpsPerLcu: positive },
  cache: { latencyMs: positive, sizes: sizesOf('ops'), defaultSize: isText, crash: crashPolicy(false) },
  queue: { latencyMs: positive, limitRps: positive, pricePerMillion: nonNegative },
  cdn: { latencyMs: positive, limitRps: positive, pricePer10k: nonNegative },
};
// Optional fields (phase 2, time-based traffic). Traffic patterns on Clients: [hour, multiplier]
// points from hour 0 to hour 24, hours never going back, multipliers 0 to 1 (1 = the rps setting)
// with at least one point at 1. Autoscaling on Server: target load %, boot and scale-in minutes.
const point = (p) => Array.isArray(p) && p.length === 2 && nonNegative(p[0]) && p[0] <= 24 && nonNegative(p[1]) && p[1] <= 1;
const pattern = (p) => p && typeof p === 'object' && isText(p.id) && isText(p.label) && isText(p.short) && isText(p.desc) && Array.isArray(p.points) && p.points.length >= 2 && p.points.every(point)
  && p.points[0][0] === 0 && p.points.at(-1)[0] === 24 && p.points.every((x, i) => i === 0 || x[0] >= p.points[i - 1][0]) && p.points.some((x) => x[1] === 1);
const patterns = (list) => Array.isArray(list) && list.length > 0 && list.every(pattern) && new Set(list.map((p) => p.id)).size === list.length;
const autoscaling = (a) => a && typeof a === 'object' && (a.like === undefined || isText(a.like)) && isText(a.label) && isText(a.minLabel) && isText(a.maxLabel) && isText(a.note) && positive(a.targetPct) && a.targetPct <= 100 && positive(a.warmupMinutes) && positive(a.scaleInMinutes) && Number.isInteger(a.defaultMax) && a.defaultMax >= 1;
// Cache behaviour: a choice is {label, default, options: [{id, label, desc}]} with exactly the ids the
// simulator knows.
const choice = (ids) => (c) => c && typeof c === 'object' && isText(c.label) && Array.isArray(c.options) && c.options.length === ids.length
  && c.options.every((o) => o && ids.includes(o.id) && isText(o.label) && isText(o.desc)) && new Set(c.options.map((o) => o.id)).size === ids.length && ids.includes(c.default);
const CHOICES = { writePolicy: ['through', 'back'], onDown: ['database', 'fail'] };
// Read replicas on Database: a whole-number range that may start at 0, and the share of writes.
const replicas = (r) => r && typeof r === 'object' && isText(r.label) && [r.min, r.max, r.default].every((v) => Number.isInteger(v) && v >= 0) && r.min <= r.default && r.default <= r.max && r.max <= 10;
// Database engines: what a database is. "instance" engines have sizes (or use the component's) and
// may crash; "request" engines have a throughput limit and per-million prices. `features` name what
// the engine is good at, from the component's `features` list.
const ENGINE_FAMILIES = new Set(['Relational', 'Key-value / document', 'Document', 'Wide-column', 'Search', 'Object storage', 'Time-series', 'Graph']);
const features = (list) => Array.isArray(list) && list.length > 0 && list.every((f) => f && /^[a-zA-Z]{2,24}$/.test(f.id || '') && isText(f.label)) && new Set(list.map((f) => f.id)).size === list.length;
const engine = (e, known) => e && typeof e === 'object' && /^[a-z0-9]{2,20}$/.test(e.id || '') && isText(e.label) && ENGINE_FAMILIES.has(e.family) && isText(e.desc) && isText(e.aws)
  && ['instance', 'request'].includes(e.capacity) && ['option', 'builtin', 'none'].includes(e.multiAz) && typeof e.replicas === 'boolean' && typeof e.crash === 'boolean'
  && (e.latencyMs === undefined || positive(e.latencyMs))
  && (e.capacity === 'request' ? positive(e.limitQps) && nonNegative(e.readPerMillion) && nonNegative(e.writePerMillion) && e.crash === false && e.replicas === false
    : (e.sizes === undefined || (sizesOf('qps')(e.sizes) && e.sizes.some((s) => s.id === e.defaultSize))))
  && Array.isArray(e.features) && e.features.every((f) => known.has(f))
  && (e.aliases === undefined || (Array.isArray(e.aliases) && e.aliases.every(isText)));
const OPTIONAL_FIELDS = { database: { replicas }, client: { patterns }, server: { autoscaling }, cache: { warmupMinutes: positive, flushSeconds: positive, writePolicy: choice(CHOICES.writePolicy), onDown: choice(CHOICES.onDown) } };
// Every catalogue needs the original four; the others are optional so content can add them later.
const REQUIRED_TYPES = ['client', 'apigw', 'server', 'database'];
export function validateLab(lab, problems = []) {
  const at = 'lab.json';
  if (!lab) { problems.push(`${at}: missing`); return problems; }
  for (const key of ['title', 'smallScreen']) if (!isText(lab[key])) problems.push(`${at}: needs ${key}`);
  // the v1 Lab's credit, retries and notes went with it (phase 7): the v2 evaluator's are in eval.json
  for (const key of ['budget', 'retries', 'intro', 'region', 'priceNote', 'modelNote', 'crashNote', 'requiresNote', 'roleNote']) if (lab[key] !== undefined) problems.push(`${at}: ${key} is v1 only`);
  const types = new Set();
  for (const [i, c] of list(lab.components).entries()) {
    const where = `${at} components[${i}]`;
    if (!c || !LAB_TYPES[c.type]) { problems.push(`${where}: unknown type ${c && c.type}`); continue; }
    for (const k of ['queriesPerRequest', 'hitPct', 'writePct', 'roles', 'live']) if (c[k] !== undefined) problems.push(`${where}: ${k} is v1 only`);
    if (types.has(c.type)) problems.push(`${where}: duplicate type ${c.type}`);
    types.add(c.type);
    for (const key of ['name', 'group', 'desc']) if (!isText(c[key])) problems.push(`${where}: needs ${key}`);
    if (c.like !== undefined && !isText(c.like)) problems.push(`${where}: like must be text`);
    if (c.aliases !== undefined && !(Array.isArray(c.aliases) && c.aliases.length && c.aliases.every(isText))) problems.push(`${where}: aliases must be a list of names`);
    for (const [key, ok] of Object.entries(LAB_TYPES[c.type])) if (!ok(c[key])) problems.push(`${where}: ${key} is missing or malformed`);
    for (const [key, ok] of Object.entries(OPTIONAL_FIELDS[c.type] || {})) if (c[key] !== undefined && !ok(c[key])) problems.push(`${where}: ${key} is malformed`);
    if (c.type === 'server' && autoscaling(c.autoscaling) && range(c.count) && c.autoscaling.defaultMax > c.count.max) problems.push(`${where}: autoscaling.defaultMax is above count.max`);
    if (c.type === 'database' && c.engines !== undefined) {
      const known = new Set(features(c.features) ? c.features.map((f) => f.id) : []);
      if (!features(c.features)) problems.push(`${where}: features must be [{id, label}] with unique ids`);
      if (!Array.isArray(c.engines) || !c.engines.length) problems.push(`${where}: engines must be a list`);
      else {
        for (const [j, e] of c.engines.entries()) if (!engine(e, known)) problems.push(`${where}: engines[${j}] (${e && e.id}) is malformed`);
        if (new Set(c.engines.map((e) => e && e.id)).size !== c.engines.length) problems.push(`${where}: engine ids must be unique`);
        if (!c.engines.some((e) => e && e.id === c.defaultEngine)) problems.push(`${where}: defaultEngine must be one of its engines`);
      }
    }
    if (Array.isArray(c.sizes) && !c.sizes.some((s) => s && s.id === c.defaultSize)) problems.push(`${where}: defaultSize ${c.defaultSize} is not one of its sizes`);
  }
  for (const type of REQUIRED_TYPES) if (!types.has(type)) problems.push(`${at}: missing component ${type}`);
  validateDesign(lab.example, lab, `${at} example`, problems);
  if (lab.levels !== undefined || lab.challenges !== undefined) checkChallenges(lab, problems);
  // Import (optional): the copy of the "Import your own architecture" dialog.
  if (lab.import !== undefined) shape(lab.import, { title: 'text', intro: 'text', placeholder: 'text', options: ['text'], file: 'text', create: 'text', cancel: 'text', export: 'text', menu: 'text', summary: 'text' }, `${at}: import`, problems);
  // An alias may name only one kind of component, or imports would be ambiguous.
  const owner = new Map();
  for (const c of list(lab.components)) for (const a of list(c && c.aliases)) { const k = String(a).toLowerCase().trim(); if (owner.has(k) && owner.get(k) !== c.type) problems.push(`${at}: alias "${a}" names both ${owner.get(k)} and ${c.type}`); owner.set(k, c && c.type); }
  return problems;
}

// A challenge judged by v2 (phase 7): its entities, operations and starting design as a v2 problem's, and its
// stars as the checks of its one scenario test (frontend/src/eval/challenge.js).
const STAR_KINDS2 = { availability: 'slo', cost: 'cost', noCrash: 'noCrash', noLostWrites: 'noLostWrites', completes: 'completes' };
function checkChallenge2(ch, lab, where, problems) {
  const stars = list(ch.stars);
  if (!stars.length || stars.length > 3 || stars[0]?.kind !== 'availability' && stars[0]?.kind !== 'completes') problems.push(`${where}: stars needs 1 to 3 entries, the first an availability (or completes) goal`);
  for (const st of stars) if (!st || !STAR_KINDS2[st.kind] || !isText(st.label)) problems.push(`${where}: each star needs a kind (${Object.keys(STAR_KINDS2).join(', ')}) and a label`);
  for (const k of ['fixed', 'chaos', 'requires']) if (ch[k] !== undefined) problems.push(`${where}: ${k} is v1 only`);
  const check = (st) => (st.kind === 'availability' ? { kind: 'slo', availability: st.min, ...(st.from !== undefined ? { from: st.from, to: st.to } : {}) } : st.kind === 'cost' ? { kind: 'cost', max: st.max } : { kind: STAR_KINDS2[st.kind], ...(st.type ? { type: st.type } : {}), ...(st.withinSec ? { withinSec: st.withinSec } : {}) });
  const practice = { brief: ch.brief, entities: ch.entities, operations: ch.operations, start: ch.start,
    tests: [{ id: 'scenario', name: ch.title, desc: ch.brief, hours: ch.hours, startHour: ch.startHour, traffic: ch.traffic, ...(ch.faults ? { faults: ch.faults } : {}), checks: stars.filter((st) => st && STAR_KINDS2[st.kind]).map(check) }] };
  validatePractice2(practice, lab, where, problems, () => {}, { challenge: true });
}

// Challenges (optional): levels [{id, label}], and challenges with a scenario the simulator can play.
function checkChallenges(lab, problems) {
  const at = 'lab.json';
  const levels = list(lab.levels);
  if (!levels.length || !levels.every((l) => l && isText(l.id) && isText(l.label)) || new Set(levels.map((l) => l.id)).size !== levels.length) { problems.push(`${at}: levels must be a list of {id, label} with unique ids`); return; }
  const ids = new Set(levels.map((l) => l.id)), seen = new Set();
  const byType = Object.fromEntries(list(lab.components).filter(Boolean).map((c) => [c.type, c]));
  if (!Array.isArray(lab.challenges) || !lab.challenges.length) { problems.push(`${at}: challenges must be a non-empty list`); return; }
  lab.challenges.forEach((ch, i) => {
    const where = `${at} challenges[${i}]`;
    if (!ch || typeof ch !== 'object') { problems.push(`${where}: needs an object`); return; }
    for (const k of ['id', 'title', 'brief', 'hint']) if (!isText(ch[k])) problems.push(`${where}: needs ${k}`);
    if (seen.has(ch.id)) problems.push(`${where}: duplicate id ${ch.id}`); seen.add(ch.id);
    if (!ids.has(ch.level)) problems.push(`${where}: unknown level ${ch.level}`);
    if (!(isNumber(ch.hours) && ch.hours > 0 && ch.hours <= 168)) problems.push(`${where}: hours must be above 0 and at most 168`);
    if (!(isNumber(ch.startHour) && ch.startHour >= 0 && ch.startHour < 24)) problems.push(`${where}: startHour must be from 0 to under 24`);
    const rps = byType.client?.rps, t = ch.traffic;
    if (!t || !isNumber(t.rps) || !rps || t.rps < rps.min || t.rps > rps.max) problems.push(`${where}: traffic.rps must be inside the Clients range`);
    if (!t || !list(byType.client?.patterns).some((p) => p && p.id === t.pattern)) problems.push(`${where}: traffic.pattern ${t && t.pattern} is not a Clients pattern`);
    if (ch.v !== 2) { problems.push(`${where}: v must be 2 (the v1 format was removed)`); return; }
    checkChallenge2(ch, lab, where, problems);
  });
}

// A design (the Lab example, or a saved one): unique node ids, known types, numeric positions,
// settings inside the catalogue's ranges, and edges that follow the canvas's connection rules.
// JSON with object keys in a fixed order, so two equal values compare equal whatever order they were written in.
const canon = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
export function validateDesign(design, lab, at, problems = []) {
  if (!design || !isText(design.name) || !Array.isArray(design.nodes) || !Array.isArray(design.edges)) { problems.push(`${at}: needs name, nodes and edges`); return problems; }
  const byType = Object.fromEntries(list(lab.components).filter(Boolean).map((c) => [c.type, c]));
  const nodes = new Map();
  for (const n of design.nodes) {
    const where = `${at}: node ${n && n.id}`;
    if (!n || !isText(n.id)) { problems.push(`${at}: a node has no id`); continue; }
    if (nodes.has(n.id)) problems.push(`${where} is duplicated`);
    nodes.set(n.id, n);
    const c = byType[n.type];
    if (!c) { problems.push(`${where} has unknown type ${n.type}`); continue; }
    if (!isNumber(n.x) || !isNumber(n.y)) problems.push(`${where} needs numeric x and y`);
    if (n.name !== undefined && !(isText(n.name) && n.name.length <= 40)) problems.push(`${where}: name must be text of at most 40 characters`);
    const cfg = n.config ?? {};
    if (typeof cfg !== 'object' || Array.isArray(cfg)) { problems.push(`${where}: config must be an object`); continue; }
    const inRange = (key, r) => { if (cfg[key] !== undefined && !(isNumber(cfg[key]) && r && cfg[key] >= r.min && cfg[key] <= r.max)) problems.push(`${where}: ${key} must be from ${r?.min} to ${r?.max}`); };
    if (c.type === 'client') { inRange('rps', c.rps); if (cfg.pattern !== undefined && !(Array.isArray(c.patterns) && c.patterns.some((p) => p && p.id === cfg.pattern))) problems.push(`${where}: unknown traffic pattern ${cfg.pattern}`); }
    if (c.type === 'server') {
      inRange('count', c.count); inRange('maxCount', c.count);
      if (cfg.autoscale !== undefined && typeof cfg.autoscale !== 'boolean') problems.push(`${where}: autoscale must be true or false`);
      if (isNumber(cfg.maxCount) && cfg.maxCount < (cfg.count ?? c.count?.default)) problems.push(`${where}: maxCount is below count`);
    }
    if (c.type === 'cache') {
      for (const key of Object.keys(CHOICES)) if (cfg[key] !== undefined && !(c[key] && Array.isArray(c[key].options) && c[key].options.some((o) => o && o.id === cfg[key]))) problems.push(`${where}: unknown ${key} ${cfg[key]}`);
    }
    const eng = c.type === 'database' && Array.isArray(c.engines) ? c.engines.find((e) => e && e.id === (cfg.engine ?? c.defaultEngine)) : null;
    if (c.type === 'database' && cfg.engine !== undefined && !eng) problems.push(`${where}: unknown engine ${cfg.engine}`);
    const sizeList = eng && Array.isArray(eng.sizes) ? eng.sizes : c.sizes;
    if (Array.isArray(sizeList) && cfg.size !== undefined && !sizeList.some((s) => s && s.id === cfg.size)) problems.push(`${where}: unknown size ${cfg.size}${eng ? ` for ${eng.label}` : ''}`);
    if (c.type === 'database' && cfg.multiAz !== undefined && typeof cfg.multiAz !== 'boolean') problems.push(`${where}: multiAz must be true or false`);
    if (c.type === 'database') inRange('replicas', c.replicas);
    if (c.type === 'database' && cfg.schema !== undefined) {
      // a schema in content must already be clean, and have nothing its engine can't do
      if (canon(cleanSchema(cfg.schema)) !== canon(cfg.schema)) problems.push(`${where}: schema is malformed (names, types, keys or indexes)`);
      else for (const x of schemaIssues(eng, cfg.schema)) if (x.level === 'error') problems.push(`${where}: schema: ${x.text}`);
    }
    // the v1 settings went with the v1 simulator (phase 7)
    for (const k of ['queriesPerRequest', 'hitPct', 'writePct', 'role', 'live']) if (cfg[k] !== undefined) problems.push(`${where}: ${k} is v1 only`);
  }
  const seen = new Set();
  for (const e of design.edges) {
    const key = `${e && e.from}→${e && e.to}`;
    const from = nodes.get(e && e.from), to = nodes.get(e && e.to);
    if (!from || !to) { problems.push(`${at}: edge ${key} points at a missing node`); continue; }
    if (seen.has(key)) problems.push(`${at}: edge ${key} is duplicated`);
    seen.add(key);
    if (e.from === e.to) problems.push(`${at}: edge ${key} links a node to itself`);
    if (to.type === 'client') problems.push(`${at}: edge ${key} sends traffic into Clients`);
    if (from.type === 'database') problems.push(`${at}: edge ${key} sends traffic out of a Database`);
  }
  return problems;
}

export function validateContent({ site, examples, articles, lab, evalCat }) {
  const problems = [];
  if (lab !== undefined) validateLab(evalCat && lab ? { ...lab, eval: evalCat } : lab, problems);
  // the v2 evaluator's catalogue (content/eval.json), when there is one
  if (evalCat !== undefined) validateEval(evalCat, lab, problems);
  if (site && site.landingLab && !list(articles).some((a) => a && a.slug === site.landingLab.problem && a.practice)) problems.push(`site.json: landingLab.problem ${site.landingLab.problem} is not a problem (an article with practice)`);
  validateSite(site, examples, problems);
  const sections = new Set(list(site?.dashboard?.sections).map((s) => s && s[0]));
  // Subsections: dashboard.groups = {section: [[id, label, desc], …]}; an article's "group" must be one of its section's.
  const groups = site?.dashboard?.groups, groupIds = new Map();
  if (groups !== undefined) {
    if (!groups || typeof groups !== 'object' || Array.isArray(groups)) problems.push('site.json: dashboard.groups needs an object');
    else for (const [sec, g] of Object.entries(groups)) {
      if (!sections.has(sec)) problems.push(`site.json: dashboard.groups.${sec} is not a section`);
      shape(g, [{ tuple: ['text', 'text', 'text'] }], `site.json: dashboard.groups.${sec}`, problems);
      const ids = list(g).map((x) => Array.isArray(x) && x[0]);
      if (!ids.every((x) => typeof x === 'string' && SLUG.test(x)) || new Set(ids).size !== ids.length) problems.push(`site.json: dashboard.groups.${sec} needs unique lowercase ids`);
      groupIds.set(sec, new Set(ids));
    }
  }
  const targets = { challenges: new Set(list(lab?.challenges).map((c) => c && c.id)), problems: new Set(list(articles).filter((a) => a && a.practice).map((a) => a.slug)) };
  const slugs = new Set();
  for (const a of list(articles)) {
    if (!a || typeof a !== 'object') { problems.push('articles: an article file is not a JSON object'); continue; }
    const at = `articles/${a.section}/${a.slug}.json`;
    if (typeof a.slug !== 'string' || !SLUG.test(a.slug)) problems.push(`${at}: bad slug`);
    if (slugs.has(a.slug)) problems.push(`${at}: duplicate slug`);
    slugs.add(a.slug);
    if (!sections.has(a.section)) problems.push(`${at}: unknown section ${a.section}`);
    for (const key of ['no', 'tag', 'date', 'title', 'dek']) if (!isText(a[key])) problems.push(`${at}: needs ${key}`);
    if (a.group !== undefined && !groupIds.get(a.section)?.has(a.group)) problems.push(`${at}: unknown group ${a.group} for section ${a.section}`);
    // who can read it once subscriptions start: a few articles are free, everything with practice (the
    // problems), the Lab and the videos are for subscribers
    if (a.access !== 'free' && a.access !== 'paid') problems.push(`${at}: access must be "free" or "paid"`);
    else if (a.access === 'free' && a.practice !== undefined) problems.push(`${at}: a problem (an article with practice) must be paid`);
    checkBlocks(a.body, at, problems, targets);
    // practice designs are checked against the Lab catalogue, so only when it is given
    if (a.practice !== undefined && lab) validatePractice(a.practice, evalCat ? { ...lab, eval: evalCat } : lab, `${at} practice`, problems);
  }
  return problems;
}

// An Interview Question as a problem to solve (article `practice`, v 2; judged by the v2 evaluator in
// frontend/src/eval, tech-katta-context/evaluator.md §6): its data and calls, the tests, the designs that
// calibrate them, the rubric for the written steps and the hints. The v1 format was removed in phase 7.
const HINT_STEPS = new Set(['requirements', 'estimates', 'api', 'design', 'deep']);
const ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
export function validatePractice(p, lab, at, problems) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) { problems.push(`${at}: needs an object`); return; }
  if (p.v !== 2) { problems.push(`${at}: v must be 2 (the v1 format was removed)`); return; }
  validatePractice2(p, lab, at, problems, validateRubricHints);
}

// The written steps (rubric) and the hints.
export function validateRubricHints(p, at, problems) {
  const r = p.rubric;
  if (!r || typeof r !== 'object') problems.push(`${at}: needs rubric`);
  else {
    if (!list(r.fr).length || !r.fr.every((x) => x && isText(x.label) && Array.isArray(x.keys) && x.keys.length && x.keys.every((k) => isText(k) && k === k.toLowerCase()))) problems.push(`${at}: rubric.fr needs [{label, keys: [lowercase phrases]}]`);
    const range = (v) => Array.isArray(v) && v.length === 2 && v.every(isNumber) && v[0] <= v[1];
    const nfr = r.nfr || {};
    for (const [k, v] of Object.entries(nfr)) {
      if (k === 'consistency') { if (!['strong', 'eventual'].includes(v)) problems.push(`${at}: rubric.nfr.consistency must be strong or eventual`); }
      else if (!['availability', 'p99', 'readsPerWrite'].includes(k)) problems.push(`${at}: unknown rubric.nfr.${k}`);
      else if (!range(v)) problems.push(`${at}: rubric.nfr.${k} must be [min, max]`);
    }
    if (!list(r.est).length || !r.est.every((x) => x && ID.test(x.id || '') && isText(x.label) && isText(x.unit) && isNumber(x.answer) && x.answer > 0 && (x.tol === undefined || (isNumber(x.tol) && x.tol > 1)) && (x.how === undefined || isText(x.how)))) problems.push(`${at}: rubric.est needs [{id, label, unit, answer, tol?, how?}]`);
    if (!list(r.decisions).length || !r.decisions.every((x) => x && ID.test(x.id || '') && isText(x.q) && Array.isArray(x.options) && x.options.length >= 2 && x.options.length <= 6 && x.options.every(isText) && Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.options.length && isText(x.why)) || new Set(r.decisions.map((x) => x.id)).size !== r.decisions.length) problems.push(`${at}: rubric.decisions needs [{id, q, options (2–6), answer (index), why}] with unique ids`);
    if (!list(r.api).length || !r.api.every((x) => x && isText(x.label) && typeof x.method === 'string' && x.method.split('|').every((m) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) && isText(x.path) && (() => { try { new RegExp(x.path); return true; } catch { return false; } })())) problems.push(`${at}: rubric.api needs [{label, method, path (a regular expression)}]`);
  }
  if (!list(p.hints).length || !p.hints.every((h) => h && HINT_STEPS.has(h.step) && isText(h.x))) problems.push(`${at}: hints need [{step, x}] with step one of ${[...HINT_STEPS].join(', ')}`);
}

// Checks loaded content before the API serves it, so a typo in a JSON file is rejected at deploy
// (and at startup) instead of breaking the site. Returns a list of problems; empty means valid.
const BLOCKS = new Set(['tldr', 'example', 'fig', 'h2', 'p', 'list', 'type', 'code', 'table', 'more']);
// Figure ids the frontend can draw (FIGS in frontend/src/dashboard.jsx).
export const FIGS = new Set(['patterns', 'choose', 'order', 'retry']);
export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';

function checkBlocks(blocks, where, problems) {
  if (!Array.isArray(blocks) || blocks.length === 0) { problems.push(`${where}: body must be a non-empty array`); return; }
  blocks.forEach((b, i) => {
    const at = `${where}[${i}]`;
    if (!b || !BLOCKS.has(b.t)) { problems.push(`${at}: unknown block type ${b && b.t}`); return; }
    if (['h2', 'p'].includes(b.t) && !isText(b.x)) problems.push(`${at}: needs text x`);
    if (['list', 'tldr'].includes(b.t) && !(Array.isArray(b.items) && b.items.length && b.items.every(isText))) problems.push(`${at}: needs items`);
    if (b.t === 'fig') { if (!FIGS.has(b.id)) problems.push(`${at}: unknown figure ${b.id}`); if (!isText(b.cap)) problems.push(`${at}: needs cap`); }
    if (b.t === 'type') for (const key of ['name', 'kind', 'what', 'use', 'avoid', 'ex']) if (!isText(b[key])) problems.push(`${at}: needs ${key}`);
    if (b.t === 'code') for (const key of ['label', 'x', 'say']) if (!isText(b[key])) problems.push(`${at}: needs ${key}`);
    if (b.t === 'table' && !(Array.isArray(b.head) && Array.isArray(b.rows) && b.rows.every((r) => Array.isArray(r) && r.length === b.head.length))) problems.push(`${at}: every row needs ${b.head && b.head.length} cells`);
    if (b.t === 'more') { if (!isText(b.label)) problems.push(`${at}: needs label`); checkBlocks(b.body, `${at}.body`, problems); }
  });
}

// The Lab's component catalogue (content/lab.json): the frontend simulates designs with these numbers,
// so every number must be a finite value of the right sign and every setting the right shape.
const positive = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonNegative = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
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
  server: { latencyMs: positive, sizes: sizesOf('rps'), count: range, defaultSize: isText, queriesPerRequest: range, crash: crashPolicy(false) },
  database: { latencyMs: positive, sizes: sizesOf('qps'), defaultSize: isText, crash: crashPolicy(true), multiAz: (m) => m && typeof m === 'object' && isText(m.label) && typeof m.default === 'boolean' && typeof m.priceFactor === 'number' && Number.isFinite(m.priceFactor) && m.priceFactor >= 1 },
};
export function validateLab(lab, problems = []) {
  const at = 'lab.json';
  if (!lab) { problems.push(`${at}: missing`); return problems; }
  for (const key of ['title', 'intro', 'region', 'priceNote', 'modelNote', 'crashNote']) if (!isText(lab[key])) problems.push(`${at}: needs ${key}`);
  if (!(Number.isInteger(lab.retries) && lab.retries >= 0 && lab.retries <= 3)) problems.push(`${at}: retries must be a whole number from 0 to 3`);
  if (!(Number.isFinite(lab.budget) && lab.budget > 0)) problems.push(`${at}: budget must be a positive number`);
  const types = new Set();
  for (const [i, c] of (lab.components || []).entries()) {
    const where = `${at} components[${i}]`;
    if (!LAB_TYPES[c.type]) { problems.push(`${where}: unknown type ${c.type}`); continue; }
    if (types.has(c.type)) problems.push(`${where}: duplicate type ${c.type}`);
    types.add(c.type);
    for (const key of ['name', 'group', 'desc']) if (!isText(c[key])) problems.push(`${where}: needs ${key}`);
    for (const [key, ok] of Object.entries(LAB_TYPES[c.type])) if (!ok(c[key])) problems.push(`${where}: ${key} is missing or malformed`);
    if (Array.isArray(c.sizes) && !c.sizes.some((s) => s && s.id === c.defaultSize)) problems.push(`${where}: defaultSize ${c.defaultSize} is not one of its sizes`);
  }
  for (const type of Object.keys(LAB_TYPES)) if (!types.has(type)) problems.push(`${at}: missing component ${type}`);
  const ids = new Set((lab.example?.nodes || []).map((n) => n.id));
  for (const n of lab.example?.nodes || []) if (!types.has(n.type)) problems.push(`${at} example: node ${n.id} has unknown type ${n.type}`);
  for (const e of lab.example?.edges || []) if (!ids.has(e.from) || !ids.has(e.to)) problems.push(`${at} example: edge ${e.from}→${e.to} points at a missing node`);
  return problems;
}

export function validateContent({ site, examples, articles, lab }) {
  const problems = [];
  if (lab !== undefined) validateLab(lab, problems);
  for (const key of ['brand', 'nav', 'hero', 'topics', 'notes', 'numbers', 'dashboard', 'footer']) if (!site || !site[key]) problems.push(`site.json: missing ${key}`);
  if (!site || !examples[site.example]) problems.push(`site.json: example "${site && site.example}" has no examples/<id>.json`);
  const sections = new Set((site?.dashboard?.sections || []).map((s) => s[0]));
  const slugs = new Set();
  for (const a of articles) {
    const at = `articles/${a.section}/${a.slug}.json`;
    if (!SLUG.test(a.slug || '')) problems.push(`${at}: bad slug`);
    if (slugs.has(a.slug)) problems.push(`${at}: duplicate slug`);
    slugs.add(a.slug);
    if (!sections.has(a.section)) problems.push(`${at}: unknown section ${a.section}`);
    for (const key of ['no', 'tag', 'date', 'title', 'dek']) if (!isText(a[key])) problems.push(`${at}: needs ${key}`);
    checkBlocks(a.body, at, problems);
  }
  return problems;
}

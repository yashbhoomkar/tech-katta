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

export function validateContent({ site, examples, articles }) {
  const problems = [];
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

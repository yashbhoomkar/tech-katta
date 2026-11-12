// Problem files (spec section 9; content/problems2/NNN-slug.json): their shape, their calibration, and what the
// public may see of them. Shared by the API (backend/src/practice), the checker test and the sweep tool.
import { judgeAll, JUDGE_VERSION } from './judge.js';
import { compile } from './compile.js';
import { REQUEST } from './parse.js';
import { ROLES } from './catalogue.js';
import { VERDICTS } from './verdict.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 1e6) => typeof v === 'string' && v.length > 0 && v.length <= max;
const num = (v, min = 0, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Everything wrong with a problem's shape, as sentences ("" when it is fine).
export function problemShape(p) {
  const out = [], at = `problem ${p?.slug || p?.id || '?'}`;
  const bad = (m) => out.push(`${at}: ${m}`);
  if (!isObj(p)) return [`${at}: not an object`];
  if (!Number.isInteger(p.id) || p.id < 1) bad('id must be a whole number from 1');
  if (!SLUG.test(p.slug || '')) bad('bad slug');
  if (!str(p.title, 120)) bad('title missing');
  if (!DIFFICULTIES.includes(p.difficulty)) bad('difficulty must be easy, medium or hard');
  if (!Array.isArray(p.topics) || !p.topics.every((t) => str(t, 40))) bad('topics must be a list of words');
  if (!Array.isArray(p.companies)) bad('companies must be a list');
  if (typeof p.free !== 'boolean') bad('free must be true or false');
  if (!str(p.statement, 4000) || p.statement.split(/\s+/).length > 200) bad('statement missing or over 200 words');
  if (!Array.isArray(p.constraints) || !p.constraints.every((c) => str(c, 200))) bad('constraints must be a list of lines');
  if (!num(p.total_items, 1)) bad('total_items must be a positive number');
  if (!Array.isArray(p.requests) || !p.requests.length) { bad('requests missing'); return out; }
  const names = new Set();
  for (const r of p.requests) {
    if (!isObj(r) || !REQUEST.test(r.name || '')) { bad(`request ${r?.name}: bad name`); continue; }
    if (names.has(r.name)) bad(`request ${r.name} twice`);
    names.add(r.name);
    if (r.mode !== 'read' && r.mode !== 'write') bad(`request ${r.name}: mode must be read or write`);
    if (!str(r.says, 300)) bad(`request ${r.name}: says missing`);
    if (r.mode === 'read') {
      // a cache's hit ratio divides by these (22.7)
      if (!num(r.distinct_keys, 1)) bad(`request ${r.name}: distinct_keys must be over 0`);
      if (!num(r.item_bytes, 1)) bad(`request ${r.name}: item_bytes must be over 0`);
      if (r.skew !== undefined && !num(r.skew, 0, 0.95)) bad(`request ${r.name}: skew must be 0 to 0.95`);
      if (r.max_stale_s !== undefined && !num(r.max_stale_s, 0)) bad(`request ${r.name}: max_stale_s`);
    }
  }
  if (!str(p.template, 8000)) bad('template missing');
  if (!str(p.reference, 8000)) bad('reference missing');
  if (!Array.isArray(p.wrong)) bad('wrong must be a list');
  else for (const w of p.wrong) if (!isObj(w) || !str(w.name, 80) || !VERDICTS.includes(w.expect) || w.expect === 'Accepted' || !str(w.source, 8000)) bad(`wrong design ${w?.name}: needs name, expect (a verdict) and source`);
  if (!Array.isArray(p.hints) || !p.hints.every((h) => str(h, 400))) bad('hints must be a list');
  if (typeof p.editorial !== 'string') bad('editorial must be text');
  if (!Array.isArray(p.tests) || !p.tests.length) { bad('tests missing'); return out; }
  const ids = new Set();
  for (const t of p.tests) out.push(...testShape(t, names).map((m) => `${at}: ${m}`)), ids.add(t?.id);
  if (ids.size !== p.tests.length) bad('test ids repeat');
  return out;
}

// A test (a problem's, or the one a visitor edits in the Testcase tab).
export function testShape(t, names) {
  const out = [], at = `test ${t?.id || '?'}`;
  if (!isObj(t)) return [`${at}: not an object`];
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(t.id || '')) out.push(`${at}: bad id`);
  if (!str(t.title, 120)) out.push(`${at}: title missing`);
  if (typeof t.hidden !== 'boolean') out.push(`${at}: hidden must be true or false`);
  if (!Array.isArray(t.phases) || !t.phases.length || t.phases.length > 20) { out.push(`${at}: 1 to 20 phases`); return out; }
  for (const ph of t.phases) {
    if (!isObj(ph) || !num(ph.seconds, 1, 86_400)) { out.push(`${at}: a phase needs seconds (1 to 86,400)`); continue; }
    if (!isObj(ph.rates) || !Object.entries(ph.rates).every(([k, v]) => names.has(k) && num(v, 0, 1e7))) out.push(`${at}: rates must name the problem's requests`);
    if (ph.events !== undefined && (!Array.isArray(ph.events) || !ph.events.every((e) => isObj(e) && (ROLES.includes(e.kill_role) || e.flush_role === 'cache')))) out.push(`${at}: events are kill_role or flush_role`);
  }
  const pr = t.promises;
  if (!isObj(pr)) { out.push(`${at}: promises missing`); return out; }
  for (const key of ['p99_ms', 'p50_ms', 'availability', 'done_within_s']) if (pr[key] !== undefined && (!isObj(pr[key]) || !Object.entries(pr[key]).every(([k, v]) => names.has(k) && num(v, 0, key === 'availability' ? 1 : 1e7)))) out.push(`${at}: ${key} must map requests to numbers`);
  if (pr.budget_inr !== undefined && !num(pr.budget_inr, 1)) out.push(`${at}: budget_inr`);
  if (pr.no_data_loss !== undefined && pr.no_data_loss !== true) out.push(`${at}: no_data_loss is true or absent`);
  return out;
}

// The authoring rules (section 9 and 21.6): the reference is Accepted with 10 % to spare on every promise; each wrong
// design gets exactly its verdict, failing its promise by at least 10 % where it has one; tests: 2+ visible, 3+ hidden;
// the template only unfinished (E022, E029, E030).
export function calibration(p) {
  const out = [], at = `problem ${p.slug}`;
  const ref = judgeAll(p.reference, p, { all: true });
  if (ref.verdict !== 'Accepted') out.push(`${at}: reference is ${ref.verdict}${ref.failed ? ` (${ref.failed.test}: ${ref.failed.message})` : ref.errors ? ` (${ref.errors[0].message})` : ''}`);
  else if (ref.tightest && ref.tightest.margin < 0.1) out.push(`${at}: reference has only ${Math.round(ref.tightest.margin * 100)} % to spare on ${ref.tightest.request || ''} ${ref.tightest.promise} (${ref.tightest.test}); needs 10 %`);
  for (const w of p.wrong || []) {
    const r = judgeAll(w.source, p, { all: true });
    if (r.verdict !== w.expect) { out.push(`${at}: wrong design ${w.name} is ${r.verdict}, expected ${w.expect}`); continue; }
    if (r.close) out.push(`${at}: wrong design ${w.name} fails by only ${r.close.over} %; needs 10 %`);
  }
  const visible = p.tests.filter((t) => !t.hidden).length, hidden = p.tests.length - visible;
  if (visible < 2 || hidden < 3) out.push(`${at}: needs at least 2 visible and 3 hidden tests (has ${visible} and ${hidden})`);
  const c = compile(p.template, p);
  if (c.ok) out.push(`${at}: the template should be unfinished, but it compiles`);
  else if (!c.errors.every((e) => ['E022', 'E029', 'E030'].includes(e.code))) out.push(`${at}: the template has errors other than E022/E029/E030: ${c.errors.map((e) => e.code).join(', ')}`);
  return out;
}

// What anyone may read of a problem (GET /v1/practice/problems/:slug): hidden tests keep only id, title and hidden;
// no reference, no wrong designs, no editorial.
export function publicProblem(p) {
  const { reference, wrong, editorial, tests, followups, ...rest } = p;
  return { ...rest, tests: tests.map((t) => (t.hidden ? { id: t.id, title: t.title, hidden: true } : t)), judge_version: JUDGE_VERSION };
}
export const summaryOf = (p) => ({ id: p.id, slug: p.slug, title: p.title, difficulty: p.difficulty, topics: p.topics, free: p.free });

// The judge: LeetCode-style test suites for system design problems (content: article `practice`, v 2).
//
// Every problem and Lab challenge is judged by the v2 evaluator (src/eval, tech-katta-context/evaluator.md): the
// design is compiled into a plan for each call, simulated minute by minute under the test's traffic and faults,
// analysed for correctness, and checked. Nothing is compared with a model answer, so any design that behaves
// well passes. (The v1 judge, which played tests on the Lab's steady-load simulator, was removed in phase 7.)
//
// judge() runs a list of tests and returns a verdict; gradeAnswer() checks the written steps
// (functional and non-functional requirements, estimates, APIs) against the problem's rubric;
// score() puts it together out of 100. All pure: the browser runs them for Run and Submit.
// sameDesign() says whether a design is the problem's own solution, as copied from the Solution tab
// (same components, settings and arrows; where they sit and what they are called don't count), so a
// copied solution isn't counted as solved.
import { evaluate } from '../eval/index.js';
import { cleanDesign } from '../lab/store.js';

// Runs the sample tests (Run) or all of them (Submit). Stops nothing early: every result is shown.
export function judge(design, lab, problem, { sample = false } = {}) {
  return evaluate(design, lab, problem, { sample });
}

// ---- The written steps -------------------------------------------------------------------------
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9/{}:._ -]+/g, ' ');
// rubric.fr: [{label, keys: [phrase]}] (any phrase that starts a word counts, so "tie" matches "ties" but not
// "cities"; phrases are lowercase)
const startsWord = (text, k) => { for (let i = text.indexOf(k); i >= 0; i = text.indexOf(k, i + 1)) if (i === 0 || !/[a-z0-9]/.test(text[i - 1])) return true; return false; };
// rubric.nfr: {availability: [min, max], p99: [min, max], consistency: "strong" | "eventual", readsPerWrite: [min, max]}
// rubric.est: [{id, label, unit, answer, tol}] (within answer ÷ tol … answer × tol)
// rubric.api: [{label, method, path}] (method may be "PUT|POST"; path is a regular expression for the visitor's path)
// rubric.decisions: [{id, q, options: [text], answer: index of the right option, why}] (answer.decisions: {id: index})
export function gradeAnswer(answer = {}, rubric = {}) {
  const text = norm(answer.fr);
  const fr = (rubric.fr || []).map((r) => ({ label: r.label, ok: r.keys.some((k) => startsWord(text, norm(k))) }));
  const nfr = Object.entries(rubric.nfr || {}).map(([k, want]) => {
    const v = answer.nfr?.[k];
    if (Array.isArray(want)) { const n = Number(v); return { id: k, want, value: v ?? '', ok: v !== '' && v != null && Number.isFinite(n) && n >= want[0] && n <= want[1] }; }
    return { id: k, want, value: v ?? '', ok: v === want };
  });
  const est = (rubric.est || []).map((r) => {
    const n = Number(String(answer.est?.[r.id] ?? '').replace(/[, _]/g, ''));
    const ok = Number.isFinite(n) && n > 0 && n >= r.answer / (r.tol || 3) && n <= r.answer * (r.tol || 3);
    return { id: r.id, label: r.label, unit: r.unit, answer: r.answer, value: Number.isFinite(n) && n > 0 ? n : null, ok };
  });
  const rows = (answer.api || []).filter((a) => a && a.path);
  // a rubric method may list alternatives ("PUT|POST"): following someone can fairly be either
  const api = (rubric.api || []).map((r) => { const re = new RegExp(r.path, 'i'), ms = r.method.split('|'); const hit = rows.find((a) => ms.includes(a.method) && re.test(String(a.path).trim())); return { label: r.label, method: r.method, ok: !!hit, got: hit ? `${hit.method} ${hit.path}` : null }; });
  const dec = (rubric.decisions || []).map((r) => { const v = answer.decisions?.[r.id]; const n = v === '' || v == null ? null : Number(v); return { id: r.id, q: r.q, chosen: Number.isInteger(n) ? n : null, answer: r.answer, ok: n === r.answer, why: r.why }; });
  const share = (xs) => (xs.length ? xs.filter((x) => x.ok).length / xs.length : 0);
  return { fr, nfr, est, api, dec, parts: { fr: share(fr), nfr: share(nfr), est: share(est), api: share(api), dec: share(dec) } };
}

// Out of 100: requirements 15 (functional 10, non-functional 5), estimates 10, API 10, key decisions
// 15, design 50 (share of all tests passed). Each hint opened takes 3 off, at most 15.
// ---- Is this design the problem's own solution? (copy detection) ----------------------------------------------------
// A design's structure, without ids, names or positions: every part gets a colour made of its type and its settings
// other than capacity, then colours are mixed with those of its neighbours along the arrows for a few rounds (a hash
// of the whole graph's shape, not its ids). Two designs rebuilt by hand, with fresh ids, have the same structure.
// A near copy has the same structure and every capacity setting (instances, shards, replicas, partitions, size…)
// within one step of the solution's. Pure and deterministic; the browser and the server both call copyOf().
const CAPACITY = ['count', 'maxCount', 'nodes', 'shards', 'replicas', 'partitions', 'parallelism'];
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const hash = (str) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
const settingDefault = (lab, type, key) => { const st = (lab?.eval?.components || []).find((c) => c.type === type)?.settings?.find((x) => x.key === key); return st ? st.default : undefined; };
const sizeIds = (lab, node) => { const comp = (lab?.components || []).find((c) => c.type === node.type); if (!comp) return []; const eng = comp.engines ? (comp.engines.find((e) => e.id === (node.config?.engine ?? comp.defaultEngine)) || comp.engines[0]) : null; return (eng?.sizes || comp.sizes || []).map((x) => x.id); };
const capacityOf = (lab, n) => { const out = {}; for (const k of CAPACITY) { const v = n.config?.[k] ?? settingDefault(lab, n.type, k); if (typeof v === 'number') out[k] = v; } return out; };

export function structureOf(d, lab) {
  const nodes = (d?.nodes || []).map((n) => ({ id: n.id, type: n.type, config: n.config || {} }));
  const by = new Map(nodes.map((n) => [n.id, n]));
  const edges = (d?.edges || []).filter((e) => by.has(e.from) && by.has(e.to));
  const inn = new Map(nodes.map((n) => [n.id, []])), out = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) { out.get(e.from).push(e.to); inn.get(e.to).push(e.from); }
  let colour = new Map(nodes.map((n) => {
    const rest = Object.fromEntries(Object.entries(n.config).filter(([k]) => !CAPACITY.includes(k) && k !== 'size'));
    return [n.id, hash(`${n.type}|${JSON.stringify(canon(rest))}`)];
  }));
  for (let round = 0; round < 4; round++) {
    const next = new Map();
    for (const n of nodes) next.set(n.id, hash(`${colour.get(n.id)}<${inn.get(n.id).map((x) => colour.get(x)).sort().join(',')}>${out.get(n.id).map((x) => colour.get(x)).sort().join(',')}`));
    colour = next;
  }
  const classes = new Map();
  for (const n of nodes) { const c = colour.get(n.id); if (!classes.has(c)) classes.set(c, []); classes.get(c).push(n); }
  const signature = hash([...colour.values()].sort().join(';') + '|' + edges.map((e) => `${colour.get(e.from)}>${colour.get(e.to)}`).sort().join(';'));
  return { signature, classes, nodes, lab };
}

// is one part within one step of the other? (a size one up or down in the catalogue; a count one more or less)
function withinOneStep(lab, a, b) {
  const ca = capacityOf(lab, a), cb = capacityOf(lab, b);
  for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) if (Math.abs((ca[k] ?? 0) - (cb[k] ?? 0)) > 1 || (k in ca) !== (k in cb)) return false;
  if ((a.config.size ?? undefined) !== (b.config.size ?? undefined)) {
    const ids = sizeIds(lab, a), i = ids.indexOf(a.config.size), j = ids.indexOf(b.config.size);
    if (i < 0 || j < 0 || Math.abs(i - j) > 1) return false;
  }
  return true;
}
const permutations = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));

// Same parts and arrows (ids, names and positions don't count), every capacity setting within `step` of the other's.
export function sameDesign(a, b, lab = null, step = 1) {
  if (!(a && b && a.nodes?.length && b.nodes?.length)) return false;
  const sa = structureOf(a, lab), sb = structureOf(b, lab);
  if (sa.signature !== sb.signature) return false;
  for (const [c, xs] of sa.classes) {
    const ys = sb.classes.get(c) || [];
    if (xs.length !== ys.length) return false;
    const ok = (p, q) => (step === 0 ? JSON.stringify([capacityOf(lab, p), p.config.size]) === JSON.stringify([capacityOf(lab, q), q.config.size]) : withinOneStep(lab, p, q));
    if (xs.length <= 6) { if (!permutations(ys).some((perm) => xs.every((x, i) => ok(x, perm[i])))) return false; }
    else { const key = (n) => JSON.stringify(Object.values(capacityOf(lab, n))); const sx = [...xs].sort((p, q) => (key(p) < key(q) ? -1 : 1)), sy = [...ys].sort((p, q) => (key(p) < key(q) ? -1 : 1)); if (!sx.every((x, i) => ok(x, sy[i]))) return false; }
  }
  return true;
}

// The one place the browser and the server ask "did they hand in the problem's own solution?": both designs are
// cleaned the same way (a v2 problem's designs keep their v2 settings; the Solution tab's design carries no mark of
// its own), then compared by structure. design, solution: { nodes, edges }; practice: the problem's practice.
export function copyOf(design, solution, lab, practice) {
  if (!design || !solution) return false;
  const v2 = practice?.v === 2;
  const prep = (d) => cleanDesign(v2 ? { ...d, v: 2 } : d, lab, 'copy');
  return sameDesign(prep(design), prep(solution), lab);
}

export const WEIGHTS = { fr: 10, nfr: 5, est: 10, api: 10, dec: 15, design: 50 };
export function score(graded, judged, hints = 0) {
  const p = graded?.parts || { fr: 0, nfr: 0, est: 0, api: 0, dec: 0 };
  const parts = { fr: p.fr * WEIGHTS.fr, nfr: p.nfr * WEIGHTS.nfr, est: p.est * WEIGHTS.est, api: p.api * WEIGHTS.api, dec: (p.dec || 0) * WEIGHTS.dec, design: judged && Number.isFinite(judged.designPoints) ? Math.min(WEIGHTS.design, Math.max(0, judged.designPoints)) : judged && judged.total ? WEIGHTS.design * judged.passed / judged.total : 0 };
  const penalty = Math.min(15, 3 * hints);
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total: Math.max(0, Math.round(raw - penalty)), parts, penalty };
}

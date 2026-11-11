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
// A design's shape: its components (id, type, settings) and arrows, in a fixed order.
const shape = (d) => {
  const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
  const nodes = (d?.nodes || []).map((n) => ({ id: n.id, type: n.type, config: canon(n.config || {}) })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const edges = (d?.edges || []).map((e) => `${e.from}>${e.to}`).sort();
  return JSON.stringify({ nodes, edges });
};
export const sameDesign = (a, b) => !!(a && b && a.nodes?.length && b.nodes?.length) && shape(a) === shape(b);

export const WEIGHTS = { fr: 10, nfr: 5, est: 10, api: 10, dec: 15, design: 50 };
export function score(graded, judged, hints = 0) {
  const p = graded?.parts || { fr: 0, nfr: 0, est: 0, api: 0, dec: 0 };
  const parts = { fr: p.fr * WEIGHTS.fr, nfr: p.nfr * WEIGHTS.nfr, est: p.est * WEIGHTS.est, api: p.api * WEIGHTS.api, dec: (p.dec || 0) * WEIGHTS.dec, design: judged && Number.isFinite(judged.designPoints) ? Math.min(WEIGHTS.design, Math.max(0, judged.designPoints)) : judged && judged.total ? WEIGHTS.design * judged.passed / judged.total : 0 };
  const penalty = Math.min(15, 3 * hints);
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total: Math.max(0, Math.round(raw - penalty)), parts, penalty };
}

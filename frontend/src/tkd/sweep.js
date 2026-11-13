// Design-space sweep (spec 22.11): judge a grid of plausible designs built from the problem's reference, and say
// whether the problem is fit to ship. Used by backend/scripts/sweep-problem.mjs; pure, like the rest of tkd/.
// The grid varies the reference's own parts: servers and workers (count 1, 2, 3, 4, 6, 8 and the reference's own,
// × three sizes), nosql stores (3, 4, 6, 8, 12 nodes and the reference's, × quorums w1r1, w2r2, w3r1, w1r3), caches (none, or 1, 4,
// 16 GB with a TTL of 1 minute, 1 hour or 1 day, cleared on write, written through, or neither), sql (three sizes ×
// 0, 1, 2 replicas × sync on/off) and id kinds (random and hash at 32 and 64 bits). The spec's grid plus a day-long TTL
// and 32-bit ids, so that the Wrong Answer mistakes are in it too.
import { parseLenient } from './parse.js';
import { format } from './format.js';
import { compile } from './compile.js';
import { judge } from './judge.js';
import { costOf } from './verdict.js';
import { SIZES, ID_KINDS } from './catalogue.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const setArg = (st, name, value) => { const a = st.args.find((x) => x.name === name); if (a) a.value = value; else st.args.push({ name, value }); };

// Remove a part from the parsed design: its statement, its hops (neighbours joined with ">"), "then … it".
function dropPart(stmts, name) {
  return stmts.filter((s) => !(s.type === 'part' && s.name === name)).map((s) => {
    if (s.type !== 'route') return s;
    const hops = []; let carry = null;
    for (const h of s.hops) { if (h.part === name) { carry = carry || h.op; continue; } hops.push(carry && h.op === '|' ? { ...h, op: carry === '|' ? '>' : carry } : h); carry = null; }
    return { ...s, hops, after: s.after?.part === name ? null : s.after };
  });
}

// Every variant of the reference: [{ label, source }].
export function grid(problem) {
  const base = parseLenient(problem.reference).statements.filter((s) => s.type !== 'raw');
  let designs = [{ label: [], stmts: base }];
  const product = (name, options) => { designs = designs.flatMap((d) => options.map((o) => { const st = o.apply(clone(d.stmts)); return st ? { label: [...d.label, `${name}:${o.label}`], stmts: st } : null; }).filter(Boolean)); };
  for (const p of base.filter((s) => s.type === 'part')) {
    const on = (fn) => (stmts) => { fn(stmts.find((s) => s.type === 'part' && s.name === p.name), stmts); return stmts; };
    // servers and workers: the spec's counts plus the reference's own, so the reference is always in the grid
    const refArg = (n, d) => p.args.find((a) => a.name === n)?.value ?? d;
    if (p.kind === 'server' || p.kind === 'worker') product(p.name, [...new Set([1, 2, 3, 4, 6, 8, refArg('count', 1)])].sort((a, b) => a - b).flatMap((n) => SIZES.map((z) => ({ label: `${n}×${z}`, apply: on((s) => { setArg(s, 'count', n); setArg(s, 'size', z); }) }))));
    // nosql: nodes and the quorum (w, r) with rf 3
    if (p.kind === 'nosql') product(p.name, [...new Set([3, 4, 6, 8, 12, refArg('nodes', 3)])].sort((a, b) => a - b).flatMap((n) => [[1, 1], [2, 2], [3, 1], [1, 3]].map(([w, r]) => ({ label: `${n}n/w${w}r${r}`, apply: on((s) => { setArg(s, 'nodes', n); setArg(s, 'rf', 3); setArg(s, 'w', w); setArg(s, 'r', r); }) }))));
    if (p.kind === 'sql') product(p.name, SIZES.flatMap((z) => [0, 1, 2].flatMap((r) => [true, false].map((y) => ({ label: `${z}+${r}${y ? 'sync' : ''}`, apply: on((s) => { setArg(s, 'size', z); setArg(s, 'replicas', r); setArg(s, 'sync', y); }) })))));
    // id kinds; random and hash at 32 and 64 bits (too few bits is a mistake worth having in the grid)
    if (p.kind === 'idgen') product(p.name, ID_KINDS.flatMap((k) => (k === 'random' || k === 'hash' ? [32, 64] : [64]).map((b) => ({ label: `${k}${k === 'random' || k === 'hash' ? b : ''}`, apply: on((s) => { setArg(s, 'kind', k); setArg(s, 'bits', b); }) }))));
    if (p.kind === 'cache') {
      const after = (mode) => (stmts) => stmts.map((s) => {
        if (s.type !== 'route' || s.mode !== 'write') return s;
        const touches = problem.requests.find((r) => r.name === s.request)?.table;
        return touches ? { ...s, after: mode ? { action: mode, part: p.name } : null } : s;
      });
      const opts = [{ label: 'none', apply: (st) => dropPart(st, p.name) }];
      for (const gb of [1, 4, 16]) for (const ttl of [60, 3600, 86400]) for (const mode of ['invalidate', 'update', null]) {
        opts.push({ label: `${gb}GB/${ttl}s/${mode || 'keep'}`, apply: (st) => { const s = st.find((x) => x.type === 'part' && x.name === p.name); setArg(s, 'memory_gb', gb); setArg(s, 'ttl_s', ttl); return after(mode)(st); } });
      }
      product(p.name, opts);
    }
  }
  return designs.map((d) => ({ label: d.label.join(' '), source: format({ statements: d.stmts, leading: [] }, problem) }));
}

export function sweep(problem) {
  const designs = grid(problem), tests = problem.tests;
  const rows = [];
  for (const d of designs) {
    const c = compile(d.source, problem);
    if (!c.ok) { rows.push({ ...d, verdict: 'Invalid Design', perTest: tests.map(() => 'Invalid Design'), cost: null }); continue; }
    const perTest = tests.map((t) => judge(c.design, problem, t).verdict);
    const first = perTest.find((v) => v !== 'Passed');
    rows.push({ ...d, verdict: first || 'Accepted', perTest, cost: costOf(c.design) });
  }
  const n = rows.length, accepted = rows.filter((r) => r.verdict === 'Accepted').sort((a, b) => a.cost - b.cost);
  const refCost = costOf(compile(problem.reference, problem).design);
  const byVerdict = {};
  for (const r of rows) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;
  // designs that only this test rejects (every other test passes them)
  const alone = tests.map((t, i) => ({ test: t.id, rejects: rows.filter((r) => r.perTest[i] !== 'Passed' && r.perTest.every((v, j) => j === i || v === 'Passed')).length }));
  const share = accepted.length / n, cheapest = accepted[0] || null;
  const taught = [...new Set((problem.wrong || []).map((w) => w.expect))];
  const rules = [
    { rule: '1 % to 20 % of the grid is Accepted', ok: share >= 0.01 && share <= 0.2, value: `${(share * 100).toFixed(1)} %` },
    { rule: 'the reference is within 15 % of the cheapest Accepted cost', ok: !!cheapest && refCost <= cheapest.cost * 1.15, value: cheapest ? `reference ₹${refCost}, cheapest ₹${cheapest.cost}` : 'nothing Accepted' },
    ...alone.map((a) => ({ rule: `${a.test} alone rejects at least 2 % of the grid`, ok: a.rejects / n >= 0.02, value: `${(100 * a.rejects / n).toFixed(1)} %` })),
    ...taught.map((v) => ({ rule: `some design gets ${v}`, ok: (byVerdict[v] || 0) > 0, value: String(byVerdict[v] || 0) })),
  ];
  return { designs: n, accepted: accepted.length, cheapest, referenceCost: refCost, referenceRank: accepted.filter((a) => a.cost < refCost).length + 1, byVerdict, alone, rules, ship: rules.every((r) => r.ok) };
}

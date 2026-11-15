// Trade-offs in your design (context 36, step 18). For each setting in the learner's design where the other side is a
// real choice, the design is run again with only that setting flipped, against every test, so both sides are compared
// in this problem's own numbers: the monthly bill and the tests each side passes. Nothing here is written by hand:
// the labels are the catalogue's, the numbers the simulator's. Pure.
import { evaluate } from './judge.js';

// [part type, setting key, when it applies (cfg, node) -> bool, the other side (value) -> value]
const RULES = [
  ['server', 'autoscale', () => true, (v) => !v],
  ['server', 'zones', () => true, (v) => (v >= 2 ? 1 : 2)],
  ['realtime', 'zones', () => true, (v) => (v >= 2 ? 1 : 2)],
  ['database', 'multiAz', (c) => c.engine !== 's3', (v) => !v],
  ['database', 'replicas', (c) => c.engine !== 's3', (v) => (v >= 1 ? 0 : 1)],
  ['database', 'readFrom', (c) => (c.replicas || 0) >= 1, (v) => (v === 'replicas' ? 'primary' : 'replicas')],
  ['database', 'replication', (c) => (c.replicas || 0) >= 1 || c.multiAz, (v) => (v === 'sync' ? 'async' : 'sync')],
  ['cache', 'replica', () => true, (v) => !v],
  ['cache', 'writePolicy', () => true, (v) => (v === 'back' ? 'through' : 'back')],
  ['cache', 'onDown', () => true, (v) => (v === 'fail' ? 'database' : 'fail')],
  ['queue', 'kind', () => true, (v) => (v === 'fifo' ? 'standard' : 'fifo')],
  ['queue', 'dlq', () => true, (v) => !v],
  ['scheduler', 'count', () => true, (v) => (v >= 2 ? 1 : 2)],
  ['scheduler', 'lock', () => true, (v) => (v === 'lease' ? 'none' : 'lease')],
  ['apigw', 'rateLimit', () => true, (v) => (v === 'perClient' ? 'off' : 'perClient')],
];

const settingOf = (lab, type, key) => (lab?.eval?.components || []).find((c) => c.type === type)?.settings?.find((s) => s.key === key);
// A value in words: the option's label, on/off, or the number with the setting's own noun.
export function valueWords(s, v) {
  if (!s) return String(v);
  if (s.kind === 'bool') return v ? 'on' : 'off';
  if (s.kind === 'choice') return s.options?.find((o) => o.id === v)?.label || String(v);
  return String(v);
}

// The settings of a design that have another side: [{ part, name, key, label, from, to, fromWords, toWords }].
export function decisionsOf(design, lab) {
  const comps = Object.fromEntries((lab?.components || []).map((c) => [c.type, c])), out = [];
  for (const n of design?.nodes || []) {
    for (const [type, key, when, other] of RULES) {
      if (n.type !== type) continue;
      const s = settingOf(lab, type, key); if (!s) continue;
      const cfg = n.config || {}, from = cfg[key] ?? s.default;
      if (!when({ ...cfg, [key]: from }, n)) continue;
      const to = other(from);
      out.push({ part: n.id, name: n.name || comps[type]?.name || type, key, label: s.label, from, to, fromWords: valueWords(s, from), toWords: valueWords(s, to) });
    }
  }
  return out;
}

const summary = (r) => ({ passed: r.passed, total: r.total, monthly: r.metrics?.avgMonthly ?? 0, failed: r.results.filter((x) => !x.ok).map((x) => ({ id: x.id, name: x.test?.name || x.id, why: x.why?.[0] || x.error || '' })) });

// -> { yours: summary, cards: [{ ...decision, other: summary, newFails: [...], fixes: [...] }], runs } (at most `max` flips).
export function tradeoffs(design, lab, practice, { max = 12 } = {}) {
  const yours = summary(evaluate(design, lab, practice)), had = new Set(yours.failed.map((f) => f.id));
  const cards = [];
  for (const d of decisionsOf(design, lab).slice(0, max)) {
    const flipped = { ...design, nodes: design.nodes.map((n) => (n.id === d.part ? { ...n, config: { ...(n.config || {}), [d.key]: d.to } } : n)) };
    const other = summary(evaluate(flipped, lab, practice)), has = new Set(other.failed.map((f) => f.id));
    cards.push({ ...d, other, newFails: other.failed.filter((f) => !had.has(f.id)), fixes: yours.failed.filter((f) => !has.has(f.id)) });
  }
  return { yours, cards, runs: cards.length + 1 };
}

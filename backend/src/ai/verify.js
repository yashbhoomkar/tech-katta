// The verifier (tech-katta-context/22-EVALUATOR-V3.md §12.4): runs on every interviewer response before anything is
// stored or shown. The interviewer may choose, order and word facts; it may never state a number of its own, cite a
// fact that wasn't sent, or call something a problem the judge didn't find. Pure.
//   verifyReview(raw, pack, { names }) → { ok, review?, dropped: [{ item, rule }], why? }
// `review` has the template review's shape (slots filled with the pack's own formatted values).

const SLOT = /\{\{([a-z0-9_:.\-]+)\.([a-z_]+)\}\}/gi;
const WORDS = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const LIMITS = { headline: 140, itemWords: 60, askWords: 25, nextWords: 40, maxItems: 5, minItems: 2, maxFacts: 4 };
const KIND_TONES = { problem: ['fail'], risk: ['risk', 'fail'], strength: ['good'] };

// R9: plain text only. Markup characters and links go; the page renders text, never HTML, whatever is left.
export const plain = (s) => String(s).replace(/https?:\/\/\S+/g, '').replace(/[<>`*#]/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/\s+/g, ' ').trim();

// R4: no digit outside a slot, once the allowed words are removed (p50, p99, and names of this design or problem that
// contain a digit). Names are removed longest first so "db2" goes before "db".
export function digitFree(text, names) {
  let t = String(text).replace(SLOT, ' ').replace(/\bp(50|99)\b/gi, ' ');
  for (const n of [...names].filter((x) => /\d/.test(x)).sort((a, b) => b.length - a.length)) t = t.split(n).join(' ');
  return !/\d/.test(t);
}

// R3: every slot names an allowed fact and a field that fact has.
function slotsOk(text, allowed, byId) {
  for (const [, id, field] of String(text).matchAll(SLOT)) {
    if (!allowed.has(id)) return false;
    const v = byId.get(id)?.f?.[field];
    if (typeof v !== 'string' || !v) return false;
  }
  return true;
}
const fill = (text, byId) => String(text).replace(SLOT, (_, id, field) => byId.get(id).f[field]);

// Names a sentence may contain even with digits in them: parts, requests and tests of this design and problem.
export function namesOf(pack, extra = []) {
  const out = new Set(extra);
  for (const f of pack.facts) for (const v of [f.about?.part, f.about?.request, f.about?.test]) if (v) out.add(String(v));
  return out;
}

export function verifyReview(raw, pack, { names = namesOf(pack) } = {}) {
  const byId = new Map(pack.facts.map((f) => [f.id, f])), all = new Set(byId.keys()), dropped = [];
  const isStr = (v) => typeof v === 'string';
  // R1: the shape
  if (!raw || typeof raw !== 'object' || !isStr(raw.headline) || !Array.isArray(raw.items) || !raw.next || !isStr(raw.next.text)) return { ok: false, dropped, why: 'R1 shape' };
  if (raw.items.length < 1 || raw.items.length > LIMITS.maxItems) return { ok: false, dropped, why: 'R1 item count' };
  const headline = plain(raw.headline);
  if (!headline || headline.length > LIMITS.headline) return { ok: false, dropped, why: 'R1 headline length' };
  if (!slotsOk(headline, all, byId)) return { ok: false, dropped, why: 'R3 headline slot' };
  if (!digitFree(headline, names)) return { ok: false, dropped, why: 'R4 headline digit' };

  const items = [], used = new Set();
  const replaceWithFacts = (ids) => {
    // a dropped item is replaced by the sentences of the facts it cited (§12.4), each fact at most once
    for (const id of ids || []) {
      const f = isStr(id) && byId.get(id);
      if (!f || used.has(id) || !f.say) continue;
      const kind = f.tone === 'fail' ? 'problem' : f.tone === 'risk' ? 'risk' : f.tone === 'good' ? 'strength' : 'note';
      items.push({ kind, facts: [id], text: f.say, from: 'report' }); used.add(id);
      return;
    }
  };
  raw.items.forEach((it, i) => {
    const bad = (rule) => { dropped.push({ item: i, rule }); replaceWithFacts(it?.facts); };
    if (!it || typeof it !== 'object' || !isStr(it.text) || !Array.isArray(it.facts) || !it.facts.length || it.facts.length > LIMITS.maxFacts) return bad('R1 item shape');
    const text = plain(it.text), ask = isStr(it.ask) && it.ask.trim() ? plain(it.ask) : null;
    if (!text || WORDS(text) > LIMITS.itemWords || (ask && WORDS(ask) > LIMITS.askWords)) return bad('R1 item length');
    if (!it.facts.every((id) => isStr(id) && byId.has(id))) return bad('R2 unknown fact');
    const allowed = new Set(it.facts);
    if (!slotsOk(text, allowed, byId) || (ask && !slotsOk(ask, allowed, byId))) return bad('R3 slot');
    if (!digitFree(text, names) || (ask && !digitFree(ask, names))) return bad('R4 digit');
    // R5: the kind must be one the cited tones support; corrected when exactly one other kind fits
    const tones = it.facts.map((id) => byId.get(id).tone);
    let kind = it.kind;
    if (!KIND_TONES[kind] || !tones.some((t) => KIND_TONES[kind].includes(t))) {
      const fits = Object.keys(KIND_TONES).filter((k) => tones.some((t) => KIND_TONES[k].includes(t)));
      if (fits.length !== 1) return bad('R5 kind');
      kind = fits[0];
    }
    it.facts.forEach((id) => used.add(id));
    items.push({ kind, facts: [...it.facts], text: fill(text, byId), ...(ask ? { ask: fill(ask, byId) } : {}), from: 'interviewer' });
  });
  // fewer than two items in all, or none of the interviewer's own: the template review is shown instead
  if (items.length < LIMITS.minItems || !items.some((x) => x.from === 'interviewer')) return { ok: false, dropped, why: 'fewer than two items survived' };

  // R6 and the next step: a repair id must be one in the pack; a next step that fails R1/R3/R4 makes the review fail
  const next = raw.next, nextText = plain(next.text);
  if (!nextText || WORDS(nextText) > LIMITS.nextWords || !slotsOk(nextText, all, byId) || !digitFree(nextText, names)) return { ok: false, dropped, why: 'next step' };
  const repair = isStr(next.repair) && byId.get(next.repair)?.kind === 'repair' ? next.repair : null;
  return {
    ok: true, dropped,
    review: { headline: fill(headline, byId), items: items.map(({ from, ...x }) => x), next: { text: fill(nextText, byId), repair } },
  };
}

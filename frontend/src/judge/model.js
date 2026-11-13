// The model answer of a problem's written steps, built from its rubric: what "Copy to my canvas" on the Solution tab
// puts in Your answer along with the design, so a copied solution is the whole solution (functional and
// non-functional requirements, estimates, API, key decisions), not only the drawing. Pure.
//   modelAnswer(rubric) → { fr, nfr, est, api, decisions }   (the shape Your answer saves and gradeAnswer reads)
//   examplePath(regex)  → a concrete path that the rubric's path pattern accepts

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// A concrete path for a rubric's path pattern, e.g. ^/(api/)?(v\d+/)?stores/[^/]+/items/?$ → /v1/stores/{id}/items.
// Walks the pattern: the first alternative of a group, optional parts left out, a character class as a short
// placeholder; the result is kept only if the pattern itself accepts it (else a plainer try, else the pattern's text).
function gen(src) {
  let i = 0;
  const atom = () => {
    const c = src[i];
    if (c === '(') { i += 1; if (src.startsWith('?:', i)) i += 2; const out = alts(); i += 1; return out; }
    if (c === '[') { const j = src.indexOf(']', i + 1); const cls = src.slice(i + 1, j); i = j + 1; return cls.startsWith('^') ? '{id}' : /a-z|A-Z/.test(cls) ? 'abc' : /0-9|\\d/.test(cls) ? '1' : cls.replace(/\\/g, '')[0] || 'a'; }
    if (c === '\\') { const e = src[i + 1]; i += 2; return e === 'd' ? '1' : e === 'w' ? 'a' : e; }
    if (c === '.') { i += 1; return 'a'; }
    i += 1; return c;
  };
  const seq = () => {
    let out = '';
    while (i < src.length && src[i] !== '|' && src[i] !== ')') {
      if (src[i] === '^' || src[i] === '$') { i += 1; continue; }
      const a = atom(), q = src[i];
      if (q === '?' || q === '*') { i += 1; continue; }
      if (q === '+') i += 1;
      if (q === '{') { const j = src.indexOf('}', i); const n = Number(src.slice(i + 1, j).split(',')[0]) || 1; i = j + 1; out += a.repeat(n); continue; }
      out += a;
    }
    return out;
  };
  const alts = () => { const first = seq(); while (src[i] === '|') { i += 1; seq(); } return first; };
  return alts();
}
export function examplePath(re) {
  const src = String(re), test = (p) => { try { return new RegExp(src, 'i').test(p); } catch { return false; } };
  const tries = [gen(src.replace(/\(api\/\)\?/g, '').replace(/\(v\\d\+\/\)\?/g, 'v1/')), gen(src)].map((p) => (p.startsWith('/') ? p : `/${p}`));
  return tries.find(test) || tries[0];
}

// A value inside [lo, hi] that reads like an answer: the lower bound for availability, else a round number near the
// middle (on a log scale), never outside the range.
function pick(id, [lo, hi]) {
  if (id === 'availability') return lo;
  const mid = Math.sqrt(Math.max(lo, 1e-9) * hi), p = 10 ** Math.floor(Math.log10(mid)), r = Math.round(mid / p) * p;
  return r >= lo && r <= hi ? r : lo;
}

export function modelAnswer(rubric = {}) {
  // one line per functional requirement; its label, plus a key word when the label alone wouldn't be recognised
  const fr = (rubric.fr || []).map((r) => {
    const label = norm(r.label), hit = (r.keys || []).some((k) => ` ${label} `.includes(` ${norm(k)}`));
    return hit || !r.keys?.length ? r.label : `${r.label} (${r.keys[0]})`;
  }).join('\n');
  const nfr = Object.fromEntries(Object.entries(rubric.nfr || {}).map(([id, want]) => [id, Array.isArray(want) ? String(pick(id, want)) : want]));
  const est = Object.fromEntries((rubric.est || []).map((r) => [r.id, String(r.answer)]));
  const api = (rubric.api || []).map((r) => ({ method: r.method.split('|')[0], path: examplePath(r.path) }));
  const decisions = Object.fromEntries((rubric.decisions || []).map((r) => [r.id, r.answer]));
  return { fr, nfr, est, api, decisions };
}

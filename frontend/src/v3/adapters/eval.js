// The canvas judge (src/eval, Interview Questions) as an evidence pack (tech-katta-context/22-EVALUATOR-V3.md §5.3,
// §6): the same shape the Practice judge gives, so the template review, the interviewer, the verifier and the review
// card work unchanged. On Submit the learner already sees every canvas test and its sentences, so nothing here is
// hidden (every fact has hidden: false). Pure.
//   canvasEvidence(judged, article) → pack      judged: judge/judge.js judge(design, lab, practice), every test
//   canvasProblem(article)          → { id, slug, title, statement, constraints, requests } for the prompt's
//                                     problem block (backend/src/ai/prompt.js), from what the problem page shows
import { REASON_WORDS } from '../words.js';

export const CANVAS_EVIDENCE_VERSION = 1;
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const q = (s) => `'${s}'`;
const MAX_FINDINGS = 4, MAX_ADVICE = 4;
const SEVERITY_TONE = { fail: 'risk', warn: 'risk', info: 'note' };

export function canvasProblem(article) {
  const P = article.practice || {};
  return {
    id: `iq:${article.slug}`, slug: article.slug, title: article.title,
    statement: [article.dek, P.brief].filter(Boolean).join(' '),
    constraints: [],
    requests: (P.operations || []).map((o) => ({ name: o.id, mode: o.kind === 'write' ? 'write' : 'read', says: `${o.name}${o.slo ? ` (target: ${o.slo.availability ?? '?'} % succeed, 99 % within ${o.slo.p99Ms ?? '?'} ms)` : ''}` })),
  };
}

export function canvasEvidence(judged, article) {
  const results = judged?.results || [], facts = [], seen = new Set();
  const add = (fact) => { if (seen.has(fact.id)) return; seen.add(fact.id); facts.push({ about: {}, n: {}, f: {}, hidden: false, ...fact }); };
  const passed = judged?.passed ?? results.filter((r) => r.ok).length, total = judged?.total ?? results.length;
  const accepted = judged?.verdict === 'accepted';
  const failed = results.filter((r) => !r.ok), first = failed[0] || null;
  const word = accepted ? 'Accepted' : judged?.verdict === 'error' ? 'Invalid Design' : 'Failed';
  const pack = {
    v: 1, engine: 'eval', evidence_version: CANVAS_EVIDENCE_VERSION, mode: 'submit',
    problem: { slug: article.slug, id: `iq:${article.slug}` },
    verdict: { word, passed, total, first_failed: first ? { test: first.id, title: first.test?.name || first.id, hidden: false } : null },
    facts,
  };

  add({ id: 'verdict', kind: 'verdict', tone: accepted ? 'good' : 'fail', n: { passed, total }, f: { passed: String(passed), total: String(total) },
    say: accepted ? `Accepted: all ${total} tests passed.` : first ? `${word}: ${q(first.test?.name || first.id)} failed first (${passed} of ${total} passed).` : `${word}.` });

  // one fact per test; for a failed one, the check that broke and the judge's own sentence
  for (const r of results) {
    const name = r.test?.name || r.id, bad = (r.checks || []).find((c) => !c.ok && !c.blocked) || (r.checks || []).find((c) => !c.ok);
    const f = bad ? { check: bad.label || bad.kind, ...(bad.value !== undefined && bad.value !== null ? { value: String(bad.value) } : {}) } : {};
    add({ id: `test:${r.id}`, kind: 'test', tone: r.ok ? 'good' : 'fail', about: { test: r.id }, n: bad ? { value: bad.value ?? null } : {}, f,
      say: r.ok ? `${q(name)} passed.` : `${q(name)} failed${bad ? `: ${bad.label || REASON_WORDS[bad.kind] || bad.kind}${f.value ? ` (yours: ${f.value})` : ''}` : ''}.` });
  }

  // findings: what broke in the first few failed tests, in the judge's words, named after the check that broke
  for (const r of failed.slice(0, MAX_FINDINGS)) {
    const bad = (r.checks || []).find((c) => !c.ok && !c.blocked) || (r.checks || []).find((c) => !c.ok);
    const kind = r.error ? 'error' : bad?.kind || 'response', part = (r.checks || []).find((c) => c.first?.node)?.first?.node;
    const why = (r.why || []).filter(Boolean);
    add({ id: `finding:${kind}:${r.id}`, kind: 'finding', tone: 'fail', about: { test: r.id, ...(part ? { part } : {}) },
      n: bad?.value !== undefined ? { value: bad.value } : {}, f: bad?.value !== undefined && bad.value !== null ? { value: String(bad.value) } : {},
      say: r.error || why.slice(0, 2).join(' ') || `${q(r.test?.name || r.id)} failed: ${REASON_WORDS[kind] || kind}.` });
  }

  // the bill, and the budget when a test states one
  const monthly = judged?.metrics?.avgMonthly;
  if (Number.isFinite(monthly) && !(judged?.verdict === 'error')) {
    const cap = results.flatMap((r) => r.checks || []).find((c) => c.kind === 'cost' && Number.isFinite(c.max));
    const over = cap && monthly > cap.max;
    add({ id: 'cost:total', kind: 'cost', tone: over ? 'fail' : 'note', n: { usd: monthly, ...(cap ? { budget: cap.max } : {}) },
      f: { usd: usd(monthly), ...(cap ? { budget: usd(cap.max) } : {}) },
      say: cap ? `This design costs about ${usd(monthly)} a month; the budget is ${usd(cap.max)}.` : `This design costs about ${usd(monthly)} a month.` });
  }

  // the judge's advice about the design (oversized parts, missing spares…), as risks or notes
  for (const x of (judged?.findings || []).slice(0, MAX_ADVICE)) {
    const part = x.nodes?.[0];
    add({ id: `advice:${x.code}:${part || 'design'}`, kind: 'advice', tone: SEVERITY_TONE[x.severity] || 'note', about: part ? { part } : {},
      say: [x.title, x.story].filter(Boolean).join('. ').replace(/\.\./g, '.') + (/[.!?]$/.test(x.story || x.title || '') ? '' : '.') });
  }

  // one next step the judge itself suggests: the fix of its first piece of advice
  const fix = (judged?.findings || []).find((x) => x.fix);
  if (fix && !accepted) add({ id: 'repair:1', kind: 'repair', tone: 'note', about: fix.nodes?.[0] ? { part: fix.nodes[0] } : {}, say: fix.fix });
  return pack;
}

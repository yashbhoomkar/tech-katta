// The bake-off for the interviewer's view (observe.mjs): every model over the test designs of blind-spots.mjs (each
// flawed design has its own finding) and the clean ones (the problems' references and two variants), through one
// platform and one key, ranked by catches, then false alarms, then cost. Run by hand: it spends platform credit.
//
//   node ai-evals/observe-bakeoff.mjs --estimate
//   AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --models meta/muse-ember@low,google/gemma-4-26b-a4b-it --repeat 3
//
// Options as bakeoff.mjs: --platform vercel|openrouter, --models, --repeat (3), --out, --rpm (5 on Vercel), --max-out.
// Behind a proxy that injects the key, run Node with NODE_USE_ENV_PROXY=1.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { aiConfig, createClient } from '../src/ai/client.js';
import { loadProblems } from './ground-truth.mjs';
import { BLIND_SPOTS, ALLOWED_ON_CLEAN } from './blind-spots.mjs';
import { observeRequest, verifyObserve, scoreObserve } from './observe.mjs';
import { PLATFORMS } from './platforms.mjs';

const args = process.argv.slice(2), opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const P = PLATFORMS[opt('platform', 'vercel')];
const repeat = Number(opt('repeat', 3)), rpm = Number(opt('rpm', opt('platform', 'vercel') === 'vercel' ? 5 : 0)), maxOut = String(opt('max-out', 4000));
const candidates = JSON.parse(readFileSync(new URL('./candidates.json', import.meta.url), 'utf8')).models;
const models = (opt('models', null)?.split(',') ?? candidates.filter((c) => c[opt('platform', 'vercel')]).map((c) => `${c[opt('platform', 'vercel')]}${c.effort ? `@${c.effort}` : ''}`)).map((s) => s.trim()).filter(Boolean);
const key = process.env[P.keyVar] || '';

export function loadDesigns() {
  const problems = new Map(loadProblems().map((p) => [p.slug, p]));
  const designs = [
    ...BLIND_SPOTS,
    ...[...problems.values()].map((p) => ({ id: `${p.slug}/reference`, kind: 'clean', source: p.reference })),
  ];
  return designs.map((d) => {
    const problem = problems.get(d.id.split('/')[0]);
    const pack = redact(buildEvidence(d.source, problem));
    return { ...d, problem, pack, request: observeRequest(problem, d.source, pack) };
  });
}

async function runModel(spec, designs, client, config, price) {
  const gap = rpm > 0 ? Math.ceil(60_000 / rpm) : 0;
  const rows = [];
  let last = 0;
  for (let k = 0; k < repeat; k += 1) for (const d of designs) {
    for (let attempt = 0; ; attempt += 1) {
      const wait = last + gap - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      last = Date.now();
      const res = await client.call({ system: d.request.system, problemBlock: d.request.problemBlock, requestBlock: d.request.requestBlock, schema: d.request.schema, maxOutputTokens: config.maxOutputTokens });
      if (res.ok || res.why !== 'http 429' || attempt >= 3) {
        const v = res.ok ? verifyObserve(res.json, d.source) : null;
        const score = res.ok ? scoreObserve(d, v, ALLOWED_ON_CLEAN[d.id] || []) : { correct: false, caught: d.kind === 'flawed' ? false : null, false_alarms: 0, why: `error: ${res.why}` };
        const u = res.usage || {};
        const cost = typeof u.cost === 'number' ? u.cost : (((u.input || 0) * price.in + (u.output || 0) * price.out) / 1e6);
        rows.push({ design: d.id, kind: d.kind, run: k + 1, ok: !!res.ok, score, points: v?.points || [], dropped: v?.dropped || [], ms: res.ms, usage: res.usage, cost });
        break;
      }
      await new Promise((r) => setTimeout(r, 61_000));
    }
  }
  const pct = (n, of) => (of ? Math.round((1000 * n) / of) / 10 : 0);
  const flawed = rows.filter((r) => r.kind === 'flawed'), clean = rows.filter((r) => r.kind === 'clean');
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b), p95 = ms[Math.min(ms.length - 1, Math.floor(0.95 * ms.length))] ?? 0;
  const spent = rows.reduce((t, r) => t + (r.cost || 0), 0), correct = rows.filter((r) => r.score.correct).length;
  const byDesign = new Map();
  for (const r of rows) byDesign.set(r.design, [...(byDesign.get(r.design) || []), r.score.correct]);
  return {
    model: spec, rows,
    summary: {
      calls: rows.length, errors: rows.filter((r) => !r.ok).length,
      catch_pct: pct(flawed.filter((r) => r.score.caught).length, flawed.length),
      false_alarm_pct: pct(clean.filter((r) => r.score.false_alarms > 0).length, clean.length),
      correct_pct: pct(correct, rows.length),
      same_every_run_pct: pct([...byDesign.values()].filter((v) => v.every((x) => x === v[0])).length, byDesign.size),
      ms_p95: p95, cost_usd: Math.round(spent * 1e5) / 1e5, cost_per_correct_usd: correct ? Math.round((spent / correct) * 1e7) / 1e7 : null,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const designs = loadDesigns();
  const flawed = designs.filter((d) => d.kind === 'flawed').length;
  console.log(`${P.name} · ${designs.length} designs (${flawed} flawed, each its own finding; ${designs.length - flawed} clean) × ${repeat} runs · ${models.length} models`);
  for (const d of designs) if (d.pack.verdict.word !== 'Accepted') console.warn(`warning: ${d.id} does not pass the judge (${d.pack.verdict.word})`);
  if (args.includes('--estimate')) {
    const chars = designs.reduce((t, d) => t + d.request.system.length + d.request.problemBlock.length + d.request.requestBlock.length, 0) / designs.length;
    console.log(`about ${Math.round(chars / 3.5)} tokens in a call; at $0.10 in / $0.50 out per million and ~1,200 out: $${((designs.length * repeat * (chars / 3.5 * 0.1 + 1200 * 0.5)) / 1e6).toFixed(3)} a model`);
    process.exit(0);
  }
  if (!key) { console.error(`Set ${P.keyVar}.`); process.exit(1); }
  const r = await fetch(`${P.base}/models`), cat = new Map((await r.json()).data.map((m) => [m.id, m]));
  const stamp = opt('out', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  const results = await Promise.all(models.map(async (spec) => {
    const [id, effort] = spec.split('@');
    if (!cat.has(id)) return { model: spec, summary: null, missing: true };
    const config = aiConfig({ AI_PROVIDER: 'openai', AI_BASE_URL: P.base, AI_API_KEY: key, AI_MODEL: id, AI_JSON_MODE: P.schema(cat.get(id)) ? 'schema' : 'object', AI_TIMEOUT_MS: '60000', AI_MAX_OUTPUT_TOKENS: maxOut,
      AI_EXTRA_BODY: JSON.stringify({ ...P.body(), ...(effort ? { reasoning: effort === 'none' ? { enabled: false } : { effort } } : {}) }) });
    const out = await runModel(spec, designs, createClient(config), config, P.price(cat.get(id)));
    writeFileSync(new URL(`./results/observe-${stamp}-${spec.replace(/[^a-z0-9.-]+/gi, '_')}.json`, import.meta.url), JSON.stringify(out, null, 1));
    console.log(`${spec}: catches ${out.summary.catch_pct} % · false alarms ${out.summary.false_alarm_pct} % · errors ${out.summary.errors} · p95 ${out.summary.ms_p95} ms · $${out.summary.cost_usd}`);
    return out;
  }));
  const done = results.filter((x) => x.summary).sort((a, b) => b.summary.catch_pct - a.summary.catch_pct || a.summary.false_alarm_pct - b.summary.false_alarm_pct || (a.summary.cost_per_correct_usd ?? 9) - (b.summary.cost_per_correct_usd ?? 9));
  const md = [
    `# Interviewer's view bake-off, ${stamp}`, '',
    `${designs.length} designs (${flawed} flawed, each with its own finding the judge cannot see; ${designs.length - flawed} clean) × ${repeat} runs, through ${P.name}.`, '',
    '| Rank | Model | Catches (flawed) | False alarms (clean) | Correct | Same every run | Errors | p95 | Per correct answer | 1,000 answers |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...done.map((x, i) => `| ${i + 1} | ${x.model} | ${x.summary.catch_pct} % | ${x.summary.false_alarm_pct} % | ${x.summary.correct_pct} % | ${x.summary.same_every_run_pct} % | ${x.summary.errors} | ${(x.summary.ms_p95 / 1000).toFixed(1)} s | $${x.summary.cost_per_correct_usd ?? '?'} | ₹${x.summary.cost_per_correct_usd ? (x.summary.cost_per_correct_usd * 88 * 1000).toFixed(0) : '?'} |`),
  ];
  writeFileSync(new URL(`./results/observe-${stamp}.md`, import.meta.url), `${md.join('\n')}\n`);
  console.log(`\n${md.slice(4).join('\n')}\n\nwritten: ai-evals/results/observe-${stamp}.md`);
}

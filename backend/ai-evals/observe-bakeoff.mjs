// The test of the models for the interviewer's view (observe.mjs): every model answers every test design of
// blind-spots.mjs (10 flawed designs, each with its own finding the judge cannot see) and the clean ones (two variants
// and every problem's reference), and its answers are marked exactly against the hand-written truth. Through one
// platform and one key. Run by hand: it spends platform credit.
//
//   node ai-evals/observe-bakeoff.mjs --estimate              no key, no spending: models, prices, what it would cost
//   AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --out first-run
//   AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --out first-run --resume      after a stop: carries on
//   AI_GATEWAY_API_KEY=… node ai-evals/observe-bakeoff.mjs --models meta/muse-ember@minimal,meta/muse-ember@low --out effort
//
// Options:
//   --models a,b      platform ids, each optionally @none|@minimal|@low|@medium (else observe-candidates.json)
//   --tier free|paid|all   which candidates to take from observe-candidates.json (default free)
//   --repeat N        runs per design (default 3)       --limit N   only the first N designs (a cheap trial)
//   --out name        results/observe-<name>-*.jsonl, one line per answer, written as it arrives
//   --resume          skip answers already in the --out files (a stopped run loses nothing and pays nothing twice)
//   --budget dollars  estimate first; skip any model that would take the total past it (default 2)
//   --rpm N           calls a minute per model (default 5 on Vercel: its free-tier limit) · --max-out tokens (4000)
//   --platform vercel|openrouter
// Behind a proxy that injects the key (a cloud session), run Node with NODE_USE_ENV_PROXY=1.
//
// Marking (observe.mjs scoreObserve): a flawed design is caught when a "problem" point names its line in a fitting
// category; on a clean design any "problem" point is a false alarm (except categories ALLOWED_ON_CLEAN allows).
// The report ranks models that clear the bar (REQUIREMENTS.md) by cost per correct answer, and shows, for every
// flawed design, which models caught it.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildEvidence, redact } from '../../frontend/src/v3/evidence.js';
import { aiConfig, createClient } from '../src/ai/client.js';
import { loadProblems } from './ground-truth.mjs';
import { BLIND_SPOTS, ALLOWED_ON_CLEAN } from './blind-spots.mjs';
import { observeRequest, verifyObserve, scoreObserve } from './observe.mjs';
import { PLATFORMS } from './platforms.mjs';

/** The bar a model must clear (REQUIREMENTS.md). */
export const BAR = { catch_pct: 80, false_alarm_pct: 10, error_pct: 2, ms_p95: 10_000 };

/** The test designs: the hand-written ones, then every problem's reference (clean), each with its request built. */
export function loadDesigns() {
  const problems = new Map(loadProblems().map((p) => [p.slug, p]));
  const designs = [...BLIND_SPOTS, ...[...problems.values()].map((p) => ({ id: `${p.slug}/reference`, kind: 'clean', source: p.reference }))];
  return designs.map((d) => {
    const problem = problems.get(d.id.split('/')[0]);
    const pack = redact(buildEvidence(d.source, problem));
    return { ...d, problem, pack, request: observeRequest(problem, d.source, pack) };
  });
}

/** Marks one answer of one design. */
export function markAnswer(design, res) {
  if (!res.ok) return { ok: false, score: { correct: false, caught: design.kind === 'flawed' ? false : null, false_alarms: 0, why: `error: ${res.why}` }, points: [], dropped: [] };
  const v = verifyObserve(res.json, design.source);
  return { ok: true, score: scoreObserve(design, v, ALLOWED_ON_CLEAN[design.id] || []), points: v.points, dropped: v.dropped };
}

/** Totals of one model's answers, and whether it clears the bar. */
export function summarise(rows) {
  const pct = (n, of) => (of ? Math.round((1000 * n) / of) / 10 : 0);
  const flawed = rows.filter((r) => r.kind === 'flawed'), clean = rows.filter((r) => r.kind === 'clean');
  const ms = rows.map((r) => r.ms || 0).sort((a, b) => a - b), p95 = ms[Math.min(ms.length - 1, Math.floor(0.95 * ms.length))] ?? 0;
  const spent = rows.reduce((t, r) => t + (r.cost || 0), 0), correct = rows.filter((r) => r.score.correct).length;
  const byDesign = new Map();
  for (const r of rows) byDesign.set(r.design, [...(byDesign.get(r.design) || []), r.score.correct]);
  const s = {
    answers: rows.length,
    catch_pct: pct(flawed.filter((r) => r.score.caught).length, flawed.length),
    false_alarm_pct: pct(clean.filter((r) => r.score.false_alarms > 0).length, clean.length),
    error_pct: pct(rows.filter((r) => !r.ok).length, rows.length),
    same_every_run_pct: pct([...byDesign.values()].filter((v) => v.every((x) => x === v[0])).length, byDesign.size),
    ms_p95: p95,
    cost_usd: Math.round(spent * 1e5) / 1e5,
    cost_per_correct_usd: correct ? Math.round((spent / correct) * 1e7) / 1e7 : null,
  };
  const misses = [];
  if (s.catch_pct < BAR.catch_pct) misses.push(`catches under ${BAR.catch_pct} %`);
  if (s.false_alarm_pct > BAR.false_alarm_pct) misses.push(`false alarms over ${BAR.false_alarm_pct} %`);
  if (s.error_pct > BAR.error_pct) misses.push(`errors over ${BAR.error_pct} %`);
  if (s.ms_p95 > BAR.ms_p95) misses.push(`p95 over ${BAR.ms_p95 / 1000} s`);
  return { ...s, passes: !misses.length, misses };
}

/** The report: the ranking, then for every flawed design which models caught it, in how many runs. */
export function report({ stamp, platform, designs, repeat, results }) {
  const ranked = [...results].sort((a, b) => (b.summary.passes - a.summary.passes)
    || (a.summary.passes ? (a.summary.cost_per_correct_usd ?? 9) - (b.summary.cost_per_correct_usd ?? 9) : b.summary.catch_pct - a.summary.catch_pct || a.summary.false_alarm_pct - b.summary.false_alarm_pct));
  const flawed = designs.filter((d) => d.kind === 'flawed');
  const caughtIn = (r, id) => `${r.rows.filter((x) => x.design === id && x.score.caught).length}/${r.rows.filter((x) => x.design === id).length}`;
  const inr = (usd) => (usd === null ? '?' : `₹${(usd * 88 * 1000).toFixed(0)}`);
  return [
    `# Interviewer's view: model test ${stamp}`, '',
    `${designs.length} designs (${flawed.length} flawed, each with its own finding the judge cannot see; ${designs.length - flawed.length} clean) × ${repeat} runs, through ${platform}.`,
    `The bar: catches ≥ ${BAR.catch_pct} %, false alarms ≤ ${BAR.false_alarm_pct} %, errors ≤ ${BAR.error_pct} %, p95 ≤ ${BAR.ms_p95 / 1000} s. Then the cheapest correct answer.`, '',
    '| Rank | Model | Clears the bar | Catches | False alarms | Same every run | Errors | p95 | Per correct answer | 1,000 answers |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...ranked.map((r, i) => `| ${i + 1} | ${r.model} | ${r.summary.passes ? 'yes' : `no: ${r.summary.misses.join('; ')}`} | ${r.summary.catch_pct} % | ${r.summary.false_alarm_pct} % | ${r.summary.same_every_run_pct} % | ${r.summary.error_pct} % | ${(r.summary.ms_p95 / 1000).toFixed(1)} s | $${r.summary.cost_per_correct_usd ?? '?'} | ${inr(r.summary.cost_per_correct_usd)} |`),
    '', '## Which model caught which flaw (runs caught / runs)', '',
    `| Finding | ${ranked.map((r) => r.model).join(' | ')} |`,
    `|---|${ranked.map(() => '---').join('|')}|`,
    ...flawed.map((d) => `| ${d.finding} | ${ranked.map((r) => caughtIn(r, d.id)).join(' | ')} |`),
    '', 'Every answer is in the .jsonl files beside this report. Read a sample of the best models\' points before choosing:',
    'the marking checks the line and category, not how well the point is explained.',
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2), opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
  const platformName = opt('platform', 'vercel'), P = PLATFORMS[platformName];
  if (!P) throw new Error(`--platform must be one of: ${Object.keys(PLATFORMS).join(', ')}`);
  const repeat = Number(opt('repeat', 3)), limit = Number(opt('limit', Infinity)), budget = Number(opt('budget', 2));
  const rpm = Number(opt('rpm', platformName === 'vercel' ? 5 : 0)), maxOut = String(opt('max-out', 4000)), tier = opt('tier', 'free');
  const listed = JSON.parse(readFileSync(new URL('./observe-candidates.json', import.meta.url), 'utf8')).models;
  const specs = (opt('models', null)?.split(',') ?? listed.filter((m) => tier === 'all' || m.tier === tier).map((m) => `${m.id}${m.effort ? `@${m.effort}` : ''}`)).map((s) => s.trim()).filter(Boolean);
  const designs = loadDesigns().slice(0, limit);
  const stamp = opt('out', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
  for (const d of designs) if (d.pack.verdict.word !== 'Accepted') console.warn(`warning: ${d.id} does not pass the judge (${d.pack.verdict.word}): it tests nothing the judge misses`);

  // prices from the platform's public list (no key needed): input measured from the real requests, output = about
  // 400 tokens of answer plus about 1,200 of reasoning when an effort is set (measured in the trial, 2026-11-16)
  const cat = new Map((await (await fetch(`${P.base}/models`)).json()).data.map((m) => [m.id, m]));
  const tokensIn = designs.reduce((t, d) => t + d.request.system.length + d.request.problemBlock.length + d.request.requestBlock.length, 0) / designs.length / 3.5;
  const plan = specs.map((spec) => {
    const [id, effort] = spec.split('@'), m = cat.get(id);
    if (!m) return { spec, id, effort, missing: true };
    const price = P.price(m), out = 400 + (effort && effort !== 'none' ? 1200 : 0);
    return { spec, id, effort, m, price, estimate: (designs.length * repeat * (tokensIn * price.in + out * price.out)) / 1e6 };
  });
  console.log(`${P.name} · ${designs.length} designs × ${repeat} runs = ${designs.length * repeat} answers a model · about ${Math.round(tokensIn)} tokens in`);
  let planned = 0;
  for (const x of plan) {
    if (x.missing) { console.log(`  ${x.spec.padEnd(44)} not on ${P.name}: skipped`); continue; }
    x.skip = planned + x.estimate > budget;
    if (!x.skip) planned += x.estimate;
    console.log(`  ${x.spec.padEnd(44)} $${x.price.in.toFixed(3)} / $${x.price.out.toFixed(3)} a million · about $${x.estimate.toFixed(3)}${x.skip ? ` · skipped: over the $${budget} budget` : ''}`);
  }
  console.log(`About $${planned.toFixed(2)} in all (₹${Math.round(planned * 88)}). ${rpm ? `Paced at ${rpm} calls a minute per model: about ${Math.ceil((designs.length * repeat) / rpm)} minutes, models in parallel.` : ''}`);
  if (args.includes('--estimate')) return;
  const key = process.env[P.keyVar] || '';
  if (!key) throw new Error(`Set ${P.keyVar} (one key from ${P.name} covers every model).`);

  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  const fileOf = (spec) => new URL(`./results/observe-${stamp}-${spec.replace(/[^a-z0-9.-]+/gi, '_')}.jsonl`, import.meta.url);
  const results = await Promise.all(plan.filter((x) => !x.missing && !x.skip).map(async (x) => {
    const file = fileOf(x.spec);
    const rows = args.includes('--resume') && existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    if (!args.includes('--resume')) writeFileSync(file, '');
    const done = new Set(rows.map((r) => `${r.design}#${r.run}`));
    const config = aiConfig({ AI_PROVIDER: 'openai', AI_BASE_URL: P.base, AI_API_KEY: key, AI_MODEL: x.id, AI_JSON_MODE: P.schema(x.m) ? 'schema' : 'object', AI_TIMEOUT_MS: '60000', AI_MAX_OUTPUT_TOKENS: maxOut,
      AI_EXTRA_BODY: JSON.stringify({ ...P.body(), ...(x.effort ? { reasoning: x.effort === 'none' ? { enabled: false } : { effort: x.effort } } : {}) }) });
    const client = createClient(config), gap = rpm > 0 ? Math.ceil(60_000 / rpm) : 0;
    let last = 0;
    for (let run = 1; run <= repeat; run += 1) for (const d of designs) {
      if (done.has(`${d.id}#${run}`)) continue;
      let res;
      for (let attempt = 0; ; attempt += 1) {
        const wait = last + gap - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        last = Date.now();
        res = await client.call({ ...d.request, maxOutputTokens: config.maxOutputTokens });
        if (res.ok || res.why !== 'http 429' || attempt >= 3) break;
        await new Promise((r) => setTimeout(r, 61_000)); // a rate limit is waited out, never counted against the model
      }
      const u = res.usage || {};
      const row = { design: d.id, kind: d.kind, run, ...markAnswer(d, res), raw: res.json ?? null, ms: res.ms, usage: res.usage, cost: typeof u.cost === 'number' ? u.cost : ((u.input || 0) * x.price.in + (u.output || 0) * x.price.out) / 1e6 };
      rows.push(row);
      appendFileSync(file, `${JSON.stringify(row)}\n`);
      if (rows.length % 22 === 0) console.log(`  ${x.spec}: ${rows.length} of ${designs.length * repeat}`);
    }
    const summary = summarise(rows);
    console.log(`${x.spec}: catches ${summary.catch_pct} % · false alarms ${summary.false_alarm_pct} % · errors ${summary.error_pct} % · p95 ${summary.ms_p95} ms · $${summary.cost_usd}${summary.passes ? ' · clears the bar' : ` · ${summary.misses.join('; ')}`}`);
    return { model: x.spec, rows, summary };
  }));
  const md = report({ stamp, platform: P.name, designs, repeat, results });
  writeFileSync(new URL(`./results/observe-${stamp}.md`, import.meta.url), `${md}\n`);
  console.log(`\n${md}\n\nwritten: ai-evals/results/observe-${stamp}.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });

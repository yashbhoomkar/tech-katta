// Re-mark saved answers with the current answer key and marking rules, without calling any model.
//   node ai-evals/remark.mjs <file.jsonl> ... [--write <dir>]
// Each row's raw answer is verified and scored again; rows whose design is not in the current key keep their old
// marks and are counted as "not re-marked". Prints old and new totals per file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadDesigns, markAnswer, summarise } from './observe-bakeoff.mjs';

export function remarkRows(rows, designs) {
  const byId = new Map(designs.map((d) => [d.id, d]));
  let skipped = 0;
  const out = rows.map((r) => {
    const d = byId.get(r.design);
    if (!d || !r.ok) { if (!d) skipped += 1; return r; }
    return { ...r, kind: d.kind, cls: d.cls, ...markAnswer(d, { ok: true, json: r.raw }) };
  });
  return { rows: out, skipped };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), wi = args.indexOf('--write'), dir = wi >= 0 ? args[wi + 1] : null;
  const files = args.filter((a, i) => a.endsWith('.jsonl') && !(wi >= 0 && i === wi + 1));
  const designs = loadDesigns();
  if (dir) mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const { rows: now, skipped } = remarkRows(rows, designs);
    const a = summarise(rows), b = summarise(now), clean = now.filter((r) => r.kind === 'clean');
    // the false alarms the old rule would give with today's key: a problem on a judge line counted too
    const oldRule = clean.length ? Math.round((1000 * clean.filter((r) => r.score.false_alarms > 0 || r.score.restated > 0).length) / clean.length) / 10 : 0;
    console.log(`${basename(f)}\tsaved ${a.catch_pct} / ${a.false_alarm_pct}\ttoday's key, old rule ${b.catch_pct} / ${oldRule}\tnew rule ${b.catch_pct} / ${b.false_alarm_pct}\tnot re-marked ${skipped}`);
    if (dir) writeFileSync(join(dir, basename(f)), now.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
}

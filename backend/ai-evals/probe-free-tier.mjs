// Which models does the platform serve on the free credit? One tiny call to every language model in the public
// catalog that takes a strict JSON schema (no batch/fast/image variants), and every response is saved.
// Costs a fraction of a cent in all (16 output tokens a call). Vercel only: its free access is per team.
//
//   NODE_USE_ENV_PROXY=1 AI_GATEWAY_API_KEY=proxy-injected node ai-evals/probe-free-tier.mjs --out <file.json>
//
// The output lists each model with: status, free (it answered), the error message if not, price, reasoning tag,
// effort values, zdr, and the lowest effort the model search would use ("low" preferred, else "minimal", else
// "medium"; none when the model lists no effort).
import { writeFileSync } from 'node:fs';
import { PLATFORMS } from './platforms.mjs';

export function candidatesOf(list) {
  return list.filter((m) => m.type === 'language' && (m.tags || []).includes('structured-output') && !/-batch|-fast|-ultrafast|image/.test(m.id));
}
export const effortOf = (m) => {
  const v = (m.reasoning_options || []).find((o) => o.type === 'effort')?.values || [];
  return ['low', 'minimal', 'medium'].find((e) => v.includes(e)) || null;
};

async function main() {
  const args = process.argv.slice(2), out = args[args.indexOf('--out') + 1];
  if (!out || out.startsWith('--')) throw new Error('--out <file.json> is required');
  const P = PLATFORMS.vercel, key = process.env[P.keyVar];
  if (!key) throw new Error(`set ${P.keyVar}`);
  const list = candidatesOf((await (await fetch(`${P.base}/models`)).json()).data);
  const rows = [];
  let next = 0;
  const one = async () => {
    for (;;) {
      const m = list[next++];
      if (!m) return;
      let status = 0, body = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const r = await fetch(`${P.base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: m.id, messages: [{ role: 'user', content: 'Say ok' }], max_tokens: 16 }), signal: AbortSignal.timeout(60_000) }).catch((e) => ({ status: 0, json: async () => ({ error: { message: String(e?.name || e) } }) }));
        status = r.status;
        body = await r.json().catch(() => null);
        if (![429, 500, 502, 503, 504, 0].includes(status)) break;
        await new Promise((res) => setTimeout(res, 15_000));
      }
      const err = body?.error ? (typeof body.error === 'string' ? body.error : body.error.message || JSON.stringify(body.error)) : null;
      rows.push({ id: m.id, status, free: !!body?.choices, error: body?.choices ? null : String(err || '').slice(0, 300), usage: body?.usage || null,
        price_in: Number(m.pricing?.input || 0) * 1e6, price_out: Number(m.pricing?.output || 0) * 1e6,
        reasoning: (m.tags || []).includes('reasoning'), effort: effortOf(m), effort_values: (m.reasoning_options || []).find((o) => o.type === 'effort')?.values || [], zdr: m.zdr ?? null });
      if (rows.length % 25 === 0) console.log(`${rows.length} of ${list.length}`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, one));
  rows.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(out, `${JSON.stringify({ probed_at: new Date().toISOString(), platform: P.name, models: rows.length, free: rows.filter((r) => r.free).length, rows }, null, 1)}\n`);
  console.log(`probed ${rows.length}: ${rows.filter((r) => r.free).length} free · written ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });

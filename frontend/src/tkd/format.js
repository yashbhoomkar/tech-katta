// Parsed design → its canonical text (spec 20.2). The Builder edits the parsed statements and writes them back with this,
// so both editors hold the same string, and canonical() gives one identity per design (22.10).
// Rules: leading comment lines kept, other comments dropped; parts (declaration order), a blank line, tables, a blank
// line, routes in the problem's request order; every setting of a known kind written, defaults included, in the
// catalogue's order; "=" and ":" lined up; lines the parser couldn't read stay, unchanged, after the statement they followed.
import { ARGS } from './catalogue.js';
import { parseLenient } from './parse.js';

const val = (v) => (v === true ? 'true' : v === false ? 'false' : String(v));
export function partArgs(st) {
  const specs = ARGS[st.kind], written = new Map(st.args.map((a) => [a.name, a]));
  if (!specs) return st.args.map((a) => `${a.name}=${val(a.value)}`);
  const known = Object.keys(specs).map((n) => `${n}=${val(written.has(n) ? written.get(n).value : specs[n].default)}`);
  const extra = st.args.filter((a) => !specs[a.name]).map((a) => `${a.name}=${val(a.value)}`);
  return [...known, ...extra];
}
export const partText = (st, pad = 0) => `${st.name.padEnd(pad)} = ${st.kind}(${partArgs(st).join(', ')})`;
export const tableText = (st) => `table ${st.part}.${st.name}(${st.columns.map((c) => (c.pk ? `${c.name} pk` : c.name)).join(', ')})${st.index.length ? ` index(${st.index.map((i) => i.name).join(', ')})` : ''}`;
export const hopText = (h) => `${h.op} ${h.part}${h.replica ? '[replica]' : ''}`;
export function routeText(st, pad = 0) {
  const hops = st.hops.map(hopText).join(' ');
  const after = st.after ? ` then ${st.after.action} ${st.after.part}` : '';
  return `${st.mode.padEnd(5)} ${`${st.request}:`.padEnd(pad + 1)} client${hops ? ` ${hops}` : ''}${st.open ? ' >' : ''}${after}`;
}

export function format(parsed, problem) {
  const { statements = [], leading = [] } = parsed || {};
  // raw lines travel with the statement before them
  const groups = [], head = [];
  for (const st of statements) {
    if (st.type === 'raw') { (groups.length ? groups[groups.length - 1].raw : head).push(st.text); continue; }
    groups.push({ st, raw: [] });
  }
  const of = (t) => groups.filter((g) => g.st.type === t);
  const parts = of('part'), tables = of('table'), order = new Map((problem?.requests || []).map((r, i) => [r.name, i]));
  const routes = of('route').map((g, i) => ({ g, i })).sort((a, b) => (order.get(a.g.st.request) ?? 1e6) - (order.get(b.g.st.request) ?? 1e6) || a.i - b.i).map((x) => x.g);
  const pPad = Math.max(0, ...parts.map((g) => g.st.name.length)), rPad = Math.max(0, ...routes.map((g) => g.st.request.length));
  const block = (gs, text) => gs.flatMap((g) => [text(g.st), ...g.raw]);
  const sections = [block(parts, (s) => partText(s, pPad)), block(tables, tableText), block(routes, (s) => routeText(s, rPad))].filter((s) => s.length);
  const lines = [...leading, ...head];
  sections.forEach((s, i) => { if (i || lines.length) lines.push(''); lines.push(...s); });
  while (lines.length && lines[0] === '') lines.shift();
  return `${lines.map((l) => l.replace(/\s+$/, '')).join('\n')}\n`;
}

// One design, one identity (22.10): formatted, with every comment line removed.
export const canonical = (source, problem) => { const p = parseLenient(String(source || '')); return format({ statements: p.statements, leading: [] }, problem); };

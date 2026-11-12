// TKD text → statements (spec sections 3 and 5, layer 1). Line by line, one small lexer per line: linear in the length
// of the text, no regular expression runs over the whole text, nothing is evaluated.
//   parse(text)        → { ok:true, statements, leading } or { ok:false, errors }   (E001–E005; E002 for a line it can't read)
//   parseLenient(text) → { statements, leading }: a line that isn't a valid statement is kept as {type:"raw"} (the Builder)
// A statement: {type:"part", name, kind, args:[{name, value, col}], line, col}
//              {type:"table", part, name, columns:[{name, pk}], index:[names], line, col}
//              {type:"route", mode, request, start, hops:[{op, part, replica, col}], after:{action, part, col}|null, line, col}
//              {type:"raw", text, line, error}
// `leading`: the comment lines before the first statement (format() keeps them).
import { msg } from './messages.js';

export const MAX_LINES = 200, MAX_CHARS = 8000;
export const NAME = /^[a-z][a-z0-9_]{0,23}$/;
export const REQUEST = /^[A-Z][A-Z0-9_]{0,31}$/;

const isLetter = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
const isDigit = (ch) => ch >= '0' && ch <= '9';
const err = (code, line, col, vars) => ({ code, line, col, message: msg(code, vars) });
class LineError extends Error { constructor(e) { super(e.message); this.e = e; } }

// One line (without its comment) → tokens {t: "name"|"num"|"sym", v, col}. col is 1-based.
function lex(text, line) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === ' ' || ch === '\t' || ch === '\r') { i += 1; continue; }
    const col = i + 1;
    if (isLetter(ch)) {
      let j = i + 1;
      while (j < text.length && (isLetter(text[j]) || isDigit(text[j]))) j += 1;
      out.push({ t: 'name', v: text.slice(i, j), col }); i = j; continue;
    }
    if (isDigit(ch) || (ch === '-' && isDigit(text[i + 1] || ''))) {
      let j = i + 1;
      while (j < text.length && isDigit(text[j])) j += 1;
      if (text[j] === '.' && isDigit(text[j + 1] || '')) { j += 1; while (j < text.length && isDigit(text[j])) j += 1; }
      out.push({ t: 'num', v: text.slice(i, j), col }); i = j; continue;
    }
    if (ch === '~' && text[i + 1] === '>') { out.push({ t: 'sym', v: '~>', col }); i += 2; continue; }
    if ('=(),.:>|[]'.includes(ch)) { out.push({ t: 'sym', v: ch, col }); i += 1; continue; }
    throw new LineError(err('E002', line, col));
  }
  return out;
}

// A cursor over one line's tokens; any mismatch is an E002 at the offending token.
function reader(tokens, line, endCol) {
  let k = 0;
  const peek = (o = 0) => tokens[k + o];
  const fail = (code = 'E002', vars) => { throw new LineError(err(code, line, peek()?.col || endCol, vars)); };
  const sym = (v) => { const t = peek(); if (t && t.t === 'sym' && t.v === v) { k += 1; return t; } return fail(); };
  const name = () => { const t = peek(); if (t && t.t === 'name') { k += 1; return t; } return fail(); };
  const isSym = (v, o = 0) => peek(o)?.t === 'sym' && peek(o).v === v;
  return { peek, fail, sym, name, isSym, done: () => k >= tokens.length, next: () => tokens[k++] };
}

const checkName = (tok, line) => {
  if (tok.v === 'client') throw new LineError(err('E005', line, tok.col));
  if (!NAME.test(tok.v)) throw new LineError(err('E004', line, tok.col, { name: tok.v }));
};

function partStatement(r, line) {
  const nameTok = r.name(); checkName(nameTok, line);
  r.sym('=');
  const kindTok = r.name();
  r.sym('(');
  const args = [];
  if (!r.isSym(')')) {
    for (;;) {
      const a = r.name(); r.sym('=');
      const v = r.peek();
      if (!v || (v.t !== 'name' && v.t !== 'num')) r.fail();
      r.next();
      args.push({ name: a.v, value: v.t === 'num' ? Number(v.v) : v.v === 'true' ? true : v.v === 'false' ? false : v.v, raw: v.v, col: v.col });
      if (r.isSym(',')) { r.sym(','); continue; }
      break;
    }
  }
  r.sym(')');
  if (!r.done()) r.fail();
  return { type: 'part', name: nameTok.v, kind: kindTok.v, args, line, col: nameTok.col };
}

function tableStatement(r, line, start) {
  r.name(); // "table"
  const part = r.name(); r.sym('.');
  const name = r.name(); checkName(name, line);
  r.sym('(');
  const columns = [];
  for (;;) {
    const c = r.name(); checkName(c, line);
    let pk = false;
    if (r.peek()?.t === 'name' && r.peek().v === 'pk') { r.next(); pk = true; }
    columns.push({ name: c.v, pk, col: c.col });
    if (r.isSym(',')) { r.sym(','); continue; }
    break;
  }
  r.sym(')');
  const index = [];
  if (r.peek()?.t === 'name' && r.peek().v === 'index') {
    r.next(); r.sym('(');
    for (;;) { const c = r.name(); index.push({ name: c.v, col: c.col }); if (r.isSym(',')) { r.sym(','); continue; } break; }
    r.sym(')');
  }
  if (!r.done()) r.fail();
  return { type: 'table', part: part.v, partCol: part.col, name: name.v, columns, index, line, col: start };
}

const HOP_OPS = new Set(['>', '|', '~>']);
function routeStatement(r, line, endCol) {
  const modeTok = r.name(), req = r.name(); r.sym(':');
  const first = r.peek();
  if (!first || first.t !== 'name' || first.v !== 'client') throw new LineError(err('E025', line, first?.col || endCol));
  r.next();
  const hops = [];
  let open = false;
  while (!r.done()) {
    const t = r.peek();
    if (t.t === 'name' && t.v === 'then') break;
    if (t.t !== 'sym' || !HOP_OPS.has(t.v)) r.fail();
    r.next();
    if (!hops.length && t.v !== '>') throw new LineError(err('E025', line, t.col));
    // "client > lb > api > " (a template's unfinished route): a last operator with nothing after it is ignored
    if (r.done()) { open = true; break; }
    const p = r.name();
    let replica = false;
    if (r.isSym('[')) { r.sym('['); const w = r.name(); if (w.v !== 'replica') throw new LineError(err('E002', line, w.col)); r.sym(']'); replica = true; }
    hops.push({ op: t.v, part: p.v, replica, col: p.col });
  }
  let after = null;
  if (!r.done()) {
    const then = r.name();
    const act = r.name();
    if (act.v !== 'invalidate' && act.v !== 'update') throw new LineError(err('E002', line, act.col));
    const target = r.name();
    if (!r.done()) r.fail();
    after = { action: act.v, part: target.v, col: then.col };
  }
  return { type: 'route', mode: modeTok.v, request: req.v, requestCol: req.col, hops, after, open, line, col: modeTok.col };
}

function statementOf(text, line) {
  const tokens = lex(text, line);
  if (!tokens.length) return null;
  const r = reader(tokens, line, text.length + 1);
  const [a, b, c] = tokens;
  if (a.t === 'name' && (a.v === 'read' || a.v === 'write') && b?.t === 'name' && c?.t === 'sym' && c.v === ':') return routeStatement(r, line, text.length + 1);
  if (a.t === 'name' && a.v === 'table' && b?.t === 'name' && c?.t === 'sym' && c.v === '.') return tableStatement(r, line, a.col);
  if (a.t === 'name' && b?.t === 'sym' && b.v === '=') return partStatement(r, line);
  throw new LineError(err('E002', line, a.col));
}

// Lines of a text: "\n" or "\r\n"; a final newline doesn't make an extra line.
export const linesOf = (text) => { const l = String(text).split('\n'); if (l.length > 1 && l[l.length - 1] === '') l.pop(); return l.map((x) => (x.endsWith('\r') ? x.slice(0, -1) : x)); };
const stripComment = (s) => { const i = s.indexOf('#'); return i < 0 ? s : s.slice(0, i); };

function scan(text, lenient) {
  const lines = linesOf(text);
  const statements = [], errors = [], leading = [], seen = new Map();
  let started = false;
  lines.forEach((full, idx) => {
    const line = idx + 1, body = stripComment(full);
    if (!body.trim()) { if (!started && full.trim().startsWith('#')) leading.push(full.trim()); return; }
    started = true;
    try {
      const st = statementOf(body, line);
      // a name declared twice (parts, and tables as part.table)
      const key = st.type === 'part' ? st.name : st.type === 'table' ? `${st.part}.${st.name}` : null;
      if (key) {
        if (seen.has(key)) throw new LineError(err('E003', line, st.col, { name: key, n: seen.get(key) }));
        seen.set(key, line);
      }
      statements.push(st);
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      errors.push(e.e);
      if (lenient) statements.push({ type: 'raw', text: full.replace(/\s+$/, ''), line, error: e.e });
    }
  });
  return { statements, errors, leading };
}

export function tooLong(text) {
  const s = String(text);
  return s.length > MAX_CHARS || linesOf(s).length > MAX_LINES;
}

export function parse(text) {
  if (typeof text !== 'string') return { ok: false, errors: [err('E001', 1, 1)] };
  if (tooLong(text)) return { ok: false, errors: [err('E001', 1, 1)] };
  const { statements, errors, leading } = scan(text, false);
  return errors.length ? { ok: false, errors: errors.slice(0, 20) } : { ok: true, statements, leading };
}

export function parseLenient(text) {
  const { statements, leading } = scan(typeof text === 'string' ? text.slice(0, MAX_CHARS * 4) : '', true);
  return { statements, leading };
}

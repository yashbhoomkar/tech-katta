// Autocomplete for the text editor (spec 11.3, step 6): after "= " offer part kinds; inside "kind(" offer that kind's
// settings; after ">", "|" or "~>" on a route offer the declared names. Pure: text + cursor → { from, items }.
import { KIND_NAMES, ARGS } from "../tkd/catalogue.js";

// The part names declared anywhere in the text (a cheap scan; the editor already has the compiled design for the rest).
const declared = (text) => [...text.matchAll(/^\s*([a-z][a-z0-9_]{0,23})\s*=/gm)].map((m) => m[1]).filter((n) => n !== "client");

// items: [{label, insert}]; from: the offset where the word being typed starts (it is replaced by `insert`).
export function suggest(text, cursor) {
  const lineStart = text.lastIndexOf("\n", cursor - 1) + 1, before = text.slice(lineStart, cursor);
  if (before.includes("#")) return null;
  const word = /[a-z0-9_]*$/.exec(before)[0], from = cursor - word.length;
  const pick = (list) => { const items = list.filter((x) => x.label.startsWith(word) && x.label !== word); return items.length ? { from, items: items.slice(0, 8) } : null; };
  // a route: after an operator
  if (/^\s*(read|write)\s+[A-Z][A-Z0-9_]*\s*:/.test(before) && /(>|\|)\s*[a-z0-9_]*$/.test(before)) {
    const used = new Set([...before.matchAll(/(?:>|\||client)\s*([a-z][a-z0-9_]*)/g)].map((m) => m[1]));
    return pick(declared(text).filter((n) => !used.has(n)).map((n) => ({ label: n, insert: n })));
  }
  // inside kind( … ): a setting name
  const call = /^\s*[a-z][a-z0-9_]*\s*=\s*([a-z]+)\s*\(([^)]*)$/.exec(before);
  if (call && /(^|,)\s*[a-z_]*$/.test(call[2])) {
    const args = ARGS[call[1]];
    if (!args) return null;
    const have = new Set([...call[2].matchAll(/([a-z_]+)\s*=/g)].map((m) => m[1]));
    return pick(Object.keys(args).filter((a) => !have.has(a)).map((a) => ({ label: a, insert: `${a}=` })));
  }
  // after "name = ": a kind
  if (/^\s*[a-z][a-z0-9_]*\s*=\s*[a-z]*$/.test(before)) return pick(KIND_NAMES.map((k) => ({ label: k, insert: `${k}(` })));
  return null;
}
export const accept = (text, s, item, cursor) => ({ text: text.slice(0, s.from) + item.insert + text.slice(cursor), cursor: s.from + item.insert.length });

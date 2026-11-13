// The text editor (spec 11.3): a plain <textarea> over a highlighted copy of the same text, with a line-number gutter.
// No editor library. Errors get a red bar and a wavy underline at their column; warnings orange. Tab inserts two spaces
// (press Escape first to move focus on with Tab).
import React, { useRef, useState, useEffect } from "react";
import { KIND_NAMES } from "../tkd/catalogue.js";
import { suggest, accept } from "./complete.js";

const KEYWORDS = new Set(["read", "write", "table", "then", "invalidate", "update", "index", "pk", "client"]);
const KINDS = new Set(KIND_NAMES);
// one line → spans; `mark`: {col, kind} underlines the token at that column
function paint(line, mark) {
  const out = [], hash = line.indexOf("#"), code = hash < 0 ? line : line.slice(0, hash);
  const re = /([A-Za-z_][A-Za-z0-9_]*)|(-?\d+(?:\.\d+)?)|(\s+)|(~>|.)/g;
  let m, k = 0;
  while ((m = re.exec(code))) {
    const [t] = m, col = m.index + 1, under = mark && col <= mark.col && mark.col < col + t.length ? ` pe-${mark.kind}` : "";
    let cls = "";
    if (m[1]) cls = KEYWORDS.has(t) ? "pe-kw" : KINDS.has(t) ? "pe-kind" : /^[A-Z][A-Z0-9_]*$/.test(t) ? "pe-req" : "";
    else if (m[2]) cls = "pe-num";
    else if (m[4]) cls = "pe-op";
    out.push(cls || under ? <span key={k++} className={cls + under}>{t}</span> : t);
  }
  if (hash >= 0) out.push(<span key={k++} className="pe-com">{line.slice(hash)}</span>);
  return out;
}

export default function TextEditor({ text, onChange, compiled, cost, label, focusLine }) {
  const ta = useRef(null), over = useRef(null), gut = useRef(null), esc = useRef(false);
  const [, force] = useState(0), [sug, setSug] = useState(null); // autocomplete: {from, items, sel, line, col}
  const take = (t, item) => { const cur = t.selectionStart, r = accept(t.value, sug, item, cur); onChange(r.text); setSug(null); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = r.cursor; const again = suggest(r.text, r.cursor); if (again && item.insert.endsWith("(")) open(again, r.text, r.cursor); }); };
  const open = (s, v, cur) => { if (!s) return setSug(null); const ls = v.lastIndexOf("\n", cur - 1) + 1; setSug({ ...s, sel: 0, line: v.slice(0, ls).split("\n").length - 1, col: s.from - ls }); };
  const lines = text.split("\n");
  const errs = compiled && !compiled.ok ? compiled.errors : [], warns = compiled?.ok ? compiled.warnings : [];
  const byLine = new Map();
  for (const w of warns) byLine.set(w.line, { kind: "warn", col: w.col, message: w.message });
  for (const e of errs) byLine.set(e.line, { kind: "err", col: e.col, message: e.message });
  const sync = () => { const t = ta.current; if (!t) return; over.current.style.transform = `translate(${-t.scrollLeft}px,${-t.scrollTop}px)`; gut.current.style.transform = `translateY(${-t.scrollTop}px)`; };
  useEffect(sync);
  useEffect(() => { if (!focusLine || !ta.current) return; const t = ta.current, at = lines.slice(0, focusLine - 1).join("\n").length + (focusLine > 1 ? 1 : 0); t.focus(); t.setSelectionRange(at, at); t.scrollTop = Math.max(0, (focusLine - 3) * 21); }, [focusLine]); // eslint-disable-line
  const key = (e) => {
    if (sug) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = sug.items.length; setSug({ ...sug, sel: (sug.sel + (e.key === "ArrowDown" ? 1 : n - 1)) % n }); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); take(e.target, sug.items[sug.sel]); return; }
      if (e.key === "Escape") { e.preventDefault(); setSug(null); return; }
    }
    if (e.key === "Escape") { esc.current = true; return; }
    if (e.key === "Tab" && !e.shiftKey && !esc.current && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const t = e.target, s = t.selectionStart, end = t.selectionEnd, v = t.value;
      onChange(v.slice(0, s) + "  " + v.slice(end));
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
    }
    esc.current = false;
  };
  const first = errs[0] || null;
  return <div className="pe">
    <div className="pe-box">
      <div className="pe-gutter" aria-hidden="true"><div ref={gut}>{lines.map((_, i) => { const m = byLine.get(i + 1); return <div key={i} className={m ? `pe-g-${m.kind}` : ""} title={m?.message}>{i + 1}</div>; })}</div></div>
      <div className="pe-area">
        <pre className="pe-over" aria-hidden="true"><code ref={over}>{lines.map((l, i) => <div key={i} className="pe-line">{paint(l, byLine.get(i + 1))}{"\n"}</div>)}</code></pre>
        <textarea ref={ta} className="pe-ta" value={text} spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" wrap="off" aria-label={label} aria-describedby="pe-msg"
          onChange={(e) => { const t = e.target; onChange(t.value); force((x) => x + 1); open(t.selectionStart === t.selectionEnd ? suggest(t.value, t.selectionStart) : null, t.value, t.selectionStart); }}
          onScroll={() => { sync(); setSug(null); }} onKeyDown={key} onBlur={() => setTimeout(() => setSug(null), 150)} aria-autocomplete="list" aria-expanded={!!sug} aria-controls="pe-sug"/>
        {sug && <ul id="pe-sug" className="pe-sug" role="listbox" style={{ top: `${10 + (sug.line + 1) * 21 - (ta.current?.scrollTop || 0)}px`, left: `calc(12px + ${sug.col}ch - ${ta.current?.scrollLeft || 0}px)` }}>
          {sug.items.map((x, i) => <li key={x.label} role="option" aria-selected={i === sug.sel} className={i === sug.sel ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); take(ta.current, x); }}>{x.label}</li>)}</ul>}
      </div>
    </div>
    <div className="pe-foot">
      <p id="pe-msg" className={first ? "pe-msg pe-msg-err" : warns[0] ? "pe-msg pe-msg-warn" : "pe-msg"} role="status" aria-live="polite">
        {first ? `Line ${first.line}: ${first.message}` : warns[0] ? `Line ${warns[0].line}: ${warns[0].message}` : ""}
      </p>
      {cost && <span className="pe-cost">{cost}</span>}
    </div>
  </div>;
}

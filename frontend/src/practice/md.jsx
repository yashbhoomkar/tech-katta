// A small Markdown renderer for problem statements and editorials: paragraphs, ## headings, - and 1. lists, ``` code
// blocks, **bold**, `code` and [links](/path). It builds React elements (never HTML strings), so nothing in the text runs.
import React from "react";
const inline = (s, k = 0) => {
  const out = [], re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2]) out.push(<b key={k++}>{m[2]}</b>);
    else if (m[3]) out.push(<code key={k++}>{m[3]}</code>);
    else { const href = /^(\/|#|https:\/\/)/.test(m[5]) ? m[5] : "#"; out.push(<a key={k++} href={href}>{m[4]}</a>); }
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
};
export function Md({ text = "", className = "" }) {
  const lines = String(text).split("\n"), blocks = [];
  for (let i = 0; i < lines.length;) {
    const l = lines[i];
    if (l.startsWith("```")) { const body = []; i += 1; while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]); i += 1; blocks.push(<pre key={i}><code>{body.join("\n")}</code></pre>); continue; }
    if (/^#{2,3} /.test(l)) { const H = l.startsWith("###") ? "h4" : "h3"; blocks.push(<H key={i}>{inline(l.replace(/^#+ /, ""))}</H>); i += 1; continue; }
    if (/^(- |\d+\. )/.test(l)) { const ordered = /^\d/.test(l), items = []; while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, "")); const L = ordered ? "ol" : "ul"; blocks.push(<L key={i}>{items.map((x, j) => <li key={j}>{inline(x)}</li>)}</L>); continue; }
    if (!l.trim()) { i += 1; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3} |- |\d+\. |```)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={i}>{inline(para.join(" "))}</p>);
  }
  return <div className={"pr-md " + className}>{blocks}</div>;
}

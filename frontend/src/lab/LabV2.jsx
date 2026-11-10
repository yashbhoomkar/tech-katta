// The canvas's v2 parts (tech-katta-context/evaluator.md §12.1): used when the problem on the canvas is judged by
// the v2 evaluator (practice.v === 2). The settings panel is generated from each type's `settings` in
// content/eval.json (one renderer for every kind), arrows can carry only some calls, and the palette comes from
// the v2 catalogue. No simulation runs here: the canvas shows a test's timeline when the workspace replays it.
import React, { useState } from 'react';
import SchemaEditor from './SchemaEditor.jsx';
import { schemaIssues, schemaSummary, vocab, cleanSchema } from './schema.js';
import { sizesOf } from './engine.js';
import { evalCatalogue, settingsOf, configOf, STRUCTURE_KINDS } from '../eval/design.js';

const num = (n) => Math.round(n).toLocaleString('en-US');
const KIND_WORDS = { kv: 'key–value', counter: 'counters', zset: 'sorted set (ranking)', geo: 'locations (geo set)', set: 'set' };

// Palette entries for a v2 problem: the catalogue's types, grouped by their v2 group.
// palette: false hides a type the learner doesn't add (an external service is placed by the problem) or that isn't
// simulated yet
export const paletteV2 = (lab) => Object.values(evalCatalogue(lab)).filter((c) => c.palette !== false);

function Field({ label, help, children }) {
  return <label className="lab-f"><span>{label}</span>{children}{help && <small className="lab-note lab-note-tight">{help}</small>}</label>;
}

// One setting, whatever its kind.
function Setting({ s, comp, cfg, set, node, fieldHints, title }) {
  const k = s.key;
  if (s.kind === 'number') {
    const put = (v) => set({ [k]: Math.max(s.min, Math.min(s.max, s.step === 1 ? Math.round(+v || 0) : +v || 0)) });
    return <Field label={s.label} help={s.help}><input type="number" min={s.min} max={s.max} value={cfg[k] ?? s.default} onChange={(e) => put(e.target.value)} /></Field>;
  }
  if (s.kind === 'bool') return <><label className="lab-check"><input type="checkbox" checked={!!cfg[k]} onChange={(e) => set({ [k]: e.target.checked })} />{s.label}</label>{s.help && <p className="lab-note lab-note-tight">{s.help}</p>}</>;
  if (s.kind === 'choice') {
    const cur = s.options.find((o) => o.id === cfg[k]) || s.options.find((o) => o.id === s.default);
    return <><Field label={s.label}><select value={cur.id} onChange={(e) => set({ [k]: e.target.value })}>{s.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>{cur.desc && <p className="lab-note lab-note-tight">{cur.desc}</p>}</>;
  }
  if (s.kind === 'size') {
    const [list, def] = sizesOf(comp, cfg);
    if (!Array.isArray(list) || !list.length || (comp.type === 'database' && comp.engines?.find((e) => e.id === cfg.engine)?.capacity === 'request')) return null;
    return <Field label={s.label}><select value={list.some((z) => z.id === cfg[k]) ? cfg[k] : def} onChange={(e) => set({ [k]: e.target.value })}>{list.map((z) => <option key={z.id} value={z.id}>{z.label} · {z.connections ? `${num(z.connections)} connections, ${num(z.messagesPerSec)} messages/s` : `${num(z.rps || z.qps || z.ops)} units/s`} · ${z.hourly}/h</option>)}</select></Field>;
  }
  if (s.kind === 'engine') {
    const fam = [...new Set(comp.engines.map((x) => x.family))], e = comp.engines.find((x) => x.id === cfg.engine) || comp.engines[0];
    return <><Field label={s.label}><select value={e.id} onChange={(ev) => { const c = { ...cfg, engine: ev.target.value }; set({ engine: ev.target.value, size: sizesOf(comp, c)[1] }); }}>
      {fam.map((f) => <optgroup key={f} label={f}>{comp.engines.filter((x) => x.family === f).map((x) => <option key={x.id} value={x.id}>{x.aws.startsWith(x.label) ? x.aws : `${x.label} · ${x.aws}`}</option>)}</optgroup>)}</select></Field>
      <p className="lab-note lab-note-tight">{e.desc}</p></>;
  }
  if (s.kind === 'schema') return <SchemaBox key={node.id} comp={comp} cfg={cfg} set={set} title={title} suggest={fieldHints || []} />;
  if (s.kind === 'structures') return <StructuresBox key={node.id} cfg={cfg} set={set} title={title} suggest={fieldHints || []} />;
  return null;
}

function SchemaBox({ comp, cfg, set, title, suggest }) {
  const [open, setOpen] = useState(false);
  const e = comp.engines?.find((x) => x.id === cfg.engine) || null, v = vocab(e), iss = schemaIssues(e, cfg.schema), errs = iss.filter((x) => x.level === 'error').length;
  return <div className="lab-sch"><div className="lab-h">{(comp.schemaLabel || 'Schema').toUpperCase()}</div>
    <p className="lab-note lab-note-tight">{cfg.schema?.tables?.length ? schemaSummary(e, cfg.schema) : `No ${v.tables} yet. Add what this store keeps: the tests look for the data where your ${v.tables} say it is.`}</p>
    {iss.length > 0 && <p className={'lab-note lab-note-tight ' + (errs ? 'lab-warn' : '')}>{errs ? `${errs} problem${errs > 1 ? 's' : ''}: open the schema to see them.` : `${iss.length} warning${iss.length > 1 ? 's' : ''}: open the schema to see them.`}</p>}
    <button type="button" className="lab-btn ghost" onClick={() => setOpen(true)}>{cfg.schema?.tables?.length ? 'Edit schema' : `Add ${v.tables}`}</button>
    {open && <SchemaEditor engine={e} schema={cfg.schema} title={title} suggest={suggest} save={(schema) => set({ schema })} close={() => setOpen(false)} />}</div>;
}

// A cache's own data (structures): like a schema's tables, each with a kind (key–value, counters, sorted set…).
function StructuresBox({ cfg, set, title, suggest }) {
  const [open, setOpen] = useState(false), list = cfg.structures || [];
  const kindOf = (name) => list.find((x) => x.name === name)?.kind || 'kv';
  const save = (schema) => set({ structures: (schema?.tables || []).map((t) => ({ ...t, kind: kindOf(t.name) })) });
  return <div className="lab-sch"><div className="lab-h">DATA KEPT HERE</div>
    <p className="lab-note lab-note-tight">{list.length ? `${list.length} kept here, found by their key.` : 'Nothing yet: as a look-aside cache it keeps copies of what it reads from the database. Add data here to keep it only in the cache (a ranking, counters, locations).'}</p>
    {list.map((t) => <Field key={t.name} label={`${t.name} is`}><select value={t.kind} onChange={(e) => set({ structures: list.map((x) => (x.name === t.name ? { ...x, kind: e.target.value } : x)) })}>{STRUCTURE_KINDS.map((k) => <option key={k} value={k}>{KIND_WORDS[k]}</option>)}</select></Field>)}
    <button type="button" className="lab-btn ghost" onClick={() => setOpen(true)}>{list.length ? 'Edit data' : 'Add data'}</button>
    {open && <SchemaEditor engine={null} schema={cleanSchema({ tables: list })} title={title} suggest={suggest} save={save} close={() => setOpen(false)} />}</div>;
}

// The settings panel of one component in a v2 problem.
export function InspectorV2({ lab, node, update, rename, remove, conn, labelOf, fieldHints, H, Glyph, maxName, locked }) {
  const cat = evalCatalogue(lab), comp = cat[node.data.kind];
  if (!comp) return null;
  const raw = node.data.config || {}, cfg = configOf({ id: node.id, type: node.data.kind, config: raw }, lab), set = (patch) => update(node.id, { ...raw, ...patch });
  const title = node.data.name || comp.name, settings = settingsOf(comp.type, lab);
  // set by the problem (another company's service): shown, not changed
  if (locked) return <aside className="lab-ins" tabIndex={0} aria-label="Component settings"><div className="lab-h">{comp.group.toUpperCase()}</div><H><Glyph kind={comp.type} />{title}</H><p className="lab-desc">{comp.desc}</p><p className="lab-like"><b>SET BY THE PROBLEM</b>Not yours to change: you design around it.</p>
    <dl className="lab-kv">{settings.map((s) => <React.Fragment key={s.key}><dt>{s.label}</dt><dd>{s.kind === 'choice' ? s.options.find((o) => o.id === cfg[s.key])?.label : String(cfg[s.key] ?? '')}</dd></React.Fragment>)}</dl></aside>;
  return <aside className="lab-ins" tabIndex={0} aria-label="Component settings"><div className="lab-h">{comp.group.toUpperCase()}</div><H><Glyph kind={comp.type} />{title}</H>
    {node.data.name && <p className="lab-note lab-note-tight">{comp.name}</p>}
    <Field label="Name"><input type="text" maxLength={maxName} value={node.data.name || ''} placeholder={comp.name} onChange={(e) => rename(node.id, e.target.value.slice(0, maxName))} onBlur={(e) => { const v = e.target.value.replace(/\s+/g, ' ').trim(); if (v !== (node.data.name || '')) rename(node.id, v); }} /></Field>
    <p className="lab-desc">{comp.desc}</p>{comp.like && <p className="lab-like"><b>IN REAL LIFE</b>{comp.like}</p>}
    {comp.type === 'client' && <p className="lab-like"><b>SET BY THE TESTS</b>The tests send the traffic: how much, when, and which calls.</p>}
    {settings.map((s) => <Setting key={s.key} s={s} comp={comp} cfg={cfg} set={set} node={node} fieldHints={fieldHints} title={title} />)}
    {comp.managed && comp.type !== 'client' && <p className="lab-note lab-note-tight">Run for you by AWS: it doesn't crash, it refuses what is over its limit{comp.limitRps ? ` (${num(comp.limitRps)} a second)` : ''}.</p>}
    {conn && <div className="lab-conn"><div className="lab-h">ARROWS OUT</div>{conn.out.length ? <ul>{conn.out.map((e) => <li key={e.id}><span>→ {labelOf(e.target)}</span><button type="button" className="lab-x" aria-label={`Remove the arrow to ${labelOf(e.target)}`} onClick={() => conn.removeEdge(e.id)}>✕</button></li>)}</ul> : <p className="lab-note lab-note-tight">None yet.</p>}
      {conn.targets.length > 0 && <Field label="Connect to"><select value="" onChange={(e) => { if (e.target.value) conn.add(e.target.value); }}><option value="">Choose a component…</option>{conn.targets.map((n) => <option key={n.id} value={n.id}>{labelOf(n.id)}</option>)}</select></Field>}</div>}
    <button type="button" className="lab-btn ghost" onClick={() => remove(node.id)}>Remove from design</button></aside>;
}

// What a selected arrow carries: every call, only reads, only writes, or the operations chosen.
export function ArrowV2({ edge, ops, labelOf, removeEdge, setCarries, H }) {
  const c = edge.data?.carries, mode = !c ? 'all' : c.length === 1 && c[0] === 'reads' ? 'reads' : c.length === 1 && c[0] === 'writes' ? 'writes' : 'some';
  const pick = (m) => setCarries(edge.id, m === 'all' ? undefined : m === 'reads' ? ['reads'] : m === 'writes' ? ['writes'] : ops.map((o) => o.id));
  const toggle = (id) => { const now = mode === 'some' ? c : []; const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id]; setCarries(edge.id, next.length ? ops.map((o) => o.id).filter((x) => next.includes(x)) : undefined); };
  return <aside className="lab-ins" tabIndex={0} aria-label="Arrow"><div className="lab-h">ARROW</div><H>{labelOf(edge.source)} → {labelOf(edge.target)}</H>
    <p className="lab-desc">Calls flow this way. By default an arrow carries every call; choose fewer to send reads and writes, or each call, their own way.</p>
    <Field label="Carries"><select value={mode} onChange={(e) => pick(e.target.value)}><option value="all">Every call</option><option value="reads">Only reads</option><option value="writes">Only writes</option>{ops.length > 0 && <option value="some">Calls I choose…</option>}</select></Field>
    {mode === 'some' && ops.map((o) => <label key={o.id} className="lab-check"><input type="checkbox" checked={c.includes(o.id)} onChange={() => toggle(o.id)} />{o.name}</label>)}
    <button type="button" className="lab-btn ghost" onClick={() => removeEdge(edge.id)}>Remove arrow</button><p className="lab-note">Shortcut: select an arrow and press Delete, or use the ✕ on it.</p></aside>;
}

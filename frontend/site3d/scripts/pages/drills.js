// Quick interview drills (/drills): one card at a time, a one-minute question, tap to show the model answer, then Next. The questions and answers come from
// the API (content/drills.json, built only from the articles' own facts); the cards already seen are remembered in this browser (tk-drills-v1), nothing on the server.
import { API } from '../articles.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KEY = 'tk-drills-v1';
export const readSeen = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return Array.isArray(v.seen) ? v.seen.filter((x) => typeof x === 'string') : []; } catch { return []; } };
const writeSeen = (seen) => { try { localStorage.setItem(KEY, JSON.stringify({ seen })); } catch { /* storage blocked: the cards still work */ } };
/** the card to show: the first one not seen yet after `from`, wrapping round; null when every card is seen */
export function nextCard(drills, seen, from = -1) {
  for (let k = 1; k <= drills.length; k += 1) { const i = (from + k) % drills.length; if (!seen.includes(drills[i].id)) return i; }
  return null;
}

export function mount(view) {
  let alive = true, drills = [], at = -1, shown = false, seen = readSeen();
  const frame = (inner) => `<section class="page narrow drills" aria-labelledby="drills-h">
    <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><a href="/learn/interview-questions">Learn</a><span>/</span><span>Drills</span></nav>
    <h1 class="headline" id="drills-h"><span class="thin">One minute,</span><span class="heavy accent">one question</span></h1>
    <p class="lead">Say your answer out loud first, then check it. Each card links to the part of the article it comes from, and to a problem where it matters.</p>${inner}</section>${footer()}`;
  const draw = () => {
    if (!drills.length) return;
    const done = drills.filter((d) => seen.includes(d.id)).length;
    if (at < 0 || at >= drills.length) at = nextCard(drills, seen, -1) ?? 0;
    const d = drills[at];
    const all = done === drills.length;
    view.innerHTML = frame(`<div class="you-card block glass drill" data-id="${esc(d.id)}">
      <p class="mono drill-count" aria-live="polite">Card ${at + 1} of ${drills.length} · ${done} seen</p>
      <h2 class="drill-q">${esc(d.q)}</h2>
      ${shown ? `<div class="prose drill-a" role="region" aria-label="Model answer"><p>${esc(d.a)}</p>
        <p class="muted">Read it in <a href="/learn/${esc(d.article)}#${esc(d.anchor)}">${esc(d.articleTitle.split(': ')[0])}, ${esc(d.section)}</a>. Try it on the canvas: <a href="/problems/${esc(d.problem)}">${esc(d.problemTitle.split(': ')[0])}</a>.</p></div>` : ''}
      <p class="actions">${shown ? `<button class="btn dark" type="button" data-next>Next question<span class="chip">→</span></button>` : `<button class="btn dark" type="button" data-show>Show the answer<span class="chip">↓</span></button>`}
        <button class="btn light" type="button" data-skip>Skip</button></p>
      ${all ? '<p class="ok"><b>You have seen every card.</b> <button class="btn light sm" type="button" data-reset>Start again</button></p>' : ''}
    </div>`);
    view.querySelector('[data-show]')?.addEventListener('click', () => { shown = true; if (!seen.includes(d.id)) { seen = [...seen, d.id]; writeSeen(seen); } draw(); view.querySelector('.drill-a')?.focus?.(); });
    view.querySelector('[data-next]')?.addEventListener('click', () => { shown = false; at = nextCard(drills, seen, at) ?? (at + 1) % drills.length; draw(); });
    view.querySelector('[data-skip]')?.addEventListener('click', () => { shown = false; at = (at + 1) % drills.length; draw(); });
    view.querySelector('[data-reset]')?.addEventListener('click', () => { seen = []; writeSeen(seen); shown = false; at = 0; draw(); });
  };
  view.innerHTML = frame('<p class="muted" role="status">Loading the cards…</p>');
  fetch(`${API}/v1/drills`, { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => { if (!alive) return; drills = j.drills || []; if (drills.length) draw(); else view.innerHTML = frame('<p class="muted">No drills yet.</p>'); })
    .catch(() => { if (alive) view.innerHTML = frame('<p class="muted">The drills could not be loaded. <button class="btn light sm" type="button" onclick="location.reload()">Try again</button></p>'); });
  return () => { alive = false; };
}

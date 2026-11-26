// The workspace pages: the canvas and the judge (React, in an island) inside a 3D page. One module for every address that
// opens them: /problems/<slug> (a problem), /problems/challenge/<id>, /problems/sandbox, /problems/shared (a shared design,
// its data in the #fragment) and /practice[/<slug>] (the practice problems, open to everyone). The island code
// (frontend/next/src/islands, built into /3d/islands/islands.js) loads only here; the page around it (sidebar, bottom bar,
// title, the content lock) is the 3D site's.
import { API, apiFetch, getArticle, listArticles, listNow, SECTIONS } from '../articles.js';
import { gateNow, watchGate } from '../gating.js';
import { signInCard, wireSignInCard } from '../signin.js';
import { problemPublicHtml, wirePublic } from './public.js';
import { syncRail } from '../shell.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const isProblem = (a) => a.section === 'interview-questions' && a.group !== 'start';

/** which island an address opens: { kind, slug?, id? } */
export function kindOf(path) {
  let m;
  if ((m = path.match(/^\/problems\/challenge\/([\w-]+)\/?$/))) return { kind: 'challenge', id: m[1] };
  if (/^\/problems\/sandbox\/?$/.test(path)) return { kind: 'sandbox' };
  if (/^\/problems\/shared\/?$/.test(path)) return { kind: 'shared' };
  if ((m = path.match(/^\/problems\/([\w-]+)\/?$/))) return { kind: 'problem', slug: m[1] };
  if ((m = path.match(/^\/practice(?:\/([\w-]+))?\/?$/))) return { kind: 'practice', slug: m[1] };
  return null;
}
/** the browser tab's title for these addresses (app.js titleFor) */
export function titleOf(path) {
  const k = kindOf(path), brand = 'Tech Katta';
  if (!k) return null;
  if (k.kind === 'problem') { const a = listNow().find((x) => x.slug === k.slug); return `${a ? a.title.split(/:\s/)[0] : 'Problem'} · Problems · ${brand}`; }
  return `${{ challenge: 'Challenge · Problems', sandbox: 'Sandbox · Problems', shared: 'Shared design · Problems', practice: 'Practice' }[k.kind]} · ${brand}`;
}

const wait = () => `<section class="ws"><div class="ws-wait glass" role="status" aria-label="Loading"><div class="skel"><i></i><i></i><i></i></div></div></section>`;
const missing = () => `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><a href="/problems">Problems</a><span>/</span><span>Not found</span></nav><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy">at this address</span></h1><p><a class="btn dark" href="/problems">See all problems<span class="chip">→</span></a></p></section>`;
/** a page that has no public part (the sandbox, a shared design): only the sign-in card */
function locked(title) {
  return `<section class="locked-wrap"><div class="locked-card"><p class="kicker"><span>${esc(title)}</span></p><h1 class="sr">${esc(title)}</h1>${signInCard('page')}</div></section>`;
}
// a challenge's own name, for the tab title and the lock card (GET /v1/lab, once)
let labP = null;
const getLab = () => (labP ||= apiFetch('/v1/lab', { headers: { accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
addEventListener('tk-account', () => { labP = null; });
const challengeName = (id) => getLab().then((l) => (l?.challenges || []).find((c) => c.id === id)?.title || null);

export function mount(view, _params, ctx) {
  const path = location.pathname.replace(/(.)\/$/, '$1');
  const target = kindOf(path);
  let alive = true, unmount = null, island = null, ro = null, offPublic = null;
  /** which kind of gate this address has: a problem, a challenge or a practice problem shows its public part; the sandbox and shared designs only the card; the practice list is open */
  const gateKind = () => (target.kind === 'practice' ? (target.slug ? 'problem' : null) : target.kind === 'problem' || target.kind === 'challenge' ? 'problem' : 'workspace');
  /** the public part of this address: { title, difficulty, brief } or null */
  const publicData = async () => {
    try {
      if (target.kind === 'problem') { let a = await getArticle(target.slug); if (!a) { const h = listNow().find((x) => x.slug === target.slug); a = h && { title: h.title, group: h.group, brief: h.dek }; } if (!a) return null; const names = Object.fromEntries((SECTIONS.find((x) => x.id === 'interview-questions')?.groups || [])); return { title: a.title, difficulty: names[a.difficulty || a.group] || a.difficulty || '', brief: a.brief || a.dek }; }
      if (target.kind === 'challenge') { const l = await getLab(); const c = (l?.challenges || []).find((x) => x.id === target.id); return c ? { title: c.title, difficulty: l.levels?.[c.level] ?? c.level, brief: c.brief } : null; }
      if (target.kind === 'practice') { const r = await apiFetch(`/v1/practice/problems/${encodeURIComponent(target.slug)}`, { headers: { accept: 'application/json' } }); if (!r.ok) return null; const p = await r.json(); return { title: p.title, difficulty: p.difficulty ? p.difficulty[0].toUpperCase() + p.difficulty.slice(1) : '', brief: p.brief }; }
    } catch { /* offline: the card alone */ }
    return null;
  };
  const stop = () => { try { unmount?.(); } catch (e) { console.warn(e); } unmount = null; ro?.disconnect(); ro = null; document.documentElement.style.removeProperty('--ws-bottom'); document.documentElement.style.removeProperty('--ws-top'); };

  /** the bottom bar floats over the page on phones: the island ends above it */
  const reserve = () => {
    const bar = document.querySelector('.tabbar');
    const top = document.getElementById('top');
    const set = () => {
      const r = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect() : null, t = top && getComputedStyle(top).display !== 'none' ? top.getBoundingClientRect() : null;
      document.documentElement.style.setProperty('--ws-bottom', r ? `${Math.max(0, Math.round(innerHeight - r.top))}px` : '0px');
      document.documentElement.style.setProperty('--ws-top', t ? `${Math.max(0, Math.round(t.bottom))}px` : '0px');
    };
    set(); ro = new ResizeObserver(set); ro.observe(document.documentElement);
  };

  async function draw() {
    stop();
    if (!alive) return;
    const g = gateKind() ? gateNow(gateKind()) : 'open';
    document.body.classList.toggle('ws-locked', g !== 'open'); syncRail();
    if (g === 'wait') { view.innerHTML = wait(); return; }
    if (g === 'preview' || g === 'locked') {
      // signed out: the public part of a problem or challenge (title, difficulty, the first lines of the brief) and the card; nothing else exists in the page
      const label = target.kind === 'challenge' ? 'Challenge' : target.kind === 'practice' ? 'Practice' : target.kind === 'problem' ? 'Problem' : { sandbox: 'Sandbox', shared: 'Shared design' }[target.kind] || 'Problem';
      const crumbs = `<nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Home</a><span>/</span><a href="${target.kind === 'practice' ? '/practice' : '/problems'}">${target.kind === 'practice' ? 'Practice' : 'Problems'}</a><span>/</span><span>${esc(label)}</span></nav>`;
      const data = g === 'preview' ? await publicData() : null;
      if (!alive) return;
      if (data) { view.innerHTML = problemPublicHtml(data, { crumbs, kicker: label }); offPublic = wirePublic(view); }
      else { view.innerHTML = locked({ sandbox: 'Sandbox', shared: 'Shared design' }[target.kind] || label); offPublic = wireSignInCard(view); }
      return;
    }
    view.innerHTML = `<section class="ws"><div class="ws-host"></div></section>`;
    reserve();
    const host = view.querySelector('.ws-host');
    try {
      island ||= await import('/3d/islands/islands.js');
      if (!alive) return;
      host.setAttribute('aria-busy', 'false');
      unmount = target.kind === 'problem' ? island.mountWorkspace(host, { slug: target.slug })
        : target.kind === 'challenge' ? island.mountChallenge(host, { id: target.id })
        : target.kind === 'sandbox' ? island.mountSandbox(host)
        : target.kind === 'shared' ? island.mountShared(host)
        : island.mountPractice(host, { slug: target.slug });
    } catch (e) {
      console.warn('workspace failed to load', e);
      view.innerHTML = `<section class="page narrow missing"><h1 class="headline"><span class="thin">The workspace</span><span class="heavy">couldn't open</span></h1><p class="lead">Check your connection and reload. Your designs are kept in this browser.</p><p><button type="button" class="btn dark" onclick="location.reload()">Reload<span class="chip">↻</span></button></p></section>`;
    }
  }

  view.innerHTML = wait();
  (async () => {
    await listArticles().catch(() => {});
    if (!alive) return;
    // a problem that does not exist: the same page as any unknown address
    if (target.kind === 'problem' && listNow().length && !listNow().some((a) => a.slug === target.slug && isProblem(a))) { view.innerHTML = missing(); return; }
    document.title = titleOf(path) || document.title;
    if (target.kind === 'challenge') challengeName(target.id).then((n) => { if (alive && n) document.title = `${n} · Challenge · Tech Katta`; });
    draw();
  })();
  const off = gateKind() ? watchGate(gateKind(), () => { if (alive) window.tkRefresh?.(); }) : null;
  return () => { alive = false; off?.(); offPublic?.(); stop(); document.body.classList.remove('ws-locked'); };
}

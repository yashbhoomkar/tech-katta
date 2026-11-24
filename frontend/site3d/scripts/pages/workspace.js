// The workspace pages: the canvas and the judge (React, in an island) inside a 3D page. One module for every address that
// opens them: /problems/<slug> (a problem), /problems/challenge/<id>, /problems/sandbox, /problems/shared (a shared design,
// its data in the #fragment) and /practice[/<slug>] (the practice problems, open to everyone). The island code
// (frontend/next/src/islands, built into /3d/islands/islands.js) loads only here; the page around it (sidebar, bottom bar,
// title, the content lock) is the 3D site's.
import { listArticles, listNow } from '../articles.js';
import { gateNow, watchGate, accountCopy } from '../gating.js';
import { openSignIn } from '../signin.js';

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
const missing = () => `<section class="page narrow missing"><nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><a href="/problems">Problems</a><span>/</span><span>Not found</span></nav><h1 class="headline"><span class="thin">Nothing runs</span><span class="heavy">at this address</span></h1><p><a class="btn dark" href="/problems">See all problems<span class="chip">→</span></a></p></section>`;
function locked(title) {
  const c = accountCopy()?.pageLock || { title: 'Sign in to open this', text: '' };
  return `<section class="page narrow"><div class="gate-card big"><p class="kicker"><span>${esc(title)}</span></p><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p><button type="button" class="btn dark" data-signin>Sign in<span class="chip">→</span></button></div></section>`;
}

export function mount(view, _params, ctx) {
  const path = location.pathname.replace(/(.)\/$/, '$1');
  const target = kindOf(path);
  let alive = true, unmount = null, island = null, ro = null;
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
    const g = target.kind === 'practice' ? 'open' : gateNow('workspace');
    if (g === 'wait') { view.innerHTML = wait(); return; }
    if (g === 'locked') {
      const a = target.slug && listNow().find((x) => x.slug === target.slug);
      view.innerHTML = locked(a ? a.title : { challenge: 'Challenge', sandbox: 'Sandbox', shared: 'Shared design' }[target.kind] || 'Problem');
      view.querySelector('[data-signin]').addEventListener('click', () => openSignIn('page'));
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
    draw();
  })();
  const off = target.kind === 'practice' ? null : watchGate('workspace', () => { if (alive) draw(); });
  return () => { alive = false; off?.(); stop(); };
}

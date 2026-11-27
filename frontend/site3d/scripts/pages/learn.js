// Learn: four tabs (concepts, components, interview questions, real systems), the real articles grouped as the site
// groups them. Beside the list, a live 3D preview of each article's figure rebuilds as you hover (wide screens) or as
// a row passes the middle of the screen (phones, where the preview stays at the top).
import { createWorld } from '../world.js';
import { listArticles, listNow, splitTitle, SECTIONS, FREE } from '../articles.js';
import { recipeFor, RECIPES, PREVIEW } from '../figures.js';
import { ensureStories } from '../articles.js';
import { accountState } from '../account.js';
import { store } from '../store.js';
import { footer } from './landing.js';
import { PLACES } from '../shell.js';
const tagText = (t = '') => t.toLowerCase().replace(/^./, (c) => c.toUpperCase()).replace(/\b(cap|cdc|api|sql|ai|cdn)\b/gi, (w) => w.toUpperCase());

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const numOf = (no = '') => (no.match(/(\d+)/) || [])[1] || '';
const HEAD = {
  concepts: ['The ideas every design is built from', 'Each opens with a short 3D story, then the full article.'],
  components: ['The tools interviewers name', 'What each is for, where it stops, and when to pick it.'],
  'interview-questions': ['Asked in real interviews', 'Each answered the way you would say it out loud: clarify, estimate, design, trade-offs.'],
  'real-systems': ['How apps you use are built', 'Real products at Indian scale, part by part.'],
};

export function mount(view, [sectionId], { reduced }) {
  ensureStories(!!accountState().user); // signed in: the 3D previews get their words (never sent to anyone else)
  const sec = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];
  let world = null, alive = true, cleanup = [];
  const draw = (list) => {
    cleanup.forEach((f) => f()); cleanup = [];
    const read = store.get().read;
    const mine = list.filter((a) => a.section === sec.id);
    const done = mine.filter((a) => read[`${a.section}/${a.slug}`]).length;
    const groups = sec.groups.map(([g, name]) => [name, mine.filter((a) => a.group === g)]).filter(([, l]) => l.length);
    const other = mine.filter((a) => !sec.groups.some(([g]) => g === a.group));
    if (other.length) groups.push(['More', other]);
    // interview questions and real systems: a plain list, no 3D preview (owner: "there should be no animation")
    const noFig = sec.id === 'interview-questions' || sec.id === 'real-systems';
    const next = mine.find((x) => !read[`${x.section}/${x.slug}`]);
    const levels = sec.id === 'interview-questions' ? ['easy', 'medium', 'hard'].filter((l) => mine.some((x) => x.group === l)) : [];
    const colour = (PLACES.find((p) => p.id === sec.id) || PLACES[2]).colour;
    view.innerHTML = `
    <section class="page learn" style="--acc: var(--${colour})">
      <header class="sec-head">
        <div>
          <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/home">Dashboard</a><span>/</span><span>${esc(sec.name)}</span></nav>
          <h1 class="headline"><span class="thin">${esc(sec.name)}</span><span class="heavy accent">${esc(HEAD[sec.id][0])}</span></h1>
          <p class="lead">${esc(HEAD[sec.id][1])}</p>
          <nav class="tabs" aria-label="Sections">${SECTIONS.map((s) => `<a href="/learn/${s.id}" ${s.id === sec.id ? 'aria-current="page"' : ''}>${esc(s.name)}<span class="mono">${list.filter((a) => a.section === s.id).length}</span></a>`).join('')}</nav>
        </div>
        <div class="cprog">
          <b>${done} of ${mine.length} done</b>
          <span class="cbar"><i style="width:${mine.length ? (done / mine.length) * 100 : 0}%"></i></span>
          ${next ? `<small>Next up: ${esc(splitTitle(next.title)[0])}</small><a class="btn dark sm" href="/learn/${next.section}/${next.slug}">${done ? 'Continue' : 'Start'}<span class="chip">→</span></a>` : '<small>All done here</small>'}
        </div>
      </header>
      ${levels.length ? `<div class="seg levels" role="group" aria-label="Filter by difficulty" style="--n:${levels.length + 1}">${['all', ...levels].map((l, i) => `<button type="button" data-level="${l}" data-i="${i}" aria-pressed="${l === 'all'}">${l === 'all' ? 'All' : l[0].toUpperCase() + l.slice(1)}</button>`).join('')}<i class="seg-pill" aria-hidden="true"></i></div>`
        : groups.length > 1 ? `<nav class="jump" aria-label="Groups">${groups.map(([name], gi) => `<a href="#g-${gi}" data-jumpg="${gi}">${esc(name)}</a>`).join('')}</nav>` : ''}
      <div class="learn-cols${noFig ? ' one' : ''}">
        <div class="learn-list">
          ${groups.map(([name, items], gi) => { const gd = items.filter((x) => read[`${x.section}/${x.slug}`]).length; const gid = sec.groups.find(([, n]) => n === name)?.[0] || 'more';
            return `<section class="track-block" id="g-${gi}" data-group="${gid}">
              <div class="track-head"><h2>${esc(name)}</h2><span class="chip-done mono">${gd} of ${items.length} done</span></div>
              <ol class="lessons">
                ${items.map((a, i) => { const [h, rest] = splitTitle(a.title), isRead = read[`${a.section}/${a.slug}`]; return `<li>
                  <a class="lesson${isRead ? ' done' : ''}" href="/learn/${a.section}/${a.slug}" data-preview="${a.slug}">
                    <span class="st" role="img" aria-label="${isRead ? 'Done' : 'Not started'}">${isRead ? '<i class="tk" aria-hidden="true"></i>' : ''}</span>
                    <span class="l-n mono">${String(i + 1).padStart(2, '0')}</span>
                    <span class="l-main"><b>${esc(h)}${a.access === 'free' ? FREE : ''}</b><span class="muted">${esc(rest || a.dek)}</span></span>
                    <span class="l-tag mono">${esc(tagText(a.tag))}</span>
                  </a></li>`; }).join('')}
              </ol>
            </section>`; }).join('')}
        </div>
        ${noFig ? '' : `<aside class="learn-preview" aria-hidden="true"><div class="preview-card"><canvas></canvas><div class="overlay"></div><p class="preview-cap"><span class="cap-t mono"></span><span class="cap-s"></span></p></div></aside>`}
      </div>
    </section>
    ${footer()}`;

    // difficulty filter (interview questions): the pill slides to the choice; the start guides always show
    view.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
      view.querySelectorAll('[data-level]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      view.querySelector('.levels').style.setProperty('--at', b.dataset.i);
      view.querySelectorAll('.track-block').forEach((g) => { g.hidden = !(b.dataset.level === 'all' || g.dataset.group === b.dataset.level || !levels.includes(g.dataset.group)); });
    }));
    view.querySelectorAll('[data-jumpg]').forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); view.querySelector(`#g-${l.dataset.jumpg}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }));
    const card = view.querySelector('.preview-card');
    world?.destroy(); world = null;
    if (card) { try { world = createWorld(card.querySelector('canvas'), card.querySelector('.overlay'), { reduced, still: true }); } catch { world = null; } card.classList.toggle('flat', !world); }
    world?.setLabelBand(0.8); world?.setLabelTop(10); // clear of the caption at the bottom
    const capT = card?.querySelector('.cap-t'), capS = card?.querySelector('.cap-s');
    const bySlug = Object.fromEntries(mine.map((a) => [a.slug, a]));
    let shown = null;
    function preview(slug) {
      if (shown === slug || !bySlug[slug]) return; shown = slug;
      const a = bySlug[slug], steps = recipeFor(a), s = steps[Math.min(steps.length - 1, PREVIEW[slug] ?? steps.length - 1)];
      if (capT) capT.textContent = `${numOf(a.no)} · ${splitTitle(a.title)[0]}`;
      if (capS) capS.textContent = RECIPES[slug] && s.words ? `${(s.words[0] || s.h2 || '').replace(/^\d+\.\s*/, '')}: ${s.words[1].charAt(0).toLowerCase()}${s.words[1].slice(1)}` : splitTitle(a.title)[1] || a.dek;
      view.querySelectorAll('.lesson.on').forEach((x) => x.classList.remove('on'));
      view.querySelector(`[data-preview="${slug}"]`)?.classList.add('on');
      if (!world) return;
      world.setSystem(s.system);
      const f = world.frame();
      world.setCamera({ t: f.t, dist: f.dist * (innerWidth <= 760 ? 0.72 : 0.8), az: 42, el: 32, sx: 0.5, sy: 0.56 });
      world.setState({ ...s.state, avoid: 0 });
    }
    const rows = [...view.querySelectorAll('[data-preview]')];
    rows.forEach((el) => { const f = () => preview(el.dataset.preview); el.addEventListener('pointerenter', f); el.addEventListener('focus', f); });
    // phones: the row in the middle of the screen is previewed
    const onScroll = () => {
      if (innerWidth > 900) return;
      const mid = innerHeight * 0.62;
      let best = null, bd = Infinity;
      for (const el of rows) { const r = el.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = el; } }
      if (best) preview(best.dataset.preview);
    };
    addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => removeEventListener('scroll', onScroll));
    preview(rows[0]?.dataset.preview);
    // phones: swipe sideways to move between the tabs; the list follows the finger, then goes or springs back
    const learnEl = view.querySelector('.learn'), at = SECTIONS.findIndex((x) => x.id === sec.id);
    let x0 = 0, y0 = 0, dx = 0, horiz = null;
    const start = (e) => { if (innerWidth > 900 || e.touches.length !== 1 || e.target.closest('.tabs')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horiz = null; learnEl.style.transition = 'none'; };
    const move = (e) => {
      if (!x0) return;
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (horiz === null && Math.hypot(mx, my) > 10) horiz = Math.abs(mx) > Math.abs(my) * 1.4;
      if (!horiz) return;
      const edge = (mx > 0 && at === 0) || (mx < 0 && at === SECTIONS.length - 1);
      dx = edge ? mx * 0.25 : mx; // a rubber band at the first and last tab
      learnEl.style.transform = `translateX(${dx * 0.6}px)`; learnEl.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 900));
    };
    const end = () => {
      if (!x0) return; x0 = 0;
      const to = horiz && Math.abs(dx) > 70 ? at + (dx < 0 ? 1 : -1) : at;
      learnEl.style.transition = 'transform .3s var(--out), opacity .3s'; learnEl.style.transform = ''; learnEl.style.opacity = '';
      if (to !== at && SECTIONS[to]) { document.documentElement.dataset.dirHint = dx < 0 ? 'fwd' : 'back'; window.tkFresh = true; window.tkGo(`/learn/${SECTIONS[to].id}`); }
    };
    learnEl.addEventListener('touchstart', start, { passive: true }); learnEl.addEventListener('touchmove', move, { passive: true }); learnEl.addEventListener('touchend', end);
    cleanup.push(() => { learnEl.removeEventListener('touchstart', start); learnEl.removeEventListener('touchmove', move); learnEl.removeEventListener('touchend', end); });
  };
  const first = listNow();
  draw(first);
  listArticles().then((l) => { if (alive && l !== first && JSON.stringify(l) !== JSON.stringify(first)) draw(l); });
  return () => { alive = false; cleanup.forEach((f) => f()); world?.destroy(); };
}

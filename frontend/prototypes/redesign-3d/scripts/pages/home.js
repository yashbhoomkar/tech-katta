// Home: the app's front page. One live 3D figure for what to read next, then a card for every place in the sidebar
// (the same names, colours and icons), each with how far you are and what is next. On phones the cards are a deck
// you swipe sideways; on wide screens a grid. The cards slide up in turn when the page opens.
import { createWorld } from '../world.js';
import { listArticles, listNow, splitTitle } from '../articles.js';
import { recipeFor, PREVIEW } from '../figures.js';
import { INCIDENTS } from '../sim.js';
import { store } from '../store.js';
import { PLACES, icon, tally } from '../shell.js';
import { footer } from './landing.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ORDER = ['concepts', 'components', 'interview-questions', 'real-systems'];

export function mount(view, _p, { reduced }) {
  let world = null, alive = true, offs = [];
  const draw = (list) => {
    offs.forEach((f) => f()); offs = [];
    const read = store.get().read, isRead = (a) => !!read[`${a.section}/${a.slug}`];
    const next = ORDER.map((s) => list.find((a) => a.section === s && !isRead(a))).find(Boolean);
    const nextIn = (id) => id === 'practice' ? INCIDENTS.find((i) => !store.get().best[i.id]?.passed) : list.find((a) => a.section === id && !isRead(a));
    const all = ORDER.reduce((n, s) => n + tally(s, list).done, 0), total = ORDER.reduce((n, s) => n + tally(s, list).total, 0);
    const cards = PLACES.filter((p) => p.id !== 'start');
    view.innerHTML = `
    <section class="page home-app">
      <header class="home-head">
        <p class="kicker"><span>Home</span><i></i>${all} of ${total} read</p>
        <h1 class="headline"><span class="thin">Your system design prep</span><span class="heavy accent">Everything in one place</span></h1>
      </header>
      ${next ? `<a class="continue" href="#/learn/${next.section}/${next.slug}">
        <div class="continue-fig" aria-hidden="true"><canvas></canvas><div class="overlay"></div></div>
        <div class="continue-copy"><p class="mono">${all ? 'Continue' : 'Start here'} · ${esc(PLACES.find((p) => p.id === next.section).name)}</p>
          <h2>${esc(splitTitle(next.title)[0])}</h2><p class="muted">${esc(next.dek)}</p><span class="go">Play the story →</span></div></a>` : ''}
      <h2 class="sub-h">Everything here</h2>
      <div class="deck" role="list">
        ${cards.map((p, i) => { const t = p.section || p.id === 'practice' ? tally(p.id, list) : null, n = p.section || p.id === 'practice' ? nextIn(p.id) : null;
          return `<a class="place" role="listitem" href="${p.href}" style="--c:var(--${p.colour}); --i:${i}">
            <span class="place-icon">${icon(p)}</span>
            <b>${esc(p.name)}</b><span class="muted">${esc(p.blurb)}</span>
            ${t ? `<span class="place-bar"><i style="width:${t.total ? (t.done / t.total) * 100 : 0}%"></i></span><span class="place-meta mono">${t.done} of ${t.total}${n ? ` · next: ${esc(n.title ? splitTitle(n.title)[0] : '')}` : ''}</span>`
              : `<span class="place-meta mono">${p.id === 'me' ? `${tally('concepts', list).done} of 21 concepts lit` : ''}</span>`}
          </a>`; }).join('')}
      </div>
      <p class="deck-dots" aria-hidden="true">${cards.map((_, i) => `<i data-d="${i}"></i>`).join('')}</p>
    </section>
    ${footer()}`;

    // the next article's figure, live
    world?.destroy(); world = null;
    const fig = view.querySelector('.continue-fig');
    if (fig && next) {
      try { world = createWorld(fig.querySelector('canvas'), fig.querySelector('.overlay'), { reduced }); } catch { world = null; }
      fig.classList.toggle('flat', !world);
      if (world) {
        const steps = recipeFor(next), s = steps[Math.min(steps.length - 1, PREVIEW[next.slug] ?? steps.length - 1)];
        world.setSystem(s.system); world.setLabelBand(0.9);
        const f = world.frame();
        world.setCamera({ t: f.t, dist: f.dist * 0.82, az: 42, el: 32, sx: 0.5, sy: 0.55 }, { instant: true });
        world.setState({ ...s.state, avoid: 0 });
      }
    }
    // phones: the dots follow the card in view as you swipe the deck
    const deck = view.querySelector('.deck'), dots = [...view.querySelectorAll('.deck-dots i')];
    const onDeck = () => { const w = deck.firstElementChild?.offsetWidth || 1; const k = Math.round(deck.scrollLeft / (w + 12)); dots.forEach((d, j) => d.classList.toggle('on', j === k)); };
    deck.addEventListener('scroll', onDeck, { passive: true }); onDeck();
    offs.push(() => deck.removeEventListener('scroll', onDeck));
  };
  const first = listNow();
  draw(first);
  listArticles().then((l) => { if (alive && JSON.stringify(l) !== JSON.stringify(first)) draw(l); });
  return () => { alive = false; offs.forEach((f) => f()); world?.destroy(); };
}

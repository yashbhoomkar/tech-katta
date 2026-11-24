// The public part of a locked page, drawn for a signed-out reader (tech-katta-context 52). The same markup is pre-rendered into
// the HTML for search engines (frontend/seo.js), so what the server sends and what the page draws agree.
//
//   an article : header (label, title, subtitle, read time), its first 2 paragraphs fading out, the names of its sections
//                dimmed with a lock each, then the inline sign-in card
//   a problem  : title, difficulty, the first lines of its brief, the sign-in card ("Sign in to design this")
//
// Nothing else is drawn: no further text, figures, 3D story, code, tables or quizzes exist in the payload.
import { requireSignIn, signInCard, wireSignInCard } from '../signin.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const inline = (s = '') => String(s).split(/`([^`]+)`/).map((t, i) => (i % 2 ? `<code>${esc(t)}</code>` : esc(t))).join('');
const LOCK = '<svg class="lock" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="9" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

/** an article's public part. head: { crumbs, kicker, t1, t2 }, a: the public payload (body: 2 paragraphs, headings, minutes) */
export function articlePublicHtml(a, { crumbs, kicker, t1, t2 }) {
  const heads = a.headings || [];
  return `<article class="page narrow public-article" data-public="article">
    ${crumbs}
    <p class="kicker"><span>${esc(kicker[0])}</span><i></i>${esc(kicker[1])}</p>
    <h1 class="headline"><span class="thin">${esc(t1)}</span>${t2 ? `<span class="heavy accent">${esc(t2)}</span>` : ''}</h1>
    <p class="lead">${inline(a.dek)}</p>
    <p class="meta mono">${a.minutes ? `${a.minutes} min read` : ''}${a.date ? `${a.minutes ? ' · ' : ''}${esc(a.date)}` : ''}</p>
    <div class="actions"><button class="btn dark" type="button" data-gated="story">Play the story<span class="chip">↓</span></button></div>
    <div class="prose public-prose preview-fade">${(a.body || []).map((b) => `<p>${inline(b.x)}</p>`).join('')}</div>
    ${heads.length ? `<ol class="locked-heads" aria-label="Sections in this article, locked until you sign in">${heads.map((h) => `<li class="locked-head" aria-disabled="true">${LOCK}<span>${inline(h)}</span></li>`).join('')}</ol>` : ''}
    ${signInCard('article')}
    <div class="complete-wrap"><button class="btn dark complete" type="button" data-gated="complete">Mark complete<span class="chip">→</span></button></div>
  </article>`;
}

/** a problem's or challenge's public part: p: { title, difficulty, brief } */
export function problemPublicHtml(p, { crumbs, kicker }) {
  return `<article class="page narrow public-article public-problem" data-public="problem">
    ${crumbs}
    <p class="kicker"><span>${esc(kicker)}</span>${p.difficulty ? `<i></i><span class="difficulty">${esc(p.difficulty)}</span>` : ''}</p>
    <h1 class="headline"><span class="thin">${esc(p.title)}</span></h1>
    ${p.brief ? `<div class="prose public-prose"><p>${inline(p.brief)}</p></div>` : ''}
    <div class="actions"><button class="btn dark" type="button" data-gated="run">Run${LOCK}</button><button class="btn light" type="button" data-gated="submit">Submit${LOCK}</button></div>
    ${signInCard('problem')}
  </article>`;
}

/** makes the locked page work: the gated buttons open the dialog, the inline card signs in. Returns a cleanup. */
export function wirePublic(root) {
  const onClick = (e) => { const b = e.target.closest('[data-gated]'); if (b) { e.preventDefault(); requireSignIn('action'); } };
  root.addEventListener('click', onClick);
  const off = wireSignInCard(root);
  return () => { root.removeEventListener('click', onClick); off(); };
}

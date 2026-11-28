// How an article is read: Story (the 3D story first, as on the landing) or Text (straight to the words, still figures, no 3D). The reader's choice is kept in
// localStorage; with no choice, a phone opens the story and a wider screen opens the text; a reader who asked for less motion never gets the story by itself.
const KEY = 'tk-reading';
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
let kept = null; // where storage is blocked, the choice lasts for this visit to the site
/** the reader's own choice: 'story', 'text', or null */
export function readingChoice() { try { const v = localStorage.getItem(KEY); if (v === 'story' || v === 'text') return v; } catch { /* storage blocked */ } return kept; }
export const readingNow = () => readingChoice() || (reduced() ? 'text' : innerWidth <= 760 ? 'story' : 'text');
export function setReading(m) { kept = m; try { localStorage.setItem(KEY, m); } catch { /* storage blocked: it holds for this page only */ } }
/** the small control, in the style of the article header's Full text | Cards switch */
export const readingControl = (m) => `<div class="reading-wrap"><span class="reading-l mono" aria-hidden="true">Reading</span><div class="seg reading${m === 'text' ? ' right' : ''}" role="radiogroup" aria-label="Reading"><button type="button" role="radio" data-reading="story" aria-checked="${m === 'story'}">Story</button><button type="button" role="radio" data-reading="text" aria-checked="${m === 'text'}">Text</button><i class="seg-pill" aria-hidden="true"></i></div></div>`;

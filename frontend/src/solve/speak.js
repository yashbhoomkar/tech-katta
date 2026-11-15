// Speak it (context 36, step 21): a spoken summary of the design, two minutes at most, recorded in the browser and
// kept only in this browser (IndexedDB, one per problem). Nothing is uploaded or scored: hearing yourself is the point.

export const SPEAK_MAX = 120; // seconds
const DB = 'tk-speak', STORE = 'takes';

// What to say, in order, with this problem's own words where it has them. About two minutes in all.
export function speakOutline(P) {
  const r = P?.rubric || {}, est = (r.est || []).slice(0, 2).map((e) => e.label.toLowerCase());
  return [
    ['20 s', 'What it must do: the two or three things users do most.'],
    ['20 s', est.length ? `The numbers that matter: ${est.join(' and ')}.` : 'The numbers that matter: requests a second at the peak, and how much data.'],
    ['50 s', 'Walk the design from the client to the data, one part at a time, and why each is there.'],
    ['30 s', 'One trade-off you made, what it costs, and what breaks first if traffic doubles.'],
  ];
}

export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// The best recording format this browser offers, or '' for its default.
export function pickMime(isSupported) {
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) if (isSupported?.(m)) return m;
  return '';
}

function open() {
  return new Promise((resolve, reject) => {
    const q = indexedDB.open(DB, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE);
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
async function tx(mode, f) {
  const db = await open();
  return new Promise((resolve, reject) => { const t = db.transaction(STORE, mode), q = f(t.objectStore(STORE)); t.oncomplete = () => resolve(q?.result); t.onerror = () => reject(t.error); });
}
// { blob, seconds, at } or null
export const loadTake = async (slug) => { try { return (await tx('readonly', (s) => s.get(slug))) || null; } catch { return null; } };
export const saveTake = async (slug, take) => { try { await tx('readwrite', (s) => s.put(take, slug)); return true; } catch { return false; } };
export const dropTake = async (slug) => { try { await tx('readwrite', (s) => s.delete(slug)); } catch { /* nothing kept */ } };

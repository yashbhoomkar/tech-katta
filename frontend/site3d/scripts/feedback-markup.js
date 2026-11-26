// The Report popup's picture editor (Visual feedback): draw on the screenshot before it is sent. Loaded with the screenshot (feedback-ui.js).
// Tools: Draw (freehand), Arrow, Box, Highlight (translucent yellow), Hide (a solid block for anything private), Text; Undo, Clear; red, yellow or blue.
// The picture is a canvas of the screenshot's own pixels with the marks drawn on it, so what is sent (flatten) is exactly what is seen.
// Touch first: pointer events on the canvas only (touch-action: none there), one finger at a time; the sheet's drag-to-close lives on its handle, not here.
import { MARK_COLORS, HIDE_COLOR, toImagePoint, lineWidthFor, textSizeFor, boxOf, arrowHead, tooSmall, dataUrlBytes, MAX_BYTES } from './feedback-core.js';

const TOOLS = [['pen', '✎', 'Draw'], ['arrow', '➚', 'Arrow'], ['box', '▭', 'Box'], ['hl', '▮', 'Highlight'], ['hide', '◼', 'Hide'], ['text', 'T', 'Text']];
const prefs = { tool: 'pen', color: 'red' }; // kept for the next screenshot in this page

/** one mark onto a 2d context, in picture pixels */
export function drawMark(g, m) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (m.t === 'pen') {
    g.strokeStyle = m.col; g.lineWidth = m.lw; g.beginPath();
    m.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (m.pts.length === 1) g.lineTo(m.pts[0][0] + 0.01, m.pts[0][1]);
    g.stroke();
  } else if (m.t === 'arrow') {
    g.strokeStyle = m.col; g.lineWidth = m.lw; g.beginPath(); g.moveTo(m.a.x, m.a.y); g.lineTo(m.b.x, m.b.y);
    for (const h of arrowHead(m.a, m.b, m.lw * 5)) { g.moveTo(m.b.x, m.b.y); g.lineTo(h.x, h.y); }
    g.stroke();
  } else if (m.t === 'box') {
    const r = boxOf(m.a, m.b); g.strokeStyle = m.col; g.lineWidth = m.lw; g.strokeRect(r.x, r.y, r.w, r.h);
  } else if (m.t === 'hl') {
    const r = boxOf(m.a, m.b); g.globalAlpha = 0.4; g.fillStyle = MARK_COLORS.yellow; g.fillRect(r.x, r.y, r.w, r.h);
  } else if (m.t === 'hide') {
    const r = boxOf(m.a, m.b); g.fillStyle = HIDE_COLOR; g.fillRect(r.x, r.y, r.w, r.h);
  } else if (m.t === 'text') {
    g.font = `700 ${m.s}px system-ui, sans-serif`; g.textBaseline = 'top'; g.lineWidth = m.s / 5; g.strokeStyle = '#ffffff'; g.fillStyle = m.col;
    g.strokeText(m.text, m.x, m.y); g.fillText(m.text, m.x, m.y);
  }
  g.restore();
}

const btn = (cls, html, label, attrs = '') => `<button type="button" class="${cls}" aria-label="${label}" ${attrs}>${html}</button>`;

/** { el, flatten(), hasMarks(), isFull(), exitFull() } for a screenshot { dataUrl, width, height } */
export function createEditor(shot) {
  const marks = []; let act = null, text = null, full = false, tool = prefs.tool, color = prefs.color;
  const el = document.createElement('div'); el.className = 'tk-mk';
  el.innerHTML = `<div class="tk-mk-stage"><canvas width="${shot.width}" height="${shot.height}" aria-label="The screenshot. Draw on it to show what you mean." role="img"></canvas>
      ${btn('tk-mk-fs', '⤢ <span>Full screen</span>', 'Open the picture over the whole screen', 'data-fs')}</div>
    <div class="tk-mk-bar" role="toolbar" aria-label="Drawing tools">${TOOLS.map(([id, ic, name]) => `<button type="button" class="tk-mk-t" data-tool="${id}" aria-pressed="false"><i aria-hidden="true">${ic}</i><small>${name}</small></button>`).join('')}
      <span class="tk-mk-sep" aria-hidden="true"></span>
      <span class="tk-mk-cols" role="radiogroup" aria-label="Pen colour">${Object.keys(MARK_COLORS).map((c) => `<button type="button" class="tk-mk-c" role="radio" data-color="${c}" aria-checked="false" aria-label="${c}"><i style="background:${MARK_COLORS[c]}"></i></button>`).join('')}</span>
      <span class="tk-mk-sep" aria-hidden="true"></span>
      <button type="button" class="tk-mk-t" data-undo aria-label="Undo"><i aria-hidden="true">↶</i><small>Undo</small></button>
      <button type="button" class="tk-mk-t" data-clear aria-label="Clear all marks"><i aria-hidden="true">✕</i><small>Clear</small></button></div>`;
  const stage = el.querySelector('.tk-mk-stage'), cv = el.querySelector('canvas'), g = cv.getContext('2d');
  const img = new Image(); const ready = new Promise((r) => { img.onload = r; img.onerror = r; }); img.src = shot.dataUrl;

  const redraw = () => { g.clearRect(0, 0, cv.width, cv.height); if (img.complete && img.naturalWidth) g.drawImage(img, 0, 0, cv.width, cv.height); marks.forEach((m) => drawMark(g, m)); if (act) drawMark(g, act.m); };
  ready.then(redraw);
  const sync = () => {
    el.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
    el.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.color === color)));
    el.querySelector('[data-undo]').disabled = !marks.length; el.querySelector('[data-clear]').disabled = !marks.length;
    const fs = el.querySelector('[data-fs]'); fs.innerHTML = full ? '✓ <span>Done</span>' : '⤢ <span>Full screen</span>';
    fs.setAttribute('aria-label', full ? 'Back to the report' : 'Open the picture over the whole screen');
    el.classList.toggle('tk-mk-full', full);
  };
  const shownW = () => cv.getBoundingClientRect().width;
  const point = (e) => toImagePoint(e.clientX, e.clientY, cv.getBoundingClientRect(), cv.width, cv.height);

  const commitText = (inp, p) => {
    if (!text || text.inp !== inp) return; const v = inp.value.trim(); text = null; inp.remove();
    if (v) { marks.push({ t: 'text', col: MARK_COLORS[color], x: p.x, y: p.y, s: textSizeFor(cv.width, shownW()), text: v.slice(0, 80) }); }
    redraw(); sync();
  };
  const startText = (e, p) => {
    if (text) { text.inp.blur(); return; } // the first label is put down; this tap only closes it
    const sr = stage.getBoundingClientRect(), inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'tk-mk-text'; inp.maxLength = 80; inp.setAttribute('aria-label', 'Text to put on the picture'); inp.enterKeyHint = 'done';
    inp.style.cssText = `left:${Math.min(e.clientX - sr.left, sr.width - 90)}px;top:${Math.min(e.clientY - sr.top, sr.height - 36)}px;color:${MARK_COLORS[color]}`;
    text = { inp }; stage.appendChild(inp);
    inp.addEventListener('keydown', (k) => { k.stopPropagation(); if (k.key === 'Enter') { k.preventDefault(); inp.blur(); } if (k.key === 'Escape') { inp.value = ''; inp.blur(); } });
    inp.addEventListener('blur', () => commitText(inp, p));
    setTimeout(() => inp.focus({ preventScroll: true }), 0);
  };

  cv.addEventListener('pointerdown', (e) => {
    if (act || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault(); const p = point(e);
    if (tool === 'text') { startText(e, p); return; }
    try { cv.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    const lw = lineWidthFor(cv.width, shownW()), col = MARK_COLORS[color];
    const m = tool === 'pen' ? { t: 'pen', col, lw, pts: [[p.x, p.y]] } : { t: tool, col, lw, a: p, b: p };
    act = { id: e.pointerId, m, from: p }; redraw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!act || e.pointerId !== act.id) return; const p = point(e);
    if (act.m.t === 'pen') act.m.pts.push([p.x, p.y]); else act.m.b = p;
    redraw();
  });
  const end = (e, cancel) => {
    if (!act || e.pointerId !== act.id) return; const m = act.m; act = null;
    if (!cancel && (m.t === 'pen' || !tooSmall(m.a, m.b, m.t === 'arrow' ? 4 : 6))) marks.push(m);
    redraw(); sync();
  };
  cv.addEventListener('pointerup', (e) => end(e, false)); cv.addEventListener('pointercancel', (e) => end(e, true));
  cv.addEventListener('lostpointercapture', (e) => end(e, false));

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !el.contains(t)) return;
    if (t.dataset.tool) { tool = prefs.tool = t.dataset.tool; sync(); }
    else if (t.dataset.color) { color = prefs.color = t.dataset.color; sync(); }
    else if ('undo' in t.dataset) { marks.pop(); redraw(); sync(); }
    else if ('clear' in t.dataset) { marks.length = 0; redraw(); sync(); }
    else if ('fs' in t.dataset) { full = !full; sync(); }
  });
  sync();

  /** the picture with its marks, as a PNG data URL under the size limit (drawn smaller when it is over) */
  async function flatten() {
    await ready; if (text) text.inp.blur(); act = null; redraw();
    let url = cv.toDataURL('image/png'), w = cv.width, h = cv.height, src = cv;
    while (dataUrlBytes(url) > MAX_BYTES && w > 320) {
      w = Math.round(w * 0.8); h = Math.round(h * 0.8);
      const s = document.createElement('canvas'); s.width = w; s.height = h; const sg = s.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(src, 0, 0, w, h); url = s.toDataURL('image/png');
    }
    return { dataUrl: url, width: w, height: h, bytes: dataUrlBytes(url) };
  }
  return { el, flatten, hasMarks: () => marks.length > 0, isFull: () => full, exitFull: () => { full = false; sync(); } };
}

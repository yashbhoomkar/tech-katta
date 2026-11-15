// The guided path for beginners (context 36, step 15): the interview's steps in order, with the canvas opening once the
// requirements, the numbers and the API are written. Pure; solve.jsx draws it. The choice is kept in this browser.

export const GUIDE_KEY = 'tk-guided-v1';

const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter((x) => x.length >= 3);

// Your answer ({fr, nfr, est, api, decisions}) and the problem's rubric -> the steps, which is next, and whether the
// canvas is open. Only steps the rubric asks for count.
export function guideOf(ans = {}, rubric = {}) {
  const est = rubric.est || [], filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  const steps = [
    { id: 'fr', label: 'Requirements', need: 'Write at least two things the system must do, one per line.', done: lines(ans.fr).length >= 2 },
    ...(est.length ? [{ id: 'est', label: 'The numbers', need: `Fill in every estimate (${est.filter((e) => filled(ans.est?.[e.id])).length} of ${est.length} so far). Rough is fine.`, done: est.every((e) => filled(ans.est?.[e.id])) }] : []),
    { id: 'api', label: 'The API', need: 'Add at least one call: a method and a path.', done: Array.isArray(ans.api) && ans.api.some((c) => /^\/\S+/.test(String(c?.path || '').trim())) },
  ];
  const decisions = rubric.decisions || [];
  if (decisions.length) steps.push({ id: 'dec', label: 'Key decisions', need: `Pick an answer for each decision (${decisions.filter((d) => ans.decisions?.[d.id] !== undefined).length} of ${decisions.length}).`, done: decisions.every((d) => ans.decisions?.[d.id] !== undefined), optional: true });
  steps.push({ id: 'design', label: 'Design and run', need: 'Build it on the canvas, press Run, then Submit.', done: false });
  const gate = steps.filter((s) => s.id === 'fr' || s.id === 'est' || s.id === 'api');
  const next = steps.find((s) => !s.done && !s.optional) || steps[steps.length - 1];
  return { steps, next, canvasOpen: gate.every((s) => s.done) };
}

// The practice API (backend/src/practice/routes.js). Every call carries the session cookie; errors become
// {status, code, message}.
import { API } from "../api.js";
async function call(path, { method = "GET", body, timeout = 15000 } = {}) {
  let r;
  try { r = await fetch(API + path, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout?.(timeout) }); }
  catch { throw { status: 0, code: "network" }; }
  let data = null; try { data = await r.json(); } catch {}
  if (!r.ok) throw { status: r.status, code: data?.error?.code || (typeof data?.error === "string" ? data.error : `http_${r.status}`), message: data?.error?.message || data?.message };
  return data;
}
export const listProblems = () => call("/v1/practice/problems");
export const getProblem = (slug) => call(`/v1/practice/problems/${encodeURIComponent(slug)}`);
export const submitDesign = (slug, source) => call(`/v1/practice/problems/${encodeURIComponent(slug)}/submit`, { method: "POST", body: { source } });
export const mySubmissions = (slug) => call(`/v1/practice/problems/${encodeURIComponent(slug)}/submissions`);
export const oneSubmission = (id) => call(`/v1/practice/submissions/${id}`);
export const editorial = (slug) => call(`/v1/practice/problems/${encodeURIComponent(slug)}/editorial`);
export const solutions = (slug, sort) => call(`/v1/practice/problems/${encodeURIComponent(slug)}/solutions${sort === "speed" ? "?sort=speed" : ""}`);
export const share = (id, note) => call(`/v1/practice/submissions/${id}/share`, { method: "POST", body: { note } });
// The interviewer (spec 22 §12, §17.1): a review can take a model tens of seconds, so its own longer limit.
export const reviewSubmission = (id) => call(`/v1/practice/submissions/${id}/review`, { method: "POST", body: {}, timeout: 70000 });
export const aiCredits = () => call("/v1/practice/me/credits");
// The interviewer on a canvas design (Interview Questions): the server judges the design itself, every test.
export const reviewCanvas = (slug, design) => call("/v1/me/submissions/review", { method: "POST", body: { slug, design }, timeout: 70000 });

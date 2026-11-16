// Live content from the real API (owner, 2026-11-16: "all the prototypes should also call tech-api.katta.cc").
// Before the first page renders, the sample data in sections.js and problems.js is replaced, in place, by the site's
// real sections, groups, lessons, problems, acceptance and challenges. A lesson's text is fetched when it opens
// (articleBody). If the API cannot be reached, the sample stays, so the prototype still works offline.
import { SECTIONS } from "./sections.js";
import { PROBLEMS, CHALLENGES } from "./problems.js";

export const API = "https://tech-api.katta.cc";
const get = async (path) => {
  const r = await fetch(API + path, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${path} answered ${r.status}`);
  return r.json();
};

// the prototype's section ids (its URLs and colours) for the API's
const ID = { concepts: "concepts", components: "components", "interview-questions": "interview", "quick-notes": "notes", "real-systems": "real" };
export const apiSection = (protoId) => Object.keys(ID).find((k) => ID[k] === protoId);
const short = (t) => t.split(/\s*[:—–]\s*/)[0] || t;
const replace = (arr, items) => arr.splice(0, arr.length, ...items);

// progress on this device (the prototype's own key; signed-in sync is the real app's job)
const KEY = "tk-full-site-done";
const doneSet = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); } };
export const markDone = (slug) => { const s = doneSet(); s.add(slug); try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* storage blocked */ } };

export let LIVE = false;
export const FULL = new Map(); // slug → { title, dek, date, tag } (the article list)

export async function loadLive() {
  try {
    const [site, { articles }, lab, stats] = await Promise.all([get("/v1/site"), get("/v1/articles"), get("/v1/lab").catch(() => ({ challenges: [] })), get("/v1/problems/stats").catch(() => ({ problems: {} }))]);
    const done = doneSet();
    for (const a of articles) FULL.set(a.slug, { title: a.title, dek: a.dek, date: a.date, tag: a.tag });

    const sections = SECTIONS.map((proto) => {
      const id = apiSection(proto.id);
      const own = articles.filter((a) => a.section === id && !a.tests);
      const defs = site.dashboard.groups?.[id] ?? [];
      let groups;
      if (proto.id === "notes") {
        const items = site.notes?.items ?? [];
        groups = [{ id: "notes", title: site.notes?.title ?? proto.groups[0].title, desc: site.notes?.desc ?? "", lessons: items.map(([no, title, topic, status]) => [`note-${no}`, title, null, done.has(`note-${no}`) ? "done" : "", { topic, status }]) }];
      } else {
        const ids = new Set(defs.map(([g]) => g));
        groups = defs.map(([gid, title, desc]) => ({ id: gid, title, desc, lessons: own.filter((a) => a.group === gid).map((a) => [a.slug, short(a.title), null, done.has(a.slug) ? "done" : ""]) }));
        const rest = own.filter((a) => !ids.has(a.group));
        if (rest.length) groups.push({ id: "more", title: "More", desc: "", lessons: rest.map((a) => [a.slug, short(a.title), null, done.has(a.slug) ? "done" : ""]) });
        groups = groups.filter((g) => g.lessons.length);
      }
      // the lesson to read next is "now"
      const all = groups.flatMap((g) => g.lessons);
      const nx = all.find((l) => l[3] !== "done");
      if (nx) nx[3] = "now";
      const n = all.length;
      const name = site.dashboard.sections.find(([s]) => s === id)?.[1] ?? proto.name;
      return { ...proto, name, groups, blurb: n ? `${n} ${proto.id === "notes" ? "notes" : "lessons"}${groups.length > 1 ? ` in ${groups.length} groups` : ""}. ${groups[0]?.desc ?? ""}`.trim() : proto.blurb };
    }).filter((s) => s.groups.length);
    replace(SECTIONS, sections);

    const probs = articles.filter((a) => a.tests);
    replace(PROBLEMS, probs.map((a, i) => {
      const st = stats.problems?.[a.slug];
      const level = String(a.tag || a.group || "medium").toLowerCase();
      return { n: String(i + 1).padStart(2, "0"), slug: a.slug, title: a.title, level: ["easy", "medium", "hard"].includes(level) ? level : "medium", status: done.has(a.slug) ? "solved" : "", accepted: st?.accepted != null ? `${Math.round(st.accepted * 100)}%` : "—", best: null, stars: 0, dek: a.dek };
    }));
    if (lab.challenges?.length) replace(CHALLENGES, lab.challenges.map((c) => ({ id: c.id, level: c.level[0].toUpperCase() + c.level.slice(1), title: c.title, stars: 0, brief: c.brief })));
    LIVE = true;
  } catch (err) {
    console.warn("full-site: the content API could not be reached; showing the sample", err);
  }
}

// ---------- a lesson's body, rendered from the API's blocks ----------
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const BODY = new Map();
export async function articleBody(slug) {
  if (!BODY.has(slug)) BODY.set(slug, get(`/v1/articles/${encodeURIComponent(slug)}`).catch(() => null));
  return BODY.get(slug);
}

/** HTML for an article's blocks. Each h2 starts a new card (data-card) for the Cards view; h2s get ids s1, s2… for
 *  "On this page". Figures are named by their caption (the real app draws them). Returns { html, heads, words }. */
export function renderBlocks(article) {
  let card = 0, h = 0, words = 0;
  const heads = [];
  const count = (s) => { words += String(s || "").split(/\s+/).filter(Boolean).length; return s; };
  const one = (b) => {
    switch (b.t) {
      case "h2": h++; card++; heads.push([`s${h}`, b.x]); return `<h2 id="s${h}" data-card="${card}">${esc(b.x)}</h2>`;
      case "h3": return `<h3 data-card="${card}">${esc(b.x)}</h3>`;
      case "p": return `<p class="body" data-card="${card}">${esc(count(b.x))}</p>`;
      case "list": return `<ul class="body" data-card="${card}">${(b.items || []).map((i) => `<li>${esc(count(i))}</li>`).join("")}</ul>`;
      case "table": return `<div class="card" data-card="${card}" style="overflow:auto;padding:0">${b.label ? `<p class="mono" style="padding:12px 14px 0">${esc(b.label)}</p>` : ""}<table style="width:100%;border-collapse:collapse;font-size:14.5px"><thead><tr>${(b.head || []).map((c) => `<th style="text-align:left;padding:10px 14px">${esc(c)}</th>`).join("")}</tr></thead><tbody>${(b.rows || []).map((r) => `<tr>${r.map((c) => `<td style="padding:10px 14px;border-top:1px solid var(--line);vertical-align:top">${esc(count(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      case "code": return `<figure class="card" data-card="${card}" style="padding:0;overflow:auto"><figcaption class="mono" style="padding:10px 14px">${esc(b.label || "Code")}</figcaption><pre style="margin:0;padding:14px;font:13px/1.6 var(--mono)">${esc(b.x)}</pre></figure>`;
      case "fig": return `<div class="fig" data-card="${card}"><div class="cap"><span class="ct">${esc(b.cap || "Figure")}</span></div></div>`;
      case "more": return `<details class="card" data-card="${card}" style="padding:14px 18px"><summary><b>${esc(b.label || "Go deeper")}</b></summary>${(b.body || []).map(one).join("")}</details>`;
      case "example": return article.example ? `<div class="say" data-card="${card}"><p class="mono">Example system · ${esc(article.example.name)}</p><p>${esc(article.example.text)}</p></div>` : "";
      default: return b.x ? `<p class="body" data-card="${card}">${esc(count(b.x))}</p>` : "";
    }
  };
  const html = (article.body || []).map(one).join("");
  return { html, heads, words };
}

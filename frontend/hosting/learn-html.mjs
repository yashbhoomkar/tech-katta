// The text of /drills, /guides and /guides/<slug> as plain HTML, put inside the page's HTML for search engines and readers without JavaScript (the 3D page
// replaces it when it starts). Built from content/drills.json and content/guides.json, the same files the API serves. Pure.
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const first = (t) => t.split(": ")[0];

export function anchorOf(article, heading) {
  let h2 = null;
  for (const b of article.body || []) {
    if (b.t === "h2") { if (b.x === heading) return slugify(b.x); h2 = b.x; }
    else if (b.t === "h3" && b.x === heading) return h2 ? slugify(h2) : "";
  }
  return "";
}

export function drillsPage(drills, articles) {
  const by = new Map(articles.map((a) => [`${a.section}/${a.slug}`, a])), bySlug = new Map(articles.map((a) => [a.slug, a]));
  return {
    key: "drills", title: "One-minute system design interview drills · Tech Katta",
    description: `${drills.length} one-minute system design interview questions with short model answers, each linked to the part of the article it comes from and to a problem to solve.`,
    body: `<h1>One-minute interview drills</h1><p>Say your answer out loud first, then check it.</p><ol>${drills.map((d) => {
      const a = by.get(d.article);
      return `<li><h2>${esc(d.q)}</h2><p>${esc(d.a)}</p><p><a href="/learn/${esc(d.article)}#${esc(anchorOf(a, d.section))}">${esc(first(a.title))}, ${esc(d.section)}</a> · <a href="/problems/${esc(d.problem)}">${esc(first(bySlug.get(d.problem).title))}</a></p></li>`;
    }).join("")}</ol>`,
  };
}

export function guidePages(guides, articles) {
  const by = new Map(articles.map((a) => [`${a.section}/${a.slug}`, a])), bySlug = new Map(articles.map((a) => [a.slug, a]));
  const pages = guides.map((g) => ({
    key: `guides/${g.slug}`, title: `${g.title} · Decision guides · Tech Katta`, description: g.dek,
    body: `<h1>${esc(g.title)}</h1><p>${esc(g.dek)}</p><p>${esc(g.intro)}</p>${g.picks.map((p) => `<h2>${esc(p.title)}</h2><ul>${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`).join("")}`
      + `<h2>${esc(g.table.label)}</h2><table><thead><tr>${g.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${g.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      + `<h2>${esc(g.example.title)}</h2>${g.example.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}`
      + `<h2>Read more, then try it</h2><ul>${g.articles.map((x) => `<li><a href="/learn/${esc(x.article)}">${esc(first(by.get(x.article).title))}</a>: ${esc(x.why)}</li>`).join("")}<li><a href="/problems/${esc(g.problem)}">${esc(first(bySlug.get(g.problem).title))}</a>: ${esc(g.problemWhy)}</li></ul>`,
  }));
  pages.unshift({ key: "guides", title: "Decision guides · Tech Katta", description: "Five choices that come up in every system design interview, each with when to pick which, a small table and a worked example.",
    body: `<h1>Decision guides</h1><ul>${guides.map((g) => `<li><a href="/guides/${esc(g.slug)}">${esc(g.title)}</a>: ${esc(g.dek)}</li>`).join("")}</ul>` });
  return pages;
}

import "./style.css";

const root = document.querySelector("#root");

const tracks = [
  { id: "distributed-systems", name: "Distributed systems", eyebrow: "FOUNDATIONS → PRODUCTION", count: "08 notes", description: "Understand the failure modes and trade-offs behind systems that run across machines.", tone: "violet", icon: "↗" },
  { id: "ai-infrastructure", name: "AI infrastructure", eyebrow: "MODELS → SERVING", count: "06 notes", description: "The systems behind inference, retrieval, embeddings, and reliable AI applications.", tone: "blue", icon: "⌘" },
  { id: "databases", name: "Databases", eyebrow: "STORAGE → QUERY", count: "07 notes", description: "Indexes, replication, partitioning, query engines, and the cost of every choice.", tone: "green", icon: "▤" },
  { id: "backend-engineering", name: "Backend engineering", eyebrow: "APIS → OPERATIONS", count: "05 notes", description: "Build services that are observable, resilient, secure, and boring in production.", tone: "orange", icon: "⌁" },
  { id: "cloud-devops", name: "Cloud & DevOps", eyebrow: "DEPLOY → OPERATE", count: "04 notes", description: "Containers, networking, deployment pipelines, and operating services under load.", tone: "pink", icon: "◈" },
  { id: "engineering-practice", name: "Engineering practice", eyebrow: "READ → BUILD", count: "03 labs", description: "Small exercises that turn a mental model into something you can test yourself.", tone: "yellow", icon: "⌘" }
];

const lessons = [
  { id: "ds-concepts", title: "Distributed systems, from first principles", category: "distributed-systems", type: "Learning path", time: "35 min", level: "FOUNDATION", description: "Build a mental model for latency, partial failure, replication, and coordination.", detail: ["Start with the uncomfortable truth: a network call can fail even when both machines are healthy.", "Follow the consequences through timeouts, retries, duplicate requests, consistency, and coordination.", "Finish by mapping each concept to a concrete production failure and the mitigation that actually helps."] },
  { id: "kafka-fundamentals", title: "Kafka fundamentals", category: "distributed-systems", type: "Engineering notes", time: "18 min", level: "CORE CONCEPTS", description: "Topics, partitions, consumer groups, replication, and why ordering has boundaries.", detail: ["A topic is split into partitions; each partition is an ordered append-only log.", "Consumer groups divide partitions across consumers, which makes parallelism and ordering inseparable.", "Replication improves durability, but acknowledgements, in-sync replicas, and producer retries still shape delivery guarantees."] },
  { id: "retrieval-pipelines", title: "What happens inside a RAG pipeline?", category: "ai-infrastructure", type: "System walkthrough", time: "22 min", level: "BUILDING BLOCKS", description: "Trace a question through chunking, embeddings, retrieval, reranking, and generation.", detail: ["Retrieval quality starts before the vector database: parsing and chunk boundaries determine what can be found.", "A retrieval pipeline is a sequence of measurable stages, not a single embedding call.", "Evaluate recall, context precision, latency, and answer faithfulness separately so failures are diagnosable."] },
  { id: "database-indexes", title: "Database indexes: the trade-offs", category: "databases", type: "Engineering notes", time: "14 min", level: "CORE CONCEPTS", description: "Understand what an index saves, what it costs, and why selectivity matters.", detail: ["An index trades write amplification and storage for fewer rows examined on reads.", "The useful question is not whether a column is indexed; it is whether the chosen access path matches the query shape and data distribution.", "Validate the hypothesis with query plans and representative cardinalities, not intuition alone."] },
  { id: "reliable-apis", title: "Designing reliable APIs", category: "backend-engineering", type: "Practical guide", time: "16 min", level: "IN PRODUCTION", description: "Timeouts, idempotency, rate limits, retries, and graceful degradation.", detail: ["Set deadlines at the request boundary and propagate remaining time downstream.", "Retries are safe only when their semantics are understood; idempotency keys can make write retries tractable.", "A service is more reliable when overload behavior is deliberate rather than accidental."] },
  { id: "containers", title: "Containers without the magic", category: "cloud-devops", type: "Mental model", time: "12 min", level: "FOUNDATION", description: "Images, namespaces, cgroups, networking, and what a container really is.", detail: ["A container is not a tiny virtual machine; it is a process isolated through operating-system primitives.", "Images package filesystem layers, while runtime configuration supplies process and resource boundaries.", "Understanding the host kernel explains both the portability benefits and the limits of container isolation."] }
];

const roadmaps = [
  { id: "distributed-systems-roadmap", number: "01", title: "Learn distributed systems", description: "From network basics to replication, partitioning, and failure handling.", meta: "6 milestones · 3–4 weeks", tags: ["Foundations", "Architecture"] },
  { id: "ai-infra-roadmap", number: "02", title: "Understand AI infrastructure", description: "Follow a request from source data to retrieval, inference, and evaluation.", meta: "5 milestones · 2–3 weeks", tags: ["AI systems", "Hands-on"] },
  { id: "backend-roadmap", number: "03", title: "Build production-ready backends", description: "Move from API design to observability, reliability, and deployment.", meta: "5 milestones · 2–3 weeks", tags: ["Backend", "Operations"] }
];

let activeCategory = "all";
let activeView = "library";
let query = "";
const saved = new Set(JSON.parse(localStorage.getItem("tk-saved-notes") || "[]"));

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Tech Katta home"><span class="brand-mark">tk</span><span class="brand-name">tech<span>.katta</span></span></a>
      <nav class="main-nav" aria-label="Main navigation">
        <button class="nav-link active" data-view="library">Library</button>
        <button class="nav-link" data-view="roadmaps">Roadmaps</button>
        <a class="nav-link nav-about" href="#about">About</a>
      </nav>
      <a class="top-cta" href="#library">Explore notes <span>↗</span></a>
      <button class="mobile-menu" aria-label="Toggle navigation" aria-expanded="false">☰</button>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-dot"></span> A FIELD GUIDE FOR SOFTWARE ENGINEERS</div>
          <h1>Understand the systems<br />behind <span>the software.</span></h1>
          <p class="hero-intro">Practical notes on distributed systems, databases, AI infrastructure, and the decisions that make software work in production.</p>
          <div class="hero-actions">
            <a class="button-primary" href="#library">Explore the library <span>↘</span></a>
            <button class="button-secondary" data-view="roadmaps">Follow a roadmap <span>→</span></button>
          </div>
          <div class="hero-footnote"><span class="tiny-check">✓</span> Built around mental models, real trade-offs, and things worth testing.</div>
        </div>
        <div class="hero-art" aria-label="Illustration of connected system components">
          <div class="art-grid"></div>
          <div class="art-label label-top">SYSTEM MAP / 001</div>
          <div class="node node-client"><span class="node-icon">⌘</span><span><b>Client</b><small>request</small></span></div>
          <div class="connector connector-a"></div><div class="connector connector-b"></div><div class="connector connector-c"></div>
          <div class="node node-api"><span class="node-icon">↔</span><span><b>API layer</b><small>routing</small></span></div>
          <div class="node node-cache"><span class="node-icon">▦</span><span><b>Cache</b><small>fast path</small></span></div>
          <div class="node node-db"><span class="node-icon">▤</span><span><b>Database</b><small>source of truth</small></span></div>
          <div class="art-label label-bottom"><span class="art-live"></span> ONE REQUEST · MANY TRADE-OFFS</div>
        </div>
      </section>

      <section class="signal-strip" aria-label="What you will find">
        <div><span class="signal-number">01</span><span><b>Start with the mental model</b><small>Understand the primitive first.</small></span></div>
        <div><span class="signal-number">02</span><span><b>Follow the request</b><small>See how components fit together.</small></span></div>
        <div><span class="signal-number">03</span><span><b>Study the trade-offs</b><small>Know what breaks and why.</small></span></div>
      </section>

      <section class="content-section" id="library">
        <div class="section-heading">
          <div><div class="eyebrow">THE LIBRARY</div><h2>Pick a direction.</h2><p>Browse by the system you want to understand.</p></div>
          <div class="library-search"><span>⌕</span><input id="search" type="search" placeholder="Search notes, topics…" aria-label="Search notes and topics" /><kbd>↵</kbd></div>
        </div>
        <div class="category-grid" id="category-grid"></div>
      </section>

      <section class="content-section latest-section" id="latest">
        <div class="section-heading">
          <div><div class="eyebrow">WORTH YOUR TIME</div><h2 id="lesson-heading">A good place to start.</h2><p id="lesson-subheading">A few notes to get you into the details.</p></div>
          <button class="text-action" id="saved-filter">Saved notes <span id="saved-count">0</span> ↗</button>
        </div>
        <div class="filter-row" id="filter-row">
          <button class="filter-chip selected" data-category="all">Everything</button>
          ${tracks.map(t => `<button class="filter-chip" data-category="${t.id}">${t.name}</button>`).join("")}
        </div>
        <div class="lesson-grid" id="lesson-grid"></div>
        <div class="empty-state" id="empty-state" hidden><span>⌕</span><h3>No notes found.</h3><p>Try another search or choose a different topic.</p></div>
      </section>

      <section class="roadmap-section" id="roadmaps">
        <div class="section-heading"><div><div class="eyebrow">A LITTLE STRUCTURE</div><h2>Follow a thread.</h2><p>Curated paths when you want to learn in sequence.</p></div><span class="section-index">ROADMAPS / 03</span></div>
        <div class="roadmap-list" id="roadmap-list"></div>
      </section>

      <section class="about-section" id="about">
        <div class="about-mark">tk<span>.</span></div>
        <div><div class="eyebrow">ABOUT TECH KATTA</div><h2>Notes from the engineering side of the screen.</h2><p>Tech Katta is a growing field guide to the systems we build, the abstractions we rely on, and the trade-offs we discover the hard way. No mystery scores. No magic answers. Just clear explanations and useful ways to think.</p></div>
      </section>
    </main>

    <footer class="footer"><a class="brand" href="#"><span class="brand-mark">tk</span><span class="brand-name">tech<span>.katta</span></span></a><span>Notes on building systems.</span><span>Made for curious engineers <span class="footer-star">✳</span></span></footer>
  </div>
  <div class="lesson-modal" id="lesson-modal" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-backdrop" data-close-modal></div><article class="modal-panel"><button class="modal-close" data-close-modal aria-label="Close note">×</button><div class="eyebrow" id="modal-eyebrow">ENGINEERING NOTES</div><h2 id="modal-title"></h2><p class="modal-lede" id="modal-lede"></p><div class="modal-body" id="modal-body"></div><div class="modal-footer"><span id="modal-meta"></span><button class="button-primary" data-close-modal>Back to library <span>↗</span></button></div></article></div>
`;

const categoryGrid = document.querySelector("#category-grid");
const lessonGrid = document.querySelector("#lesson-grid");
const roadmapList = document.querySelector("#roadmap-list");

categoryGrid.innerHTML = tracks.map((track, index) => `
  <button class="category-card ${track.tone}" data-track="${track.id}">
    <span class="category-top"><span class="category-icon">${track.icon}</span><span class="category-count">${track.count}</span></span>
    <span class="category-eyebrow">${track.eyebrow}</span><span class="category-title">${track.name}</span>
    <span class="category-description">${track.description}</span><span class="category-link">Explore topic <span>↗</span></span>
  </button>`).join("");

roadmapList.innerHTML = roadmaps.map(item => `
  <button class="roadmap-item" data-roadmap="${item.id}">
    <span class="roadmap-number">${item.number}</span><span class="roadmap-copy"><b>${item.title}</b><small>${item.description}</small><span class="roadmap-tags">${item.tags.map(tag => `<i>${tag}</i>`).join("")}</span></span><span class="roadmap-meta">${item.meta}</span><span class="roadmap-arrow">↗</span>
  </button>`).join("");

function renderLessons() {
  const visible = lessons.filter(lesson => {
    const categoryMatches = activeCategory === "all" || lesson.category === activeCategory;
    const haystack = `${lesson.title} ${lesson.description} ${lesson.type} ${tracks.find(t => t.id === lesson.category)?.name || ""}`.toLowerCase();
    const queryMatches = haystack.includes(query.toLowerCase());
    const savedMatches = !window.showSavedOnly || saved.has(lesson.id);
    return categoryMatches && queryMatches && savedMatches;
  });
  lessonGrid.innerHTML = visible.map(lesson => `
    <article class="lesson-card">
      <div class="lesson-card-top"><span class="lesson-type">${lesson.type}</span><button class="save-button ${saved.has(lesson.id) ? "is-saved" : ""}" data-save="${lesson.id}" aria-label="${saved.has(lesson.id) ? "Remove saved note" : "Save note"}" title="${saved.has(lesson.id) ? "Remove saved note" : "Save note"}">${saved.has(lesson.id) ? "★" : "☆"}</button></div>
      <div class="lesson-level">${lesson.level}</div><h3>${lesson.title}</h3><p>${lesson.description}</p>
      <div class="lesson-card-bottom"><span>◷ &nbsp;${lesson.time}</span><button class="open-lesson" data-open="${lesson.id}">Read notes <span>↗</span></button></div>
    </article>`).join("");
  document.querySelector("#empty-state").hidden = visible.length > 0;
  document.querySelector("#saved-count").textContent = saved.size;
  document.querySelector("#lesson-heading").textContent = window.showSavedOnly ? "Your saved notes." : activeCategory === "all" ? "A good place to start." : `${tracks.find(t => t.id === activeCategory)?.name || "Topic"} notes.`;
  document.querySelector("#lesson-subheading").textContent = window.showSavedOnly ? "The notes you kept close." : query ? `Matching notes for “${query}”.` : "A few notes to get you into the details.";
}
window.showSavedOnly = false;
function setCategory(category) {
  activeCategory = category;
  window.showSavedOnly = false;
  document.querySelectorAll(".filter-chip").forEach(button => button.classList.toggle("selected", button.dataset.category === category));
  renderLessons();
}
function openLesson(id) {
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) return;
  document.querySelector("#modal-eyebrow").textContent = `${lesson.type.toUpperCase()} / ${lesson.level}`;
  document.querySelector("#modal-title").textContent = lesson.title;
  document.querySelector("#modal-lede").textContent = lesson.description;
  document.querySelector("#modal-body").innerHTML = lesson.detail.map((paragraph, index) => `<section class="modal-note"><span>0${index + 1}</span><p>${paragraph}</p></section>`).join("") + `<div class="note-callout"><b>Think about it</b><p>What changes if this component becomes the bottleneck or fails completely? Write down the assumption you would test first.</p></div>`;
  document.querySelector("#modal-meta").textContent = `${lesson.time} · ${tracks.find(t => t.id === lesson.category)?.name}`;
  document.querySelector("#lesson-modal").hidden = false;
  document.body.classList.add("modal-open");
}
function closeModal() {
  document.querySelector("#lesson-modal").hidden = true;
  document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
  activeView = button.dataset.view;
  document.querySelectorAll(".nav-link[data-view]").forEach(link => link.classList.toggle("active", link.dataset.view === activeView));
  if (activeView === "roadmaps") document.querySelector("#roadmaps").scrollIntoView({ behavior: "smooth" });
  else document.querySelector("#library").scrollIntoView({ behavior: "smooth" });
}));
document.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => setCategory(button.dataset.category)));
categoryGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-track]");
  if (button) { setCategory(button.dataset.track); document.querySelector("#latest").scrollIntoView({ behavior: "smooth" }); }
});
document.querySelector("#search").addEventListener("input", event => {
  query = event.target.value.trim();
  window.showSavedOnly = false;
  renderLessons();
});
document.querySelector("#saved-filter").addEventListener("click", () => {
  window.showSavedOnly = !window.showSavedOnly;
  activeCategory = "all";
  document.querySelectorAll(".filter-chip").forEach(button => button.classList.toggle("selected", button.dataset.category === "all"));
  renderLessons();
  document.querySelector("#latest").scrollIntoView({ behavior: "smooth" });
});
lessonGrid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    const id = saveButton.dataset.save;
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    localStorage.setItem("tk-saved-notes", JSON.stringify([...saved]));
    renderLessons();
    return;
  }
  const openButton = event.target.closest("[data-open]");
  if (openButton) openLesson(openButton.dataset.open);
});
document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
roadmapList.addEventListener("click", event => {
  const button = event.target.closest("[data-roadmap]");
  if (!button) return;
  const roadmap = roadmaps.find(item => item.id === button.dataset.roadmap);
  const mapping = { "distributed-systems-roadmap": "distributed-systems", "ai-infra-roadmap": "ai-infrastructure", "backend-roadmap": "backend-engineering" };
  setCategory(mapping[roadmap.id] || "all");
  document.querySelector("#latest").scrollIntoView({ behavior: "smooth" });
});
document.querySelector(".mobile-menu").addEventListener("click", event => {
  const nav = document.querySelector(".main-nav");
  const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!expanded));
  nav.classList.toggle("mobile-open", !expanded);
});
renderLessons();

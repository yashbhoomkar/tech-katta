import "./style.css";

const root = document.querySelector("#root");

const tracks = [
  { id: "foundations", name: "Distributed systems foundations", eyebrow: "NETWORKS → FAILURE", count: "04 guides", description: "Latency, partial failure, timeouts, retries, and the limits of a single machine.", tone: "blue", icon: "↗" },
  { id: "data-consistency", name: "Data & consistency", eyebrow: "REPLICATION → TRUTH", count: "04 guides", description: "Replication, partitioning, consistency models, transactions, and conflict resolution.", tone: "green", icon: "▤" },
  { id: "communication", name: "Communication & async", eyebrow: "REQUESTS → EVENTS", count: "04 guides", description: "Queues, event streams, delivery guarantees, ordering, and backpressure.", tone: "orange", icon: "⇄" },
  { id: "reliability", name: "Reliability & scale", eyebrow: "LOAD → RECOVERY", count: "04 guides", description: "Caching, load balancing, rate limits, redundancy, and graceful degradation.", tone: "pink", icon: "◈" },
  { id: "design-practice", name: "System design practice", eyebrow: "REQUIREMENTS → REVIEW", count: "04 exercises", description: "Design real systems, state assumptions, and inspect trade-offs and failure modes.", tone: "yellow", icon: "⌘" }
];

const lessons = [
  { id: "partial-failure", title: "Distributed systems start with partial failure", category: "foundations", type: "Core concept", time: "12 min", level: "FOUNDATIONS", description: "Why remote calls fail ambiguously, and how deadlines, timeouts, and retries change system behavior.", detail: ["In a distributed system, a timeout does not prove that the remote operation failed. The request may have completed while its response was lost.", "Retries can improve success rates, but they can also amplify overload or execute a non-idempotent operation twice. Use bounded retries, jitter, deadlines, and idempotency where appropriate.", "Model the failure explicitly: distinguish a known failure from an unknown outcome, then decide what the caller can safely do next."] },
  { id: "replication", title: "Replication: availability, lag, and stale reads", category: "data-consistency", type: "Architecture note", time: "16 min", level: "DATA & CONSISTENCY", description: "Leader-follower replication, replication lag, failover, and the consistency guarantees visible to clients.", detail: ["Replication keeps multiple copies of data, but those copies may not become current at the same time. A successful write on the leader can be followed by a stale read from a lagging replica.", "Synchronous replication can strengthen durability or read-after-write guarantees but adds latency and can reduce write availability during failures. Asynchronous replication usually trades stronger immediate guarantees for lower latency.", "Choose the read and write path from product requirements. State which guarantees matter, how failover selects a new leader, and what happens to writes acknowledged just before a failure."] },
  { id: "partitioning", title: "Partitioning and hot keys", category: "data-consistency", type: "Core concept", time: "14 min", level: "DATA & CONSISTENCY", description: "Choose partition keys, spread load, and reason about skew, rebalancing, and cross-partition work.", detail: ["Partitioning distributes data and work across nodes. A good key spreads both storage and request volume while preserving the access patterns the product needs.", "Even a high-cardinality key can create a hot partition if traffic is skewed. Measure key frequency and per-partition load rather than assuming an even distribution.", "Rebalancing moves data and ownership as capacity changes. Account for migration cost, temporary imbalance, and operations that need to touch multiple partitions."] },
  { id: "consistency-models", title: "Consistency models without hand-waving", category: "data-consistency", type: "Mental model", time: "18 min", level: "DATA & CONSISTENCY", description: "Linearizability, eventual consistency, read-your-writes, and the user-visible cost of each guarantee.", detail: ["Consistency is a contract about which histories clients are allowed to observe. It is not a single on/off property of a database.", "Linearizability makes operations appear to take effect atomically in a real-time order, which is useful for coordination-sensitive state but can constrain latency and availability across failures.", "Eventual consistency allows replicas to temporarily disagree and converge when updates stop. Product-level guarantees such as read-your-writes can be more useful than choosing a label without describing observable behavior."] },
  { id: "message-queues", title: "Message queues, delivery, and idempotency", category: "communication", type: "System walkthrough", time: "17 min", level: "ASYNC SYSTEMS", description: "Decouple producers and consumers while handling duplicates, poison messages, retries, and backpressure.", detail: ["A queue absorbs bursts and decouples producer latency from consumer work, but it does not remove capacity limits. If arrivals persistently exceed processing throughput, backlog and queue age grow.", "At-least-once delivery can redeliver a message after a consumer performs a side effect but crashes before acknowledging it. Consumers should make repeated processing safe through idempotency or deduplication.", "Define retry limits, dead-letter handling, ordering scope, retention, and backlog alerts. Monitor queue age as well as depth because old work can be more harmful than a large but quickly draining queue."] },
  { id: "caching", title: "Caching: invalidation, stampedes, and stale data", category: "reliability", type: "Architecture note", time: "15 min", level: "RELIABILITY & SCALE", description: "Reduce read latency and origin load without pretending cached data is always correct.", detail: ["A cache is an optimization layer, not automatically the source of truth. Every cached value needs an explicit freshness and invalidation policy.", "A hot key expiring can send many concurrent requests to the origin at once. TTL jitter, request coalescing, stale-while-revalidate, and bounded refresh work can reduce cache stampedes.", "Specify behavior during cache failure, eviction, and stale reads. A cache outage should not accidentally overwhelm the database or cause correctness-sensitive decisions to rely on invalid data."] },
  { id: "url-shortener", title: "Design a URL shortener", category: "design-practice", type: "Design exercise", time: "35 min", level: "PRACTICE / 01", description: "Estimate traffic, generate unique keys, design redirects, and choose cache and storage behavior.", detail: ["Start with requirements: redirect latency, creation volume, read-to-write ratio, custom aliases, expiration, abuse controls, and availability targets.", "Sketch the write path for key generation and durable mapping storage, then the read path through cache and database. Estimate storage and request rates before selecting components.", "Evaluate collisions, hot links, cache misses, database failure, replication lag, and key-generation bottlenecks. Explain each choice and the trade-off it introduces."] },
  { id: "notification-system", title: "Design a notification system", category: "design-practice", type: "Design exercise", time: "40 min", level: "PRACTICE / 02", description: "Fan-out, queues, user preferences, retries, rate limits, and delivery status.", detail: ["Separate request acceptance from delivery. Define what an accepted notification means and which channels must be supported.", "Use queues to absorb bursts and workers to deliver across providers, with user preferences, rate limits, retry policies, and idempotency keys controlling side effects.", "Evaluate provider outages, duplicate delivery, poison jobs, hot recipients, and queue growth. Decide which events need ordering and which can be delayed or dropped."] },
  { id: "news-feed", title: "Design a news feed", category: "design-practice", type: "Design exercise", time: "45 min", level: "PRACTICE / 03", description: "Compare fan-out-on-write and fan-out-on-read, ranking freshness, and celebrity hot spots.", detail: ["Clarify feed semantics first: freshness, pagination, ranking, privacy, and acceptable staleness shape the architecture.", "Fan-out-on-write precomputes recipient feeds but makes writes expensive for accounts with many followers. Fan-out-on-read moves work to reads and can increase latency for users following high-volume accounts.", "Consider hybrid fan-out, cache invalidation, feed repair, duplicate items, and ranking updates. Compare tail latency and operational complexity under skewed follower distributions."] },
  { id: "rate-limiting", title: "Rate limiting under real traffic", category: "reliability", type: "Core concept", time: "13 min", level: "RELIABILITY & SCALE", description: "Token buckets, fixed and sliding windows, distributed counters, and overload protection.", detail: ["Rate limiting protects a service and its dependencies by constraining request volume over a defined scope such as user, API key, tenant, or IP.", "Fixed windows are simple but permit boundary bursts; sliding windows smooth the boundary; token buckets allow controlled bursts while bounding sustained rate.", "Distributed enforcement introduces coordination and failure choices. Decide whether limits must be exact, how counters are partitioned, and whether limiter failure should fail open or fail closed for each operation."] },
  { id: "load-balancing", title: "Load balancing and health-aware routing", category: "reliability", type: "Architecture note", time: "14 min", level: "RELIABILITY & SCALE", description: "Spread requests without hiding overload, correlated failures, or uneven work.", detail: ["A load balancer distributes requests across eligible backends, but round-robin alone does not guarantee balanced work when request costs vary.", "Health checks should identify instances that cannot serve traffic, while avoiding flapping and synchronized removal of too much capacity. Queueing and tail latency can rise well before a process is technically unhealthy.", "Account for connection reuse, sticky sessions, zone-aware routing, graceful draining, and overload shedding. Test what happens when capacity drops while incoming traffic stays constant."] },
  { id: "capacity-planning", title: "Capacity planning from first principles", category: "foundations", type: "Practical guide", time: "20 min", level: "FOUNDATIONS", description: "Turn product assumptions into request rates, storage estimates, bandwidth, and headroom.", detail: ["Start with orders of magnitude: users, active fraction, actions per user, peak-to-average ratio, payload size, and retention. Write every assumption down.", "Convert assumptions into read and write requests per second, bytes per second, and retained storage. Include replication, indexes, metadata, and growth rather than counting only raw payload.", "Capacity estimates are hypotheses, not precision forecasts. Identify the assumptions with the highest impact and validate them with load tests and production measurements."] }
];

const roadmaps = [
  { id: "foundations-roadmap", number: "01", title: "Distributed systems foundations", description: "Build intuition for networks, partial failure, timeouts, retries, and capacity.", meta: "4 milestones · 1–2 weeks", tags: ["Mental models", "Failure modes"] },
  { id: "data-roadmap", number: "02", title: "Data, replication & consistency", description: "Understand replicas, partition keys, consistency contracts, and recovery.", meta: "4 milestones · 2 weeks", tags: ["Storage", "Trade-offs"] },
  { id: "design-roadmap", number: "03", title: "Practice system design", description: "Work through a URL shortener, notifications, and a news feed with explicit assumptions.", meta: "3 exercises · 2–3 weeks", tags: ["Architecture", "Evaluation"] }
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
          <div class="eyebrow"><span class="eyebrow-dot"></span> DISTRIBUTED SYSTEMS · DESIGN · EVALUATION</div>
          <h1>Design systems<br />that <span>survive reality.</span></h1>
          <p class="hero-intro">Learn distributed system design through engineering principles, realistic architecture exercises, failure scenarios, and explainable feedback.</p>
          <div class="hero-actions">
            <a class="button-primary" href="#library">Explore the library <span>↘</span></a>
            <button class="button-secondary" data-view="roadmaps">Follow a roadmap <span>→</span></button>
          </div>
          <div class="hero-footnote"><span class="tiny-check">✓</span> Learn the principle. Design the system. Test the failure modes.</div>
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
          <div><div class="eyebrow">DISTRIBUTED SYSTEMS FIELD GUIDE</div><h2>Understand the building blocks.</h2><p>Learn the primitives behind reliable, scalable distributed systems.</p></div>
          <div class="library-search"><span>⌕</span><input id="search" type="search" placeholder="Search concepts and design exercises…" aria-label="Search notes and topics" /><kbd>↵</kbd></div>
        </div>
        <div class="category-grid" id="category-grid"></div>
      </section>

      <section class="content-section latest-section" id="latest">
        <div class="section-heading">
          <div><div class="eyebrow">LEARN · DESIGN · REASON</div><h2 id="lesson-heading">Build your architecture intuition.</h2><p id="lesson-subheading">Start with core concepts, then apply them to real design problems.</p></div>
          <button class="text-action" id="saved-filter">Saved guides <span id="saved-count">0</span> ↗</button>
        </div>
        <div class="filter-row" id="filter-row">
          <button class="filter-chip selected" data-category="all">All topics</button>
          ${tracks.map(t => `<button class="filter-chip" data-category="${t.id}">${t.name}</button>`).join("")}
        </div>
        <div class="lesson-grid" id="lesson-grid"></div>
        <div class="empty-state" id="empty-state" hidden><span>⌕</span><h3>No notes found.</h3><p>Try another search or choose a different topic.</p></div>
      </section>

      <section class="roadmap-section" id="roadmaps">
        <div class="section-heading"><div><div class="eyebrow">A LITTLE STRUCTURE</div><h2>Follow a learning path.</h2><p>A sequence from distributed systems fundamentals to complete architecture exercises.</p></div><span class="section-index">ROADMAPS / 03</span></div>
        <div class="roadmap-list" id="roadmap-list"></div>
      </section>

      <section class="about-section" id="about">
        <div class="about-mark">tk<span>.</span></div>
        <div><div class="eyebrow">ABOUT TECH KATTA</div><h2>Learn to reason about distributed systems.</h2><p>Tech Katta is a focused learning and practice environment for distributed system design. Understand the guarantees and trade-offs, design a system against explicit requirements, and inspect failure modes with explainable feedback. No magic scores or one-size-fits-all architectures.</p></div>
      </section>
    </main>

    <footer class="footer"><a class="brand" href="#"><span class="brand-mark">tk</span><span class="brand-name">tech<span>.katta</span></span></a><span>Distributed systems, designed deliberately.</span><span>Made for curious engineers <span class="footer-star">✳</span></span></footer>
  </div>
  <div class="lesson-modal" id="lesson-modal" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-backdrop" data-close-modal></div><article class="modal-panel"><button class="modal-close" data-close-modal aria-label="Close note">×</button><div class="eyebrow" id="modal-eyebrow">ENGINEERING NOTES</div><h2 id="modal-title"></h2><p class="modal-lede" id="modal-lede"></p><section class="teach-panel" aria-label="Teach mode"><div><span class="teach-kicker">TEACH MODE</span><p id="teach-status" aria-live="polite">A senior-engineer-style walkthrough, read aloud by your browser.</p></div><div class="teach-controls"><button id="teach-play" class="button-primary" type="button">▶ Teach me</button><button id="teach-pause" class="button-secondary" type="button" disabled>Pause</button><button id="teach-stop" class="button-secondary" type="button" disabled>Stop</button><label class="teach-speed">Speed <select id="teach-rate" aria-label="Narration speed"><option value="0.85">0.85×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option></select></label></div></section><div class="modal-body" id="modal-body"></div><div class="modal-footer"><span id="modal-meta"></span><button class="button-primary" data-close-modal>Back to library <span>↗</span></button></div></article></div>
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
  document.querySelector("#lesson-heading").textContent = window.showSavedOnly ? "Your saved notes." : activeCategory === "all" ? "Build your architecture intuition." : `${tracks.find(t => t.id === activeCategory)?.name || "Topic"} notes.`;
  document.querySelector("#lesson-subheading").textContent = window.showSavedOnly ? "The notes you kept close." : query ? `Matching notes for “${query}”.` : "Start with core concepts, then apply them to real design problems.";
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
  document.querySelector("#modal-title").dataset.lessonId = lesson.id;
  document.querySelector("#teach-play").disabled = false;
  document.querySelector("#teach-pause").disabled = true;
  document.querySelector("#teach-stop").disabled = true;
  document.querySelector("#teach-pause").textContent = "Pause";
  setTeachStatus("A senior-engineer-style walkthrough, read aloud by your browser.");
  document.querySelector("#modal-lede").textContent = lesson.description;
  document.querySelector("#modal-body").innerHTML = lesson.detail.map((paragraph, index) => `<section class="modal-note" data-speech-section="${index}"><span>0${index + 1}</span><p>${paragraph}</p></section>`).join("") + `<div class="note-callout"><b>Think about it</b><p>What changes if this component becomes the bottleneck or fails completely? Write down the assumption you would test first.</p></div>`;
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
document.querySelector("#teach-play").addEventListener("click", () => { if (speechPaused && "speechSynthesis" in window) { window.speechSynthesis.resume(); speechPaused = false; document.querySelector("#teach-pause").textContent = "Pause"; setTeachStatus("Resuming walkthrough…"); return; } startTeaching(); });
document.querySelector("#teach-pause").addEventListener("click", () => { if (!( "speechSynthesis" in window)) return; if (window.speechSynthesis.paused) { window.speechSynthesis.resume(); speechPaused = false; document.querySelector("#teach-pause").textContent = "Pause"; setTeachStatus("Resuming walkthrough…"); } else { window.speechSynthesis.pause(); speechPaused = true; document.querySelector("#teach-pause").textContent = "Resume"; setTeachStatus("Walkthrough paused."); } });
document.querySelector("#teach-stop").addEventListener("click", () => { stopTeaching(); document.querySelector("#teach-play").disabled = false; });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });
roadmapList.addEventListener("click", event => {
  const button = event.target.closest("[data-roadmap]");
  if (!button) return;
  const roadmap = roadmaps.find(item => item.id === button.dataset.roadmap);
  const mapping = { "foundations-roadmap": "foundations", "data-roadmap": "data-consistency", "design-roadmap": "design-practice" };
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

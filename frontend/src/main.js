import "./style.css";

const root = document.querySelector("#root");

const tracks = [
  { id: "fundamentals", name: "System design fundamentals", eyebrow: "SCOPE → ARCHITECTURE", count: "CORE", description: "Turn vague product requirements into a clear, defensible high-level design.", tone: "blue", icon: "⌘" },
  { id: "scaling", name: "Scale & traffic", eyebrow: "LOAD → CAPACITY", count: "CORE", description: "Estimate QPS, identify bottlenecks, and scale reads, writes, and compute.", tone: "green", icon: "↗" },
  { id: "data-storage", name: "Data & storage", eyebrow: "MODEL → PARTITION", count: "CORE", description: "Choose data models, indexes, replication, partitioning, and consistency.", tone: "orange", icon: "▤" },
  { id: "caching", name: "Caching & delivery", eyebrow: "LATENCY → THROUGHPUT", count: "CORE", description: "Design cache layers, invalidation strategies, CDNs, and hot-key protection.", tone: "yellow", icon: "▦" },
  { id: "async-systems", name: "Async & event-driven systems", eyebrow: "QUEUE → PROCESS", count: "CORE", description: "Use queues, streams, workers, retries, and idempotency to decouple services.", tone: "pink", icon: "⌁" },
  { id: "reliability", name: "Reliability & trade-offs", eyebrow: "FAILURE → RECOVERY", count: "CORE", description: "Reason about availability, failure isolation, observability, and graceful degradation.", tone: "violet", icon: "◇" }
];

const lessons = [
  { id: "interview-framework", title: "A repeatable system design framework", category: "fundamentals", type: "Design method", time: "20 min", level: "START HERE", description: "A practical sequence for requirements, estimation, APIs, data models, architecture, and bottlenecks.", detail: ["Start by clarifying functional requirements and the non-functional targets: scale, latency, availability, durability, and consistency. Explicitly state what is out of scope.", "Estimate the order of magnitude: daily active users, requests per second, read/write ratio, payload size, storage growth, and peak-to-average traffic. Write assumptions down instead of pretending the numbers are exact.", "Define the main APIs and data entities before drawing boxes. This exposes access patterns and makes storage choices easier to defend.", "Draw the simplest end-to-end architecture, then trace one read and one write through it. Add caches, queues, replicas, or partitions only when a requirement or bottleneck justifies them.", "Close by testing failure modes and trade-offs: hot keys, duplicate requests, partial outages, data loss, overload, and operational complexity. A strong design explains what it sacrifices and why."] },
  { id: "url-shortener", title: "Design a URL shortener", category: "fundamentals", type: "End-to-end design", time: "30 min", level: "FOUNDATIONAL", description: "Short-code generation, redirect latency, storage, abuse prevention, and analytics.", detail: ["Clarify whether custom aliases, link expiry, editability, and click analytics are required. Redirect traffic is usually much higher than link creation, so read-heavy behavior should shape the design.", "Expose a create-link API and a redirect endpoint. Generate collision-safe short IDs, validate destination URLs, and make creation idempotent when clients retry.", "Store the short-code mapping durably. Compare random IDs, counter-based IDs, and encoded unique IDs against collision risk, coordination cost, predictability, and operational complexity.", "Put a cache in front of the mapping store because popular links are read repeatedly. Decide how expired or deleted links invalidate cached entries and how to protect the origin from hot keys.", "Treat analytics as a separate asynchronous path so click recording does not add latency to redirects. Discuss abuse detection, rate limits, regional latency, and what happens when analytics is unavailable."] },
  { id: "rate-limiter", title: "Design a distributed rate limiter", category: "scaling", type: "Architecture exercise", time: "25 min", level: "CORE PATTERN", description: "Token bucket vs. sliding window, atomic counters, distributed enforcement, and fail-open choices.", detail: ["Define the limiting key and policy first: user, API key, IP, endpoint, or tenant; fixed quota or burst allowance; and whether limits are global or regional.", "Compare fixed window, sliding window, leaky bucket, and token bucket. Pick based on boundary bursts, memory use, precision, and whether controlled bursts are acceptable.", "A multi-instance service needs shared state or partitioned ownership. Atomic increments and expiry are essential; discuss what happens when state updates race or the store is slow.", "Place enforcement at the edge or API gateway when possible, and distinguish local protection from globally accurate quotas. Cross-region coordination can cost more latency than the quota is worth.", "Define degraded behavior explicitly: fail open to preserve availability or fail closed to protect a costly dependency. Add metrics for allowed, rejected, backend errors, and policy drift."] },
  { id: "news-feed", title: "Design a social news feed", category: "data-storage", type: "End-to-end design", time: "35 min", level: "INTERMEDIATE", description: "Fan-out on write vs. read, feed ranking, pagination, celebrity hot spots, and cache strategy.", detail: ["Clarify whether the feed is chronological or ranked, how fresh it must be, and which interactions matter. Estimate reads per user, posts per second, and the skew caused by very popular accounts.", "Model users, follows, posts, and feed entries around the access pattern: fetch a page of a user's feed quickly, then hydrate post and author details.", "Fan-out on write precomputes feed entries for followers and makes reads fast, but creates write amplification. Fan-out on read avoids huge write fan-out but makes reads more expensive. A hybrid handles high-follower accounts differently.", "Use cursor-based pagination to avoid unstable offsets as new posts arrive. Cache feed pages or IDs carefully and define how deletions, privacy changes, and ranking updates propagate.", "Move feed generation and ranking to asynchronous workers. Discuss duplicate delivery, backpressure, rebuilding feeds, stale results, and how the product behaves when ranking is degraded."] },
  { id: "chat-system", title: "Design a real-time chat system", category: "async-systems", type: "End-to-end design", time: "35 min", level: "INTERMEDIATE", description: "Persistent connections, message ordering, delivery states, fan-out, and offline users.", detail: ["Clarify one-to-one and group chat, message history, delivery guarantees, presence, attachments, and expected group sizes. These requirements determine the connection and storage model.", "Use WebSockets or another persistent channel for live delivery, with an HTTP path for history and connection setup. Gateways manage connections, while a routing layer finds the recipient's active connection.", "Persist messages before acknowledging durable acceptance. Assign conversation-scoped sequence numbers or another ordering strategy, and be explicit that global ordering is usually unnecessary and expensive.", "Use a durable log or queue to decouple message acceptance from fan-out. Consumers need idempotency because retries can produce duplicate work; offline recipients need a durable inbox or sync cursor.", "Design reconnection, acknowledgements, push notifications, abuse controls, and regional failure behavior. Presence can be approximate; message durability and authorization generally cannot."] },
  { id: "notification-platform", title: "Design a notification platform", category: "async-systems", type: "Architecture exercise", time: "30 min", level: "INTERMEDIATE", description: "Queues, priorities, retries, provider limits, deduplication, and delivery tracking.", detail: ["Separate event creation from delivery. Producers submit a notification intent with recipient, channel, priority, template, and an idempotency key.", "Persist the intent, then publish work to queues partitioned by channel or priority. This absorbs bursts and lets email, push, and SMS workers scale independently.", "Use bounded retries with exponential backoff and jitter for transient failures. Send exhausted or permanent failures to a dead-letter queue with a replay process and operational ownership.", "Enforce provider quotas and per-recipient preferences before sending. Deduplicate repeated events and decide whether delivery means accepted by provider, delivered to device, or actually read.", "Track queue age, delivery latency, retry rate, provider errors, and backlog growth. A queue can hide overload for a while, so alert on time-to-drain rather than queue depth alone."] },
  { id: "object-storage", title: "Design an object storage service", category: "data-storage", type: "End-to-end design", time: "35 min", level: "ADVANCED", description: "Large uploads, metadata, multipart transfer, replication, durability, and signed access.", detail: ["Clarify object size limits, read/write patterns, retention, access control, durability targets, and whether objects must be immediately readable after upload.", "Separate the metadata plane from the data plane. Metadata tracks ownership, object keys, versions, and placement; blob storage handles the large byte streams.", "Use multipart uploads for large files and checksums to detect corruption. Make upload completion idempotent and clean up abandoned parts.", "Choose replication or erasure coding based on durability, storage overhead, repair cost, and read latency. Replicas alone do not protect against every correlated failure.", "Use signed URLs or scoped credentials for direct transfer, enforce authorization at metadata boundaries, and plan lifecycle policies, deletion semantics, regional recovery, and integrity scrubbing."] },
  { id: "video-streaming", title: "Design a video streaming platform", category: "caching", type: "End-to-end design", time: "40 min", level: "ADVANCED", description: "Upload pipelines, transcoding, adaptive bitrate, CDN delivery, and hot content.", detail: ["Separate upload, processing, catalog, and playback. Estimate concurrent viewers and bandwidth rather than relying only on registered-user counts.", "Store the original asset, enqueue transcoding jobs, and generate multiple renditions plus segmented manifests. Workers should be retryable and processing status should be visible to clients.", "Serve segments through a CDN so most playback traffic stays away from origin storage. Cacheability, geographic distribution, and invalidation policy dominate delivery cost and latency.", "Use adaptive bitrate streaming to trade quality against current network conditions. Keep manifests and segment URLs consistent as assets move through processing states.", "Protect origin on cache misses, prioritize popular content, and monitor startup delay, rebuffer ratio, bitrate, transcoding backlog, and CDN hit rate. Design for a viral video rather than average traffic alone."] },
  { id: "capacity-estimation", title: "Capacity estimation without false precision", category: "scaling", type: "Practical method", time: "18 min", level: "CORE CONCEPTS", description: "Translate product assumptions into QPS, storage, bandwidth, and rough capacity.", detail: ["Start with explicit assumptions: active users, actions per user, payload sizes, retention, and peak-to-average ratio. Estimates are useful because they reveal orders of magnitude, not because every input is exact.", "Convert daily activity to average requests per second, then apply a peak factor. Separate read QPS, write QPS, background work, and fan-out amplification.", "Estimate storage from writes per day times retained bytes, then account for indexes, replication, metadata, and growth. For bandwidth, multiply request rate by payload size and remember egress can dominate cost.", "Translate totals into per-node load using measured throughput and a safety margin. Avoid assuming linear scaling: coordination, hot partitions, network, and storage often become bottlenecks first.", "Use the estimate to guide the next measurement or experiment. State the assumption with the greatest uncertainty and show how the architecture changes if it is wrong."] }
];

const roadmaps = [
  { id: "fundamentals-roadmap", number: "01", title: "From requirements to a high-level design", description: "Practice scoping, capacity estimates, APIs, data models, and architecture diagrams.", meta: "6 milestones · 2 weeks", tags: ["Foundations", "Interview method"] },
  { id: "scale-roadmap", number: "02", title: "Design for scale", description: "Work through partitioning, caching, queues, hot keys, and traffic spikes.", meta: "5 milestones · 2–3 weeks", tags: ["Capacity", "Performance"] },
  { id: "realtime-roadmap", number: "03", title: "Design real-time and resilient systems", description: "Explore chat, notifications, delivery semantics, failure recovery, and observability.", meta: "5 milestones · 2–3 weeks", tags: ["Real-time", "Reliability"] }
];

let activeCategory = "all";
let activeView = "library";
let query = "";
const saved = new Set(JSON.parse(localStorage.getItem("tk-saved-designs") || "[]"));

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Tech Katta home"><span class="brand-mark">tk</span><span class="brand-name">tech<span>.katta</span></span></a>
      <nav class="main-nav" aria-label="Main navigation">
        <button class="nav-link active" data-view="library">Library</button>
        <button class="nav-link" data-view="roadmaps">Roadmaps</button>
        <a class="nav-link nav-about" href="#about">About</a>
      </nav>
      <a class="top-cta" href="#library">Explore system designs <span>↗</span></a>
      <button class="mobile-menu" aria-label="Toggle navigation" aria-expanded="false">☰</button>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-dot"></span> SYSTEM DESIGN · FROM REQUIREMENTS TO TRADE-OFFS</div>
          <h1>Design systems<br />that <span>scale.</span></h1>
          <p class="hero-intro">Learn to turn product requirements into scalable architectures. Study real design problems, compare trade-offs, and practice the decisions behind reliable systems.</p>
          <div class="hero-actions">
            <a class="button-primary" href="#library">Explore system designs <span>↘</span></a>
            <button class="button-secondary" data-view="roadmaps">Follow a design path <span>→</span></button>
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
          <div><div class="eyebrow">SYSTEM DESIGN TOOLKIT</div><h2>Build your design toolkit.</h2><p>Start with the skill or building block you need for your next architecture.</p></div>
          <div class="library-search"><span>⌕</span><input id="search" type="search" placeholder="Search designs, patterns…" aria-label="Search notes and topics" /><kbd>↵</kbd></div>
        </div>
        <div class="category-grid" id="category-grid"></div>
      </section>

      <section class="content-section latest-section" id="latest">
        <div class="section-heading">
          <div><div class="eyebrow">PRACTICE CASES</div><h2 id="lesson-heading">Practice a real design.</h2><p id="lesson-subheading">Work through a system, one decision at a time.</p></div>
          <button class="text-action" id="saved-filter">Saved designs <span id="saved-count">0</span> ↗</button>
        </div>
        <div class="filter-row" id="filter-row">
          <button class="filter-chip selected" data-category="all">All designs</button>
          ${tracks.map(t => `<button class="filter-chip" data-category="${t.id}">${t.name}</button>`).join("")}
        </div>
        <div class="lesson-grid" id="lesson-grid"></div>
        <div class="empty-state" id="empty-state" hidden><span>⌕</span><h3>No designs found.</h3><p>Try another search or system design topic.</p></div>
      </section>

      <section class="roadmap-section" id="roadmaps">
        <div class="section-heading"><div><div class="eyebrow">LEARNING PATHS</div><h2>Learn in sequence.</h2><p>Structured practice from first principles to production-scale architecture.</p></div><span class="section-index">DESIGN PATHS / 03</span></div>
        <div class="roadmap-list" id="roadmap-list"></div>
      </section>

      <section class="about-section" id="about">
        <div class="about-mark">tk<span>.</span></div>
        <div><div class="eyebrow">ABOUT TECH KATTA</div><h2>Learn to reason about architecture.</h2><p>Tech Katta is a focused system design learning space. Start from requirements, sketch the architecture, estimate scale, identify failure modes, and defend the trade-offs. The goal is not to memorize diagrams; it is to build the judgement to design systems that work.</p></div>
      </section>
    </main>

    <footer class="footer"><a class="brand" href="#"><span class="brand-mark">tk</span><span class="brand-name">tech<span>.katta</span></span></a><span>System design, made practical.</span><span>Made for curious engineers <span class="footer-star">✳</span></span></footer>
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
      <div class="lesson-card-bottom"><span>◷ &nbsp;${lesson.time}</span><button class="open-lesson" data-open="${lesson.id}">Open design <span>↗</span></button></div>
    </article>`).join("");
  document.querySelector("#empty-state").hidden = visible.length > 0;
  document.querySelector("#saved-count").textContent = saved.size;
  document.querySelector("#lesson-heading").textContent = window.showSavedOnly ? "Your saved designs." : activeCategory === "all" ? "Practice a real design." : `${tracks.find(t => t.id === activeCategory)?.name || "Topic"} notes.`;
  document.querySelector("#lesson-subheading").textContent = window.showSavedOnly ? "The designs you saved for later." : query ? `Matching designs for “${query}”.` : "Work through a system, one decision at a time.";
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
    localStorage.setItem("tk-saved-designs", JSON.stringify([...saved]));
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
  const mapping = { "fundamentals-roadmap": "fundamentals", "scale-roadmap": "scaling", "realtime-roadmap": "async-systems" };
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

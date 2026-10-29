import "./home-page.css";

// Static frontend content for the first release. Update these objects to refresh
// homepage sections and cards without rewriting the component markup.
const content = {
  brand: { name: "TECH KATTA", descriptor: "SYSTEMS KNOWLEDGE" },
  hero: {
    eyebrow: "LEARN SYSTEM DESIGN · PRACTISE · IMPROVE",
    title: "Design for failure. Understand the trade-offs.",
    description: "Field notes on distributed systems: what breaks, how systems recover, and which trade-offs your architecture makes."
  },
  figure: {
    title: "How Kafka moves an event",
    caption: "EXAMPLE ARCHITECTURE / EVENT STREAMING",
    tag: "FEATURED BREAKDOWN · EVENT STREAMING",
    description: "Producers publish to topics; partitions distribute across brokers; consumers ingest streams.",
    src: "/diagrams/kafka-architecture.svg",
    alt: "Kafka component diagram: producer services publish events to the orders.events topic, divided into partitions P0, P1, and P2; a consumer group reads P0 with Consumer A and P1/P2 with Consumer B."
  },
  curriculum: {
    id: "curriculum", number: "01", label: "TOPICS",
    title: "Follow a question from concept to consequence.",
    index: "LIBRARY / STUDIO / EVALUATION",
    cards: [
      { id: "concepts", number: "01", category: "CONCEPTS", title: "Understand the fundamentals", description: "Build intuition for scalability, consistency, replication, availability, and failure.", link: "Browse learning library", target: "learn" },
      { id: "components", number: "02", category: "COMPONENTS", title: "Know the building blocks", description: "Understand the role of caches, databases, queues, brokers, and load balancers.", link: "Explore the library", target: "learn" },
      { id: "problems", number: "03", category: "SYSTEM DESIGN", title: "Reason through real systems", description: "Turn requirements and constraints into architecture, capacity estimates, and trade-offs.", link: "Open practice lab", target: "practice" }
    ]
  },
  quickNotes: {
    id: "quick-notes", number: "02", label: "QUICK NOTES",
    title: "Engineering notes, grounded in trade-offs.",
    description: "Concise explanations of the decisions, failure modes, and constraints behind distributed systems.",
    index: "SHORT TECHNICAL EXPLANATIONS",
    items: [
      { category: "EVENT STREAMING", title: "Kafka: topics, partitions, and consumer groups", summary: "How events are organized, distributed, and consumed.", body: "A topic groups related events. Partitions split a topic into ordered logs distributed across brokers. Within a consumer group, each partition is assigned to one consumer at a time, allowing work to scale while preserving order within a partition." },
      { category: "CACHING", title: "Cache invalidation is a consistency decision", summary: "A cache is useful only when its staleness is acceptable.", body: "Choose a freshness requirement before choosing an invalidation strategy. TTLs are simple but permit stale reads; explicit invalidation can improve freshness but introduces coordination and failure cases. Decide what happens when invalidation is delayed or lost." },
      { category: "RELIABILITY", title: "Retries need idempotency and limits", summary: "Retries can amplify an outage when they are unbounded.", body: "Use bounded retries with exponential backoff and jitter. Make repeated requests safe through idempotency keys or conditional writes, and define what happens after the retry budget is exhausted. Monitor retry rates as well as successful request rates." }
    ]
  },
  guidelines: {
    id: "guidelines", number: "03", label: "GUIDELINES",
    title: "Make deliberate engineering decisions.",
    description: "Practical reminders for designing systems that remain understandable, reliable, and operable.",
    index: "PRACTICE / PRINCIPLES",
    items: [
      { number: "G.01", title: "Start with requirements", description: "Write down peak requests per second, payload size, latency target, availability objective, consistency needs, and what is explicitly out of scope." },
      { number: "G.02", title: "Measure before adding complexity", description: "Measure the constrained resource first. Estimate request rate and storage growth, then add a cache, queue, replica, or partition only when the numbers justify its operational cost." },
      { number: "G.03", title: "Design for partial failure", description: "Define timeout budgets, bounded retries with jitter, idempotency for duplicate delivery, and a degraded mode when a dependency stays unavailable." }
    ]
  }
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function scrollLink(target, label, className = "") {
  return '<a class="' + className + '" href="#' + escapeHtml(target) + '" data-home-scroll="' + escapeHtml(target) + '">' + label + '</a>';
}

function renderHeader() {
  return '<header class="tk-header">' +
    '<a class="tk-brand" href="#home" data-home-top aria-label="Tech Katta home">' +
      '<span class="tk-brand-name">' + content.brand.name + '</span><span class="tk-brand-divider" aria-hidden="true">/</span><span class="tk-brand-descriptor">' + content.brand.descriptor + '</span>' +
    '</a>' +
    '<button class="tk-menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="tk-primary-nav"><span></span><span></span></button>' +
    '<nav class="tk-nav" id="tk-primary-nav" aria-label="Primary navigation">' +
      '<a class="tk-nav-link tk-nav-app" href="#learn" data-home-route="learn">Library</a>' +
      '<a class="tk-nav-link tk-nav-app" href="#workspace" data-home-route="workspace">Design studio</a>' +
      '<a class="tk-nav-link tk-nav-app" href="#practice" data-home-route="practice">Practice lab</a>' +
      '<a class="tk-nav-link tk-nav-app" href="#evaluate" data-home-route="evaluate">Evaluate</a>' +
      '<button class="tk-theme-toggle" type="button" data-theme-toggle aria-pressed="false">Dark mode</button>' +
    '</nav></header>';
}

function renderFigure() {
  const figure = content.figure;
  return '<figure class="tk-figure" aria-labelledby="tk-figure-title">' +
    '<div class="tk-figure-header"><div class="tk-figure-heading"><h2 id="tk-figure-title">' + escapeHtml(figure.title) + '</h2><p class="tk-figure-caption">' + escapeHtml(figure.caption) + '</p></div><div class="tk-figure-tools"><span class="tk-figure-tag">' + escapeHtml(figure.tag) + '</span><button class="tk-figure-inspect" type="button" aria-pressed="false" aria-controls="tk-figure-viewport">Expand <span aria-hidden="true">＋</span></button></div></div>' +
    '<div class="tk-figure-viewport" id="tk-figure-viewport" tabindex="0" role="region" aria-label="Scrollable Kafka architecture diagram"><img class="tk-figure-image" src="' + escapeHtml(figure.src) + '" alt="' + escapeHtml(figure.alt) + '" width="2076" height="569" fetchpriority="high"></div>' +
    ''<div class="tk-failure-explorer" aria-label="Kafka failure scenario"><div class="tk-failure-controls" role="group" aria-label="Choose Kafka scenario"><button type="button" class="is-active" data-kafka-state="normal" aria-pressed="true">Normal flow</button><button type="button" data-kafka-state="failure" aria-pressed="false">Consumer stops</button></div><p class="tk-failure-status" aria-live="polite" data-kafka-explanation>Events are assigned to consumers in the group; each consumer advances its own offsets.</p></div>' +
    '<figcaption class="tk-figure-description">' + escapeHtml(figure.description) + '</figcaption><a class="tk-figure-learning-link" href="#learn" data-home-route="learn">Explore event streaming lessons <span aria-hidden="true">→</span></a></figure>';
}

function renderCardDiagram(id) {
  const diagrams = {
    concepts: '<div class="tk-mini-diagram tk-mini-concepts" aria-label="Concepts: availability, consistency, and latency trade-offs"><span>AVAILABILITY</span><i></i><span>CONSISTENCY</span><i></i><span>LATENCY</span></div>',
    components: '<div class="tk-mini-diagram tk-mini-components" aria-label="Components: request flow through a cache, service, and database"><span class="tk-mini-node">CACHE</span><b aria-hidden="true">→</b><span class="tk-mini-node tk-mini-node-active">SERVICE</span><b aria-hidden="true">→</b><span class="tk-mini-node">DB</span></div>',
    problems: '<div class="tk-mini-diagram tk-mini-problems" aria-label="Problems: requirements lead to an architecture and then trade-offs"><span>REQUIREMENTS</span><b aria-hidden="true">↓</b><span>ARCHITECTURE</span><b aria-hidden="true">↓</b><span>TRADE-OFFS</span></div>'
  };
  return diagrams[id] || "";
}

function renderCurriculum() {
  const section = content.curriculum;
  const cards = section.cards.map((card) =>
    '<article class="tk-curriculum-card" id="' + escapeHtml(card.id) + '">' +
      '<div class="tk-card-meta"><span class="tk-card-number">' + escapeHtml(card.number) + '</span><span class="tk-card-category">' + escapeHtml(card.category) + '</span></div>' +
      renderCardDiagram(card.id) +
      '<h3>' + escapeHtml(card.title) + '</h3><p>' + escapeHtml(card.description) + '</p>' +
      (card.target === "learn" || card.target === "practice" ? '<a class="tk-card-link" href="#' + escapeHtml(card.target) + '" data-home-route="' + escapeHtml(card.target) + '">' + escapeHtml(card.link) + ' <span aria-hidden="true">→</span></a>' : scrollLink(card.target, escapeHtml(card.link) + ' <span aria-hidden="true">↓</span>', "tk-card-link")) +
    '</article>'
  ).join("");
  return '<section class="tk-section tk-curriculum" id="' + section.id + '" aria-labelledby="tk-curriculum-title">' +
    '<div class="tk-section-heading"><div class="tk-section-title-group"><p class="tk-section-kicker"><span>' + section.number + '</span> / ' + escapeHtml(section.label) + '</p><h2 id="tk-curriculum-title">' + escapeHtml(section.title) + '</h2></div><p class="tk-section-index">' + escapeHtml(section.index) + '</p></div>' +
    '<div class="tk-curriculum-grid">' + cards + '</div></section>';
}

function renderQuickNotes() {
  const section = content.quickNotes;
  const items = section.items.map((item, index) =>
    '<details class="tk-note" ' + (index === 0 ? "open" : "") + '><summary>' +
      '<span class="tk-note-category">' + escapeHtml(item.category) + '</span>' +
      '<span class="tk-note-title">' + escapeHtml(item.title) + '</span>' +
      '<span class="tk-note-summary">' + escapeHtml(item.summary) + '</span>' +
      '<span class="tk-note-toggle" aria-hidden="true"></span></summary>' +
      '<div class="tk-note-body"><p>' + escapeHtml(item.body) + '</p></div></details>'
  ).join("");
  return '<section class="tk-section tk-notes-section" id="' + section.id + '" aria-labelledby="tk-notes-title">' +
    '<div class="tk-section-heading"><div class="tk-section-title-group"><p class="tk-section-kicker"><span>' + section.number + '</span> / ' + escapeHtml(section.label) + '</p><h2 id="tk-notes-title">' + escapeHtml(section.title) + '</h2><p class="tk-section-description">' + escapeHtml(section.description) + '</p></div><span class="tk-section-index">' + escapeHtml(section.index) + '</span></div>' +
    '<div class="tk-notes-search"><label for="tk-note-search">Search these notes</label><input id="tk-note-search" type="search" placeholder="Try Kafka, caching, retries…" autocomplete="off"><span class="tk-notes-search-count" aria-live="polite">' + section.items.length + ' notes</span></div>' +
    '<div class="tk-notes-list">' + items + '</div></section>';
}

function renderGuidelines() {
  const section = content.guidelines;
  const items = section.items.map((item) =>
    '<article class="tk-guideline"><span class="tk-guideline-number">' + escapeHtml(item.number) + '</span><div class="tk-guideline-copy"><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description) + '</p></div></article>'
  ).join("");
  return '<section class="tk-section tk-guidelines-section" id="' + section.id + '" aria-labelledby="tk-guidelines-title">' +
    '<div class="tk-section-heading"><div class="tk-section-title-group"><p class="tk-section-kicker"><span>' + section.number + '</span> / ' + escapeHtml(section.label) + '</p><h2 id="tk-guidelines-title">' + escapeHtml(section.title) + '</h2><p class="tk-section-description">' + escapeHtml(section.description) + '</p></div><span class="tk-section-index">' + escapeHtml(section.index) + '</span></div>' +
    '<div class="tk-tradeoff" aria-labelledby="tk-tradeoff-title"><div class="tk-tradeoff-heading"><p class="tk-section-kicker">ENGINEERING TRADE-OFFS</p><h3 id="tk-tradeoff-title">Monolith vs. distributed services</h3></div><div class="tk-tradeoff-scroll"><table class="tk-tradeoff-table"><thead><tr><th scope="col">DIMENSION</th><th scope="col">MONOLITH</th><th scope="col">DISTRIBUTED</th></tr></thead><tbody><tr><th scope="row">Operational load</th><td>Lower to start</td><td>Higher coordination</td></tr><tr><th scope="row">Deployment</th><td>One release unit</td><td>Independent services</td></tr><tr><th scope="row">Scaling</th><td>Scale the application</td><td>Scale selected services</td></tr><tr><th scope="row">Failure modes</th><td>Process-wide failures can affect the application</td><td>Timeouts, partial outages, cascading failures</td></tr><tr><th scope="row">Communication cost</th><td>In-process calls avoid network serialization</td><td>Network hops add serialization, latency, and retry costs</td></tr></tbody></table></div></div><div class="tk-guidelines-list">' + items + '</div></section>';
}

function renderFooter() {
  return '<footer class="tk-footer">' +
    '<a class="tk-footer-brand" href="#home" data-home-top>TECH KATTA <span>/ SYSTEMS KNOWLEDGE</span></a>' +
    '<p>Understand the systems behind the software.</p>' +
    '<div class="tk-footer-links">' + scrollLink("concepts", "Concepts") + scrollLink("components", "Components") + scrollLink("problems", "Problems") + scrollLink("quick-notes", "Quick Notes") + '<a href="#learn" data-home-route="learn">Learning library →</a><a href="#practice" data-home-route="practice">Practice →</a>' + '</div>' +
    '<span class="tk-footer-note">Where engineers explore architecture, trade-offs, and failure modes.</span></footer>';
}

export function renderHomePage() {
  return '<div class="tk-home">' + renderHeader() +
    '<main id="tk-main"><section class="tk-hero" aria-labelledby="tk-hero-title">' +
      '<div class="tk-hero-copy"><p class="tk-eyebrow">' + escapeHtml(content.hero.eyebrow) + '</p>' +
      '<h1 id="tk-hero-title">' + escapeHtml(content.hero.title) + '</h1>' +
      '<p class="tk-hero-description">' + escapeHtml(content.hero.description) + '</p>' +
      '<div class="tk-hero-actions">' +
        '<a class="tk-button tk-button-primary" href="#learn" data-home-route="learn">Explore topics <span aria-hidden="true">→</span></a>' +
        '<button class="tk-button tk-button-secondary tk-search-trigger" type="button" data-home-search>Search topics <kbd>⌘K</kbd></button>' +
      '</div></div><div class="tk-hero-visual">' + renderFigure() + '</div></section>' +
      renderQuickNotes() + renderCurriculum() + renderGuidelines() +
    '</main>' + renderFooter() + '</div>';
}

export function bindHomePage(root) {
  const home = root.querySelector(".tk-home");
  if (!home || home.dataset.bound === "true") return;
  home.dataset.bound = "true";
  const savedTheme = (() => { try { return localStorage.getItem("tk-home-theme"); } catch { return null; } })();
  const themeToggle = home.querySelector("[data-theme-toggle]");
  const setTheme = (dark) => {
    home.classList.toggle("is-dark", dark);
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.textContent = dark ? "Light mode" : "Dark mode";
    }
    try { localStorage.setItem("tk-home-theme", dark ? "dark" : "light"); } catch {}
  };
  setTheme(savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  themeToggle?.addEventListener("click", () => setTheme(!home.classList.contains("is-dark")));
  const kafkaExplanation = home.querySelector("[data-kafka-explanation]");
  home.querySelectorAll("[data-kafka-state]").forEach((button) => {
    button.addEventListener("click", () => {
      const failed = button.dataset.kafkaState === "failure";
      home.querySelectorAll("[data-kafka-state]").forEach((option) => {
        const active = option === button;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-pressed", String(active));
      });
      if (kafkaExplanation) {
        kafkaExplanation.textContent = failed
          ? "If a consumer stops sending heartbeats, the group can rebalance and reassign its partitions. Consumption may pause during reassignment, and lag can grow until a consumer resumes processing."
          : "Events are assigned to consumers in the group; each consumer advances its own offsets.";
      }
      home.querySelector(".tk-failure-explorer")?.classList.toggle("is-failure", failed);
    });
  });
  home.querySelector("[data-home-search]")?.addEventListener("click", () => {
    window.location.hash = "learn";
    window.requestAnimationFrame(() => root.querySelector("#lesson-search")?.focus());
  });
  const menuToggle = home.querySelector(".tk-menu-toggle");
  const nav = home.querySelector(".tk-nav");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inspectButton = home.querySelector(".tk-figure-inspect");
  const figureViewport = home.querySelector("#tk-figure-viewport");
  inspectButton?.addEventListener("click", () => {
    const inspecting = figureViewport.classList.toggle("is-inspecting");
    inspectButton.setAttribute("aria-pressed", String(inspecting));
    inspectButton.innerHTML = inspecting ? 'Fit <span aria-hidden="true">−</span>' : 'Expand <span aria-hidden="true">＋</span>';
    if (inspecting && window.matchMedia("(max-width: 767px)").matches) {
      figureViewport.scrollTo({ left: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }
  });
  const closeMenu = () => {
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });

  home.querySelectorAll("[data-home-scroll]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = home.querySelector("#" + link.dataset.homeScroll);
      closeMenu();
      if (target) target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  const noteSearch = home.querySelector("#tk-note-search");
  const noteSearchCount = home.querySelector(".tk-notes-search-count");
  noteSearch?.addEventListener("input", () => {
    const query = noteSearch.value.trim().toLowerCase();
    const notes = [...home.querySelectorAll(".tk-note")];
    let visible = 0;
    notes.forEach((note) => {
      const matches = note.textContent.toLowerCase().includes(query);
      note.hidden = !matches;
      if (matches) visible += 1;
    });
    if (noteSearchCount) noteSearchCount.textContent = visible + (visible === 1 ? " note" : " notes");
  });

  home.querySelectorAll("[data-home-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      window.location.hash = link.dataset.homeRoute;
    });
  });

  home.querySelectorAll("[data-home-top]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu();
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  home.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

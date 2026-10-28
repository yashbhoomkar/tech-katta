import "./home-page.css";

// Static frontend content for the first release. Update these objects to refresh
// homepage sections and cards without rewriting the component markup.
const content = {
  brand: { name: "TECH KATTA", descriptor: "SYSTEMS KNOWLEDGE" },
  hero: {
    eyebrow: "TECH KATTA / ENGINEERING KNOWLEDGE",
    title: "Understand the systems behind the software.",
    description: "Explore distributed systems, understand the components behind modern infrastructure, and learn to solve real-world system-design problems."
  },
  figure: {
    title: "Kafka Architecture",
    caption: "FIG. 01 — KAFKA PRODUCER, BROKER & CONSUMER ARCHITECTURE",
    tag: "STREAMING PRIMITIVES",
    description: "Producers publish to topics; partitions distribute across brokers; consumers ingest streams.",
    src: "/diagrams/kafka-architecture.svg",
    alt: "Kafka component diagram: producer services publish events to the orders.events topic, divided into partitions P0, P1, and P2; a consumer group reads P0 with Consumer A and P1/P2 with Consumer B."
  },
  curriculum: {
    id: "curriculum", number: "01", label: "CURATED CURRICULUM",
    title: "Fundamental dimensions of systems engineering.",
    index: "INDEX: ARCHITECTURAL FOUNDATIONS",
    cards: [
      { id: "concepts", number: "01", category: "CONCEPTS", title: "Understand the fundamentals", description: "Build intuition for scalability, consistency, replication, availability, and failure.", link: "Explore quick notes", target: "quick-notes" },
      { id: "components", number: "02", category: "COMPONENTS", title: "Know the building blocks", description: "Understand the role of caches, databases, queues, brokers, and load balancers.", link: "Read the guidelines", target: "guidelines" },
      { id: "problems", number: "03", category: "PROBLEMS", title: "Reason through real systems", description: "Turn requirements and constraints into architecture, capacity estimates, and trade-offs.", link: "Read the guidelines", target: "guidelines" }
    ]
  },
  quickNotes: {
    id: "quick-notes", number: "02", label: "QUICK NOTES SECTION",
    title: "Useful ideas, without the long read.",
    description: "Short, focused explanations for concepts you want to understand or revisit quickly.",
    index: "FIELD NOTES / ENGINEERING",
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
      { number: "G.01", title: "Start with requirements", description: "Clarify user journeys, workload, latency, availability, consistency, and what is out of scope before selecting components." },
      { number: "G.02", title: "Measure before adding complexity", description: "Identify the bottleneck and its evidence. Introduce a cache, queue, replica, or partition when a requirement justifies the added cost." },
      { number: "G.03", title: "Design for partial failure", description: "Assume dependencies can time out, messages can be delivered more than once, and recovery can take longer than expected." }
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
      scrollLink("concepts", "Concepts", "tk-nav-link") +
      scrollLink("components", "Components", "tk-nav-link") +
      scrollLink("problems", "Problems", "tk-nav-link") +
      scrollLink("quick-notes", "System Design Notes", "tk-nav-link tk-nav-notes") +
    '</nav></header>';
}

function renderFigure() {
  const figure = content.figure;
  return '<figure class="tk-figure" aria-labelledby="tk-figure-title">' +
    '<div class="tk-figure-header"><div class="tk-figure-heading"><h2 id="tk-figure-title">' + escapeHtml(figure.title) + '</h2><p class="tk-figure-caption">' + escapeHtml(figure.caption) + '</p></div><div class="tk-figure-tools"><span class="tk-figure-tag">' + escapeHtml(figure.tag) + '</span><button class="tk-figure-inspect" type="button" aria-pressed="false" aria-controls="tk-figure-viewport">Inspect <span aria-hidden="true">↗</span></button></div></div>' +
    '<div class="tk-figure-viewport" tabindex="0" role="region" aria-label="Scrollable Kafka architecture diagram"><img class="tk-figure-image" src="' + escapeHtml(figure.src) + '" alt="' + escapeHtml(figure.alt) + '" width="2076" height="569" fetchpriority="high"></div>' +
    '<figcaption class="tk-figure-description">' + escapeHtml(figure.description) + '</figcaption></figure>';
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
      scrollLink(card.target, escapeHtml(card.link) + ' <span aria-hidden="true">↗</span>', "tk-card-link") +
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
    '<div class="tk-notes-list">' + items + '</div></section>';
}

function renderGuidelines() {
  const section = content.guidelines;
  const items = section.items.map((item) =>
    '<article class="tk-guideline"><span class="tk-guideline-number">' + escapeHtml(item.number) + '</span><div class="tk-guideline-copy"><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description) + '</p></div><span class="tk-guideline-mark" aria-hidden="true">↗</span></article>'
  ).join("");
  return '<section class="tk-section tk-guidelines-section" id="' + section.id + '" aria-labelledby="tk-guidelines-title">' +
    '<div class="tk-section-heading"><div class="tk-section-title-group"><p class="tk-section-kicker"><span>' + section.number + '</span> / ' + escapeHtml(section.label) + '</p><h2 id="tk-guidelines-title">' + escapeHtml(section.title) + '</h2><p class="tk-section-description">' + escapeHtml(section.description) + '</p></div><span class="tk-section-index">' + escapeHtml(section.index) + '</span></div>' +
    '<div class="tk-tradeoff" aria-labelledby="tk-tradeoff-title"><div class="tk-tradeoff-heading"><p class="tk-section-kicker">REFERENCE / TRADE-OFFS</p><h3 id="tk-tradeoff-title">Monolith vs. distributed services</h3></div><div class="tk-tradeoff-scroll"><table class="tk-tradeoff-table"><thead><tr><th scope="col">DIMENSION</th><th scope="col">MONOLITH</th><th scope="col">DISTRIBUTED</th></tr></thead><tbody><tr><th scope="row">Operational load</th><td>Lower to start</td><td>Higher coordination</td></tr><tr><th scope="row">Deployment</th><td>One release unit</td><td>Independent services</td></tr><tr><th scope="row">Scaling</th><td>Scale the application</td><td>Scale selected services</td></tr><tr><th scope="row">Failure modes</th><td>Shared process boundary</td><td>Network and partial failures</td></tr></tbody></table></div></div><div class="tk-guidelines-list">' + items + '</div></section>';
}

function renderFooter() {
  return '<footer class="tk-footer">' +
    '<a class="tk-footer-brand" href="#home" data-home-top>TECH KATTA <span>/ SYSTEMS KNOWLEDGE</span></a>' +
    '<p>Understand the systems behind the software.</p>' +
    '<div class="tk-footer-links">' + scrollLink("concepts", "Concepts") + scrollLink("components", "Components") + scrollLink("problems", "Problems") + scrollLink("quick-notes", "Quick Notes") + '</div>' +
    '<span class="tk-footer-note">A frontend-first engineering knowledge project.</span></footer>';
}

export function renderHomePage() {
  return '<div class="tk-home">' + renderHeader() +
    '<main id="tk-main"><section class="tk-hero" aria-labelledby="tk-hero-title">' +
      '<div class="tk-hero-copy"><p class="tk-eyebrow">' + escapeHtml(content.hero.eyebrow) + '</p>' +
      '<h1 id="tk-hero-title">' + escapeHtml(content.hero.title) + '</h1>' +
      '<p class="tk-hero-description">' + escapeHtml(content.hero.description) + '</p>' +
      '<div class="tk-hero-actions">' +
        scrollLink("curriculum", 'Dashboard <span aria-hidden="true">↗</span>', "tk-button tk-button-primary") +
        scrollLink("quick-notes", 'Quick Notes <span aria-hidden="true">→</span>', "tk-button tk-button-secondary") +
      '</div></div><div class="tk-hero-visual">' + renderFigure() + '</div></section>' +
      renderCurriculum() + renderQuickNotes() + renderGuidelines() +
    '</main>' + renderFooter() + '</div>';
}

export function bindHomePage(root) {
  const home = root.querySelector(".tk-home");
  if (!home || home.dataset.bound === "true") return;
  home.dataset.bound = "true";
  const menuToggle = home.querySelector(".tk-menu-toggle");
  const nav = home.querySelector(".tk-nav");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inspectButton = home.querySelector(".tk-figure-inspect");
  const figureViewport = home.querySelector("#tk-figure-viewport");
  inspectButton?.addEventListener("click", () => {
    const inspecting = figureViewport.classList.toggle("is-inspecting");
    inspectButton.setAttribute("aria-pressed", String(inspecting));
    inspectButton.innerHTML = inspecting ? 'Fit <span aria-hidden="true">↙</span>' : 'Inspect <span aria-hidden="true">↗</span>';
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

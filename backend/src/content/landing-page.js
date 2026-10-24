export const landingPageContent = {
  meta: {
    title: "Tech Katta — Distributed Systems & System Design",
    description: "Understand the systems behind the software. Explore distributed systems, study production architecture, and practice designing systems that scale."
  },
  brand: { name: "Tech Katta", descriptor: "Systems architecture & design lab", reference: "DIST-SYS / 01", status: "Engineering knowledge" },
  hero: {
    eyebrow: "Tech Katta / Engineering knowledge",
    title: "Understand the systems behind the software.",
    description: "Explore distributed systems, study production architecture, and practice designing systems that scale.",
    primaryAction: { label: "Explore engineering notes", href: "#notes" },
    secondaryAction: { label: "Enter the system design lab", href: "#lab" },
    diagram: {
      caption: "Fig. 1.0 — Read/write request topology",
      annotation: "Trace a request. Find the bottleneck. Understand the trade-off.",
      groups: [
        { label: "ENTRY", nodes: [{ id: "client", label: "Client", detail: "Web / mobile" }, { id: "gateway", label: "API gateway", detail: "Auth · rate limits" }] },
        { label: "APPLICATION", nodes: [{ id: "read", label: "Query service", detail: "Stateless reads" }, { id: "write", label: "Write service", detail: "Validated mutations" }, { id: "worker", label: "Async worker", detail: "Queue consumers" }] },
        { label: "DATA", nodes: [{ id: "cache", label: "Distributed cache", detail: "Hot reads" }, { id: "database", label: "Primary datastore", detail: "Durable state" }, { id: "queue", label: "Message queue", detail: "Async work" }] }
      ]
    }
  },
  lab: {
    eyebrow: "01 / Interactive system design lab",
    title: "Inspect architectures before writing production code.",
    problem: { level: "Intermediate", title: "Design a URL shortener", description: "Design a service that creates compact aliases for long URLs and redirects visitors reliably under read-heavy traffic.", checklist: ["Functional and non-functional requirements", "API contracts and identifier strategy", "Storage schema and partitioning", "Caching, abuse prevention, and throttling"] },
    workspace: {
      filename: "topology-canvas.sys",
      components: [
        { type: "ENTRY", name: "API gateway", detail: "Authentication · limits" },
        { type: "APP", name: "Shortener API", detail: "Stateless service" },
        { type: "CACHE", name: "Distributed cache", detail: "Hot-key mitigation" },
        { type: "DATA", name: "URL datastore", detail: "Key-to-URL mapping" }
      ],
      evaluation: {
        label: "Illustrative evaluation",
        notice: "Static sample — not a live evaluation of your architecture.",
        findings: [
          { status: "Consider", title: "Cache stampede risk", detail: "Popular links expiring together can send a burst of reads to storage. Consider request coalescing, TTL jitter, or early refresh." },
          { status: "Review", title: "Write rate limits", detail: "Creation endpoints should define quotas and abuse controls so automated clients cannot exhaust resources." },
          { status: "Trade-off", title: "Identifier and partition strategy", detail: "Choose an identifier strategy and partition key that match uniqueness, access patterns, and operational constraints." }
        ]
      }
    }
  },
  notes: {
    eyebrow: "02 / Curated engineering notes",
    title: "Deep explanations of distributed systems concepts.",
    items: [
      { number: "01", category: "Distributed state", code: "DIST-CONSISTENCY", title: "Consistency models", description: "Strong consistency, eventual consistency, and the trade-offs between them in partition-tolerant systems.", readTime: "18 min", diagram: "replication" },
      { number: "02", category: "Latency optimization", code: "CACHE-PATTERNS", title: "Caching at scale", description: "Cache-aside, invalidation, hot-key mitigation, and stampede prevention.", readTime: "14 min", diagram: "cache" },
      { number: "03", category: "Event-driven architecture", code: "ASYNC-MESSAGING", title: "Message queues", description: "Delivery guarantees, idempotent consumption, ordering trade-offs, and dead-letter queues.", readTime: "22 min", diagram: "queue" }
    ]
  },
  principle: {
    eyebrow: "03 / Core principle",
    quote: "Good architecture is not about choosing more components. It is about understanding the trade-offs.",
    comparison: [
      { title: "Cohesive monolith", description: "Simple in-process calls and transaction boundaries; scaling and deployment may eventually become limiting constraints.", tag: "In-process" },
      { title: "Distributed services", description: "Independent deployment and scaling, with additional network failure modes, coordination, and consistency decisions.", tag: "Networked" }
    ],
    lesson: "Every new distributed boundary adds operational and failure-handling responsibilities. Introduce one when its benefits justify its cost."
  },
  closing: { eyebrow: "Practice & mastery", title: "Build a deeper understanding of how systems work.", description: "Study architecture, evaluate trade-offs, and develop strong distributed-systems mental models.", action: { label: "Explore Tech Katta", href: "#notes" } },
  footer: { description: "An engineering knowledge publication and system design lab for distributed software architecture.", links: [{ label: "Engineering notes", href: "#notes" }, { label: "System Design Lab", href: "#lab" }, { label: "Architecture evaluation", href: "#lab" }], copyright: "Tech Katta" }
};

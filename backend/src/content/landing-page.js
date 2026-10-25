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
    eyebrow: "02 / Interactive system design lab",
    status: "UPCOMING",
    title: "Interactive system design lab",
    description: "A guided workspace for designing systems, exploring architectural trade-offs, and getting structured feedback. We are building it. For now, Tech Katta is focused on high-quality system design notes and a useful distributed-systems knowledge base."
  },
  notes: {
    eyebrow: "01 / System design knowledge base",
    title: "Build strong mental models for designing reliable systems.",
    items: [
      { number: "01", category: "Distributed state", code: "DIST-CONSISTENCY", title: "Consistency models", description: "Strong consistency, eventual consistency, and the trade-offs between them in partition-tolerant systems.", readTime: "18 min", diagram: "replication" },
      { number: "02", category: "Latency optimization", code: "CACHE-PATTERNS", title: "Caching at scale", description: "Cache-aside, invalidation, hot-key mitigation, and stampede prevention.", readTime: "14 min", diagram: "cache" },
      { number: "03", category: "Event-driven architecture", code: "ASYNC-MESSAGING", title: "Message queues", description: "Delivery guarantees, idempotent consumption, ordering trade-offs, and dead-letter queues.", readTime: "22 min", diagram: "queue" }
    ]
  },
  principle: {
    eyebrow: "02 / Core principle",
    quote: "Good architecture is not about choosing more components. It is about understanding the trade-offs.",
    comparison: [
      { title: "Cohesive monolith", description: "Simple in-process calls and transaction boundaries; scaling and deployment may eventually become limiting constraints.", tag: "In-process" },
      { title: "Distributed services", description: "Independent deployment and scaling, with additional network failure modes, coordination, and consistency decisions.", tag: "Networked" }
    ],
    lesson: "Every new distributed boundary adds operational and failure-handling responsibilities. Introduce one when its benefits justify its cost."
  },
  closing: { eyebrow: "The knowledge base", title: "Learn the principles behind systems that scale.", description: "Start with the fundamentals. Follow the request path, understand the data model, and learn the trade-offs behind each architectural decision.", action: { label: "Explore system design notes", href: "#notes" } },
  footer: { description: "System design notes and a distributed-systems knowledge base for software engineers.", links: [{ label: "System design notes", href: "#notes" }, { label: "Knowledge base", href: "#notes" }, { label: "Interactive lab — upcoming", href: "#lab" }], copyright: "Tech Katta" }
};

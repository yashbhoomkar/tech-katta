// The learning sections, their groups and lessons. In the real app this comes from the content API
// (GET /v1/site and /v1/articles); here it is a fixed sample so every screen can be clicked through.
// Lesson state: "done", "now" (in progress) or "" (not started).

export const SECTIONS = [
  {
    id: "concepts", name: "Concepts", short: "Concepts",
    title: "The ideas every design rests on",
    blurb: "21 lessons in three groups. Read the nine core concepts in order; the patterns and specialised data are for when a problem needs them.",
    card: "Caching, sharding, queues: the ideas every design rests on.",
    groups: [
      { id: "core", title: "Core concepts", desc: "Read in order: each builds on the one before.", lessons: [
        ["networking-essentials", "Networking essentials", 12, "done"], ["api-design", "API design", 14, "done"],
        ["data-modelling", "Data modelling", 11, "done"], ["caching", "Caching", 22, "now"],
        ["sharding", "Sharding", 16, ""], ["consistent-hashing", "Consistent hashing", 9, ""],
        ["cap-theorem", "CAP theorem", 10, ""], ["database-indexing", "Database indexing", 13, ""],
        ["numbers-to-know", "Numbers to know", 8, ""] ] },
      { id: "patterns", title: "Recurring patterns", desc: "Problems that come up in many designs, and the usual fixes.", lessons: [
        ["real-time-updates", "Real-time updates", 14, ""], ["contention", "Contention", 12, ""],
        ["multi-step-processes", "Processes with many steps", 15, ""], ["read-heavy", "When reads outnumber writes", 11, ""],
        ["write-heavy", "When writes outrun one database", 13, ""], ["big-files", "Big files", 12, ""],
        ["long-jobs", "Jobs that run for minutes", 14, ""], ["proximity", "Finding what’s nearby", 12, ""] ] },
      { id: "data", title: "Specialised data", desc: "When the shape of the data decides the database.", lessons: [
        ["time-series", "Time series", 10, ""], ["search-indexes", "Search indexes", 12, ""],
        ["graphs", "Graphs", 9, ""], ["blobs", "Blob storage", 8, ""] ] },
    ],
  },
  {
    id: "components", name: "Components", short: "Components",
    title: "The tools, and where each one breaks",
    blurb: "Ten tools you'll name in every design. What each is good at, what it costs, and how it fails.",
    card: "Redis, Kafka, Postgres: what each tool is good at, and where it breaks.",
    groups: [{ id: "tools", title: "Tools", desc: "Read any order.", lessons: [
      ["redis", "Redis", 14, "done"], ["kafka", "Kafka", 16, ""], ["postgres", "Postgres", 15, ""],
      ["cassandra", "Cassandra", 13, ""], ["dynamodb", "DynamoDB", 12, ""], ["elasticsearch", "Elasticsearch", 12, ""],
      ["flink", "Flink", 11, ""], ["zookeeper", "ZooKeeper", 9, ""], ["s3", "S3", 8, ""], ["api-gateway", "API gateway", 9, ""] ] }],
  },
  {
    id: "interview", name: "Interview Questions", short: "Interview",
    title: "Real questions, answered start to finish",
    blurb: "22 questions, each answered the way an interviewer expects: requirements, numbers, a design, then the deep dives.",
    card: "22 real questions, answered from requirements to deep dives.",
    groups: [
      { id: "guides", title: "How to answer", desc: "Seven short guides before the questions.", lessons: [
        ["the-framework", "The framework", 10, "done"], ["requirements", "Asking for requirements", 8, ""],
        ["estimates", "Back-of-the-envelope numbers", 9, ""], ["deep-dives", "Choosing deep dives", 8, ""] ] },
      { id: "questions", title: "Questions", desc: "Easy first.", lessons: [
        ["url-shortener", "Design a URL shortener", 25, ""], ["chat-app", "Design a chat app", 30, ""],
        ["news-feed", "Design a news feed", 28, ""], ["payments", "Design a payment system", 32, ""] ] },
    ],
  },
  {
    id: "notes", name: "Quick Notes", short: "Notes",
    title: "One system, one page",
    blurb: "Short notes on one well-known system each: what it does, the numbers, and the one idea that makes it work.",
    card: "Short notes on one system each.",
    groups: [{ id: "notes", title: "Notes", desc: "Five minutes each.", lessons: [
      ["whatsapp", "WhatsApp messages", 5, ""], ["irctc-tatkal", "IRCTC Tatkal at 10 am", 5, ""],
      ["upi", "A UPI payment", 6, ""], ["hotstar", "Live cricket on Hotstar", 6, ""] ] }],
  },
  {
    id: "real", name: "Real Systems", short: "Real",
    title: "How real companies built it",
    blurb: "Six case studies from engineering blogs, retold with the numbers and the mistakes.",
    card: "6 case studies from engineering blogs.",
    groups: [{ id: "cases", title: "Case studies", desc: "Longer reads.", lessons: [
      ["discord-messages", "Discord stores trillions of messages", 18, ""], ["uber-dispatch", "Uber matches riders", 16, ""],
      ["netflix-edge", "Netflix at the edge", 15, ""], ["stripe-idempotency", "Stripe never charges twice", 14, ""],
      ["figma-multiplayer", "Figma multiplayer", 15, ""], ["zerodha-kite", "Zerodha at market open", 14, ""] ] }],
  },
];

export const sectionById = (id) => SECTIONS.find((s) => s.id === id);

export const lessonsOf = (sec) => sec.groups.flatMap((g) => g.lessons.map(([slug, title, min, state]) => ({ slug, title, min, state, group: g })));

export const progressOf = (sec) => {
  const all = lessonsOf(sec);
  const done = all.filter((l) => l.state === "done").length;
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) };
};

export const findLesson = (secId, slug) => {
  const sec = sectionById(secId);
  if (!sec) return null;
  const all = lessonsOf(sec);
  const i = all.findIndex((l) => l.slug === slug);
  return i < 0 ? null : { sec, lesson: all[i], prev: all[i - 1] || null, next: all[i + 1] || null, index: i };
};

// mark a lesson done and move "now" to the next one (prototype state lives in memory)
export const completeLesson = (secId, slug) => {
  const f = findLesson(secId, slug);
  if (!f) return null;
  const g = f.lesson.group.lessons, row = g.find((l) => l[0] === slug);
  row[3] = "done";
  const nx = g[g.indexOf(row) + 1];
  if (nx && !nx[3]) nx[3] = "now";
  return f.next;
};

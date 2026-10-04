export const categories = [
  { id: 'distributed-systems', label: 'Distributed Systems', count: 1 },
  { id: 'databases', label: 'Databases', count: 2 },
  { id: 'ai-infra', label: 'AI Infrastructure', count: 2 },
  { id: 'cloud-devops', label: 'Cloud & DevOps', count: 1 },
  { id: 'backend', label: 'Backend Engineering', count: 2 },
];

export const articles = [
  {
    slug: 'kafka',
    title: 'Kafka',
    eyebrow: 'Messaging',
    description: 'What Kafka actually gives you: an append-only log, consumer groups, partitioning, and the mechanics behind scalable event streaming.',
    category: 'distributed-systems',
    tags: ['Kafka', 'Messaging', 'Streaming'],
    readTime: '12 min read',
    status: 'published',
    updated: 'October 2026',
  },
  {
    slug: 'cassandra',
    title: 'Cassandra',
    eyebrow: 'Wide-column storage',
    description: 'A practical mental model for partition keys, replication, consistency, and why Cassandra asks you to model around queries.',
    category: 'databases',
    tags: ['Cassandra', 'NoSQL', 'Distributed DB'],
    readTime: '10 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'clickhouse',
    title: 'ClickHouse',
    eyebrow: 'Analytics',
    description: 'Why a columnar OLAP engine creates a very different storage and query problem from a transactional database.',
    category: 'databases',
    tags: ['ClickHouse', 'OLAP', 'Analytics'],
    readTime: '9 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'rag',
    title: 'RAG pipelines',
    eyebrow: 'AI infrastructure',
    description: 'From ingestion and chunking to embeddings, retrieval, reranking, and evaluation: a systems view of retrieval-augmented generation.',
    category: 'ai-infra',
    tags: ['RAG', 'Embeddings', 'LLM'],
    readTime: '14 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'solr',
    title: 'Solr',
    eyebrow: 'Search',
    description: 'The pieces behind a production search system: indexing, analyzers, replicas, query-time ranking, and operational trade-offs.',
    category: 'ai-infra',
    tags: ['Solr', 'Search', 'Indexing'],
    readTime: '11 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'nginx',
    title: 'Nginx',
    eyebrow: 'Edge',
    description: 'Reverse proxies, TLS termination, connection handling, and why Nginx still sits in front of so many services.',
    category: 'cloud-devops',
    tags: ['Nginx', 'Networking', 'TLS'],
    readTime: '8 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'docker',
    title: 'Docker',
    eyebrow: 'Runtime',
    description: 'Containers as packaging, process isolation, images, layers, networking, and the production details that matter on a small VPS.',
    category: 'backend',
    tags: ['Docker', 'Containers', 'Deployment'],
    readTime: '9 min read',
    status: 'soon',
    updated: 'Coming next',
  },
  {
    slug: 'kubernetes',
    title: 'Kubernetes',
    eyebrow: 'Orchestration',
    description: 'The control plane, reconciliation loops, deployments, services, scheduling, and the abstractions underneath the YAML.',
    category: 'backend',
    tags: ['Kubernetes', 'Containers', 'Platform'],
    readTime: '15 min read',
    status: 'soon',
    updated: 'Coming next',
  },
];

export const kafkaSections = [
  {
    id: 'what-is-kafka',
    title: 'What is Kafka?',
    body: [
      'Kafka is easiest to understand as a distributed, append-only log. Producers append records to topics; Kafka stores those records in partitioned logs; consumers read from those partitions at their own pace.',
      'The useful mental shift is to stop thinking of Kafka as a traditional message queue. A record does not simply disappear when one consumer reads it. Retention is independent of consumption, which lets multiple consumers replay the same stream and lets a consumer recover from a previous offset.',
    ],
  },
  {
    id: 'partitions',
    title: 'Topics and partitions',
    body: [
      'A topic is a logical stream. A topic is split into partitions so Kafka can distribute writes and reads across brokers. Ordering is guaranteed within a partition, not across the entire topic.',
      'The partition key is therefore an architectural decision. If events for the same entity must stay ordered, route them to the same partition using a stable key such as userId, accountId, or orderId.',
    ],
  },
  {
    id: 'consumer-groups',
    title: 'Consumer groups',
    body: [
      'A consumer group turns partitions into units of parallel work. Within a group, a partition is assigned to at most one active consumer at a time, so adding consumers can increase throughput until the number of consumers reaches the number of partitions.',
      'Different consumer groups see the same records independently. Analytics, search indexing, notifications, and downstream services can each maintain their own position.',
    ],
  },
  {
    id: 'delivery-semantics',
    title: 'Delivery semantics',
    body: [
      'Kafka gives you the building blocks for at-most-once, at-least-once, and effectively-once processing patterns. In practice, the application must still think about retries, idempotency, commit timing, and what happens when a consumer crashes between processing and committing an offset.',
      'A robust design usually assumes retries can happen and makes the side effect idempotent. Exactly-once semantics are a deliberate design choice, not a default property of every end-to-end system.',
    ],
  },
];

export const kafkaFacts = [
  ['Ordering', 'Per partition'],
  ['Scaling unit', 'Partition'],
  ['Parallelism', 'Consumer group members'],
  ['Retention', 'Independent of consumption'],
];

export function getArticle(slug) {
  return articles.find((article) => article.slug === slug);
}

export const categories = [
  { id: 'distributed-systems', label: 'Distributed Systems', count: 2 },
  { id: 'databases', label: 'Databases', count: 2 },
  { id: 'ai-infra', label: 'AI Infrastructure', count: 2 },
  { id: 'cloud-devops', label: 'Cloud & DevOps', count: 1 },
  { id: 'backend', label: 'Backend Engineering', count: 2 },
];

export const articles = [
  {
    slug: 'kafka-basics',
    title: 'Kafka Basics',
    eyebrow: 'Messaging',
    description: 'A first-principles introduction to Kafka: brokers, topics, partitions, producers, consumers, offsets, and consumer groups.',
    category: 'distributed-systems',
    tags: ['Kafka', 'Messaging', 'Streaming'],
    readTime: '10 min read',
    status: 'published',
    updated: 'October 2026',
  },
  {
    slug: 'kafka',
    title: 'Kafka',
    eyebrow: 'Messaging deep dive',
    description: 'Go beyond the primitives into delivery semantics, replication, failure handling, and the design trade-offs behind production Kafka systems.',
    category: 'distributed-systems',
    tags: ['Kafka', 'Distributed Systems', 'Reliability'],
    readTime: '12 min read',
    status: 'soon',
    updated: 'Coming next',
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

export const kafkaBasicsSections = [
  {
    id: 'kafka-mental-model',
    title: 'Start with the mental model',
    body: [
      'Kafka is a distributed event-streaming platform built around a durable, append-only log. Producers write records; Kafka stores those records; consumers read them later. The important idea is that reading a record does not normally delete it.',
      'That makes Kafka different from a simple work queue. The stored stream can be read by multiple independent consumers and can be replayed from an earlier position when an application needs to rebuild state or recover from a failure.',
    ],
  },
  {
    id: 'topics-and-partitions',
    title: 'Topics and partitions',
    body: [
      'A topic is the logical name for a stream of records. Kafka splits a topic into partitions so that data and traffic can be distributed across brokers and processed in parallel.',
      'A partition is an ordered sequence. Kafka guarantees ordering within a partition, so the partition key becomes an architectural decision. Events that must remain ordered for the same entity should use a stable key that maps them to the same partition.',
    ],
  },
  {
    id: 'producers',
    title: 'Producers',
    body: [
      'A producer publishes records to a topic. It can choose a partition explicitly or let Kafka select one using a partitioning strategy, commonly based on the record key.',
      'Producers also control important reliability behavior through acknowledgement and batching settings. In production, the goal is usually to balance throughput, latency, and durability rather than maximizing one metric in isolation.',
    ],
  },
  {
    id: 'consumers',
    title: 'Consumers and offsets',
    body: [
      'A consumer reads records from Kafka and tracks its position using an offset. The offset is the record position within a partition, so a consumer can stop and later continue from where it left off.',
      'Because the record remains in Kafka according to the topic retention policy, a consumer can also move backward and replay data. This is one of Kafka’s most useful properties when recovering state or adding a new downstream consumer.',
    ],
  },
  {
    id: 'consumer-groups',
    title: 'Consumer groups',
    body: [
      'A consumer group is a set of consumers cooperating to process a topic. Within one group, each partition is assigned to at most one active consumer at a time.',
      'This creates a simple scaling rule: you can add consumers to increase parallelism, but a group cannot actively process more partitions in parallel than the topic has partitions. Different groups, meanwhile, can independently consume the same topic for different purposes.',
    ],
  },
  {
    id: 'brokers-and-replication',
    title: 'Brokers and replication',
    body: [
      'Kafka runs as a cluster of brokers. Partitions are distributed across those brokers, and partitions can be replicated so that the cluster can tolerate broker failures.',
      'Think of a partition as the unit of both storage and replication. The leader handles normal reads and writes for the partition while replicas provide redundancy and can take over when the cluster elects a new leader.',
    ],
  },
  {
    id: 'simple-flow',
    title: 'Putting the pieces together',
    body: [
      'The basic flow is: a producer publishes a record to a topic, Kafka places it into a partition, and a consumer in a group reads it and advances its offset.',
      'Once that model is clear, most of Kafka’s production concepts become easier to reason about: retention answers how long the log stays around, partitions answer how work scales, consumer groups answer how work is shared, and replication answers how the data survives broker failure.',
    ],
  },
];

export const kafkaFacts = [
  ['Core idea', 'Durable append-only log'],
  ['Ordering', 'Per partition'],
  ['Scaling unit', 'Partition'],
  ['Progress', 'Consumer offset'],
];

export const articleSections = {
  kafka: [],
  'kafka-basics': kafkaBasicsSections,
};

export const articleFacts = {
  kafka: kafkaFacts,
  'kafka-basics': kafkaFacts,
};

export function getArticle(slug) {
  return articles.find((article) => article.slug === slug);
}

export function getArticleSections(slug) {
  return articleSections[slug] || [];
}

export function getArticleFacts(slug) {
  return articleFacts[slug] || [];
}

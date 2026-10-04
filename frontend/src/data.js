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
    eyebrow: 'Key Technologies',
    description: 'Learn the mental model behind Kafka, how topics and partitions work, how consumers scale with groups, and why offsets and replication matter.',
    category: 'distributed-systems',
    tags: ['Kafka', 'Messaging', 'Streaming'],
    readTime: '12 min read',
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

export const articleContent = {
  'kafka-basics': {
    introduction: [
      'Kafka is a distributed event streaming platform built around a durable, append-only log. Applications publish records to Kafka, Kafka stores them, and consumers read those records at their own pace.',
      'The easiest way to understand Kafka is top down: first look at the flow of events, then the primitives that make that flow scalable, and finally the failure and performance decisions that matter in production.',
    ],
    sections: [
      {
        id: 'motivating-example',
        title: 'A motivating example',
        paragraphs: [
          'Imagine a sports platform showing live match updates. A goal, card, substitution, or score change is an event. Several downstream systems may need the same event: the live scoreboard, notifications, analytics, and an audit pipeline.',
          'A single queue and a single consumer work until traffic grows. At that point we need parallelism without losing the ordering of events that belong to the same match.',
          'Kafka solves this by spreading a stream across partitions, while using a key to keep related records together. Consumers can then scale independently using consumer groups.',
        ],
        diagram: 'motivating',
      },
      {
        id: 'basic-terminology',
        title: 'Basic terminology and architecture',
        paragraphs: [
          'A Kafka cluster is made up of brokers. Brokers store partitions and serve producers and consumers. A topic is a logical stream made up of one or more partitions.',
          'A partition is an ordered, immutable sequence of records. It is both a storage unit and a scaling unit. A topic can therefore be processed in parallel by spreading its partitions across brokers.',
          'Producers write records to topics. Consumers read records from topics. Kafka itself does not care whether the payload represents an order, a click, a payment, or a log entry; it stores and serves the records according to the topic configuration.',
        ],
        diagram: 'architecture',
        subsections: [
          {
            title: 'Topic vs partition',
            paragraphs: [
              'Think of a topic as the name of the stream and a partition as one ordered lane within that stream. A topic can have many partitions, and a partition lives on a broker.',
              'Ordering exists within a partition, not across the entire topic. That single fact explains why choosing a partition key is an architectural decision rather than a minor producer setting.',
            ],
            diagram: 'partitions',
          },
          {
            title: 'What is stored in a record?',
            paragraphs: [
              'A Kafka record can contain a key, value, timestamp, and headers. The value is the business payload; headers are useful for metadata; the key is often the most important field for system design because it influences partition placement.',
            ],
          },
        ],
      },
      {
        id: 'how-kafka-works',
        title: 'How Kafka works',
        paragraphs: [
          'When a producer sends a record, it chooses a topic and Kafka determines the destination partition. If the record has a key, the producer partitioner uses that key to consistently route related records to the same partition. The producer then sends the record to the broker that leads that partition.',
          'The record is appended to the end of the partition log and receives an offset. Consumers do not delete the record when they read it. They track their progress by committing offsets.',
          'This separation between storage and consumption is what makes replay possible. A new consumer group can start from the beginning of the retained log, or an existing consumer can move its position backward during recovery or reprocessing.',
        ],
        diagram: 'partitions',
        code: {
          language: 'bash',
          label: 'Produce keyed records',
          code: [
            'kafka-console-producer --bootstrap-server localhost:9092 \\',
            '  --topic orders \\',
            '  --property "parse.key=true" \\',
            '  --property "key.separator=:"',
            '',
            '> user-42:order-created',
            '> user-42:payment-authorized',
          ].join('\n'),
        },
      },
      {
        id: 'consumer-groups',
        title: 'Consumer groups and offsets',
        paragraphs: [
          'A consumer group is a set of consumers cooperating to process a topic. Within a group, a partition is assigned to at most one active consumer at a time. This lets you add consumers to increase parallelism.',
          'The ceiling is the partition count: with three partitions, one group can have three actively useful consumers. Adding a fourth consumer does not create a fourth unit of partition-level parallelism.',
          'Offsets make this cooperative processing resumable. After processing records, a consumer commits its position. When a consumer crashes and later restarts, it can resume from the last committed offset.',
        ],
        diagram: 'consumer-group',
      },
      {
        id: 'replication',
        title: 'Replication and broker failures',
        paragraphs: [
          'Kafka can replicate each partition across multiple brokers. One replica acts as the leader for normal client traffic while the other replicas follow the leader and maintain copies of the partition log.',
          'Replication is what lets Kafka survive a broker failure without losing the entire partition. When the leader fails, an in-sync follower can be promoted to serve as the new leader.',
          'For durability-sensitive workloads, producer acknowledgement settings and the topic replication factor matter together. A common production baseline is replication factor 3 with acknowledgements configured so the producer does not treat a message as safely written too early.',
        ],
        diagram: 'replication',
        callout: {
          title: 'Mental model',
          text: 'Partition = ordered log. Replica = another copy of that log. Leader = the replica currently serving normal writes.',
        },
      },
      {
        id: 'queue-vs-stream',
        title: 'Kafka as a queue vs a stream',
        paragraphs: [
          'Kafka can be used as a work queue or as an event stream. The underlying storage model is the same; the difference is how consumers use it.',
          'In a queue-like pattern, consumers in one group divide the work so each partition is processed by one consumer in that group. In a stream-like pattern, multiple independent groups can read the same retained events for different purposes.',
        ],
        bullets: [
          'Use queue-style consumption when one logical workload should be distributed across workers.',
          'Use stream-style consumption when several independent systems should react to the same events.',
          'Remember that Kafka retention keeps records according to policy; reading a record does not remove it from the log.',
        ],
      },
      {
        id: 'when-to-use',
        title: 'When should you use Kafka?',
        paragraphs: [
          'Kafka is particularly useful when the producer and consumer should be decoupled, when you need high-throughput asynchronous processing, or when several downstream consumers need the same event stream.',
        ],
        bullets: [
          'Asynchronous processing: accept an event now and process it later.',
          'Independent scaling: producers and consumers can scale at different rates.',
          'Replay: rebuild downstream state from retained events.',
          'Multiple consumers: analytics, notifications, search indexing, and other systems can independently consume the same events.',
        ],
        callout: {
          title: 'Do not use Kafka as a blob store',
          text: 'For large files such as videos or images, store the blob in object storage and put a small reference to it in Kafka. Kafka should carry events, not become your primary file storage layer.',
        },
      },
      {
        id: 'scaling',
        title: 'Scaling Kafka',
        paragraphs: [
          'Kafka scales horizontally through both brokers and partitions. Adding brokers increases cluster capacity, but the topic also needs enough partitions to exploit that capacity.',
          'Partitioning strategy is usually the most important design choice. A good key spreads traffic while preserving ordering for entities that need it. A bad key can create a hot partition where one partition receives a disproportionate share of traffic.',
        ],
        subsections: [
          {
            title: 'The partition key trade-off',
            paragraphs: [
              'Suppose an orders topic is keyed by customer ID. All events for one customer remain ordered, which is useful when state transitions must be processed sequentially. But if one customer becomes dramatically hotter than everyone else, that key can become a bottleneck.',
              'Removing the key can improve distribution when ordering is irrelevant. Salting or composing the key can also spread a hot entity across several partitions, but those approaches complicate downstream aggregation and ordering.',
            ],
          },
        ],
      },
      {
        id: 'retries-and-failures',
        title: 'Retries and failed consumers',
        paragraphs: [
          'Kafka producers can retry transient send failures. Consumers are different: Kafka does not automatically give your application a full retry and dead-letter workflow, so production systems commonly model retries using additional topics.',
          'A failed record can move to a retry topic and be attempted again later. Messages that repeatedly fail can be isolated in a dead-letter topic so operators can inspect and replay them without blocking the main consumer.',
        ],
        diagram: 'retry',
      },
      {
        id: 'performance',
        title: 'Performance fundamentals',
        paragraphs: [
          'Kafka throughput depends on more than raw broker hardware. Batching, compression, partition count, message size, replication, producer acknowledgements, and consumer parallelism all affect the result.',
          'The simplest mental model is to optimize for useful work per network and disk operation: batch related records, keep messages reasonably small, compress when it helps, and distribute traffic across partitions without creating ordering problems.',
        ],
        code: {
          language: 'javascript',
          label: 'Consume from a group',
          code: [
            "const consumer = kafka.consumer({ groupId: 'orders-workers' });",
            '',
            'await consumer.subscribe({ topic: \'orders\' });',
            '',
            'await consumer.run({',
            '  eachMessage: async ({ partition, message }) => {',
            '    console.log(partition, message.value?.toString());',
            '  },',
            '});',
          ].join('\n'),
        },
      },
      {
        id: 'summary',
        title: 'Summary',
        paragraphs: [
          'Kafka is easier to reason about once you stop thinking of it as a mysterious messaging product and start thinking of it as a distributed, replicated append-only log.',
          'Topics organize streams. Partitions provide ordering and parallelism. Producers append records. Consumers read them and track offsets. Consumer groups distribute partitions across workers. Replication keeps partitions available when brokers fail.',
          'From there, most advanced Kafka discussions reduce to a few recurring trade-offs: how to partition data, how much durability you need, how to handle slow or failing consumers, and how to preserve useful throughput without sacrificing the guarantees your application actually needs.',
        ],
        callout: {
          title: 'What to remember',
          text: 'Choose the partition key for the ordering you need. Use partitions for parallelism. Use consumer groups for workload sharing. Use independent groups for fan-out. Treat replication and acknowledgement settings as durability controls.',
        },
      },
    ],
    knowledgeCheck: [
      'Why does Kafka guarantee ordering within a partition but not across an entire topic?',
      'Why can adding more consumers stop improving throughput even though the consumer code is perfectly parallel?',
      'What happens to a Kafka record after a consumer reads it?',
    ],
  },
};

export function getArticle(slug) {
  return articles.find((article) => article.slug === slug);
}

export function getArticleContent(slug) {
  return articleContent[slug] || null;
}

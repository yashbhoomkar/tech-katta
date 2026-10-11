export const kafkaAdvancedSections = [
  {
    id: "delivery-semantics",
    title: "Delivery semantics: what happens when things fail?",
    paragraphs: [
      "The offset model creates an important failure window: a consumer can process a record successfully and then crash before committing its offset. After restart, Kafka can deliver that record again. Kafka therefore gives you building blocks for different delivery guarantees; your application design determines the end-to-end guarantee.",
      "At-most-once means the consumer commits before processing. A crash after the commit can lose the record, but a successful record is not intentionally processed again. At-least-once means processing happens before the offset is committed. A crash between those operations can cause duplicates, so the usual production approach is to make the consumer operation idempotent.",
      "Exactly-once is narrower than saying code can never run twice. Kafka can provide exactly-once processing for supported Kafka-to-Kafka workflows using idempotent producers and transactions. For external databases or APIs, you still need an application-level strategy such as idempotency keys, transactional outbox/inbox patterns, or deduplication."
    ],
    bullets: [
      "At-most-once: commit first, so loss is possible but duplicate processing is minimized.",
      "At-least-once: process first, so duplicates are possible and idempotent consumers are important.",
      "Exactly-once: transactional/idempotent processing within supported Kafka boundaries; external side effects need their own correctness strategy.",
      "Idempotent producer: producer retries do not create duplicate records in the Kafka log.",
      "Idempotent consumer: safely handles the same event more than once, usually through repeat-safe side effects or event-ID deduplication."
    ],
    callout: {
      title: "The important distinction",
      text: "Processed and committed are two different events. The gap between them is where duplicate processing comes from."
    }
  },
  {
    id: "consumer-rebalancing",
    title: "Consumer groups and rebalancing",
    paragraphs: [
      "Scaling a consumer group is not free. When a consumer joins, leaves, crashes, or the subscribed partitions change, Kafka may need to redistribute partition ownership. That process is a rebalance.",
      "A rebalance changes which consumer owns which partitions. Applications need to handle partition ownership changing underneath them, and poorly bounded processing can cause delays or duplicate work around commits and failures.",
      "Kafka 4.0 introduced the next-generation consumer rebalance protocol, KIP-848, designed to make rebalances more incremental and reduce the disruption of the older stop-the-world model. The system-design lesson remains the same: consumer membership is dynamic."
    ],
    bullets: [
      "Keep processing bounded so a consumer does not hold a partition indefinitely.",
      "Commit offsets deliberately around your processing boundary.",
      "Treat partition assignment as temporary ownership, not permanent ownership.",
      "Monitor rebalance frequency and consumer lag; frequent rebalances are operational signals."
    ]
  },
  {
    id: "durability-and-failure",
    title: "Durability: RF, ISR, acks, and leader failure",
    paragraphs: [
      "Replication factor (RF) tells Kafka how many copies of a partition it should maintain. If RF=3, there can be three replicas distributed across brokers, normally with one leader and two followers.",
      "The ISR, or in-sync replica set, is the subset of replicas considered sufficiently caught up. With acks=all, the producer waits for the leader and all currently in-sync replicas to acknowledge the record. min.insync.replicas=2 can prevent Kafka from accepting an acks=all write when only one replica remains in sync.",
      "This is a durability policy, not a magic no-data-loss switch. Network failures, disk failures, operator actions, and configuration choices still matter. Unclean leader election can trade consistency for availability by allowing an out-of-sync replica to become leader, potentially losing records that existed only on the old leader."
    ],
    diagram: "replication",
    callout: {
      title: "A concrete baseline",
      text: "RF=3 + acks=all + min.insync.replicas=2 is a common starting point for durability-sensitive workloads. Tune it for your actual failure and availability requirements."
    }
  },
  {
    id: "partition-key-trap",
    title: "The partition-count trap",
    paragraphs: [
      "A keyed producer can consistently route records with the same key to the same partition while the topic has a fixed partition count. That is why the sports example can use match ID as its key and preserve per-match ordering.",
      "But the mapping depends on the partition count. If you add partitions later, the producer may map a key to a different partition. Existing records remain where they were, while new records for the same key can land elsewhere. The result can be a surprising loss of per-key ordering across the old and new partitions.",
      "This is why partition count is an architectural decision. Increase it when you need more parallelism, but understand the ordering and routing consequences before changing it on a keyed topic."
    ],
    callout: {
      title: "Production trap",
      text: "Same key to same partition is only a stable routing guarantee while the partition count remains fixed."
    }
  },
  {
    id: "retention-and-compaction",
    title: "Retention and log compaction",
    paragraphs: [
      "Kafka retention is not limited to keeping records for N days. Topics can be configured around time and size limits, while log compaction provides a different policy: Kafka keeps the latest value for each key rather than retaining every historical value forever.",
      "Compacted topics are useful for state-like streams such as customer profiles, configuration, or latest account state. A tombstone is a record with a key and a null value that tells the compaction process that the key should eventually be removed from the compacted log.",
      "Retention and compaction solve different problems. Retention answers how long records remain available under time and size policies; compaction answers which records are worth keeping when the topic represents the latest state per key."
    ]
  },
  {
    id: "why-kafka-is-fast",
    title: "Why Kafka is fast",
    paragraphs: [
      "Kafka is fast partly because its workload matches the strengths of modern operating systems and storage. Producers append sequentially to logs instead of constantly updating arbitrary locations, and consumers read sequentially through those logs. The operating-system page cache can keep hot data in memory without Kafka having to manage a separate application-level cache for every read.",
      "Kafka also relies heavily on batching and efficient network transfer. Producers can accumulate records with batch.size and linger.ms, while compression.type can reduce network and disk traffic. Larger batches can improve throughput but add latency, and compression trades CPU for lower I/O.",
      "The result is not simply fast disks. Its performance comes from sequential I/O, batching, page-cache behavior, efficient transfer paths, partition-level parallelism, and workload-aware compression."
    ],
    code: {
      language: "properties",
      label: "Producer tuning examples",
      code: "acks=all\nlinger.ms=5\nbatch.size=131072\ncompression.type=zstd\nenable.idempotence=true"
    }
  },
  {
    id: "modern-kafka",
    title: "Modern Kafka: KRaft and share groups",
    paragraphs: [
      "If you learn Kafka today, learn the modern architecture. Kafka 4.0 removed ZooKeeper mode; clusters use KRaft, where Kafka controllers manage cluster metadata using a Raft-based quorum. Older tutorials may still show ZooKeeper, but that is legacy architecture rather than the current Kafka 4.x model.",
      "Kafka 4.2 also made share groups production-ready. Unlike traditional consumer groups, share groups allow cooperative consumption where records are not permanently assigned one-per-partition to a single consumer. They add per-record acknowledgement and delivery-attempt tracking, making them relevant to queue-like workloads where per-record work distribution matters more than ordered stream processing.",
      "This does not make traditional consumer groups obsolete. Use consumer groups when partition ownership and ordered stream processing are the right model; consider share groups when your workload is fundamentally closer to a distributed work queue and the ordering model permits it."
    ]
  }
];

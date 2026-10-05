export const distributedSystemsConcepts = {
  introduction: [
    'A distributed system is not simply an application running on multiple machines. The interesting part is that those machines must cooperate even though communication is imperfect and failures can happen independently.',
    'This chapter builds the vocabulary behind distributed systems through concrete problems. Start with a simple example—an online store—and keep asking the same question: what changes when the work is no longer happening inside one process on one machine?'
  ],
  sections: [
    {
      id: 'what-is-a-distributed-system',
      title: '1. What is a distributed system?',
      paragraphs: [
        'Imagine a small online store running as one application on one server. The application handles HTTP requests, talks to a database, processes payments, and sends emails. It is simple to reason about because most state and execution are local.',
        'Now traffic grows. You put three API servers behind a load balancer, move the database to another machine, put payments in a separate service, and add a message broker for asynchronous work. The application is now a distributed system: multiple independent computers communicate over a network to provide one logical service.',
        'The important word is independent. Each machine has its own CPU, memory, storage, clock, and failure mode. There is no shared memory that makes the entire system behave like one giant process.'
      ],
      bullets: [
        'We distribute work to scale beyond one machine.',
        'We replicate state so a machine failure does not necessarily take the service down.',
        'We separate components so they can evolve and scale independently.',
        'We place computation closer to users when geographic latency matters.'
      ],
      code: {
        language: 'text',
        label: 'From one process to a distributed system',
        code: 'Before:\nClient → Application → Database\n\nAfter:\nClient → Load Balancer → API servers\n                         ↓\n                    Database cluster\n                         ↓\n                       Cache\n                         ↓\n                       Queue'
      },
      callout: {
        title: 'Mental model',
        text: 'A distributed system is a collection of independent computers that cooperate over a network to provide a service.'
      }
    },
    {
      id: 'communication',
      title: '2. Communication between machines',
      paragraphs: [
        'Once work is split across machines, those machines need to communicate. A service might call another service over HTTP or gRPC, publish a message to a queue, or query a database over the network.',
        'The key difference from a function call is that a network call can be delayed, lost, rejected, duplicated, or answered after the caller has already timed out. The caller therefore needs an explicit policy for what to do when communication does not behave normally.',
        'A common pattern is timeout → retry with backoff → stop retrying after a bounded number of attempts. But retries can create duplicate work, so the operation should be idempotent whenever possible.'
      ],
      code: {
        language: 'text',
        label: 'Example: order → payment',
        code: 'Order Service\n      │\n      │ POST /payments\n      ▼\nPayment Service\n      │\n      └── 800 ms response\n\nWhat if the caller timeout is 500 ms?\nDid the payment fail—or did the response arrive late?'
      },
      callout: {
        title: 'The distributed-systems twist',
        text: 'A timeout tells you that you did not receive a response in time. It does not necessarily tell you whether the remote operation happened.'
      }
    },
    {
      id: 'latency-and-time',
      title: '3. Latency and time',
      paragraphs: [
        'In a single process, a function call might take microseconds. Across machines, a request must travel through a network, be processed by another service, possibly wait for a database, and travel back. Latency becomes part of the system design.',
        'Average latency can hide serious problems. Suppose 99 requests finish in 20 ms and one takes 2 seconds. The average may still look acceptable while one user experiences a very slow request. This is why production systems commonly track percentiles such as p50, p95, and p99.',
        'Time is also difficult because different machines do not share a perfectly synchronized clock. Clock skew matters when timestamps are used to order events or determine whether something has expired.'
      ],
      code: {
        language: 'text',
        label: 'Tail latency example',
        code: '100 requests\n\n99 requests → 20 ms\n 1 request  → 2000 ms\n\np50 = 20 ms\np99 ≈ 2000 ms'
      },
      callout: {
        title: 'Think about the tail',
        text: 'For a distributed request that fans out to many services, the slowest dependency can dominate the end-to-end latency.'
      }
    },
    {
      id: 'failures',
      title: '4. Failures and fault tolerance',
      paragraphs: [
        'The defining difficulty of distributed systems is partial failure. One component can fail while the rest of the system continues running.',
        'For example, three API servers may be healthy while one database replica is unreachable. Or a payment service may be alive but responding so slowly that callers begin timing out. The system has to decide whether to retry, fail over, degrade the response, or reject the request.',
        'Fault tolerance means designing the system so that expected failures do not automatically become total system failures. Redundancy, timeouts, health checks, retries, circuit breakers, and failover are all tools for managing failure.'
      ],
      bullets: [
        'Crash failure: a process or machine stops responding.',
        'Network failure: messages cannot reach their destination.',
        'Slow failure: a component responds, but too slowly to be useful.',
        'Network partition: groups of machines cannot communicate with one another.'
      ],
      code: {
        language: 'text',
        label: 'Partial failure',
        code: 'API-1 ─────── Database ─────── API-2\n  ✓                         ✓\n                X\n          Replica-2 unreachable\n\nThe whole system is not necessarily down.'
      }
    },
    {
      id: 'replication',
      title: '5. Replication',
      paragraphs: [
        'Replication means maintaining multiple copies of data or service state. Its primary purposes are availability, durability, and sometimes read scalability.',
        'Consider a database with one primary and two replicas. A write goes to the primary and is copied to the replicas. If the primary fails, one replica can become the new primary. The trade-off is that asynchronous replicas can lag behind the primary, so a recently written value might not immediately appear everywhere.',
        'Replication can be synchronous or asynchronous. Synchronous replication waits for required replicas before confirming the operation; asynchronous replication can acknowledge sooner but leaves a larger window where a failure can lose the newest copy.'
      ],
      code: {
        language: 'text',
        label: 'Leader–follower replication',
        code: '                 ┌── Replica A\nClient → Leader ──┤\n                 └── Replica B\n\nLeader fails\n       ↓\nReplica A can be promoted'
      },
      callout: {
        title: 'Replication is not free',
        text: 'More copies improve resilience, but they also increase storage, network traffic, coordination, and consistency complexity.'
      }
    },
    {
      id: 'consistency',
      title: '6. Consistency',
      paragraphs: [
        'Replication creates an immediate question: if there are several copies of the same data, what should a read return?',
        'Imagine changing your profile name from Alice to Yash. The write reaches the primary immediately, but a replica is still catching up. If your next read is routed to that replica, you may see Alice for a short time. This is an example of eventual consistency.',
        'Strong consistency provides a stronger guarantee: after a successful write, subsequent reads observe the write according to the system’s consistency contract. Stronger guarantees can require more coordination and can reduce availability or increase latency under failures.'
      ],
      code: {
        language: 'text',
        label: 'Replication lag',
        code: 't0: Write name = Yash → Primary\nt1: Read → Replica → Alice\nt2: Replica catches up\nt3: Read → Replica → Yash'
      },
      bullets: [
        'Strong consistency: reads follow a strong visibility guarantee for completed writes.',
        'Eventual consistency: replicas may temporarily disagree but converge if updates stop.',
        'Read-after-write consistency: a client can observe its own successful write on later reads.'
      ]
    },
    {
      id: 'partitioning',
      title: '7. Partitioning and sharding',
      paragraphs: [
        'Replication creates copies; partitioning splits data into different pieces. If one database cannot hold or process the workload, we can distribute different records across multiple machines.',
        'Suppose a platform has one billion users. Instead of storing every user on one database server, a hash of user ID can determine which shard owns the record. Queries for one user can then go directly to the responsible shard.',
        'The difficult part is choosing the partition key. A bad key can create a hot partition, while changing the partition scheme later can require expensive data movement and can affect ordering or routing guarantees.'
      ],
      code: {
        language: 'text',
        label: 'Hash-based sharding',
        code: 'userId → hash(userId) → shard\n\nuser-101 → Shard 2\nuser-202 → Shard 4\nuser-303 → Shard 1\nuser-404 → Shard 2'
      },
      callout: {
        title: 'Partitioning vs replication',
        text: 'Partitioning answers “which machine owns this data?” Replication answers “how many copies of that data should exist?” Real systems often use both.'
      }
    },
    {
      id: 'ordering-and-causality',
      title: '8. Ordering and causality',
      paragraphs: [
        'When events travel through different machines, they can arrive in a different order from the order in which they were produced. A payment service might emit PaymentCompleted while another consumer has not yet observed OrderCreated.',
        'Sometimes ordering is required only for one entity. For example, all events for one bank account should be processed in order, while events for different accounts can be processed concurrently. This is much easier to scale than requiring one global order for every event.',
        'Distributed systems therefore distinguish between local ordering, per-key ordering, and global ordering. Logical clocks such as Lamport clocks provide a way to reason about causality without assuming perfectly synchronized physical clocks.'
      ],
      code: {
        language: 'text',
        label: 'Per-key ordering',
        code: 'Account A:  deposit → withdrawal → transfer\nAccount B:  deposit → transfer\n\nA and B can progress concurrently.\nA’s events still need their own order.'
      }
    },
    {
      id: 'quorums',
      title: '9. Quorums',
      paragraphs: [
        'A quorum is a rule that requires agreement from enough replicas before an operation is considered successful. It is a common way to balance availability and consistency in replicated systems.',
        'Suppose there are three replicas. A write quorum of two means a write needs acknowledgements from at least two replicas. A read quorum of two means a read consults at least two replicas. Because the two sets must overlap, a read can often observe the latest value under the system’s assumptions.',
        'Quorum rules are not a substitute for understanding the database’s actual consistency model. The meaning of a successful quorum depends on how replicas, timestamps, conflicts, and failures are handled.'
      ],
      code: {
        language: 'text',
        label: 'Simple quorum example',
        code: 'N = 3 replicas\nW = 2 replicas required for write\nR = 2 replicas required for read\n\nR + W > N\n2 + 2 > 3\n\nThe read and write quorums overlap.'
      }
    },
    {
      id: 'consensus',
      title: '10. Consensus and leader election',
      paragraphs: [
        'Consensus is the problem of getting distributed nodes to agree on a value or sequence of decisions despite failures and delayed messages. It is harder than simply voting because nodes can fail at inconvenient times and cannot instantly know whether another node is dead or merely slow.',
        'Leader election is a common application. Imagine three servers that coordinate scheduled jobs. If all three think they are the leader, a job could run three times. A consensus protocol such as Raft helps the cluster agree on one leader and a replicated sequence of decisions.',
        'Consensus usually relies on a majority. With five nodes, a majority is three. If two nodes fail, the remaining three can still make progress; if three fail, the cluster no longer has a majority.'
      ],
      code: {
        language: 'text',
        label: 'Raft-style majority',
        code: 'Node A   Node B   Node C   Node D   Node E\n  ✓        ✓        ✓        X        X\n\n3 / 5 = majority\nCluster can continue.'
      },
      callout: {
        title: 'Do not confuse consensus with replication',
        text: 'Replication creates copies. Consensus coordinates which decisions are accepted and in what order. Many distributed databases use both.'
      }
    },
    {
      id: 'distributed-transactions',
      title: '11. Distributed transactions',
      paragraphs: [
        'A local database transaction can atomically update several rows because one database controls the operation. A distributed transaction is harder because the participating resources are independent.',
        'Consider placing an order. The system needs to reserve inventory and charge the customer. What happens if payment succeeds but the inventory service fails? The system needs a strategy for reaching a correct business outcome.',
        'Two-phase commit coordinates a prepare phase and a commit phase across participants, but it can block around coordinator failures. The Saga pattern takes a different approach: each service commits its local transaction and later actions compensate for failures when necessary.'
      ],
      code: {
        language: 'text',
        label: 'Order workflow',
        code: 'Create Order\n    ↓\nReserve Inventory\n    ↓\nCharge Payment\n    ↓\nConfirm Order\n\nFailure after payment?\n→ compensate/refund according to business rules'
      }
    },
    {
      id: 'coordination',
      title: '12. Distributed coordination',
      paragraphs: [
        'Sometimes independent machines need to agree on ownership or membership. Examples include electing one leader, ensuring only one worker performs a scheduled task, or discovering which nodes are currently part of a cluster.',
        'Distributed locks and leases are common coordination mechanisms. A lock says that one participant owns a resource; a lease adds an expiry so ownership can eventually disappear if the holder stops renewing it.',
        'Coordination is dangerous when treated as a simple mutex. Network delays and pauses can make a process believe it still owns something when another process has already taken over. Correct designs therefore use fencing, epochs, or other mechanisms where stale owners could cause damage.'
      ],
      code: {
        language: 'text',
        label: 'Leader-based coordination',
        code: 'Worker A ─┐\nWorker B ─┼→ Coordination service → Leader = B\nWorker C ─┘\n\nOnly B should perform the singleton job.'
      }
    },
    {
      id: 'cap-theorem',
      title: '13. CAP theorem',
      paragraphs: [
        'CAP becomes useful only after you understand replication, consistency, and network partitions. The theorem describes a fundamental trade-off that appears when a partition prevents parts of a distributed system from communicating.',
        'Consistency means that operations observe a single coherent view according to the chosen consistency guarantee. Availability means requests receive a response rather than being rejected indefinitely. Partition tolerance means the system continues operating despite communication failures between nodes.',
        'A network partition is not a theoretical edge case. Networks fail, links break, and machines become unreachable. When a partition occurs, a system that cannot sacrifice consistency may reject some operations; a system that prioritizes availability may allow divergent states that converge later.'
      ],
      code: {
        language: 'text',
        label: 'Partition scenario',
        code: '        Network partition\n              X\n        ───────────────\n        Node A       Node B\n\nA cannot safely know what B has accepted.\n\nCP → preserve consistency, potentially reject requests\nAP → keep serving, potentially allow temporary divergence'
      },
      callout: {
        title: 'CAP is not “pick any two”',
        text: 'The useful CAP question is what your system does when a partition actually occurs: does it prefer rejecting some operations to preserve consistency, or continuing to serve with weaker consistency?'
      }
    }
  ],
  summary: 'Distributed systems become easier to reason about when every problem is connected to a concrete failure or scaling constraint. Communication introduces latency and uncertainty; replication introduces consistency questions; partitioning introduces routing and rebalancing; failures introduce the need for fault tolerance; and coordination introduces consensus and ownership problems. These concepts are the foundation for understanding components such as Kafka, Redis, distributed databases, and coordination systems—and for designing systems that continue working when individual machines do not.',
  knowledgeCheck: [
    'Why is a network call fundamentally different from a local function call?',
    'What is the difference between replication and partitioning?',
    'Why can a distributed system be partially failed without being completely down?',
    'Why does a bad partition key create a hot partition?',
    'What problem does consensus solve that simple replication does not?',
    'During a network partition, what trade-off does CAP force the system to make?'
  ]
};

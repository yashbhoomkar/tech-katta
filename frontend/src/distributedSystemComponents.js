export const distributedSystemComponents = {
  "introduction": [
    "Chapter 1 established the hard problems: machines communicate over unreliable networks, replicas can disagree, failures are partial, and coordination is expensive. Chapter 2 turns those primitives into the components engineers actually assemble into a production system.",
    "The useful way to learn these components is not to memorize product names. Trace one request from the edge to compute, from compute to cache and database, and then out to asynchronous workers, storage, and observability. At every hop, ask what state lives there, what happens when it fails, and whether it is on the critical path."
  ],
  "sections": [
    {
      "id": "architecture-at-a-glance",
      "title": "1. The production request path",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A typical internet-facing distributed application has an edge layer, a traffic-routing layer, stateless compute, stateful data services, asynchronous processing, and an observability/control plane. The exact products vary, but the responsibilities recur.",
            "A useful mental model is: DNS finds an entry point, an edge proxy or gateway applies policy, a load balancer selects a healthy compute target, the application reads or writes state, and slow or non-critical work moves onto an asynchronous path."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "A common architecture",
          "code": "User\n  │\n  ▼\nDNS / CDN / Edge\n  │\n  ▼\nReverse Proxy / API Gateway\n  │\n  ▼\nLoad Balancer\n  │\n  ├──────────► API-1\n  ├──────────► API-2\n  └──────────► API-3\n                  │\n         ┌────────┼────────┐\n         ▼        ▼        ▼\n       Cache   Database   Message Broker\n                           │\n                           ▼\n                         Workers\n\nCross-cutting: observability + configuration + coordination"
        },
        {
          "type": "callout",
          "title": "The key question",
          "text": "Every component exists because one responsibility has a different scaling, latency, durability, failure, or ownership requirement."
        }
      ]
    },
    {
      "id": "stateless-compute",
      "title": "2. Stateless compute",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Stateless application servers are the easiest compute units to scale horizontally. If API-1 and API-2 can handle the same request without depending on memory that exists only inside one process, a load balancer can send traffic to either instance.",
            "The goal is not that the application has no state. The goal is that request-critical state is stored in shared systems rather than hidden inside one process. Authentication sessions, shopping carts, workflow state, and other durable data often belong in a database, cache, or token.",
            "Statelessness also makes deployment easier. An instance can be drained, replaced, or restarted without taking an irreplaceable piece of application state with it."
          ]
        },
        {
          "type": "list",
          "items": [
            "Good candidate for local process state: connection pools, immutable configuration snapshots, short-lived memoization.",
            "Bad candidate for local-only state: durable user sessions, orders, payment state, or work that another instance must continue after a crash.",
            "Sticky sessions can reduce cross-instance movement, but they also make scaling and failure recovery more dependent on a particular backend."
          ]
        },
        {
          "type": "code",
          "language": "javascript",
          "label": "Keep request state outside the process",
          "code": "app.get('/cart', async (req, res) => {\n  const cart = await redis.get(`cart:${req.user.id}`);\n  res.json(JSON.parse(cart ?? '[]'));\n});"
        }
      ]
    },
    {
      "id": "load-balancer",
      "title": "3. Load balancers",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A load balancer presents a stable entry point while distributing traffic across multiple targets. AWS Elastic Load Balancing, for example, routes requests to registered targets and uses health checks so unhealthy targets stop receiving normal traffic.",
            "Load balancing can happen at different layers. Layer-4 load balancing reasons mainly about connections and transport protocols; layer-7 load balancing can inspect HTTP-level properties such as hostnames, paths, and headers.",
            "The important production detail is that a load balancer is not just a round-robin loop. It is also part of failure detection and connection management. A target can be alive enough to answer a health probe yet still be overloaded for real traffic, so health checks themselves need careful design."
          ]
        },
        {
          "type": "table",
          "headers": [
            "Decision",
            "Question to answer"
          ],
          "rows": [
            [
              "Routing algorithm",
              "Round robin, least connections, weighted, or latency-aware?"
            ],
            [
              "Health checks",
              "What endpoint proves the instance is ready for real traffic?"
            ],
            [
              "Connection draining",
              "How are in-flight requests handled when removing a target?"
            ],
            [
              "TLS termination",
              "Should encryption end at the balancer or continue to the backend?"
            ],
            [
              "Session affinity",
              "Do requests really need to stay on one backend?"
            ]
          ]
        },
        {
          "type": "callout",
          "title": "Operational trap",
          "text": "A health check should represent readiness to serve the dependency that matters, not merely whether the process responds with HTTP 200."
        }
      ]
    },
    {
      "id": "reverse-proxy-gateway",
      "title": "4. Reverse proxies, ingress, and API gateways",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A reverse proxy sits in front of servers and forwards client traffic to upstreams. Nginx is a classic example. An ingress controller performs a similar edge-routing role inside a container platform: Kubernetes Ingress can map host and path rules to Services, terminate TLS, and participate in load balancing.",
            "An API gateway goes one level beyond simple proxying. It is often the policy boundary for authentication, authorization, throttling, API versioning, request transformation, and observability. AWS describes API Gateway as a front door to backend services with traffic management, authorization, monitoring, and API version management.",
            "These roles can be combined in one product or split across multiple layers. The engineering question is where each policy belongs so that you do not build a fragile pile of duplicated routing logic."
          ]
        },
        {
          "type": "code",
          "language": "nginx",
          "label": "Simple reverse-proxy routing",
          "code": "upstream api_pool {\n    server api-1:8080;\n    server api-2:8080;\n    server api-3:8080;\n}\n\nserver {\n    listen 443 ssl;\n\n    location /api/ {\n        proxy_pass http://api_pool;\n    }\n}"
        },
        {
          "type": "callout",
          "title": "Do not confuse the layers",
          "text": "A load balancer answers “which target gets this traffic?” An API gateway answers a broader policy question: “is this request allowed, how should it be shaped, limited, routed, and observed?”"
        }
      ]
    },
    {
      "id": "service-discovery",
      "title": "5. Service discovery",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Once there are dozens or hundreds of service instances, hard-coding IP addresses stops working. Service discovery maps a stable service identity to the currently usable endpoints.",
            "Kubernetes provides a concrete example: a Service gets a stable virtual endpoint while the Pods behind it can change. Cluster DNS lets a workload resolve a Service by name instead of tracking Pod IPs manually. A headless Service can instead expose the individual Pod addresses when the client needs endpoint-level awareness.",
            "Discovery and load balancing are related but distinct. Discovery answers where the service instances are. Load balancing chooses which usable instance should receive a request. Some clients combine both responsibilities, as gRPC does through name resolution and configurable client-side load-balancing policies."
          ]
        },
        {
          "type": "code",
          "language": "yaml",
          "label": "Kubernetes Service identity",
          "code": "apiVersion: v1\nkind: Service\nmetadata:\n  name: payments\nspec:\n  selector:\n    app: payments\n  ports:\n    - port: 80\n      targetPort: 8080"
        },
        {
          "type": "callout",
          "title": "The production reality",
          "text": "Endpoint membership changes. Discovery therefore needs a way to publish additions, removals, and health-related changes without forcing every client to redeploy."
        }
      ]
    },
    {
      "id": "caching",
      "title": "6. Caches",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A cache keeps a subset of data in a faster layer so the application avoids repeated work against a slower source of truth. Redis documents cache-aside as a common pattern: read the cache, fall back to the primary on a miss, then populate the cache with a bounded lifetime.",
            "Caching is a performance component, but it is also a consistency component. Every cached value creates a question: how stale may this value be? The answer determines TTLs, invalidation, versioning, or whether the data should be cached at all.",
            "Distributed caches can also fail in ways that hurt the very system they were supposed to protect. A popular-key expiration can cause a cache stampede, where many application instances miss simultaneously and overload the database. Cache failures therefore need fallbacks, bounded retries, and load-shedding strategies."
          ]
        },
        {
          "type": "code",
          "language": "javascript",
          "label": "Cache-aside",
          "code": "const cached = await redis.get(`product:${id}`);\nif (cached) return JSON.parse(cached);\n\nconst product = await db.products.findById(id);\nawait redis.set(\n  `product:${id}`,\n  JSON.stringify(product),\n  { EX: 60 }\n);\n\nreturn product;"
        },
        {
          "type": "table",
          "headers": [
            "Pattern",
            "Write path",
            "Typical trade-off"
          ],
          "rows": [
            [
              "Cache-aside",
              "App writes source of truth; cache fills on miss",
              "Simple, but invalidation/stampede remain application concerns"
            ],
            [
              "Write-through",
              "Write cache and source as one application operation",
              "Fresh cache, but more write coordination"
            ],
            [
              "Prefetch",
              "Separate pipeline keeps cache warm",
              "Fast reads, but sync lag becomes a correctness concern"
            ],
            [
              "Local + shared",
              "Small in-process cache in front of distributed cache",
              "Very fast hits, but more invalidation complexity"
            ]
          ]
        },
        {
          "type": "callout",
          "title": "Cache is not the source of truth",
          "text": "Unless you deliberately design it otherwise, a cache should be treated as an optimization whose failure must not destroy durable state."
        }
      ]
    },
    {
      "id": "databases",
      "title": "7. Databases: system of record vs read scale",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "The database is often the system of record: the place where durable business state lives. Once traffic grows, engineers usually separate the write path from read scale using replicas, caching, partitioning, or a different storage model.",
            "A read replica can reduce load on the primary, but it may lag. That makes “can we read from a replica?” a consistency decision rather than a simple performance switch.",
            "Connection management is another distributed-systems problem. Ten application instances each holding 100 database connections can create a 1,000-connection load on the database. Horizontal scaling of the application therefore requires connection-pool sizing as well."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "Typical read/write split",
          "code": "Write request\n    │\n    ▼\nPrimary / Leader\n    │\n    ├────────► Replica A\n    └────────► Replica B\n\nRead request ──► cache ──miss──► replica/primary\n\nQuestion: how stale can the read be?"
        },
        {
          "type": "callout",
          "title": "Never hide the consistency contract",
          "text": "A read replica is not “the same database, only faster.” It is another copy with a replication mechanism and therefore a failure and freshness model."
        }
      ]
    },
    {
      "id": "partitioned-databases",
      "title": "8. Partitioned and distributed databases",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Partitioning becomes a database architecture when the dataset or workload is too large for one machine. Records are distributed across shards, usually by a partition key.",
            "The partition key determines more than storage placement. It determines which requests are local, which operations become cross-shard, how evenly load spreads, and how expensive rebalancing will be.",
            "Distributed databases often combine partitioning, replication, and consensus. CockroachDB is a useful example: data is split into ranges and replicated, while Raft-based replication groups coordinate durable updates. That is a very different system from simply placing separate tables on separate servers."
          ]
        },
        {
          "type": "table",
          "headers": [
            "Question",
            "Good partitioning asks"
          ],
          "rows": [
            [
              "Distribution",
              "Does normal traffic spread reasonably evenly?"
            ],
            [
              "Locality",
              "Do common reads and writes stay within one partition?"
            ],
            [
              "Hot keys",
              "Can one tenant, account, or timestamp dominate a partition?"
            ],
            [
              "Rebalancing",
              "Can ownership move without a long outage or huge migration?"
            ],
            [
              "Cross-shard operations",
              "Which queries become distributed transactions or scatter/gather calls?"
            ]
          ]
        },
        {
          "type": "callout",
          "title": "Scaling trap",
          "text": "A database can have plenty of total CPU while one hot partition is saturated. Aggregate capacity is not the same thing as usable per-key capacity."
        }
      ]
    },
    {
      "id": "messaging",
      "title": "9. Message brokers and queues",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A message broker moves work off the synchronous request path. This is valuable when the user does not need the result immediately or when one event must fan out to several independent consumers.",
            "A queue and an event log solve related but different problems. A traditional work queue usually asks one worker to claim a task. Kafka-style logs retain records independently of consumption so multiple consumer groups can replay or process the same events independently.",
            "The central design question is the failure window between receiving a message and completing the side effect. At-least-once processing means duplicates are possible, so consumers often need idempotency keys, deduplication, or transactional boundaries around their effects."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "Synchronous vs asynchronous work",
          "code": "Synchronous:\nClient → API → Payment → Fraud → Email → Response\n\nAsynchronous:\nClient → API → enqueue order.created → Response\n                         │\n                         ├─► Payment worker\n                         ├─► Fraud worker\n                         └─► Email worker"
        },
        {
          "type": "callout",
          "title": "Latency boundary",
          "text": "Moving work to a queue improves request latency only if the user can safely receive a response before that work completes. The API must communicate what “accepted” means."
        }
      ]
    },
    {
      "id": "object-storage",
      "title": "10. Object storage",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Object storage is designed for large immutable or semi-static blobs such as images, videos, backups, build artifacts, and documents. It is fundamentally different from a transactional database.",
            "Amazon S3 is a representative system: AWS documents strong read-after-write consistency for object PUT and DELETE operations, as well as redundant storage across multiple Availability Zones for standard storage classes. The exact guarantees and costs differ by provider, but the architecture pattern is broadly useful.",
            "Applications commonly keep metadata in a database and the large payload in object storage. That keeps database rows small and lets a CDN or direct signed upload path handle large files."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "Store metadata separately from blobs",
          "code": "Database:\ndocument_id = 42\nowner_id = 17\nobject_key = users/17/docs/42.pdf\n\nObject storage:\nusers/17/docs/42.pdf → <large binary>"
        },
        {
          "type": "callout",
          "title": "Security boundary",
          "text": "Do not put large private blobs directly behind application servers unless you have a good reason. Signed URLs or signed upload flows can let the client talk to object storage without turning the API into a file-transfer bottleneck."
        }
      ]
    },
    {
      "id": "coordination-config",
      "title": "11. Coordination, leases, and configuration",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Distributed applications need configuration and coordination that all instances can observe consistently: feature flags, service membership, leader election, locks, leases, and sometimes cluster metadata.",
            "etcd is a useful concrete model. Its APIs expose key-value storage, watches for change notifications, and leases for client liveness. Kubernetes uses etcd underneath its control plane, which makes it a strong example of how a consistent metadata store can become the source of truth for a larger control system.",
            "Keep coordination state separate from ordinary application data when its semantics are different. A product database can store business entities, while a coordination system manages membership, ownership, or configuration changes."
          ]
        },
        {
          "type": "code",
          "language": "bash",
          "label": "Watching configuration changes with etcd",
          "code": "etcdctl --endpoints=$ENDPOINTS watch config/payment/\n\netcdctl --endpoints=$ENDPOINTS put config/payment/timeout-ms 800"
        },
        {
          "type": "callout",
          "title": "Lease warning",
          "text": "Lease expiry is only a liveness signal. When stale clients can still reach a protected resource, ownership must be enforced with generations, epochs, or fencing tokens."
        }
      ]
    },
    {
      "id": "observability",
      "title": "12. Observability: logs, metrics, and traces",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A distributed system can fail in places you did not predict. Observability is therefore not just a dashboard for known metrics; it is the mechanism that lets engineers investigate unknown failure paths.",
            "OpenTelemetry defines a vendor-neutral approach for generating, collecting, and exporting telemetry. Its core signals include traces, metrics, and logs. A trace follows a request across services; metrics quantify behavior over time; logs record individual events and context.",
            "The most important design choice is correlation. A request ID or trace context should travel across service boundaries so an engineer can connect an edge request to the API call, database query, queue publication, and downstream worker."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "One request, many signals",
          "code": "trace_id=abc123\n\nGateway   ── span ──┐\nAPI       ── span ──┼─► Trace: checkout request\nDatabase  ── span ──┤\nKafka     ── event ──┤\nWorker    ── span ──┘\n\nMetrics: p95 latency, error rate, queue lag\nLogs: structured events with trace_id"
        },
        {
          "type": "callout",
          "title": "Observability is part of the architecture",
          "text": "A system that is fast but impossible to debug is not operationally healthy."
        }
      ]
    },
    {
      "id": "rate-limiting-backpressure",
      "title": "13. Rate limiting, backpressure, and circuit breaking",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "A healthy service can become unhealthy when demand exceeds its safe operating capacity. Rate limiting controls how much work enters the system. Backpressure communicates that downstream capacity is constrained. Circuit breakers stop repeatedly calling a dependency that is already failing.",
            "These mechanisms solve different problems. A rate limiter protects an interface from excessive request volume. Backpressure protects a pipeline from queue or consumer overload. A circuit breaker reduces repeated dependency calls during an outage. Good architectures often need all three.",
            "Throttling should not be described as an exact physics law. For example, AWS API Gateway documents throttling as a best-effort target implemented with a token-bucket model, and clients may receive HTTP 429 responses when limits are exceeded."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "Token bucket intuition",
          "code": "Bucket capacity = 100 tokens\nRefill = 20 tokens / second\n\nRequest cost = 1 token\n\n100 available → burst is allowed\n0 available   → request is throttled\n\nThe bucket absorbs short bursts;\nthe refill rate bounds sustained traffic."
        },
        {
          "type": "table",
          "headers": [
            "Mechanism",
            "Protects",
            "Typical response"
          ],
          "rows": [
            [
              "Rate limiting",
              "API / resource capacity",
              "Reject or delay with 429 / retry-after"
            ],
            [
              "Backpressure",
              "Pipeline capacity",
              "Slow producers or bound buffers"
            ],
            [
              "Circuit breaker",
              "Failing dependency",
              "Fail fast while dependency is unhealthy"
            ],
            [
              "Load shedding",
              "Overall system health",
              "Drop non-critical work under saturation"
            ]
          ]
        }
      ]
    },
    {
      "id": "failure-walkthrough",
      "title": "14. One failure, end to end",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Consider a checkout request in which the API layer is healthy but the primary database becomes slow. The impact is not limited to the database. Request latency rises, API threads remain occupied longer, connection pools fill, retries amplify the load, and eventually unrelated endpoints can fail too.",
            "This is a cascading failure. The architecture should contain the blast radius: bounded timeouts, carefully chosen retry policies, circuit breaking, connection-pool limits, load shedding, and enough observability to see the queueing before the whole service collapses."
          ]
        },
        {
          "type": "code",
          "language": "text",
          "label": "Failure propagation",
          "code": "DB latency ↑\n   ↓\nAPI requests stay in-flight longer\n   ↓\nConnection pool fills\n   ↓\nRequests queue / timeout\n   ↓\nClients retry\n   ↓\nTraffic increases while DB is already slow\n   ↓\nCascading failure"
        },
        {
          "type": "list",
          "ordered": true,
          "items": [
            "Bound the timeout at each hop.",
            "Retry only failures that are plausibly transient, with exponential backoff and jitter.",
            "Avoid retrying non-idempotent operations unless the protocol provides an idempotency mechanism.",
            "Trip the circuit when the dependency is demonstrably unhealthy.",
            "Preserve capacity for critical traffic and shed optional work first.",
            "Use metrics and traces to identify the first failing dependency rather than only the final HTTP 500."
          ]
        },
        {
          "type": "callout",
          "title": "The lesson",
          "text": "Distributed failures propagate through queues, pools, retries, and shared dependencies. Capacity management is therefore a system property, not a single-component feature."
        }
      ]
    },
    {
      "id": "real-world-mapping",
      "title": "15. Where the components appear in real systems",
      "blocks": [
        {
          "type": "table",
          "headers": [
            "Responsibility",
            "Representative systems",
            "Typical failure question"
          ],
          "rows": [
            [
              "Edge / CDN",
              "CloudFront, Cloudflare",
              "What happens when an origin is slow or unreachable?"
            ],
            [
              "Load balancing",
              "AWS ALB/NLB, Nginx",
              "Which targets are healthy and how is traffic drained?"
            ],
            [
              "API gateway",
              "AWS API Gateway, Kong",
              "Where are auth, quotas, routing, and API policies enforced?"
            ],
            [
              "Service discovery",
              "Kubernetes Services/DNS, Consul, etcd-backed control planes",
              "How do clients learn that an endpoint was added or removed?"
            ],
            [
              "Cache",
              "Redis, Memcached",
              "How stale can data become and what happens on cache failure?"
            ],
            [
              "Database",
              "PostgreSQL, MySQL, Cassandra, CockroachDB, Spanner",
              "What is the consistency, replication, and partitioning model?"
            ],
            [
              "Messaging",
              "Kafka, SQS, RabbitMQ",
              "Can messages duplicate, reorder, or wait indefinitely?"
            ],
            [
              "Object storage",
              "S3, GCS",
              "How are large payloads stored, secured, versioned, and retrieved?"
            ],
            [
              "Coordination",
              "etcd, ZooKeeper, Consul",
              "How is ownership or membership decided under failure?"
            ],
            [
              "Observability",
              "OpenTelemetry, Prometheus, Grafana",
              "Can one user request be traced across every hop?"
            ]
          ]
        },
        {
          "type": "text",
          "paragraphs": [
            "The table is more important than the product names. When you learn a new technology, first map it to a responsibility: traffic, storage, coordination, messaging, or observability. Then learn the guarantees and failure modes of that implementation."
          ]
        }
      ]
    },
    {
      "id": "designing-composition",
      "title": "16. How to compose the pieces",
      "blocks": [
        {
          "type": "text",
          "paragraphs": [
            "Do not start a system design by selecting products. Start with the request path and the guarantees the business needs. Then choose the smallest set of components that solves the actual constraints.",
            "For example, a small internal service may need only a reverse proxy, two application instances, one database, and monitoring. Adding a distributed cache, Kafka cluster, service mesh, and coordination system before you have those requirements can create more failure modes than it removes.",
            "A useful progression is: scale compute first, separate slow work, cache demonstrably hot reads, replicate data when availability or read scale requires it, partition when one node is no longer sufficient, and introduce stronger coordination only when the correctness requirement demands it."
          ]
        },
        {
          "type": "list",
          "ordered": true,
          "items": [
            "Define latency, durability, consistency, availability, and throughput targets.",
            "Identify the source of truth for each important piece of state.",
            "Keep synchronous request paths short and bounded.",
            "Move independent or slow work to asynchronous processing.",
            "Make failure behavior explicit at every network boundary.",
            "Instrument the path before production traffic makes debugging expensive.",
            "Document the reason every major component exists."
          ]
        },
        {
          "type": "callout",
          "title": "Architecture rule",
          "text": "Every component adds operational cost. A good distributed architecture is not the one with the most boxes; it is the smallest architecture whose guarantees match the workload."
        }
      ]
    }
  ],
  "summary": "Distributed system components are implementations of the primitives from Chapter 1. Load balancers distribute traffic, gateways enforce edge policy, service discovery tracks changing endpoints, caches trade freshness for speed, databases provide durable state, brokers decouple work, object storage holds large blobs, coordination systems manage ownership and metadata, and observability lets engineers understand the whole system. The architecture becomes robust when each component has a clear responsibility, bounded failure behavior, and an explicit consistency and capacity contract.",
  "knowledgeCheck": [
    "Why is stateless compute easier to scale and replace than compute that owns durable request state?",
    "What is the difference between service discovery and load balancing?",
    "Why is a cache a consistency problem as well as a performance optimization?",
    "Why can adding more API instances still overload a database?",
    "When would a message broker be preferable to making a downstream service call synchronously?",
    "Why should large files usually live in object storage instead of a transactional database?",
    "What is the difference between a lease and a fencing token in coordination?",
    "How do rate limiting, backpressure, and circuit breaking protect different parts of a system?",
    "During the checkout failure walkthrough, why can retries make the original database outage worse?",
    "When should you add another distributed component instead of keeping the architecture simpler?"
  ]
};

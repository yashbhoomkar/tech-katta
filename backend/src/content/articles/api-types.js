// Served by the API; edit content here, not in the frontend.
// Block types: see backend/src/content/README.md.
export const article = {
  "section": "concepts",
  "slug": "api-types",
  "no": "CONCEPT // 01",
  "tag": "COMMUNICATION",
  "date": "31 Oct 2026",
  "title": "APIs: the main types, and which one to use where",
  "dek": "Seven ways programs talk to each other, what each one is good at, and how to choose, explained through one food delivery app.",
  "body": [
    {
      "t": "tldr",
      "items": [
        "Two questions decide most API choices: who starts the conversation, and does the caller wait for the answer?",
        "Default to REST. Pick something else only when you can name the reason.",
        "GraphQL when screens need different data. gRPC between your own services. WebSockets or SSE for live updates. Webhooks for events from other companies. Queues for work that can happen later.",
        "Whatever the type: check who is calling, limit the rate, paginate lists, make retries safe, and plan for versions."
      ]
    },
    {
      "t": "example"
    },
    {
      "t": "fig",
      "id": "patterns",
      "cap": "The four patterns behind every API type, inside Zotato. Request/response: the app asks and waits. Open connection: messages flow without new requests (both ways with WebSockets, server to client only with SSE). Callback: the payment provider calls Zotato. Queue: the Order service hands work off and does not wait."
    },
    {
      "t": "h2",
      "x": "The seven types"
    },
    {
      "t": "p",
      "x": "An API is a contract: what one program can ask another for, in what format, and what comes back. REST and gRPC are two styles of request/response: REST names things (`/orders/42`), RPC names actions (`AuthorizePayment`)."
    },
    {
      "t": "type",
      "name": "REST",
      "kind": "REQUEST / RESPONSE",
      "what": "Resources at URLs, HTTP methods to act on them, JSON back.",
      "use": "Public and partner APIs, CRUD, anything other teams integrate with.",
      "avoid": "Screens that need data from many places at once; they end up making many calls.",
      "ex": "Restaurants' billing systems call `GET /orders?status=new` to see orders waiting to be accepted.",
      "more": [
        "Each resource has a URL (`/orders/42`), and the method says what to do: `GET` reads, `POST` creates, `PUT` or `PATCH` changes, `DELETE` removes. Status codes carry the outcome. Every language has an HTTP client, `GET` responses can be cached by browsers and CDNs, and you can debug it with `curl`.",
        "The cost: a screen often needs several calls, or gets more fields than it uses. Changing the shape of a response breaks clients, so you need versioning (`/v2/orders`) and a plan for retiring old versions."
      ]
    },
    {
      "t": "type",
      "name": "GraphQL",
      "kind": "REQUEST / RESPONSE",
      "what": "One endpoint and a typed schema; the client asks for exactly the fields it wants.",
      "use": "Frontends whose screens each need a different slice of data from several services.",
      "avoid": "Simple CRUD, or public APIs where plain HTTP caching matters.",
      "ex": "The home screen gets nearby restaurants, offers and your last three orders in one query.",
      "more": [
        "Queries usually go as a `POST` to one URL, which browsers and CDNs do not cache. Sending them as `GET`, often as persisted queries, brings CDN caching back; many teams cache on the client instead.",
        "A deep or wide query can be very expensive, so servers need depth and cost limits. Resolving each nested field separately causes the N+1 query problem unless you batch lookups. Permissions are checked per field rather than per endpoint, which is flexible and easy to get wrong."
      ]
    },
    {
      "t": "type",
      "name": "gRPC",
      "kind": "RPC · REQUEST / RESPONSE + STREAMS",
      "what": "Call a function on another service. The contract lives in a `.proto` file; messages are binary, over HTTP/2.",
      "use": "Fast calls between your own services, including services written in different languages.",
      "avoid": "Browsers, which need gRPC-Web and a proxy (or a REST gateway in front), and partners who expect plain HTTP and JSON.",
      "ex": "At checkout, the Order service calls Payment (`AuthorizePayment`) and Dispatch (`FindRider`) while you wait.",
      "more": [
        "You generate client and server code from the `.proto` file, so both sides stay in step and type errors show up at build time. Protocol Buffers are compact and quick to parse. A call can also stream in either direction or both.",
        "The cost: payloads are not human-readable, so debugging needs tools like `grpcurl`. JSON-RPC and Apache Thrift are other RPC options."
      ]
    },
    {
      "t": "type",
      "name": "WebSockets",
      "kind": "OPEN CONNECTION",
      "what": "One connection stays open and both sides send messages whenever they like.",
      "use": "Chat, live location, games: frequent small messages in both directions.",
      "avoid": "Cases where only the server talks (use SSE) or updates are rare (just poll).",
      "ex": "The rider app sends its location every few seconds and receives new delivery jobs on the same connection.",
      "more": [
        "The client opens an ordinary HTTP request and asks to upgrade it; after that the TCP connection stays open. The message format is up to you, so you also design message types, acknowledgements and errors.",
        "The cost: every connected user holds a connection on a server, so servers carry state. Load balancers must allow long-lived connections, deploys drop them, and clients need reconnect logic."
      ]
    },
    {
      "t": "type",
      "name": "Server-sent events (SSE)",
      "kind": "OPEN CONNECTION, ONE WAY",
      "what": "The server keeps an HTTP response open and writes events down it as they happen.",
      "use": "Live feeds, notifications and progress, where the client only listens.",
      "avoid": "Two-way traffic, or binary data.",
      "ex": "Order tracking: \"Restaurant accepted\", \"Rider picked up\", \"Arriving in 4 minutes\". Cancel is a normal REST call.",
      "more": [
        "The browser's `EventSource` reconnects on its own if the connection drops. Events are text only.",
        "Over HTTP/1.1 a browser allows about six connections per domain, so several open tabs can run out; HTTP/2 removes most of that limit."
      ]
    },
    {
      "t": "type",
      "name": "Webhooks",
      "kind": "CALLBACK",
      "what": "Another company calls a URL you gave them whenever something happens on their side.",
      "use": "Hearing about events in systems you do not own, without asking every few seconds.",
      "avoid": "Anything that needs an answer right now.",
      "ex": "The payment provider posts `payment.captured` to Zotato, which then marks the order paid.",
      "more": [
        "Your endpoint is open to the internet, so check the provider's signature on every request. Store the event (or put it on a queue) first, then reply `200` and do the slow work afterwards; a reply sent before the event is saved can lose it.",
        "Retry rules differ by provider. Many retry, so the same event can arrive twice: record event IDs and ignore repeats. Some never retry, so you need a way to catch up on missed events. Events can also arrive out of order."
      ]
    },
    {
      "t": "type",
      "name": "Queues and event streams",
      "kind": "ASYNCHRONOUS",
      "what": "The producer drops a message on a queue or log and moves on; consumers process it when ready.",
      "use": "Work that can wait, absorbing traffic spikes, and one event feeding many consumers.",
      "avoid": "Cases where the caller needs the result now.",
      "ex": "`order.placed` on Kafka feeds the SMS, the restaurant's ticket and the invoice. If invoicing is down for ten minutes, orders still go through.",
      "more": [
        "RabbitMQ and Amazon SQS are queues: each message goes to one consumer. Kafka is a log: many consumer groups can each read every event, and events stay after they are read.",
        "The cost: the caller gets a promise, not a result. Messages can arrive more than once, so consumers must be idempotent. Following one request across several queues is harder to debug than one HTTP call."
      ]
    },
    {
      "t": "p",
      "x": "You will also meet SOAP (XML messages described by a WSDL file) in banks, insurers and government systems. Integrate with it; rarely choose it."
    },
    {
      "t": "more",
      "label": "Compare all seven in one table",
      "body": [
        {
          "t": "table",
          "head": [
            "Type",
            "Who starts",
            "Format",
            "From a browser",
            "Typical use"
          ],
          "rows": [
            [
              "REST",
              "Client",
              "JSON over HTTP",
              "Yes",
              "Public and CRUD APIs"
            ],
            [
              "GraphQL",
              "Client",
              "JSON over HTTP, one URL",
              "Yes",
              "Frontends with varied data needs"
            ],
            [
              "gRPC",
              "Client, then either side when streaming",
              "Protobuf over HTTP/2",
              "Via gRPC-Web proxy",
              "Service-to-service calls"
            ],
            [
              "WebSockets",
              "Client opens; then either side",
              "Messages you define",
              "Yes",
              "Chat, games, collaboration"
            ],
            [
              "SSE",
              "Client opens; then server only",
              "Text events over HTTP",
              "Yes",
              "Live feeds, notifications"
            ],
            [
              "Webhooks",
              "The provider",
              "JSON over HTTP POST",
              "No (server to server)",
              "Events from third parties"
            ],
            [
              "Queues",
              "Producer; nobody waits",
              "Bytes you define",
              "No",
              "Background work, spikes, fan-out"
            ]
          ]
        }
      ]
    },
    {
      "t": "h2",
      "x": "Which one to use where"
    },
    {
      "t": "fig",
      "id": "choose",
      "cap": "Ask from the top and stop at the first yes. The dot walks three Zotato cases: the order SMS can happen later, so it goes on a queue; on the tracking screen the server pushes and the app only listens, so SSE; the restaurant partner API matches none of the earlier questions, so REST."
    },
    {
      "t": "list",
      "items": [
        "Others will call it: REST, documented with an OpenAPI spec. (Zotato's restaurant API.)",
        "Each screen needs a different mix of data: GraphQL, or one REST endpoint per screen. (Zotato's home screen.)",
        "Your own services call each other and speed matters: gRPC. (Order → Payment.)",
        "The client only listens: SSE. Both sides talk often: WebSockets. (Tracking; the rider app.)",
        "You would otherwise keep asking another company whether something is done: webhooks. (Payments.)",
        "Nobody needs the result right now, or load comes in bursts: a queue. (SMS, tickets, invoices.)"
      ]
    },
    {
      "t": "fig",
      "id": "order",
      "cap": "One Zotato order uses almost every type. 1 The home screen loads with GraphQL. 2 The app places the order with REST. 3 The Order API calls Payments and Dispatch over gRPC while you wait. 4 The payment provider confirms with a webhook. 5 and 6 order.placed goes to Kafka, which feeds the SMS, the restaurant ticket and the invoice. 7 Your tracking screen updates over SSE. 8 The rider app and Dispatch talk over a WebSocket."
    },
    {
      "t": "h2",
      "x": "Designing Zotato's REST API"
    },
    {
      "t": "list",
      "items": [
        "Name things, not actions: plural nouns such as `/orders` and `/restaurants`. `/placeOrder` becomes `POST /orders`.",
        "Path for what the request cannot do without (`/restaurants/{id}/menu`), query string for optional filters and pages (`?area=`, `?after=`), body for the data you send.",
        "Know what a retry does: `GET`, `PUT` and `DELETE` are safe to repeat; `POST` is not, so `POST /orders` takes an idempotency key.",
        "Status codes: `4xx` means the caller has to change something, `5xx` means the server failed and a retry may work."
      ]
    },
    {
      "t": "code",
      "label": "ZOTATO · ORDER ENDPOINTS",
      "x": "GET    /restaurants?area=kothrud&open=true   # list, filtered\nGET    /restaurants/{id}/menu                # one restaurant's menu\nPOST   /orders                               # place an order\nGET    /orders/{id}                          # track one order\nPATCH  /orders/{id}                          # change the delivery note\nDELETE /orders/{id}                          # cancel before it is accepted\nGET    /users/{id}/orders?after=abc&limit=20 # order history, one page",
      "say": "The endpoints: list restaurants filtered by area, get one restaurant's menu, place an order, track an order, change its delivery note, cancel it before the restaurant accepts, and page through a user's order history."
    },
    {
      "t": "fig",
      "id": "retry",
      "cap": "Why `POST /orders` carries an idempotency key. The first reply is lost on a patchy network, so the app sends the same request again with the same key. The Order API finds the key and returns the order it already made instead of creating, and charging for, a second one."
    },
    {
      "t": "more",
      "label": "Placing an order, retries and status codes in detail",
      "body": [
        {
          "t": "code",
          "label": "PLACING AN ORDER",
          "x": "POST /orders\nIdempotency-Key: 7f3c9a2e\n{\n  \"restaurant_id\": \"r_42\",\n  \"items\": [{\"item_id\": \"i_7\", \"qty\": 2}],\n  \"address_id\": \"a_3\",\n  \"payment_method\": \"upi\"\n}\n\n201 Created\n{\"id\": \"o_123\", \"status\": \"placed\", \"eta_minutes\": 35}",
          "say": "Placing an order is a POST to slash orders with an idempotency key header, and a body naming the restaurant, the items, the address and the payment method. Zotato replies 201 Created with the order's ID, status and estimated delivery time."
        },
        {
          "t": "p",
          "x": "`PUT` replaces the whole resource, so sending it twice gives the same result. `DELETE` is safe to repeat: the order stays cancelled, even if the second call gets `404` instead of `204`. `PATCH` changes part of a resource and is only safe to repeat when it sets a value (\"set the note to ring the bell\") rather than adding to one. `POST` creates something new every time, which is why the app sends an idempotency key: a double tap or a retry on a patchy network still makes one order."
        },
        {
          "t": "p",
          "x": "Common codes: `200` OK, `201` Created, `400` bad request, `401` not logged in, `403` logged in but not allowed, `404` not found, `409` conflict (cancelling an order the restaurant already accepted), `429` too many requests, `500` server error."
        },
        {
          "t": "p",
          "x": "Who calls an API changes the work more than the technology does. Internal APIs (Order calling Payment) can change quickly. Partner APIs (restaurants' billing systems) need notice before changes. Public APIs (say, companies ordering team lunches) live or die by documentation, rate limits and backward compatibility. A composite API, like the home-screen gateway, calls several services and returns one answer."
        }
      ]
    },
    {
      "t": "h2",
      "x": "What every API needs"
    },
    {
      "t": "list",
      "items": [
        "Auth: who is calling, and may they touch this record? A customer reads order 123 only if it is theirs.",
        "Rate limits that answer `429`: Zotato's OTP login allows a few requests per phone number per hour, because every SMS costs money.",
        "Pagination for lists that grow: order history uses cursors.",
        "Idempotency keys on `POST`, so a retried payment is not charged twice.",
        "Stateless servers: each request carries its token and cursor, so Zotato can add servers at dinner time.",
        "Consistency: the same parameter names and error shape on every endpoint.",
        "A versioning plan: old app versions stay on phones for months, so `/v1` keeps working after `/v2` ships."
      ]
    },
    {
      "t": "more",
      "label": "Auth, pagination, errors and versioning in detail",
      "body": [
        {
          "t": "p",
          "x": "Authentication asks who is calling; authorization asks whether they may do this to this record. API keys usually identify an application, tokens such as JWTs a user. Every endpoint should need a token unless it is deliberately public, like the restaurant list."
        },
        {
          "t": "p",
          "x": "Offset pages (`?page=3`) are simple but skip or repeat items when new data arrives; cursors (`?after=abc`) stay stable but cannot jump to page 40."
        },
        {
          "t": "p",
          "x": "Errors should carry a stable machine-readable code next to a message a person can act on. A version in the URL (`/v2/`) is easy to see and route; a version in a header keeps URLs clean but is easy to miss. Use HTTP the way everyone else does: a `GET` never changes anything."
        }
      ]
    },
    {
      "t": "h2",
      "x": "In an interview"
    },
    {
      "t": "list",
      "items": [
        "Spend about five minutes on the API, then move on.",
        "Say REST unless the question gives you a reason not to.",
        "Name the pattern first: who calls whom, and does the caller wait?",
        "List the endpoints users call; mention internal gRPC in the high-level design.",
        "Give one cost for each choice: pagination for REST, query limits for GraphQL, open connections for WebSockets, idempotency for webhooks and queues."
      ]
    }
  ]
};

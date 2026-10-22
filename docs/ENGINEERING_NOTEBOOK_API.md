# Engineering Notebook API Contract

Status: proposed contract for the Engineering Notebook MVP. These endpoints are a target, not a claim that they already exist in production.

## Architecture decision

Use one Node.js backend as a modular monolith, with MongoDB Atlas as the content store. Keep the frontend on Vercel and the API on the existing VPS. Browser `SpeechSynthesis` narrates the curated mentor script; Teach Mode does not need a separate API request or audio service. Bookmarks and recently viewed concepts stay in browser storage for the unauthenticated MVP.

Do not split into microservices unless a later workload has a demonstrated independent scaling, deployment, ownership, or isolation requirement.

## Base URL and conventions

Production base URL: `https://tech-api.katta.cc`

Versioned content routes use `/api/v1`. JSON responses use UTF-8. List endpoints are paginated. Unknown routes return a consistent 404. Validate query parameters and path slugs; do not expose stack traces or database errors.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process liveness; must not imply MongoDB is healthy |
| GET | `/health/ready` | Readiness; once MongoDB is integrated, return unavailable if required dependencies fail |
| GET | `/api/v1/categories` | List published categories |
| GET | `/api/v1/categories/:slug` | Get category metadata |
| GET | `/api/v1/concepts?q=&category=&page=1&limit=20` | Search/filter published concepts |
| GET | `/api/v1/concepts/:slug` | Fetch one concept, including sections and mentor script |
| GET | `/api/v1/concepts/:slug/related` | Optional related concepts endpoint; can be omitted if related summaries are included in the concept response |

No authentication, user-specific endpoints, payments, server-side TTS, AI generation, quizzes, or system-design evaluator are in MVP scope.

## Response envelopes

Success:
```json
{
  "data": {},
  "meta": {}
}
```

Error:
```json
{
  "error": {
    "code": "validation_error",
    "message": "The request parameters are invalid."
  }
}
```

Use appropriate status codes: 200 success, 400 invalid input, 404 missing resource, 405 unsupported method, 429 only if rate limiting is configured, and 500 for unexpected errors. Do not return internal exception details.

## Concept document

A concept record should have the following logical shape. This is a schema proposal; field names should be kept consistent across MongoDB, API responses, and frontend rendering.

```json
{
  "slug": "database-replication",
  "title": "Database Replication",
  "summary": "How replicas improve availability and read capacity, and the trade-offs they introduce.",
  "categorySlug": "databases",
  "readingTimeMinutes": 8,
  "status": "published",
  "schemaVersion": 1,
  "sections": [
    {
      "id": "why-replication",
      "title": "Why replication exists",
      "blocks": [
        { "type": "paragraph", "text": "..." },
        { "type": "diagram", "format": "mermaid", "source": "..." },
        { "type": "code", "language": "text", "source": "..." }
      ]
    }
  ],
  "mentorScript": [
    {
      "id": "intro",
      "sectionId": "why-replication",
      "text": "Let's start with the problem replication is trying to solve..."
    }
  ],
  "prerequisites": [],
  "relatedConcepts": ["database-consistency"],
  "createdAt": "2026-10-22T00:00:00.000Z",
  "updatedAt": "2026-10-22T00:00:00.000Z"
}
```

The `mentorScript` is authored content, not a runtime transformation of the article. Each segment references a section so the frontend can highlight the current section during narration. TTS remains client-side; never send lesson text to a third-party TTS service.

## Query contract

- `q`: optional text search, trimmed and length-limited.
- `category`: optional category slug.
- `page`: positive integer, default 1.
- `limit`: integer 1–50, default 20.
- Sort list results deterministically, preferably by title or an explicit editorial ordering field.
- Return pagination metadata: `page`, `limit`, `total`, and `totalPages`.

## MongoDB implementation notes

- Keep each concept and its section/script arrays in one document for atomic reads and simple authoring.
- Add unique indexes for `slug`; index `status` and `categorySlug` for published catalogue queries.
- Choose a search implementation deliberately: start with MongoDB Atlas Search if already available/configured; otherwise implement a bounded MVP search strategy and document its limits rather than pretending arbitrary full-text search is indexed.
- Do not report readiness as healthy merely because the HTTP process responds. Liveness and dependency readiness are distinct.

## Frontend request behavior

- Initial Explore page: fetch categories and the first concept page (two requests).
- Search/filter: one debounced list request per settled query.
- Open concept: one concept request unless already cached.
- Start/resume Teach Mode: zero additional API requests because the mentor script is in the concept response.
- Bookmarks and recently viewed: local browser storage, no API calls.

## Delivery sequence

1. Confirm current repository and deployment baseline.
2. Implement and test the MongoDB connection/configuration and readiness semantics.
3. Add validated category and concept routes in a modular-monolith structure.
4. Seed the five initial concepts: replication, caching, load balancing, message queues/event-driven architecture, and consistency models.
5. Connect the frontend to the API; preserve loading, empty, and error states.
6. Implement Teach Mode and local bookmarks; add automated tests and deployment smoke checks.
7. Update the `tech-katta-context` documentation and the project change ledger according to the project's required workflow.

## Acceptance criteria

- Category and concept endpoints return documented JSON shapes.
- Draft/unpublished content is not exposed by public catalogue endpoints.
- Invalid pagination and malformed slugs return 400; missing published concepts return 404.
- Search/filter results are deterministic and pagination metadata is correct.
- Database outage causes readiness to fail without making liveness falsely fail.
- No secret values, stack traces, or raw database errors are returned to clients.
- Teach Mode plays authored segments sequentially and does not make an extra API request.
- API tests and frontend production build pass before merge/deployment.

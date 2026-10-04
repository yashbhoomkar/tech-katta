# Tech Katta

A dark-only technology knowledge base for articles, notes, architecture deep dives, and practical engineering lessons.

The visual direction is inspired by the **information architecture** of long-form engineering learning sites: persistent topic navigation, focused reading pages, and an in-page table of contents. The implementation and visual identity are original to Tech Katta.

## Structure

```text
tech-katta/
├── backend/      # Node.js / Express API scaffold
└── frontend/     # Vite / React knowledge base UI
```

## Frontend

- Vite
- React
- React Router
- Dark-only UI
- Topic filtering
- Article search
- Long-form article layout
- Responsive mobile layout
- SPA rewrite for article routes

## Backend

- Node.js
- Express
- Health endpoint
- Article metadata endpoints
- Docker production scaffold
- Localhost-only host port intended for Nginx

## Planned production architecture

```text
tech.katta.cc
      |
    Vercel
      |
      v
tech-api.katta.cc
      |
   Nginx / VPS
      |
 Docker / Node
```

MongoDB can be introduced later when the article catalog needs dynamic publishing/admin workflows. The initial frontend keeps the published reading experience deterministic and fast.

## Content philosophy

Write what was learned, not generic summaries:

1. Start from the primitive or mental model.
2. Explain how the pieces work.
3. Show where the technology fits in a real system.
4. Call out trade-offs and operational consequences.
5. Add diagrams, numbers, or code where they clarify the idea.

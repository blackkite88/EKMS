# Nexora Knowledge Brain

**Enterprise Decision-Intelligence system** — an internal AI assistant that reasons across a live decision graph, enforces attribute-based access control (who is allowed to know what), and acts on your behalf via real integrations.

This is a monorepo: a Node.js/Express backend and a Next.js frontend.

```
EKMS/
├── backend/     ← the API — auth, GraphRAG (Neo4j), ABAC, hybrid retrieval, MCP actions, evals
├── frontend/    ← the UI — login, chat, live knowledge-graph visualization, audit log
└── docs/        ← architecture spec (PDF/HTML), build documentation
```

## Quick start

**1. Backend** (see [`backend/README.md`](backend/README.md) for full details):
```bash
cd backend
docker compose up -d
cp .env.example .env   # set GROQ_API_KEY (+ JINA_API_KEY if using Jina)
npm install
npm run ingest:reset
npm start               # API on http://localhost:3001
```

**2. Frontend** (in a second terminal):
```bash
cd frontend
cp .env.example .env.local   # points the UI at the backend (localhost:3001)
npm install
npm run dev                  # UI on http://localhost:3000
```

Open http://localhost:3000 and sign in as any demo user (password: `demo`). The frontend expects the backend running on `localhost:3001` — see [`frontend/README.md`](frontend/README.md) for details.

## Documentation

| Doc | What it covers |
|-----|-----------------|
| [`backend/README.md`](backend/README.md) | Full backend setup, architecture, API reference, SSE event contract, demo script |
| [`docs/nexora-build-spec.pdf`](docs/nexora-build-spec.pdf) | The complete design spec — why/what/wow, all 14 architectural decisions, file-by-file structure |

## What makes it different

Ordinary "AI search over company docs" retrieves the right document. Nexora goes three steps further:

1. **It reasons, not just retrieves** — a knowledge graph (Neo4j) models decisions and their causes, so it can answer *why* something happened by walking a causal chain across emails, tickets, meetings, and PRs.
2. **It respects who you are** — Attribute-Based Access Control means two people asking the same question get different, correctly-scoped answers. Restricted knowledge never reaches the LLM.
3. **It acts** — via the Model Context Protocol it can file a real Jira ticket or draft a real email.

The signature demo moment: a **live knowledge graph that lights up as the AI reasons**, and goes dark exactly where a lower-clearance user's access ends.

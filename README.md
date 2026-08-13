# AssetBrain — Industrial Knowledge Intelligence

**AssetBrain** is an AI-powered industrial knowledge platform for a process plant (*Bharat Process Industries*). It unifies a plant's fragmented documents — equipment records, maintenance work orders, inspection reports, failure histories, OEM manuals, procedures, and regulations — into one queryable, reasoning, and actionable brain.

Built as a full-stack monorepo: a Node.js/Express backend and a Next.js frontend.

## What it does

1. **Reasons, not just retrieves** — models plant knowledge as a decision/causal **graph** (Neo4j). Answering *"why did pump P-101 fail?"* walks a causal chain across work orders, inspections, manuals, and past failures that no single document contains.
2. **Root Cause Analysis** — a dedicated RCA agent reasons like a reliability engineer: immediate cause → contributing factors → systemic root cause → similar past failures → recommendations.
3. **Compliance intelligence** — detects regulatory gaps (OISD / PESO / Factory Act) by comparing mandated inspection intervals against actual records.
4. **Role-governed actions** — creates work orders, sends notifications, and generates reports — but only when a user is *permitted* and *clicks to confirm*.
5. **Access-aware** — Attribute-Based Access Control on both reading knowledge and taking actions. A field operator sees far less than a reliability engineer or plant manager.
6. **Live reasoning visualization** — the knowledge graph lights up as the AI reasons, and goes dark exactly where a user's clearance ends.

## Project structure

```
assetbrain/
├── backend/     ← API server, ingestion, GraphRAG, ABAC, actions, eval harness
└── frontend/    ← Next.js UI: copilot, work orders, notifications, compliance, live graph
```

## Tech stack

- **Backend**: Node.js, Express, ES Modules
- **Frontend**: Next.js App Router, React, Tailwind CSS, D3 (graph)
- **LLM**: Groq (`llama-3.3-70b-versatile`)
- **Embeddings**: Ollama local or Jina cloud
- **Vector database**: ChromaDB
- **Graph database**: Neo4j
- **Relational storage**: Postgres (users, memory, audit, work orders, notifications, reports)
- **Retrieval**: BM25 + vectors + Jina reranker
- **Streaming**: Server-Sent Events (SSE)

## Demo users (password `demo`)

| Email | Role | Clearance | Can see / do |
|---|---|---|---|
| `manager@bpi.com` | Plant Manager | 5 | everything, incl. safety incidents; all actions |
| `safety@bpi.com` | Safety Lead | 5 | safety + engineering + all below |
| `reliability@bpi.com` | Reliability Engineer | 4 | maintenance/failure records; RCA + compliance reports |
| `technician@bpi.com` | Maintenance Technician | 2 | maintenance records; create work orders + RCA |
| `operator@bpi.com` | Field Operator | 1 | public operations only; can be notified, **cannot** create work orders |

Note: a field operator asking "why did P-101 fail?" is walled off (the failure records are above their clearance), while a reliability engineer gets the full RCA — same question, different access.

## Setup

### 1. Start infrastructure (Docker)
```bash
cd backend
docker compose up -d          # Neo4j + Postgres + ChromaDB
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env          # set GROQ_API_KEY (required); JINA_API_KEY if using Jina
```

> **Groq free-tier limit:** 100,000 tokens/day. Ingestion + a few queries can exhaust it (HTTP 429). If answers go empty, that's the daily cap resetting — not a bug. The graph/ABAC layers work without the LLM.

### 3. Install + ingest
```bash
npm install
npm run ingest:reset          # builds vectors + the knowledge graph (~1 min)
```

### 4. Start the backend
```bash
npm start                     # API on http://localhost:3001
```

### 5. Start the frontend
```bash
cd ../frontend
cp .env.example .env.local    # points the UI at the backend
npm install
npm run dev                   # UI on http://localhost:3000
```

Open http://localhost:3000 and sign in as any demo user.

> On a corporate/Zscaler machine, run `npm run certs:zscaler` in `backend/` once, then use the `:zscaler` script variants.

## The 6 sections

- **Copilot** — ask about equipment, failures, or compliance; get cited, permission-aware answers with the graph lighting up. Contextual action tiles appear when an action is relevant (the AI proposes; you click to execute).
- **Knowledge Graph** — the full access-filtered plant graph; the active reasoning path highlights during a query.
- **Work Orders** — real work orders (role-filtered), created via the copilot.
- **Reports** — generated RCA and compliance reports, role-filtered.
- **Notifications** — your inbox for alerts directed to you or your team.
- **Compliance** — a live regulatory gap scan + generated compliance reports.

## Demo script (5 beats)

| # | As | Ask / do | Shows |
|---|----|----------|-------|
| 1 | reliability | "Why did pump P-101 fail?" | RCA — graph lights up, root cause = SOP gap, cited |
| 2 | reliability | "Has this happened before?" | follow-up rewrite → the P-102 pattern (SIMILAR_TO) |
| 3 | operator | same "why did P-101 fail?" | 🔒 walled off — 0 nodes, "above your access level" |
| 4 | technician | "Create a work order to fix the SOP" → click tile | proposal → confirm → real WO created |
| 5 | reliability | "What compliance gaps exist?" | 8 gaps detected, cited |

## Evaluation

```bash
cd backend
npm run evals                 # measured metrics → EVAL_REPORT.md
```
Reports entity-extraction accuracy, graph linkage completeness, answer quality, access-control compliance, compliance-gap detection, and time-to-answer.

## API (key endpoints)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/login` | `{email,password}` → `{token, user}` (with permitted actions) |
| `POST` | `/query` | **SSE** — routed answer (copilot / RCA / compliance / action proposal) |
| `GET`  | `/graph` | access-filtered knowledge graph |
| `POST` | `/actions/:action/execute` | run an action (permission-gated) — called by action tiles |
| `GET`  | `/work-orders` · `/notifications` · `/reports` | role-filtered artifact lists |
| `GET`  | `/documents/:id` | source document behind a citation |

## Documentation

- `backend/README.md` — backend architecture, API, SSE event contract, setup
- `frontend/README.md` — frontend setup and backend integration

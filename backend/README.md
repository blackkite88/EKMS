# AssetBrain — Backend

**Industrial Knowledge Intelligence backend** for a fictional process plant, *Bharat Process Industries*. It doesn't just search plant documents; it **reasons across an industrial knowledge graph**, enforces **who is allowed to know what**, and **acts** on your behalf — but only when you confirm.

Backend only (a Next.js frontend in `../frontend` consumes the streaming API + graph events).

---

## Quick start (TL;DR)

```bash
docker compose up -d                      # Neo4j + Postgres + ChromaDB
cp .env.example .env                      # then set GROQ_API_KEY (+ JINA_API_KEY if using Jina)
npm install
npm run ingest:reset                      # builds vectors + the knowledge graph (~1 min)
npm start                                 # API on http://localhost:3001
```
Then log in and ask a question:
```bash
TOKEN=$(curl -s -X POST localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"reliability@bpi.com","password":"demo"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')

curl -N -X POST localhost:3001/query -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"why did pump P-101 fail?","sessionId":"demo1"}'
```
> On a corporate/Zscaler machine, run `npm run certs:zscaler` once, then use the `:zscaler` script variants (see [Corporate TLS / Zscaler](#corporate-tls--zscaler)).

The full section-by-section setup is [below](#setup--run).

---

## What makes it different

Ordinary "AI search over plant docs" retrieves the right document. AssetBrain goes three steps further:

1. **It reasons, not just retrieves.** Plant knowledge is modelled as a **causal graph** (Neo4j). Answering *"why did pump P-101 fail?"* walks a chain across work orders → inspections → operating logs → past failures that no single document contains.
2. **It respects who you are.** **Attribute-Based Access Control (ABAC)** means two people asking the same question get different answers based on clearance, department, and unit. Restricted knowledge is filtered out *at retrieval and traversal time* — it never reaches the LLM.
3. **It acts — with your confirmation.** The copilot can raise a real work order, notify the right person, or generate an RCA/compliance report. It always **proposes first**; nothing executes until a permitted user clicks to confirm.

The signature demo moment: a **live knowledge graph that lights up as the AI reasons**, and — when you switch from a reliability engineer to a field operator — **goes dark exactly where the operator's clearance ends.**

---

## Architecture

```
USER ──▶ AUTH + ABAC (JWT; who are you? what can you see?)
              │
              ▼
       ORCHESTRATION (route: knowledge · rca · compliance · action)
    ┌─────────┼──────────────┐
    ▼         ▼              ▼
  HYBRID    GRAPHRAG       ACTIONS
  RETRIEVAL  (Neo4j)       (governed)
  vec+kw+    access-aware  work order · notify ·
  rerank 🔒  BFS 🔒         RCA/compliance report
    └─────────┼──────────────┘
              ▼
     CONTEXT ─▶ GROQ LLM ─▶ SSE STREAM ─▶ frontend graph + citations
              │
              ▼
       EVAL HARNESS (quality + access correctness)

 backbone: POSTGRES (users · memory · audit log · work orders · notifications · reports)
 🔒 = ABAC enforced here — restricted data never reaches the LLM
```

| Layer | Files | What it does |
|-------|-------|--------------|
| Auth + ABAC | `server/auth/` | JWT login; declarative ABAC policy engine; the single `canAccess()` / `canPerform()` used everywhere |
| Orchestration | `server/agent/orchestrator.js`, `router.js`, `memory.js` | Routes each message (knowledge / RCA / compliance / action), rewrites follow-ups, injects conversation memory |
| Hybrid retrieval | `server/retrieval/` | Vector (ChromaDB) + keyword (BM25) + Jina rerank, ABAC-filtered |
| Knowledge graph | `server/graph/` | Builds the Neo4j industrial ontology; access-aware BFS that streams each hop |
| RCA agent | `server/agent/rca.js` | Structured root-cause reasoning: immediate cause → contributing factors → systemic root cause → similar past failures → responsible person |
| Compliance engine | `server/agent/compliance.js` | Deterministic interval math against inspection records — detects overdue regulatory gaps |
| Governed actions | `server/mcp/` | `create_work_order`, `draft_notification`, `generate_rca_report`, `generate_compliance_report` — propose-then-confirm, permission-gated |
| SSE stream | `server/agent/stream.js` | The event contract that drives the live graph animation and action tiles |
| Eval harness | `server/evals/` | Scores answer quality **and** access-control correctness |

---

## Tech stack

| Concern | Tech |
|---------|------|
| Runtime | Node.js · Express · ES Modules |
| LLM | Groq · `llama-3.3-70b-versatile` (model-agnostic — swap via `GROQ_MODEL`) |
| Embeddings | Jina (cloud) |
| Vector DB | ChromaDB |
| Graph DB | Neo4j (Cypher; visual browser) |
| Relational | Postgres (users, memory, audit, work orders, notifications, reports) |
| Reranking | Jina cross-encoder API |
| Streaming | Server-Sent Events |

---

## The dataset

132 cross-referenced mock files (`data/`) modelling **Bharat Process Industries**, a refinery/petrochemical plant, across nine source types:

| Folder | Content | Count |
|--------|---------|-------|
| `equipment/` | Equipment master records (pumps, compressors, vessels, exchangers) | 18 |
| `workorders/` | Maintenance work orders | 28 |
| `inspections/` | Inspection reports | 22 |
| `failures/` | Failure / incident records | 10 |
| `manuals/` | OEM equipment manuals | 12 |
| `procedures/` | Standard operating procedures | 14 |
| `regulations/` | OISD / PESO / Factory Act regulations | 10 |
| `logs/` | Operating logs | 6 |
| `people/` | Plant personnel directory | 12 |

The centerpiece failure chain: **P-101's bearing seizure** (`FAIL-2025-03`) traces back to a missing shaft-alignment step in `SOP-SEAL-REPL` — the same systemic gap that caused an earlier failure on **P-102** (`FAIL-2023-07`), linked via a `SIMILAR_TO` edge, whose corrective action was never closed.

Ingestion is source-type-agnostic: drop a new folder under `data/` and it's auto-discovered, ABAC-tagged, embedded, and woven into the graph with **zero code change**.

---

## Demo users

Log in via `POST /auth/login` (password is `demo` for all). Designed for dramatic ABAC contrast:

| Email | Role | Clearance | Unit | Sees |
|-------|------|-----------|------|------|
| `manager@bpi.com` | Plant Manager | 5 | all | everything, incl. safety incidents; all actions |
| `safety@bpi.com` | Safety Lead | 5 | all | safety + engineering + all below |
| `reliability@bpi.com` | Reliability Engineer | 4 | unit-2 | maintenance/failure records; RCA + compliance reports |
| `technician@bpi.com` | Maintenance Technician | 2 | unit-2 | maintenance records; create work orders + RCA |
| `operator@bpi.com` | Field Operator | 1 | unit-2 | public operations only; can be notified, **cannot** create work orders |

A field operator asking *"why did P-101 fail?"* is walled off — the failure records are above their clearance — while a reliability engineer gets the full RCA. Same question, different access.

---

## Setup & run

### 1. Infra (Docker — one command)
```bash
docker compose up -d      # Neo4j (7474/7687) + Postgres (5432) + ChromaDB (8000)
```

### 2. Configure
```bash
cp .env.example .env
# set GROQ_API_KEY (required); JINA_API_KEY for embeddings + reranking
```

> **⚠️ Groq free-tier token limit.** The free tier for `llama-3.3-70b-versatile` allows **100,000 tokens/day**. Ingestion (LLM graph enrichment) + a handful of queries + an eval run can exhaust it, after which every LLM call returns HTTP 429 until the daily reset. If answers suddenly go empty, check the server log for `rate_limit_exceeded` — that's the cap, not a bug. The graph/ABAC layer works without the LLM.

### 3. Install + ingest (builds vectors AND the graph)
```bash
npm install
npm run ingest:reset
```

### 4. Run
```bash
npm start          # API on http://localhost:3001
```

### 5. Prove it works
```bash
npm run evals      # runs the benchmark questions, scores quality + access correctness
```

> **Actions are real.** `create_work_order`, `draft_notification`, and the report generators write to Postgres and show up in the frontend's Work Orders / Notifications / Reports sections. They only run when a user is **permitted** (`canPerform`) and has **clicked to confirm** a proposed action — the AI never fires one on its own.

---

## API

| Method | Route | Description |
|--------|-------|--------------|
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }` (incl. permitted actions) |
| `GET`  | `/auth/demo-users` | list preset identities (for a login picker) |
| `GET`  | `/auth/me` | the current user's profile |
| `POST` | `/query` | **SSE**. `{ query, sessionId }` → streamed events (see below). Requires `Authorization: Bearer <token>` |
| `GET`  | `/graph` | full access-filtered knowledge graph (the dim backdrop) |
| `POST` | `/ingest` | run the ingestion pipeline |
| `GET`  | `/sources` | document counts per source type |
| `GET`  | `/audit` / `/audit/policies` | access audit trail / declarative ABAC policies |
| `GET`  | `/work-orders` · `/notifications` · `/reports` | role-filtered artifact lists |
| `GET`  | `/documents/:id` | source document behind a citation |
| `POST` | `/actions/:action/execute` | run a governed action (permission-gated) — called by action tiles |
| `GET`  | `/conversations` / `/conversations/:id` | a user's past chat sessions / one transcript |
| `GET`  | `/health` | connectivity to Postgres / Neo4j / ChromaDB |

### SSE event contract (drives the graph + action tiles)

`POST /query` streams `data: {json}` events including:

| `type` | Meaning |
|--------|---------|
| `auth_context` | who is reasoning (name, clearance) |
| `routing` | classified intent + any follow-up rewrite |
| `graph_seed` / `node_activated` / `edge_traversed` | the graph lighting up, hop by hop |
| `node_blocked` | a restricted wall was hit |
| `traversal_complete` / `context_assembled` | freeze the lit subgraph / retrieval finished |
| `text` | answer tokens (streamed) |
| `citation_highlight` | a citation → pulse its graph node |
| `confidence` | answer confidence + source count |
| `compliance_gaps` | detected regulatory gaps, if any |
| `proposed_action` / `suggested_actions` | the AI proposes an action — a tile appears; nothing executes yet |
| `done` then `[DONE]` | end of stream |

```bash
curl -N -X POST "http://localhost:3001/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"why did pump P-101 fail?","sessionId":"demo1"}'
```

---

## Demo script (5 beats)

| # | As | Ask / do | Shows |
|---|----|----------|-------|
| 1 | reliability | "Why did pump P-101 fail?" | RCA — graph lights up, root cause = SOP gap, cited |
| 2 | reliability | "Has this happened before?" | follow-up rewrite → the P-102 pattern (`SIMILAR_TO`) |
| 3 | operator | same "why did P-101 fail?" | 🔒 walled off — 0 nodes, "above your access level" |
| 4 | technician | "Create a work order to fix the SOP" → click tile | proposal → confirm → real work order created |
| 5 | reliability | "What compliance gaps exist?" | 8 gaps detected, cited |

---

## Corporate TLS / Zscaler

Node doesn't read the macOS keychain, so on Zscaler machines the Groq/Jina SDKs fail with `unable to get local issuer certificate`. Fix:
```bash
npm run certs:zscaler        # export system + Zscaler CAs into certs-zscaler.pem (gitignored)
npm run dev:zscaler          # / start:zscaler / ingest:zscaler / evals:zscaler
```
Teammates not behind Zscaler use the plain scripts.

---

## Project layout

```
server/
  config/      env, groq, chroma, neo4j, postgres, embeddings
  auth/        jwt, middleware, policy (ABAC), action-policy, users
  ingestion/   scanner, readers (+ABAC), loader
  graph/       schema, extractor, builder, traversal  ← the wow
  retrieval/   vector, keyword (BM25), rerank (Jina), hybrid
  agent/       orchestrator, router, rca, compliance, memory, prompts, stream (SSE)
  mcp/         client, actions (work order, notification, RCA/compliance reports)
  evals/       questions, run, judge, report
  routes/      auth, query, graph, ingest, sources, audit, workorders, notifications,
               reports, documents, actions, conversations
  middleware/  errorHandler, rateLimiter, auditLogger
  index.js
data/          132 mock files (equipment/workorders/inspections/failures/manuals/
               procedures/regulations/logs/people)
docker-compose.yml
```

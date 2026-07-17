# Nexora Knowledge Brain

**Enterprise Decision-Intelligence backend** — an internal AI assistant for the fictional company *Nexora Inc.* It doesn't just search company knowledge; it **reasons across a decision graph**, enforces **who is allowed to know what**, and **acts** on your behalf.

Built for a hackathon. Backend only (a frontend consumes the streaming API + graph events).

---

## Quick start (TL;DR)

```bash
docker compose up -d                      # Neo4j + Postgres + ChromaDB
cp .env.example .env                      # then set GROQ_API_KEY (+ JINA_API_KEY if using Jina)
npm install
npm run ingest:reset                      # builds vectors + the graph (~1 min)
npm start                                 # API on http://localhost:3001
```
Then log in and ask a question:
```bash
TOKEN=$(curl -s -X POST localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"cto@nexora.com","password":"demo"}' | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')

curl -N -X POST localhost:3001/query -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"Why was the Payments feature delayed?","sessionId":"demo1"}'
```
> On a corporate/Zscaler machine, run `npm run certs:zscaler` once, then use the `:zscaler` script variants (see [Corporate TLS / Zscaler](#corporate-tls--zscaler)).

The full section-by-section setup is [below](#setup--run).

---

## What makes it different

Ordinary "AI search over company docs" retrieves the right document. Nexora goes three steps further:

1. **It reasons, not just retrieves.** Company knowledge is modelled as a **graph of decisions** (Neo4j). Answering *"why was Payments delayed?"* walks a causal chain across emails → tickets → meetings → PRs that no single document contains.
2. **It respects who you are.** **Attribute-Based Access Control (ABAC)** means two people asking the same question get different answers based on clearance, department, and project. Restricted knowledge is filtered out *at retrieval and traversal time* — it never reaches the LLM.
3. **It acts.** Via the **Model Context Protocol (MCP)** it can file a real Jira ticket or draft a real Gmail message (with safe simulation fallback).

The signature demo moment: a **live knowledge graph that lights up as the AI reasons**, and — when you switch from an executive to an intern — **goes dark exactly where the intern's clearance ends.**

---

## Architecture (7 layers)

```
USER ──▶ ① AUTH + ABAC (JWT; who are you? what can you see?)
              │
              ▼
       ② ORCHESTRATION (classify intent · route · remember)
    ┌─────────┼──────────────┐
    ▼         ▼              ▼
② HYBRID   ③ GRAPHRAG     ④ ACTIONS
  RETRIEVAL  (Neo4j)         (MCP)
  vec+kw+    access-aware    Jira + Gmail
  rerank 🔒  BFS 🔒          (real + fallback)
    └─────────┼──────────────┘
              ▼
     CONTEXT ─▶ GROQ LLM ─▶ ⑥ SSE STREAM ─▶ frontend graph
              │
              ▼
       ⑦ EVAL HARNESS (quality + access correctness)

 backbone: POSTGRES (users · memory · audit log · actions)
 🔒 = ABAC enforced here — restricted data never reaches the LLM
```

| Layer | Files | What it does |
|-------|-------|--------------|
| Auth + ABAC | `server/auth/` | JWT login; declarative ABAC policy engine; the single `canAccess()` used everywhere |
| Orchestration | `server/agent/orchestrator.js`, `intent.js`, `memory.js` | Classifies intent, routes, injects conversation memory |
| Hybrid retrieval | `server/retrieval/` | Vector (ChromaDB) + keyword (BM25) + Jina rerank, ABAC-filtered |
| GraphRAG | `server/graph/` | Builds the Neo4j decision graph; access-aware BFS that streams each hop |
| Actions (MCP) | `server/mcp/` | `draft_email` (Gmail), `create_ticket` (Jira), `extract_action_items`, `generate_report` |
| SSE stream | `server/agent/stream.js` | The 14-event contract that drives the live graph animation |
| Eval harness | `server/evals/` | Scores answer quality **and** access-control correctness |

See `nexora-build-spec.pdf` for the full design document.

---

## Tech stack

| Concern | Tech |
|---------|------|
| Runtime | Node.js · Express · ES Modules |
| LLM | Groq · `llama-3.3-70b-versatile` |
| Embeddings | Ollama `all-minilm` (local) **or** Jina (cloud fallback) |
| Vector DB | ChromaDB |
| Graph DB | Neo4j (Cypher; visual browser) |
| Relational | Postgres (users, memory, audit, actions) |
| Reranking | Jina cross-encoder API |
| Chunking | LlamaIndexTS |
| Actions | MCP → Jira + Gmail APIs |
| Streaming | Server-Sent Events |

---

## The dataset

~75 cross-referenced mock files (`data/`) modelling Nexora Inc., built as **four interconnected storylines**:

| Storyline | Access | Role |
|-----------|--------|------|
| **A · Payments delay** | engineering, internal | the multi-hop "why" showpiece |
| **B · Security breach (INC-001)** | security/exec, **restricted** | the ABAC drama — hidden from low clearance |
| **C · DB migration + incident** | engineering, internal | connective tissue |
| **D · Search feature** | public | the "everyone sees this" floor |

The breach (B) is **woven into** the Payments thread — it exploited the very webhook gap discussed in the rate-limiter tickets — so a low-clearance user traverses Payments freely but the graph goes dark exactly where the breach begins.

Regenerate with: `node scripts/generate-dataset.mjs ./data`

---

## Demo users

Log in via `POST /auth/login` (password is `demo` for all). Designed for dramatic ABAC contrast:

| Email | Role | Clearance | Projects | Sees |
|-------|------|-----------|----------|------|
| `cto@nexora.com` | CTO | 5 | all | everything, incl. the breach |
| `security@nexora.com` | Security Lead | 5 | security + | breach + engineering |
| `eng.lead@nexora.com` | Eng Manager | 4 | payments, infra | eng confidential, **not** the exec breach thread |
| `engineer@nexora.com` | Engineer (Search) | 3 | search | search + public, **not** payments-confidential, **not** breach |
| `intern@nexora.com` | Intern | 1 | — | public only |

Note `engineer@nexora.com` is a real cleared engineer but is **not on the payments project**, so cannot see payments-confidential content — the ABAC "it's not just seniority" moment.

---

## Setup & run

### 1. Infra (Docker — one command)
```bash
docker compose up -d      # Neo4j (7474/7687) + Postgres (5432) + ChromaDB (8000)
```

### 2. Embeddings
Local (per spec):
```bash
ollama serve &
ollama pull all-minilm
# .env → EMBEDDING_PROVIDER=ollama
```
Or cloud fallback (works through corporate TLS/Zscaler):
```bash
# .env → EMBEDDING_PROVIDER=jina  and set JINA_API_KEY
```

### 3. Configure
```bash
cp .env.example .env
# set GROQ_API_KEY (required); JINA_API_KEY if using Jina; Jira/Gmail optional
```

> **⚠️ Groq free-tier token limit.** The free tier for `llama-3.3-70b-versatile` allows **100,000 tokens/day**. Ingestion (LLM graph enrichment) + a handful of queries + an eval run can exhaust it, after which every LLM call returns HTTP 429 until the daily reset. If answers suddenly go empty, check the server log for `rate_limit_exceeded` — that's the cap, not a bug. Use a paid Groq key for heavy testing. The graph/ABAC layer works without the LLM.

### 4. Install + ingest (builds vectors AND the graph)
```bash
npm install
npm run ingest:reset
```

### 5. Run
```bash
npm start          # API on http://localhost:3001
```

### 6. Prove it works
```bash
npm run evals      # runs the demo questions, scores quality + access correctness
```

> **Actions run in simulated mode by default.** `create_ticket` and `draft_email` only hit the real Jira/Gmail APIs if their credentials are set in `.env`. Otherwise they return a realistic simulated result (a fake ticket key / draft id) so nothing breaks — see the `mode: "live" | "simulated"` field on each `tool_result` event.

---

## API

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET`  | `/auth/demo-users` | list preset identities (for a login picker) |
| `POST` | `/query` | **SSE**. `{ query, sessionId }` → streamed events (see below). Requires `Authorization: Bearer <token>` |
| `GET`  | `/graph` | full access-filtered graph (the dim backdrop) |
| `POST` | `/ingest` | run the pipeline (executive only) |
| `GET`  | `/sources` | document counts per type |
| `GET`  | `/audit` | access audit trail (executive only) |
| `GET`  | `/audit/policies` | the declarative ABAC policies |
| `GET`  | `/health` | connectivity to Postgres / Neo4j / ChromaDB |

### SSE event contract (drives the graph)

`POST /query` streams these `data: {json}` events:

| `type` | Meaning |
|--------|---------|
| `auth_context` | who is reasoning (name, clearance) |
| `query_received` | detected intent |
| `graph_seed` / `node_activated` / `edge_traversed` | the graph lighting up, hop by hop (paced ~220ms) |
| `node_blocked` | a restricted wall was hit (carries **no** identifying data) |
| `traversal_complete` | freeze the lit subgraph |
| `context_assembled` | retrieval finished |
| `text` | answer tokens (streamed) |
| `citation_highlight` | a citation → pulse its graph node |
| `tool_call` / `tool_result` | an MCP action + its result |
| `done` then `[DONE]` | end of stream |

**For the frontend:** the browser `EventSource` API cannot set an `Authorization` header, so pass the JWT as a query param instead — the auth middleware accepts `?token=<jwt>`:
```js
// POST body isn't possible with EventSource; use fetch + a stream reader,
// or send the token via query string if you adapt to GET-style SSE.
// With fetch (recommended, supports POST):
const res = await fetch('/query', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, sessionId }),
});
const reader = res.body.getReader();  // read the `data: {json}` SSE lines
```
curl equivalent:
```bash
curl -N -X POST "http://localhost:3001/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"Why was the Payments feature delayed?","sessionId":"demo1"}'
```

---

## Demo script (5 questions)

| # | Question | As user | Shows |
|---|----------|---------|-------|
| 1 | Why was the Payments feature delayed? | eng.lead | multi-hop causal — the graph lights up |
| 2 | Who approved the database migration? | eng.lead | factual + citations |
| 3 | Summarize the security incident. | **cto** then **intern** | 🔒 CTO gets the breach; intern is refused — the ABAC moment |
| 4 | Draft a follow-up email about the API rate limiting issue. | eng.lead | real MCP action (`draft_email`) |
| 5 | What chain of events led to the security breach? | **cto** then **engineer** | 🔒 GraphRAG + ABAC combined |

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
  config/      env, groq, chroma, neo4j, postgres, embeddings, llamaindex
  auth/        jwt, middleware, policy (ABAC), attributes, users
  ingestion/   scanner, readers (+ABAC), loader
  graph/       schema, extractor, builder, traversal  ← the wow
  retrieval/   vector, keyword (BM25), rerank (Jina), hybrid
  agent/       orchestrator, intent, memory, prompts, stream (SSE)
  mcp/         client, tools, internal, servers/{jira,gmail}
  evals/       questions, run, judge, report
  routes/      auth, query, graph, ingest, sources, audit
  middleware/  errorHandler, rateLimiter, auditLogger
  index.js
data/          ~75 mock files (emails/meetings/tickets/docs/github)
scripts/       generate-dataset.mjs
docker-compose.yml
```

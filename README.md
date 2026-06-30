# Nexora Knowledge Brain

An AI-powered Enterprise Knowledge Management backend for **Nexora Inc.** — a fictional Enterprise SaaS company used as a demo dataset.

Ingests emails, meeting transcripts, Jira tickets, internal documentation, and GitHub PRs into a RAG (Retrieval-Augmented Generation) pipeline. Users can ask questions in natural language and get cited, streaming answers grounded in the company's knowledge base.

---

## Architecture

```
data/ (JSON/TXT/MD files)
  │
  ▼
ingestion/readers.js        — reads files, attaches metadata
  │
  ▼
config/llamaindex.js        — chunks text with LlamaIndexTS SentenceSplitter
  │
  ▼
Ollama (all-minilm)         — generates 384-dim embeddings locally
  │
  ▼
ChromaDB (localhost:8000)   — stores and indexes vectors directly via chromadb client
  │
  ▼
retrieval/retriever.js      — embeds query, retrieves top 8 chunks
  │
  ▼
agent/agent.js              — builds context, calls Groq with SSE streaming + tool calling
  │
  ▼
Express API (port 3001)     — /query, /ingest, /sources
```

**Key design decision:** LlamaIndexTS is used **only** for document chunking (`SentenceSplitter`). ChromaDB is accessed directly via its npm client — this avoids the version-pinning issues with LlamaIndexTS's ChromaDB vector store adapter and gives full control over embedding dimensions (384 for `all-minilm`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ with ES Modules |
| API Framework | Express |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Embeddings | Ollama (`all-minilm`, local) |
| Vector DB | ChromaDB (local, port 8000) |
| Chunking | LlamaIndexTS `SentenceSplitter` |
| Streaming | Server-Sent Events (SSE) |

---

## Project Structure

```
EKMS/
├── server/
│   ├── config/
│   │   ├── groq.js          — Groq client singleton
│   │   ├── chroma.js        — ChromaDB client + collection management
│   │   └── llamaindex.js    — SentenceSplitter chunking helpers
│   ├── ingestion/
│   │   ├── readers.js       — file → LlamaIndex Document with metadata
│   │   └── loader.js        — full ingestion pipeline (scan → embed → store)
│   ├── retrieval/
│   │   └── retriever.js     — query embedding + ChromaDB similarity search
│   ├── agent/
│   │   ├── prompts.js       — system prompt + context builder
│   │   ├── tools.js         — Groq tool definitions (draft_email, create_ticket, etc.)
│   │   └── agent.js         — SSE streaming + tool call delta accumulation
│   ├── routes/
│   │   ├── query.js         — POST /query
│   │   ├── ingest.js        — POST /ingest
│   │   └── sources.js       — GET /sources
│   ├── middleware/
│   │   ├── errorHandler.js  — global Express error handler
│   │   └── rateLimiter.js   — in-memory 10 req/min per IP
│   ├── utils/
│   │   └── fileScanner.js   — recursive data/ directory scanner
│   └── index.js             — app entrypoint
├── data/
│   ├── emails/              — 12 JSON email files
│   ├── meetings/            — 8 TXT meeting transcripts
│   ├── tickets/             — 15 Jira ticket JSON files
│   ├── docs/                — 10 Markdown documentation files
│   └── github/              — 8 GitHub PR JSON files
├── .env.example
├── package.json
└── README.md
```

---

## Setup & Running

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai) installed locally
- [ChromaDB](https://docs.trychroma.com) running locally
- A [Groq API key](https://console.groq.com) (free)

### Step 1 — Install dependencies

```bash
cd EKMS
npm install
```

### Step 2 — Configure environment

```bash
cp .env.example .env
# Edit .env and set your GROQ_API_KEY
```

### Step 3 — Start Ollama and pull the embedding model

```bash
# Start Ollama (runs as a background service)
ollama serve

# In a new terminal, pull the all-minilm embedding model
ollama pull all-minilm
```

### Step 4 — Start ChromaDB

```bash
# Using pip (Python)
pip install chromadb
chroma run --host localhost --port 8000

# Or using Docker
docker run -p 8000:8000 chromadb/chroma
```

### Step 5 — Run ingestion

This scans all files in `data/`, chunks them, generates embeddings via Ollama, and stores vectors in ChromaDB.

```bash
npm run ingest

# To reset ChromaDB and re-ingest from scratch:
node server/ingestion/loader.js --reset
```

### Step 6 — Start the backend

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3001`

---

## API Reference

### POST /query

Ask a question. Returns a Server-Sent Events stream.

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Why was the Payments feature delayed?"}' \
  --no-buffer
```

**SSE Event Types:**

| Type | Payload | Description |
|------|---------|-------------|
| `sources` | `{ sources: [{ source_type, source_id, score }] }` | Retrieved knowledge sources (sent first) |
| `text` | `{ text: "..." }` | Streamed LLM response token |
| `tool_result` | `{ name: "draft_email", arguments: {...} }` | Tool call result (if triggered) |
| `done` | — | Stream complete |
| `error` | `{ message: "..." }` | Error occurred |

### POST /ingest

Trigger the ingestion pipeline.

```bash
curl -X POST http://localhost:3001/ingest \
  -H "Content-Type: application/json" \
  -d '{"reset": false}'
```

Set `reset: true` to wipe and rebuild the ChromaDB collection from scratch.

### GET /sources

Returns document counts by source type.

```bash
curl http://localhost:3001/sources
```

```json
{
  "emails": 12,
  "meetings": 8,
  "tickets": 15,
  "docs": 10,
  "github": 8,
  "total": 53
}
```

### GET /health

```bash
curl http://localhost:3001/health
```

---

## Demo Queries

These four queries demonstrate the system's capabilities. Run them after ingestion:

### Query 1 — Cross-source reasoning

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Why was the Payments feature delayed?"}' \
  --no-buffer
```

Expected: Answer cites `email_02` (PCI-DSS blocker), `ticket_NEX-217` (compliance gaps), and `standup_03` (team discussion where delay was announced). Two causes: pen test lead time + Stripe webhook rate limiting conflict.

### Query 2 — Document + email cross-reference

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Who approved the database migration?"}' \
  --no-buffer
```

Expected: Answer cites `email_06` (Raj Patel CTO approval with conditions) and `email_07` (Priya Sharma approval), referencing `database-migration-plan.md`.

### Query 3 — Meeting summary

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Summarize last week'\''s engineering standup."}' \
  --no-buffer
```

Expected: Summarizes standups from `standup_03` and `standup_04`, covering Payments delay, PCI-DSS work, and migration follow-up.

### Query 4 — Tool calling trigger

```bash
curl -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Draft a follow-up email about the API rate limiting issue."}' \
  --no-buffer
```

Expected: Triggers `draft_email` tool call. SSE stream will emit a `tool_result` event with `name: "draft_email"` and a fully composed email about the rate limiting issue, referencing `email_04`, `email_09`, `email_12`, and NEX-231.

---

## Mock Dataset — Nexora Inc.

The `data/` directory contains 53 interconnected files representing a fictional Enterprise SaaS company.

**Company:** Nexora Inc.  
**Industry:** Enterprise SaaS  
**Employees:** 80 (engineering team)

**Key Characters:**
- **Raj Patel** — CTO
- **Priya Sharma** — Engineering Manager
- **Arjun Mehta** — Senior Backend Engineer (Payments lead)
- **Kenji Nakamura** — Security Engineer
- **Diana Chen** — Database Architect
- **Riya Desai** — Software Engineer

**Key storylines the data cross-references:**
1. **Payments delay** — PCI-DSS gaps (email_02 → ticket_NEX-217 → standup_03 → email_03)
2. **Database migration** — approval chain (email_05 → email_06 → email_07 → pr_50 → email_11)
3. **API rate limiting** — Stripe conflict (email_04 → ticket_NEX-231 → email_09 → email_12 → pr_47)
4. **Search incident** — index bug (email_08 → ticket_NEX-244 → pr_52 → incident-postmortem-nov10.md)

---

## Agent Capabilities

The agent supports four Groq function tools:

| Tool | Trigger | Parameters |
|------|---------|-----------|
| `draft_email` | "draft/write/compose an email" | to, subject, body |
| `create_ticket` | "create/log/open a ticket" | title, description, priority |
| `extract_action_items` | "extract action items/tasks" | items[] |
| `generate_report` | "generate/summarize a report" | title, sections[] |

The agent uses Groq's streaming API with tool call delta accumulation — tool call arguments arrive in chunks and are assembled before being emitted as a `tool_result` SSE event.

---

## Citation Format

Every factual statement in the LLM's response includes a citation:

```
[EMAIL | email_04]
[TICKET | ticket_NEX-231]
[DOC | api-rate-limiting]
[MEETING | standup_03]
[PR | pr_47]
```

If the knowledge base doesn't contain enough information to answer, the assistant responds: *"I don't have enough information in the knowledge base."*

---

## Rate Limiting

The API enforces 10 requests per minute per IP address. Exceeding this returns HTTP 429 with a `Retry-After` header.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Required. Get from console.groq.com |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `CHROMA_URL` | `http://localhost:8000` | ChromaDB server URL |
| `PORT` | `3001` | Express server port |
| `EMBEDDING_PROVIDER` | `ollama` | `ollama` (spec default) or `jina` (cloud fallback) |
| `JINA_API_KEY` | — | Required only when `EMBEDDING_PROVIDER=jina`. Free key from jina.ai |
| `JINA_EMBED_MODEL` | `jina-embeddings-v2-base-en` | Jina embedding model (768-dim) |

## Embedding Provider (swappable)

The embedding step is provider-agnostic ([server/config/embeddings.js](server/config/embeddings.js)). The spec default is **Ollama + all-minilm** (local, 384-dim). A cloud fallback (**Jina**, 768-dim) is included for environments where Ollama's model registry is blocked (e.g. corporate networks running Zscaler — the model blob is hosted on Cloudflare R2, which Zscaler's TLS interception can break).

To switch, change one line in `.env`:
```bash
EMBEDDING_PROVIDER=ollama   # local, per spec
# or
EMBEDDING_PROVIDER=jina     # cloud fallback
```

ChromaDB infers the vector dimension automatically, so switching providers just requires a fresh ingest (`node server/ingestion/loader.js --reset`).

## Corporate TLS / Zscaler

Node.js does not read the macOS keychain, so on machines with Zscaler (or any TLS-intercepting proxy) the Groq SDK fails with `unable to get local issuer certificate`. Fix:

```bash
# Export the system + Zscaler root CAs into a local bundle (gitignored)
npm run certs:zscaler

# Then use the :zscaler script variants, which set NODE_EXTRA_CA_CERTS
npm run dev:zscaler        # instead of npm run dev
npm run start:zscaler      # instead of npm start
npm run ingest:zscaler     # instead of npm run ingest
```

Teammates not behind Zscaler just use the plain `npm run dev` / `start` / `ingest`.

# Nexora Knowledge Brain

**Nexora Knowledge Brain** is an enterprise decision-intelligence demo built as a full-stack monorepo.
It pairs a Node.js/Express backend with a Next.js frontend to show a secure AI assistant that:

- reasons over a live decision graph,
- enforces Attribute-Based Access Control (ABAC),
- streams step-by-step reasoning,
- and executes actions through MCP-enabled integrations.

## Project structure

```
EKMS/
├── backend/     ← API server, ingestion, GraphRAG, ABAC, MCP actions, eval harness
├── frontend/    ← Next.js UI, login, streaming chat, live graph visualization, audit/ sources
└── docs/        ← architecture design spec and supporting documentation
```

## What this demo shows

1. **Graph-based reasoning** — queries traverse a Neo4j decision graph instead of only retrieving documents.
2. **Access-aware answers** — user identity and clearance determine what knowledge is visible.
3. **Live reasoning visualization** — graph nodes light up while the assistant thinks.
4. **Action execution** — the system can draft emails and create tickets through MCP actions.

## Tech stack

- Backend: Node.js, Express, ES Modules
- Frontend: Next.js App Router, React, Tailwind CSS, Cytoscape.js
- LLM: Groq (`llama-3.3-70b-versatile`)
- Embeddings: Ollama local or Jina cloud
- Vector database: ChromaDB
- Graph database: Neo4j
- Relational storage: Postgres
- Retrieve-and-rank: BM25 + vectors + optional Jina reranker
- Streaming: Server-Sent Events (SSE)
- Actions: MCP integration with Gmail/Jira

## Demo users

All demo users use password `demo`.

| Email | Role | Intended view |
|---|---|---|
| `cto@nexora.com` | CTO | full access, including security breach details |
| `security@nexora.com` | Security lead | breach + engineering context |
| `eng.lead@nexora.com` | Engineering manager | payments + infra reasoning |
| `engineer@nexora.com` | Engineer | public/engineer knowledge only; no breach or confidential payments details |
| `intern@nexora.com` | Intern | public-only access |

## Setup

### 1. Start backend infrastructure

```bash
cd backend
docker compose up -d
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:

- `GROQ_API_KEY` (required)
- `JINA_API_KEY` (optional, for reranking via Jina)
- `EMBEDDING_PROVIDER=ollama` or `jina`

### 3. Install backend dependencies

```bash
npm install
```

### 4. Ingest data

```bash
npm run ingest:reset
```

This builds vectors, loads documents, and constructs the decision graph.

### 5. Start the backend API

```bash
npm start
```

The API will run on `http://localhost:3001` by default.

### 6. Start the frontend

```bash
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with one of the demo users.

## Frontend behavior

- Login page supports demo identity selection.
- Chat panel streams answer tokens and citation highlights.
- Graph canvas animates live traversal events from the backend.
- Audit and sources pages expose ABAC policies and document coverage.

## Important notes

- `POST /query` uses SSE to stream both reasoning events and answer tokens.
- The frontend sends the JWT to the backend and receives a filtered graph based on the user's access scope.
- ABAC is enforced in retrieval, graph traversal, and every action.
- Actions are simulated unless real Jira/Gmail credentials are provided.

## Documentation

- `backend/README.md` — backend architecture, API reference, event contract, detailed setup.
- `frontend/README.md` — frontend setup, UI behavior, and integration details.
- `docs/nexora-build-spec.pdf` — full design and architectural decisions.

## Demo video script

### 1. Intro + problem statement

- Show the app landing page and explain the goal: an AI assistant for enterprise decision intelligence.
- Emphasize that this demo blends reasoning, access control, and action execution.
- Mention the two main components: backend intelligence and frontend visualization.

### 2. Start the system

- Show `docker compose up -d` inside `backend/`.
- Show `cp .env.example .env`, note `GROQ_API_KEY` and optional `JINA_API_KEY`.
- Run `npm install` and `npm run ingest:reset`.
- Show the backend starting on `http://localhost:3001`.
- Open `http://localhost:3000` and land on the login page.

### 3. Show the core experience

- Log in as `eng.lead@nexora.com`.
- Ask: "Why was the Payments feature delayed?"
- Highlight live graph activation: nodes light up, edges traverse, and the answer appears with citations.
- Point out that the system is not just searching docs—it is reasoning through a decision graph.

### 4. ABAC contrast

- Log out and log in as `cto@nexora.com`.
- Ask: "Summarize the security incident."
- Show the detailed breach answer.
- Then log in as `intern@nexora.com` and ask the same question.
- Emphasize the restricted data wall: the graph goes dark at blocked nodes and the answer is appropriately scoped.

### 5. Action execution

- As `eng.lead@nexora.com`, ask: "Draft a follow-up email about the API rate limiting issue."
- Show the assistant calling an MCP action and returning a draft or simulated result.
- Explain that this is how the system can act on behalf of users safely.

### 6. Wrap up and key takeaways

- Recap the three core strengths: reasoning, access-aware answers, and actionable intelligence.
- Mention that the backend includes an eval harness for quality and access correctness.
- Close with the idea that this architecture is ready for enterprise-grade secure AI workflows.

## Demo questions

Use these scripted prompts during the video:

1. "Why was the Payments feature delayed?" — shows GraphRAG reasoning and citation tracing.
2. "Who approved the database migration?" — shows factual retrieval and trust signals.
3. "Summarize the security incident." — show CTO vs intern access contrast.
4. "Draft a follow-up email about the API rate limiting issue." — shows MCP action execution.
5. "What chain of events led to the security breach?" — reinforces graph traversal and ABAC.

---

## License

This demo is provided for evaluation and demonstration purposes.

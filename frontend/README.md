# Nexora Knowledge Brain — Frontend

Next.js (App Router) + React + Tailwind UI for the Nexora backend. It handles
login, a streaming chat panel, a **live knowledge-graph visualization** that
lights up as the AI reasons, plus audit-log and sources views.

## Prerequisites

The **backend must be running first** (default `http://localhost:3001`). See
[`../backend/README.md`](../backend/README.md).

## Setup

```bash
cp .env.example .env.local   # sets NEXT_PUBLIC_API_URL (backend URL)
npm install
npm run dev                  # http://localhost:3000
```

Then sign in as any demo user (password: `demo`) — e.g. `cto@nexora.com` or
`intern@nexora.com` — or click one of the demo-identity cards on the login page.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Base URL of the backend API |

## How it connects to the backend

All API access goes through [`lib/api.ts`](lib/api.ts):

- **Auth** — `POST /auth/login`, `GET /auth/me`, `GET /auth/demo-users`
- **Chat** — `POST /query` consumed as **Server-Sent Events** via `fetch` +
  `ReadableStream` (browser `EventSource` can't send a POST body or an auth
  header). See `streamQuery()`.
- **Graph** — `GET /graph` for the access-filtered backdrop; live traversal
  events (`graph_seed` / `node_activated` / `edge_traversed` / `node_blocked`)
  arrive over the same `/query` SSE stream and drive the Cytoscape animation.
- **Audit / Sources** — `GET /audit`, `GET /audit/policies`, `GET /sources`.

## Key files

```
app/            layout (AuthProvider) + page (login vs dashboard)
components/
  login-page       demo-user picker + real credential login
  dashboard        sidebar nav (Ask / Graph / Audit / Sources)
  chat-panel       streams answers, renders citations + tool calls
  graph-canvas     Cytoscape.js live graph visualization
  audit-log-page   access trail + ABAC policies
  sources-page     document counts
lib/
  api.ts               typed API client + SSE streaming
  types.ts             shared contracts (matches the backend)
  auth-context.tsx     JWT storage + session
  graph-stream-context.tsx   shares live traversal state chat↔graph
```

## Build

```bash
npm run build   # production build
```

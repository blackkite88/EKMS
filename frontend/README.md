# AssetBrain — Frontend

Next.js (App Router) + React + Tailwind UI for the AssetBrain backend. It handles
login, a streaming copilot chat panel, a **live knowledge-graph visualization**
(D3) that lights up as the AI reasons, plus work orders, reports, notifications,
and compliance views.

## Prerequisites

The **backend must be running first** (default `http://localhost:3001`). See
[`../backend/README.md`](../backend/README.md).

## Setup

```bash
cp .env.example .env.local   # sets NEXT_PUBLIC_API_URL (backend URL)
npm install
npm run dev                  # http://localhost:3000
```

Then sign in as any demo user (password: `demo`) — e.g. `manager@bpi.com` or
`operator@bpi.com` — or click one of the demo-identity cards on the login page.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Base URL of the backend API |

## How it connects to the backend

All API access goes through [`lib/api.ts`](lib/api.ts):

- **Auth** — `POST /auth/login`, `GET /auth/me`, `GET /auth/demo-users`, `GET /auth/action-permissions`
- **Copilot** — `POST /query` consumed as **Server-Sent Events** via `fetch` +
  `ReadableStream` (browser `EventSource` can't send a POST body or an auth
  header). See `streamQuery()`.
- **Graph** — `GET /graph` for the access-filtered backdrop; live traversal
  events (`graph_seed` / `node_activated` / `edge_traversed` / `node_blocked`)
  arrive over the same `/query` SSE stream and drive the D3 graph animation.
- **Governed actions** — `POST /actions/:action/execute`, called only when the
  user clicks a proposed-action tile (the AI never fires an action on its own).
- **Work orders / notifications / reports** — `GET /work-orders`,
  `GET /notifications`, `GET /reports` (role-filtered).
- **Documents** — `GET /documents/:id`, the source behind a citation.
- **Conversations** — `GET /conversations`, `GET /conversations/:id`, past
  chat history per user.

## Key files

```
app/            layout (AuthProvider) + page (login vs dashboard)
components/
  login-page           demo-user picker + real credential login
  dashboard            sidebar nav (Copilot / Graph / Work Orders / Reports /
                        Notifications / Compliance)
  chat-panel           streams answers, renders citations, action tiles,
                        chat history
  graph-canvas         D3 live knowledge-graph visualization
  work-orders-page     role-filtered work orders
  reports-page         generated RCA + compliance reports
  notifications-page   inbox for alerts directed to you or your team
  compliance-page      regulatory gap scan
  document-drawer      slide-over showing the source behind a citation
lib/
  api.ts                     typed API client + SSE streaming
  types.ts                   shared contracts (matches the backend)
  auth-context.tsx           JWT storage + session
  graph-stream-context.tsx   shares live traversal state chat ↔ graph
```

## Build

```bash
npm run build   # production build
```

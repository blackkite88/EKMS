// Shared types matching the backend's exact API + SSE contracts
// (see backend/server/agent/stream.js and backend/server/routes/*.js).

export interface AuthUser {
  email: string
  name: string
  title: string | null
  department: string
  clearance: number
  projects: string[]
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface DemoUser {
  email: string
  name: string
  title: string
  department: string
  clearance: number
  projects: string[]
  password: string
}

// ── Graph (GET /graph) ──────────────────────────────────────────────
export interface GraphNode {
  id: string
  label: string
  title: string
}

export interface GraphEdge {
  from: string
  to: string
  relation: string
}

export interface GraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: { visible: number; hidden: number; total: number }
}

// ── SSE events (POST /query) ────────────────────────────────────────
export type SSEEvent =
  | { type: 'auth_context'; user: string; name: string; title: string | null; department: string; clearance: number }
  | { type: 'query_received'; query: string; intent: string }
  | { type: 'graph_seed'; node: string; label: string; title: string }
  | { type: 'node_activated'; node: string; label: string; reason: string; title: string }
  | { type: 'edge_traversed'; from: string; to: string; relation: string }
  | { type: 'node_blocked'; reason: string }
  | { type: 'traversal_complete'; nodeCount: number; blockedCount: number }
  | { type: 'context_assembled'; sourceCount: number }
  | { type: 'text'; text: string }
  | { type: 'citation_highlight'; node: string }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown>; mode: 'live' | 'simulated' | 'internal' | 'error' }
  | { type: 'done' }
  | { type: 'error'; message: string }

// ── Audit (GET /audit) ──────────────────────────────────────────────
export interface AuditEntry {
  user_email: string
  action: string
  query: string | null
  granted_ids: string[]
  denied_count: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditPolicy {
  id: string
  description: string
}

// ── Chat (frontend-local conversation model) ───────────────────────
export interface Citation {
  tag: string
  id: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations: Citation[]
  toolCalls: { name: string; result: Record<string, unknown>; mode: string }[]
  streaming: boolean
}

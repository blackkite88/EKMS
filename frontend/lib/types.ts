// Shared types matching the backend's exact API + SSE contracts
// (see backend/server/agent/stream.js and backend/server/routes/*.js).

export interface AuthUser {
  email: string
  name: string
  title: string | null
  department: string
  clearance: number
  unit: string
  permittedActions?: string[]
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
  unit: string
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
export interface ComplianceGap {
  regulation: string
  equipment: string
  activity: string
  status: string
  overdue_days?: number | null
  last?: string | null
}

export type SSEEvent =
  | { type: 'auth_context'; user: string; name: string; title: string | null; department: string; clearance: number }
  | { type: 'query_received'; query: string; intent: string }
  | { type: 'routing'; decision: string; rewritten: string | null }
  | { type: 'graph_seed'; node: string; label: string; title: string }
  | { type: 'node_activated'; node: string; label: string; reason: string; title: string }
  | { type: 'edge_traversed'; from: string; to: string; relation: string }
  | { type: 'node_blocked'; reason: string }
  | { type: 'traversal_complete'; nodeCount: number; blockedCount: number }
  | { type: 'context_assembled'; sourceCount: number }
  | { type: 'text'; text: string }
  | { type: 'citation_highlight'; node: string }
  | { type: 'confidence'; level: 'high' | 'medium' | 'low'; sourceCount: number }
  | { type: 'compliance_gaps'; count: number; gaps: ComplianceGap[] }
  | { type: 'suggested_actions'; actions: string[] }
  | { type: 'tool_call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: Record<string, unknown>; mode: 'live' | 'simulated' | 'internal' | 'error' | 'denied' }
  | { type: 'done'; elapsedMs?: number }
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

// ── Work orders / notifications / reports ──────────────────────────
export interface WorkOrder {
  wo_number: string
  title: string
  description: string | null
  equipment_id: string | null
  priority: string
  status: string
  created_by: string | null
  assigned_to: string | null
  created_at: string
}

export interface Notification {
  id: number
  title: string
  body: string | null
  sender: string | null
  related_to: string | null
  is_read: boolean
  created_at: string
}

export interface ReportSummary {
  id: number
  report_type: 'rca' | 'compliance'
  title: string
  equipment_id: string | null
  created_by: string | null
  created_at: string
}

export interface ReportDetail extends ReportSummary {
  content: Record<string, unknown>
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
  suggestedActions: string[]
  confidence: { level: string; sourceCount: number } | null
  complianceGaps: ComplianceGap[]
  routing: { decision: string; rewritten: string | null } | null
  elapsedMs: number | null
  streaming: boolean
}

// Action metadata for the UI tiles.
export const ACTION_META: Record<string, { label: string; icon: string }> = {
  generate_rca_report: { label: 'Generate RCA Report', icon: 'file-search' },
  create_work_order: { label: 'Create Work Order', icon: 'clipboard-list' },
  generate_compliance_report: { label: 'Compliance Report', icon: 'shield-check' },
  draft_notification: { label: 'Notify Team', icon: 'bell' },
}

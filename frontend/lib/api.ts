// Backend API client. Every call goes through here so the base URL, auth
// header, and error handling live in one place.
import type {
  AuthUser, DemoUser, LoginResponse, GraphResponse, SSEEvent, AuditEntry, AuditPolicy,
  WorkOrder, Notification, ReportSummary, ReportDetail,
} from './types'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(body.error || `Request failed: ${res.status}`, res.status)
  }
  return res.json()
}

export const api = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  demoUsers(): Promise<DemoUser[]> {
    return request<DemoUser[]>('/auth/demo-users')
  },

  me(token: string): Promise<{ user: AuthUser }> {
    return request('/auth/me', {}, token)
  },

  graph(token: string): Promise<GraphResponse> {
    return request<GraphResponse>('/graph', {}, token)
  },

  sources(token: string): Promise<Record<string, number>> {
    return request('/sources', {}, token)
  },

  audit(token: string, limit = 50): Promise<{ entries: AuditEntry[] }> {
    return request(`/audit?limit=${limit}`, {}, token)
  },

  auditPolicies(token: string): Promise<{ policies: AuditPolicy[] }> {
    return request('/audit/policies', {}, token)
  },

  actionPermissions(token: string): Promise<{ permissions: { action: string; label: string; min_clearance: number }[] }> {
    return request('/auth/action-permissions', {}, token)
  },

  workOrders(token: string): Promise<{ workOrders: WorkOrder[]; stats: { visible: number; hidden: number; total: number } }> {
    return request('/work-orders', {}, token)
  },

  notifications(token: string): Promise<{ notifications: Notification[]; unread: number }> {
    return request('/notifications', {}, token)
  },

  markNotificationRead(token: string, id: number): Promise<{ success: boolean }> {
    return request(`/notifications/${id}/read`, { method: 'POST' }, token)
  },

  reports(token: string): Promise<{ reports: ReportSummary[] }> {
    return request('/reports', {}, token)
  },

  report(token: string, id: number): Promise<ReportDetail> {
    return request(`/reports/${id}`, {}, token)
  },

  document(token: string, id: string): Promise<{ id: string; source_type: string; filename: string; content: string }> {
    return request(`/documents/${encodeURIComponent(id)}`, {}, token)
  },
}

/**
 * Streams POST /query as Server-Sent Events. Yields each parsed event as it
 * arrives. Uses fetch + a ReadableStream reader (not EventSource, since
 * EventSource can't send a POST body or an Authorization header).
 */
export async function* streamQuery(
  token: string,
  query: string,
  sessionId: string,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, sessionId }),
    signal,
  })

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(body.error || `Query failed: ${res.status}`, res.status)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (possibly incomplete) line in the buffer.
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') return
        try {
          yield JSON.parse(payload) as SSEEvent
        } catch {
          // Ignore malformed frames rather than killing the stream.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export { ApiError }

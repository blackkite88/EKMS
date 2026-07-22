'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, BellRing, CheckCircle2, ClipboardList, FileSearch, FileText, Loader2, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api, streamQuery, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useGraphStream } from '@/lib/graph-stream-context'
import { ACTION_META, type ChatMessage, type Citation } from '@/lib/types'

const CITATION_RE = /\[(EQUIPMENT|WO|INSPECTION|FAILURE|MANUAL|PROCEDURE|REGULATION|LOG)\s*\|\s*([^\]]+)\]/gi

const ACTION_ICON: Record<string, typeof FileSearch> = {
  generate_rca_report: FileSearch,
  create_work_order: ClipboardList,
  generate_compliance_report: ShieldCheck,
  draft_notification: BellRing,
}

function extractCitations(text: string): Citation[] {
  const found = new Map<string, Citation>()
  let m: RegExpExecArray | null
  CITATION_RE.lastIndex = 0
  while ((m = CITATION_RE.exec(text)) !== null) {
    const id = m[2].trim()
    if (!found.has(id)) found.set(id, { tag: m[1].toUpperCase(), id })
  }
  return [...found.values()]
}

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

const EMPTY_MSG = (id: string, role: 'user' | 'assistant', text: string): ChatMessage => ({
  id, role, text, citations: [], toolCalls: [], suggestedActions: [], proposedAction: null,
  actionResults: [], confidence: null, complianceGaps: [], routing: null, elapsedMs: null,
  streaming: role === 'assistant',
})

export function ChatPanel({ onOpenDocument }: { onOpenDocument?: (id: string) => void }) {
  const { user, token } = useAuth()
  const { reset, applyEvent } = useGraphStream()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(`sess_${Date.now()}`)
  const permitted = user?.permittedActions || []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    const q = text.trim()
    if (!q || streaming || !token) return
    setQuestion('')
    setStreaming(true)
    reset()

    const assistantId = `a_${Date.now()}`
    setMessages((prev) => [...prev, EMPTY_MSG(`u_${Date.now()}`, 'user', q), EMPTY_MSG(assistantId, 'assistant', '')])
    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)))

    try {
      for await (const event of streamQuery(token, q, sessionIdRef.current)) {
        applyEvent(event)
        switch (event.type) {
          case 'text':
            patch((m) => { const t = m.text + event.text; return { ...m, text: t, citations: extractCitations(t) } })
            break
          case 'routing':
            patch((m) => ({ ...m, routing: { decision: event.decision, rewritten: event.rewritten } }))
            break
          case 'confidence':
            patch((m) => ({ ...m, confidence: { level: event.level, sourceCount: event.sourceCount } }))
            break
          case 'suggested_actions':
            patch((m) => ({ ...m, suggestedActions: event.actions }))
            break
          case 'proposed_action':
            patch((m) => ({ ...m, proposedAction: { action: event.action, target: event.target, args: event.args } }))
            break
          case 'compliance_gaps':
            patch((m) => ({ ...m, complianceGaps: event.gaps }))
            break
          case 'tool_call':
            patch((m) => ({ ...m, toolCalls: [...m.toolCalls, { name: event.name, result: {}, mode: 'pending' }] }))
            break
          case 'tool_result':
            patch((m) => ({
              ...m,
              toolCalls: m.toolCalls.map((tc) =>
                tc.name === event.name && tc.mode === 'pending' ? { name: event.name, result: event.result, mode: event.mode } : tc,
              ),
              // A denied action surfaces its reason as the message text.
              text: event.mode === 'denied' ? String((event.result as { reason?: string })?.reason || m.text) : m.text,
            }))
            break
          case 'done':
            patch((m) => ({ ...m, elapsedMs: event.elapsedMs ?? null }))
            break
          case 'error':
            patch((m) => ({ ...m, text: m.text || `⚠️ ${event.message}` }))
            break
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong'
      patch((m) => ({ ...m, text: m.text || `⚠️ ${msg}` }))
    } finally {
      patch((m) => ({ ...m, streaming: false }))
      setStreaming(false)
    }
  }

  // Clicking an action tile EXECUTES the action via the dedicated endpoint —
  // this is the only place an action actually runs (the AI only proposes). The
  // result is attached to that message so the user sees the confirmation inline.
  async function runAction(messageId: string, action: string, args: Record<string, unknown>) {
    if (!token) return
    const label = ACTION_META[action]?.label || action
    const patchMsg = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === messageId ? fn(m) : m)))

    patchMsg((m) => ({ ...m, actionResults: [...m.actionResults, { label, status: 'running', message: `Running ${label}…` }] }))
    try {
      const res = await api.executeAction(token, action, args)
      patchMsg((m) => ({
        ...m,
        actionResults: m.actionResults.map((r) =>
          r.label === label && r.status === 'running' ? { label, status: 'done', message: res.message } : r,
        ),
      }))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Action failed'
      patchMsg((m) => ({
        ...m,
        actionResults: m.actionResults.map((r) =>
          r.label === label && r.status === 'running' ? { label, status: 'denied', message } : r,
        ),
      }))
    }
  }

  return (
    <section className="flex min-h-[600px] flex-1 flex-col bg-background lg:min-h-0">
      <header className="flex h-16 items-center justify-between border-b px-5">
        <div>
          <h1 className="font-medium">Ask AssetBrain</h1>
          <p className="text-xs text-muted-foreground">Equipment, maintenance, root cause &amp; compliance — permission-aware, cited</p>
        </div>
        <Badge variant="secondary">
          <CheckCircle2 data-icon="inline-start" /> {user?.department} · L{user?.clearance}
        </Badge>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-7 overflow-y-auto p-5 md:p-8">
        {messages.length === 0 && (
          <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-card">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium">Ask about your plant</p>
            <p className="text-xs text-muted-foreground">
              Try: &ldquo;Why did pump P-101 fail?&rdquo; — and watch the knowledge graph light up as AssetBrain reasons through the root cause across work orders, inspections, manuals, and past failures.
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex max-w-2xl self-end gap-3">
              <div className="rounded-2xl rounded-tr-sm bg-secondary px-4 py-3 text-sm leading-relaxed">{msg.text}</div>
              <Avatar size="sm"><AvatarFallback>{user ? initialsOf(user.name) : '?'}</AvatarFallback></Avatar>
            </div>
          ) : (
            <div key={msg.id} className="flex max-w-3xl gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles aria-hidden="true" className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                {/* "interpreted as" — visible query rewriting */}
                {msg.routing?.rewritten && (
                  <p className="text-xs text-muted-foreground">
                    ↳ interpreted as: <span className="italic text-foreground/70">{msg.routing.rewritten}</span>
                  </p>
                )}

                <div className="rounded-2xl rounded-tl-sm border bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text ? renderWithCitations(msg.text, onOpenDocument) : msg.streaming ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reasoning…</span>
                  ) : null}
                  {msg.streaming && msg.text && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary align-middle" aria-label="streaming" />
                  )}
                </div>

                {/* compliance gaps table */}
                {msg.complianceGaps.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs">
                    <p className="mb-2 font-medium">{msg.complianceGaps.length} compliance gap(s) detected</p>
                    <div className="flex flex-col gap-1">
                      {msg.complianceGaps.slice(0, 8).map((g, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="font-mono">{g.equipment}</span>
                          <span className="text-muted-foreground">{g.activity} · {g.regulation}</span>
                          <Badge variant="destructive" className="text-[10px]">{g.overdue_days != null ? `${g.overdue_days}d overdue` : g.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* action results — shown AFTER the user clicks a tile */}
                {msg.actionResults.map((ar, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${ar.status === 'denied' ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
                    {ar.status === 'running' ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Wrench className="size-3.5 text-primary" />}
                    <span>{ar.message}</span>
                  </div>
                ))}

                {/* citations */}
                {msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((c) => (
                      <button key={c.id} onClick={() => onOpenDocument?.(c.id)} className="inline-flex items-center gap-1 rounded border bg-transparent px-2 py-0.5 font-mono text-[11px] text-primary transition-colors hover:bg-primary/10">
                        <FileText className="size-3" />[{c.tag} | {c.id}]
                      </button>
                    ))}
                  </div>
                )}

                {/* confidence + time-to-answer */}
                {(msg.confidence || msg.elapsedMs != null) && !msg.streaming && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {msg.confidence && (
                      <span className="inline-flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${msg.confidence.level === 'high' ? 'bg-green-500' : msg.confidence.level === 'medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        {msg.confidence.level} confidence · {msg.confidence.sourceCount} sources
                      </span>
                    )}
                    {msg.elapsedMs != null && <span>· answered in {(msg.elapsedMs / 1000).toFixed(1)}s</span>}
                  </div>
                )}

                {/* contextual action tiles — clicking one EXECUTES the action */}
                {msg.suggestedActions.length > 0 && !msg.streaming && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.suggestedActions.filter((a) => permitted.includes(a)).map((a) => {
                      const Icon = ACTION_ICON[a] || Wrench
                      // Use the proposed action's pre-filled args when this tile is the
                      // proposed one; otherwise pass the conversation context.
                      const args = msg.proposedAction?.action === a
                        ? msg.proposedAction.args
                        : { target: msg.proposedAction?.target ?? null, request: 'from the current conversation' }
                      // Disable a tile once it's been run (avoid double-firing).
                      const alreadyRun = msg.actionResults.some((r) => r.label === (ACTION_META[a]?.label || a) && r.status !== 'denied')
                      return (
                        <Button key={a} variant="outline" size="sm" onClick={() => runAction(msg.id, a, args)} disabled={alreadyRun} className="h-8 gap-1.5 text-xs">
                          <Icon className="size-3.5" /> {ACTION_META[a]?.label || a}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="border-t bg-card p-4 md:p-5">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(question) } }}
            aria-label="Ask a question"
            placeholder="Ask about equipment, failures, or compliance…"
            className="min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={streaming}
          />
          <Button size="icon" onClick={() => send(question)} aria-label="Send" disabled={streaming || !question.trim()}>
            {streaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          PERMISSION-AWARE · RESTRICTED RECORDS ARE FILTERED · ACTIONS REQUIRE ROLE AUTHORIZATION
        </p>
      </div>
    </section>
  )
}

function renderWithCitations(text: string, onOpen?: (id: string) => void) {
  const parts: (string | { tag: string; id: string })[] = []
  let last = 0
  let m: RegExpExecArray | null
  CITATION_RE.lastIndex = 0
  while ((m = CITATION_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ tag: m[1].toUpperCase(), id: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? <span key={i}>{p}</span> : (
      <button key={i} onClick={() => onOpen?.(p.id)} className="mx-0.5 inline-flex items-center rounded bg-primary/10 px-1 font-mono text-[11px] text-primary hover:bg-primary/20">
        [{p.tag} | {p.id}]
      </button>
    ),
  )
}

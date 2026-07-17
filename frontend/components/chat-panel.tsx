'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, CheckCircle2, FileText, Loader2, Sparkles, Wrench } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { streamQuery, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useGraphStream } from '@/lib/graph-stream-context'
import type { ChatMessage, Citation } from '@/lib/types'

const CITATION_RE = /\[(EMAIL|TICKET|MEETING|DOC|PR)\s*\|\s*([^\]]+)\]/gi

// Extract citation tags from streamed text (deduped by id).
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

export function ChatPanel() {
  const { user, token } = useAuth()
  const { reset, applyEvent } = useGraphStream()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef(`sess_${Date.now()}`)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function submitQuestion() {
    const q = question.trim()
    if (!q || streaming || !token) return

    setQuestion('')
    setStreaming(true)
    reset() // clear the graph for the new query

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: q,
      citations: [],
      toolCalls: [],
      streaming: false,
    }
    const assistantId = `a_${Date.now()}`
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      citations: [],
      toolCalls: [],
      streaming: true,
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    const patchAssistant = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)))

    try {
      for await (const event of streamQuery(token, q, sessionIdRef.current)) {
        // Feed graph-relevant events to the shared graph state.
        applyEvent(event)

        if (event.type === 'text') {
          patchAssistant((m) => {
            const text = m.text + event.text
            return { ...m, text, citations: extractCitations(text) }
          })
        } else if (event.type === 'tool_call') {
          patchAssistant((m) => ({
            ...m,
            toolCalls: [...m.toolCalls, { name: event.name, result: {}, mode: 'pending' }],
          }))
        } else if (event.type === 'tool_result') {
          patchAssistant((m) => ({
            ...m,
            toolCalls: m.toolCalls.map((tc) =>
              tc.name === event.name && tc.mode === 'pending'
                ? { name: event.name, result: event.result, mode: event.mode }
                : tc,
            ),
          }))
        } else if (event.type === 'error') {
          patchAssistant((m) => ({ ...m, text: m.text || `⚠️ ${event.message}` }))
        }
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong'
      patchAssistant((m) => ({ ...m, text: m.text || `⚠️ ${msg}` }))
    } finally {
      patchAssistant((m) => ({ ...m, streaming: false }))
      setStreaming(false)
    }
  }

  return (
    <section className="flex min-h-[600px] flex-1 flex-col bg-background lg:min-h-0">
      <header className="flex h-16 items-center justify-between border-b px-5">
        <div>
          <h1 className="font-medium">Ask Nexora</h1>
          <p className="text-xs text-muted-foreground">Permission-aware answers, grounded in citations</p>
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
            <p className="text-sm font-medium">Ask a question across company knowledge</p>
            <p className="text-xs text-muted-foreground">
              Try: &ldquo;Why was the Payments feature delayed?&rdquo; and watch the knowledge graph light up as
              Nexora reasons through the answer.
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex max-w-2xl self-end gap-3">
              <div className="rounded-2xl rounded-tr-sm bg-secondary px-4 py-3 text-sm leading-relaxed">{msg.text}</div>
              <Avatar size="sm">
                <AvatarFallback>{user ? initialsOf(user.name) : '?'}</AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div key={msg.id} className="flex max-w-3xl gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles aria-hidden="true" className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="rounded-2xl rounded-tl-sm border bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text ? (
                    renderWithCitations(msg.text)
                  ) : msg.streaming ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Reasoning...
                    </span>
                  ) : null}
                  {msg.streaming && msg.text && (
                    <span
                      className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-full bg-primary align-middle"
                      aria-label="Response streaming"
                    />
                  )}
                </div>

                {msg.toolCalls.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {msg.toolCalls.map((tc, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs"
                      >
                        <Wrench className="size-3.5 text-primary" aria-hidden="true" />
                        <span className="font-mono font-medium">{tc.name}</span>
                        <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                          {tc.mode === 'pending' ? 'running...' : tc.mode}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((c) => (
                      <Badge key={c.id} variant="outline" className="font-mono text-[11px]">
                        <FileText data-icon="inline-start" />[{c.tag} | {c.id}]
                      </Badge>
                    ))}
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
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submitQuestion()
              }
            }}
            aria-label="Ask a question"
            placeholder="Ask a question across company knowledge..."
            className="min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            disabled={streaming}
          />
          <Button size="icon" onClick={submitQuestion} aria-label="Send question" disabled={streaming || !question.trim()}>
            {streaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
          ANSWERS RESPECT YOUR ACCESS LEVEL · RESTRICTED SOURCES ARE FILTERED
        </p>
      </div>
    </section>
  )
}

// Render assistant text with citation tags styled inline.
function renderWithCitations(text: string) {
  const parts: (string | { tag: string; id: string })[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  CITATION_RE.lastIndex = 0
  while ((m = CITATION_RE.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index))
    parts.push({ tag: m[1].toUpperCase(), id: m[2].trim() })
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return parts.map((part, i) =>
    typeof part === 'string' ? (
      <span key={i}>{part}</span>
    ) : (
      <span
        key={i}
        className="mx-0.5 inline-flex items-center rounded bg-primary/10 px-1 font-mono text-[11px] text-primary"
      >
        [{part.tag} | {part.id}]
      </span>
    ),
  )
}

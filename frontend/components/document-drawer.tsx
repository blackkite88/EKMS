'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { FileText, Loader2, Lock, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { api, ApiError } from '@/lib/api'

// Turn a snake_case / camelCase field name into a readable label.
function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Render one JSON value as readable text (scalars, arrays, nested objects).
function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    if (value.every((v) => !isPlainObject(v) && !Array.isArray(v))) {
      return <span>{value.join(', ')}</span>
    }
    return (
      <div className="flex flex-col gap-2">
        {value.map((v, i) => <div key={i} className="rounded-md border bg-background/50 p-2">{renderValue(v)}</div>)}
      </div>
    )
  }
  if (isPlainObject(value)) return <FieldList data={value} nested />
  return <span>{String(value)}</span>
}

// A key/value list for a JSON record. The `access` block is de-emphasized.
function FieldList({ data, nested = false }: { data: Record<string, unknown>; nested?: boolean }) {
  const entries = Object.entries(data)
  return (
    <dl className={nested ? 'flex flex-col gap-2' : 'flex flex-col divide-y'}>
      {entries.map(([key, value]) => (
        <div key={key} className={nested ? 'flex flex-col gap-0.5' : 'flex flex-col gap-1 py-3 first:pt-0'}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{humanizeKey(key)}</dt>
          <dd className="text-sm leading-relaxed text-foreground/90">{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

// If content is a JSON object, surface a human title + all the fields for a
// readable field/value view. Returns null for plain text (md/txt) documents.
function parseStructured(content: string): { title: string | null; fields: Record<string, unknown> } | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const obj = JSON.parse(trimmed)
    if (!isPlainObject(obj)) return null
    const heading =
      (typeof obj.title === 'string' && obj.title) ||
      (typeof obj.name === 'string' && obj.name) ||
      null
    return { title: heading, fields: obj }
  } catch {
    return null
  }
}

// Slide-over that shows the raw source document behind a citation. ABAC-checked
// on the backend — a 403 renders a "restricted" state.
export function DocumentDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { token } = useAuth()
  const [doc, setDoc] = useState<{ id: string; source_type: string; filename: string; content: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!id || !token) { setDoc(null); return }
    setLoading(true); setForbidden(false); setDoc(null)
    api.document(token, id)
      .then(setDoc)
      .catch((e) => { if (e instanceof ApiError && e.status === 403) setForbidden(true) })
      .finally(() => setLoading(false))
  }, [id, token])

  if (!id) return null

  return (
    <>
      <button aria-label="Close document" className="fixed inset-0 z-30 bg-background/60" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l bg-card shadow-xl">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="font-mono text-sm">{id}</span>
            {doc && <Badge variant="outline" className="text-[10px] uppercase">{doc.source_type}</Badge>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-accent"><X className="size-4" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && <div className="flex items-center justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
          {forbidden && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Lock className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">This document is restricted</p>
              <p className="max-w-xs text-xs text-muted-foreground">You are not cleared to view the full source. It exists but is above your access level.</p>
            </div>
          )}
          {doc && (() => {
            const structured = parseStructured(doc.content)
            if (structured) {
              return (
                <div className="flex flex-col gap-4">
                  {(structured.title || doc.filename) && (
                    <div>
                      <h2 className="text-base font-semibold leading-snug">{structured.title || doc.filename}</h2>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{doc.filename}</p>
                    </div>
                  )}
                  <FieldList data={structured.fields} />
                </div>
              )
            }
            // Plain text / markdown source — show it as readable prose.
            return (
              <div className="flex flex-col gap-3">
                <p className="font-mono text-xs text-muted-foreground">{doc.filename}</p>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{doc.content}</div>
              </div>
            )
          })()}
        </div>
      </aside>
    </>
  )
}

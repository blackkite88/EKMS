'use client'

import { useEffect, useState } from 'react'
import { FileText, Loader2, Lock, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { api, ApiError } from '@/lib/api'

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
          {doc && <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">{doc.content}</pre>}
        </div>
      </aside>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Database, FileJson, Mail, MessageSquare, Ticket, GitPullRequest } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'

const ICONS: Record<string, typeof Mail> = {
  emails: Mail,
  meetings: MessageSquare,
  tickets: Ticket,
  docs: FileJson,
  github: GitPullRequest,
}

const LABELS: Record<string, string> = {
  emails: 'Emails',
  meetings: 'Meeting Transcripts',
  tickets: 'Jira Tickets',
  docs: 'Documentation',
  github: 'GitHub PRs',
  other: 'Other',
}

export function SourcesPage() {
  const { token } = useAuth()
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api
      .sources(token)
      .then(setCounts)
      .catch(() => setError('Failed to load source counts'))
  }, [token])

  const entries = counts ? Object.entries(counts).filter(([key]) => key !== 'total') : []

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents indexed into the knowledge graph and vector store.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {counts && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-primary" aria-hidden="true" />
                Total indexed: {counts.total}
              </CardTitle>
              <CardDescription>Across {entries.filter(([, v]) => v > 0).length} source types</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([key, count]) => {
            const Icon = ICONS[key] || FileJson
            return (
              <Card key={key}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground">{LABELS[key] || key}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Check, Lock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api, ApiError } from '@/lib/api'
import type { AuditEntry, AuditPolicy } from '@/lib/types'

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export function AuditLogPage() {
  const { token, user } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [policies, setPolicies] = useState<AuditPolicy[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    // Policies are readable by any authenticated user.
    api
      .auditPolicies(token)
      .then((r) => setPolicies(r.policies))
      .catch(() => {})
    // The audit trail itself is executive-only (clearance 5).
    api
      .audit(token, 50)
      .then((r) => setEntries(r.entries))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true)
        else setError('Failed to load audit log')
      })
  }, [token])

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <Badge variant="outline" className="font-mono">
            GOVERNANCE
          </Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every query and access decision is recorded — the compliance trail behind permission-aware answers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" /> Access Policies
            </CardTitle>
            <CardDescription>Evaluated before every retrieval and answer.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-3">
              {policies.length === 0 && <li className="text-sm text-muted-foreground">Loading policies...</li>}
              {policies.map((policy) => (
                <li
                  key={policy.id}
                  className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm leading-relaxed"
                >
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    <span className="block font-mono text-xs font-medium text-primary">{policy.id}</span>
                    {policy.description}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest events across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {forbidden ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">Audit trail is restricted</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Viewing the full access log requires executive clearance (L5). You are signed in as{' '}
                  {user?.department} · L{user?.clearance}. The access policies above are still visible to everyone.
                </p>
              </div>
            ) : error ? (
              <p className="px-6 py-6 text-sm text-destructive">{error}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="pr-4 text-right">Denied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No activity recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {entries.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                        {formatTime(log.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{log.user_email}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{log.query || '—'}</TableCell>
                      <TableCell className="pr-4 text-right">
                        <Badge variant={log.denied_count > 0 ? 'destructive' : 'secondary'}>{log.denied_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

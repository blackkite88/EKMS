import { Check, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const logs = [
  { time: '2026-07-17 14:32:18', user: 'Raj Patel', action: 'Knowledge query', query: 'Orion launch risks and owners', denied: 0 },
  { time: '2026-07-17 14:28:04', user: 'Maya Chen', action: 'Citation opened', query: 'Q3 product strategy', denied: 0 },
  { time: '2026-07-17 14:15:51', user: 'Sam Wilson', action: 'Knowledge query', query: 'Executive compensation bands', denied: 4 },
  { time: '2026-07-17 13:59:22', user: 'Elena Rossi', action: 'Graph explored', query: 'EU residency controls', denied: 0 },
  { time: '2026-07-17 13:41:09', user: 'David Kim', action: 'Knowledge query', query: 'Authentication migration plan', denied: 1 },
  { time: '2026-07-17 12:54:36', user: 'Raj Patel', action: 'Source viewed', query: 'Board update — June', denied: 0 },
]

export function AuditLogPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <Badge variant="outline" className="font-mono">GOVERNANCE</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review knowledge access, policy decisions, and source activity.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4 text-primary" /> Access Policies</CardTitle>
            <CardDescription>Policies evaluated before every retrieval and answer.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 md:grid-cols-3">
              {['Department and role-based source filtering', 'Clearance level inheritance and enforcement', 'Sensitive query and citation audit trail'].map((policy) => (
                <li key={policy} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm leading-relaxed"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />{policy}</li>
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
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Timestamp</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Query</TableHead><TableHead className="pr-4 text-right">Denied count</TableHead></TableRow></TableHeader>
              <TableBody>{logs.map((log) => <TableRow key={log.time}><TableCell className="pl-4 font-mono text-xs text-muted-foreground">{log.time}</TableCell><TableCell className="font-medium">{log.user}</TableCell><TableCell>{log.action}</TableCell><TableCell className="max-w-64 truncate text-muted-foreground">{log.query}</TableCell><TableCell className="pr-4 text-right"><Badge variant={log.denied > 0 ? 'destructive' : 'secondary'}>{log.denied}</Badge></TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

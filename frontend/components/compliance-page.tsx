'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { streamQuery, api } from '@/lib/api'
import type { ComplianceGap, ReportSummary } from '@/lib/types'

// The Compliance section runs a live gap scan (via the /query compliance route)
// and lists any previously generated compliance reports.
export function CompliancePage({ onOpenDocument }: { onOpenDocument?: (id: string) => void }) {
  const { token } = useAuth()
  const [gaps, setGaps] = useState<ComplianceGap[] | null>(null)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [scanning, setScanning] = useState(false)

  async function scan() {
    if (!token || scanning) return
    setScanning(true)
    setGaps(null)
    try {
      for await (const ev of streamQuery(token, 'What compliance gaps exist across the plant?', `compliance_${Date.now()}`)) {
        if (ev.type === 'compliance_gaps') setGaps(ev.gaps)
      }
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    scan()
    if (token) api.reports(token).then((r) => setReports(r.reports.filter((x) => x.report_type === 'compliance'))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Regulatory gap detection against OISD / PESO / Factory Act requirements.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {gaps && gaps.length > 0 ? <AlertTriangle className="size-4 text-amber-500" /> : <ShieldCheck className="size-4 text-primary" />}
              {scanning ? 'Scanning…' : gaps ? `${gaps.length} compliance gap(s) detected` : 'Compliance scan'}
            </CardTitle>
            <CardDescription>Equipment overdue on a mandated regulatory activity.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="pl-4">Equipment</TableHead><TableHead>Required Activity</TableHead><TableHead>Regulation</TableHead><TableHead className="pr-4 text-right">Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(!gaps || gaps.length === 0) && !scanning && <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No compliance gaps — everything within required intervals.</TableCell></TableRow>}
                {gaps?.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4 font-mono text-xs">{g.equipment}</TableCell>
                    <TableCell>{g.activity}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <button onClick={() => onOpenDocument?.(g.regulation)} className="text-primary hover:underline">{g.regulation}</button>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Badge variant="destructive">{g.overdue_days != null ? `${g.overdue_days}d overdue` : g.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {reports.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Generated compliance reports</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <FileText className="size-4 text-primary" />
                  <span>{r.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

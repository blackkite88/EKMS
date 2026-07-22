'use client'

import { useEffect, useState } from 'react'
import { FileSearch, FileText, ShieldCheck, Loader2, ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { ReportSummary, ReportDetail } from '@/lib/types'

// Renders one report's structured content (RCA sections or compliance summary).
function ReportBody({ content }: { content: Record<string, unknown> }) {
  // RCA reports: { sections: [{ heading, content }] }
  const sections = content.sections as { heading: string; content: string }[] | undefined
  if (Array.isArray(sections)) {
    return (
      <div className="flex flex-col gap-4">
        {sections.map((s, i) => (
          <div key={i}>
            <h3 className="mb-1 text-sm font-semibold text-primary">{s.heading}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{s.content}</p>
          </div>
        ))}
      </div>
    )
  }
  // Compliance reports: { summary, gaps:[{equipment, regulation, finding, action}] }
  const summary = content.summary as string | undefined
  const gaps = content.gaps as { equipment?: string; regulation?: string; finding?: string; action?: string }[] | undefined
  return (
    <div className="flex flex-col gap-4">
      {summary && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{summary}</p>}
      {Array.isArray(gaps) && gaps.length > 0 && (
        <div className="flex flex-col gap-2">
          {gaps.map((g, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{g.equipment}</Badge>
                <Badge variant="destructive" className="text-[10px]">{g.regulation}</Badge>
              </div>
              {g.finding && <p className="mt-1 text-muted-foreground">{g.finding}</p>}
              {g.action && <p className="mt-1 text-xs text-primary">→ {g.action}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReportsPage() {
  const { token } = useAuth()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [open, setOpen] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!token) return
    api.reports(token).then((r) => setReports(r.reports)).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  async function openReport(id: number) {
    if (!token) return
    setLoadingDetail(true)
    try {
      const detail = await api.report(token, id)
      setOpen(detail)
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {!open ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
              <p className="mt-1 text-sm text-muted-foreground">Generated Root Cause Analysis and compliance reports.</p>
            </div>

            {loading && <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}

            {!loading && reports.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <FileText className="size-6" />
                <p className="text-sm">No reports yet.</p>
                <p className="max-w-xs text-xs">Ask the copilot to generate an RCA or compliance report, then click the action tile.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {reports.map((r) => {
                const Icon = r.report_type === 'rca' ? FileSearch : ShieldCheck
                return (
                  <button key={r.id} onClick={() => openReport(r.id)} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon className="size-4 text-primary" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.report_type.toUpperCase()}{r.equipment_id ? ` · ${r.equipment_id}` : ''} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="uppercase">{r.report_type}</Badge>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setOpen(null)} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" /> Back to reports
            </button>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {open.report_type === 'rca' ? <FileSearch className="size-4 text-primary" /> : <ShieldCheck className="size-4 text-primary" />}
                  {open.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {open.equipment_id ? `${open.equipment_id} · ` : ''}Generated {new Date(open.created_at).toLocaleString()} by {open.created_by || 'system'}
                </p>
              </CardHeader>
              <CardContent>
                {loadingDetail ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <ReportBody content={open.content} />}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}

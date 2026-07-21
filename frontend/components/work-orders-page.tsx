'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { WorkOrder } from '@/lib/types'

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline',
}

export function WorkOrdersPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [stats, setStats] = useState<{ visible: number; hidden: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api.workOrders(token).then((r) => { setOrders(r.workOrders); setStats(r.stats) }).catch(() => setError('Failed to load work orders'))
  }, [token])

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Maintenance work orders — filtered to what your role can access.</p>
        </div>

        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="size-4 text-primary" /> {stats.visible} visible</CardTitle>
              <CardDescription>{stats.hidden > 0 ? `${stats.hidden} more exist but are outside your access` : 'You can see all work orders'}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">WO #</TableHead><TableHead>Title</TableHead><TableHead>Equipment</TableHead>
                  <TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead className="pr-4">Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No work orders yet. Ask the copilot to create one.</TableCell></TableRow>}
                {orders.map((w) => (
                  <TableRow key={w.wo_number}>
                    <TableCell className="pl-4 font-mono text-xs">{w.wo_number}</TableCell>
                    <TableCell className="max-w-xs truncate">{w.title}</TableCell>
                    <TableCell className="font-mono text-xs">{w.equipment_id || '—'}</TableCell>
                    <TableCell><Badge variant={PRIORITY_VARIANT[w.priority] || 'secondary'}>{w.priority}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{w.status}</Badge></TableCell>
                    <TableCell className="pr-4 text-xs text-muted-foreground">{w.created_by || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

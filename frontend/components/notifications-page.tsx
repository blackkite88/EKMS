'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Notification } from '@/lib/types'

export function NotificationsPage({ onChanged }: { onChanged?: () => void }) {
  const { token } = useAuth()
  const [items, setItems] = useState<Notification[]>([])

  async function load() {
    if (!token) return
    const r = await api.notifications(token)
    setItems(r.notifications)
  }

  useEffect(() => { load() }, [token])

  async function markRead(id: number) {
    if (!token) return
    await api.markNotificationRead(token, id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    onChanged?.()
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-5 md:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Alerts directed to you or your team.</p>
        </div>

        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <BellOff className="size-6" /><p className="text-sm">No notifications.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((n) => (
            <Card key={n.id} className={n.is_read ? 'opacity-70' : 'border-primary/30'}>
              <CardContent className="flex items-start gap-3 pt-6">
                <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${n.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                  <Bell className={`size-4 ${n.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.is_read && <Badge variant="default" className="text-[10px]">new</Badge>}
                    {n.related_to && <Badge variant="outline" className="font-mono text-[10px]">{n.related_to}</Badge>}
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">from {n.sender || 'system'} · {new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && <button onClick={() => markRead(n.id)} className="text-xs text-primary hover:underline">Mark read</button>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

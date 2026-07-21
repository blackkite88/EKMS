'use client'

import { useEffect, useState } from 'react'
import { Bell, ClipboardList, Factory, LogOut, Menu, MessageSquareText, Network, ShieldCheck, X } from 'lucide-react'
import { ChatPanel } from '@/components/chat-panel'
import { GraphCanvas } from '@/components/graph-canvas'
import { WorkOrdersPage } from '@/components/work-orders-page'
import { NotificationsPage } from '@/components/notifications-page'
import { CompliancePage } from '@/components/compliance-page'
import { DocumentDrawer } from '@/components/document-drawer'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GraphStreamProvider } from '@/lib/graph-stream-context'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { AuthUser } from '@/lib/types'

type View = 'ask' | 'graph' | 'workorders' | 'notifications' | 'compliance'

const navItems = [
  { id: 'ask' as const, label: 'Copilot', icon: MessageSquareText },
  { id: 'graph' as const, label: 'Knowledge Graph', icon: Network },
  { id: 'workorders' as const, label: 'Work Orders', icon: ClipboardList },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'compliance' as const, label: 'Compliance', icon: ShieldCheck },
]

function initialsOf(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

export function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const { token } = useAuth()
  const [view, setView] = useState<View>('ask')
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDoc, setOpenDoc] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!token) return
    api.notifications(token).then((r) => setUnread(r.unread)).catch(() => {})
  }, [token, view])

  function selectView(next: View) {
    setView(next)
    setMenuOpen(false)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Button variant="outline" size="icon" className="fixed top-3 left-3 z-20 lg:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle navigation">
        {menuOpen ? <X /> : <Menu />}
      </Button>
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-10 bg-background/80 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <aside className={cn('fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0', menuOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Factory aria-hidden="true" className="size-4" /></div>
          <div><p className="text-sm font-semibold">AssetBrain</p><p className="font-mono text-[10px] text-muted-foreground">BHARAT PROCESS IND.</p></div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <Avatar><AvatarFallback>{initialsOf(user.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.title} · {user.department}</p></div>
            <Badge variant="secondary">L{user.clearance}</Badge>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3">
          <p className="px-2 pb-2 font-mono text-[10px] text-muted-foreground">PLANT</p>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} type="button" onClick={() => selectView(item.id)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent', view === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground')}>
                <Icon aria-hidden="true" className="size-4" />{item.label}
                {item.id === 'notifications' && unread > 0 && <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1 text-[10px]">{unread}</Badge>}
              </button>
            )
          })}
        </nav>
        <div className="border-t p-3">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"><LogOut aria-hidden="true" className="size-4" />Log out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 pt-14 lg:pt-0">
        <GraphStreamProvider>
          {view === 'ask' && <div className="flex min-w-0 flex-1 flex-col lg:flex-row"><ChatPanel onOpenDocument={setOpenDoc} /><GraphCanvas /></div>}
          {view === 'graph' && <GraphCanvas full />}
        </GraphStreamProvider>
        {view === 'workorders' && <WorkOrdersPage />}
        {view === 'notifications' && <NotificationsPage onChanged={() => token && api.notifications(token).then((r) => setUnread(r.unread))} />}
        {view === 'compliance' && <CompliancePage onOpenDocument={setOpenDoc} />}
      </div>

      <DocumentDrawer id={openDoc} onClose={() => setOpenDoc(null)} />
    </main>
  )
}

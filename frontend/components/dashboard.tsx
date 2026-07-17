'use client'

import { useState } from 'react'
import { BrainCircuit, Database, FileClock, LogOut, Menu, MessageSquareText, Network, X } from 'lucide-react'
import { AuditLogPage } from '@/components/audit-log-page'
import { ChatPanel } from '@/components/chat-panel'
import { GraphCanvas } from '@/components/graph-canvas'
import type { User } from '@/components/login-page'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type View = 'ask' | 'graph' | 'audit' | 'sources'

const navItems = [
  { id: 'ask' as const, label: 'Ask', icon: MessageSquareText },
  { id: 'graph' as const, label: 'Graph', icon: Network },
  { id: 'audit' as const, label: 'Audit Log', icon: FileClock },
  { id: 'sources' as const, label: 'Sources', icon: Database },
]

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [view, setView] = useState<View>('ask')
  const [menuOpen, setMenuOpen] = useState(false)

  function selectView(next: View) {
    setView(next)
    setMenuOpen(false)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <Button variant="outline" size="icon" className="fixed top-3 left-3 z-20 lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
        {menuOpen ? <X /> : <Menu />}
      </Button>
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-10 bg-background/80 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r bg-sidebar transition-transform lg:static lg:translate-x-0', menuOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BrainCircuit aria-hidden="true" className="size-4" /></div>
          <div><p className="text-sm font-semibold">Nexora Brain</p><p className="font-mono text-[10px] text-muted-foreground">WORKSPACE / PROD</p></div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <Avatar><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.title} · {user.department}</p></div>
            <Badge variant="secondary">L{user.clearance}</Badge>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-1 px-3">
          <p className="px-2 pb-2 font-mono text-[10px] text-muted-foreground">WORKSPACE</p>
          {navItems.map((item) => {
            const Icon = item.icon
            return <button key={item.id} type="button" onClick={() => selectView(item.id)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent', view === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground')}><Icon aria-hidden="true" className="size-4" />{item.label}</button>
          })}
        </nav>
        <div className="border-t p-3">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"><LogOut aria-hidden="true" className="size-4" />Log out</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 pt-14 lg:pt-0">
        {view === 'ask' && <div className="flex min-w-0 flex-1 flex-col lg:flex-row"><ChatPanel /><GraphCanvas /></div>}
        {view === 'graph' && <GraphCanvas full />}
        {view === 'audit' && <AuditLogPage />}
        {view === 'sources' && <section className="flex flex-1 items-center justify-center p-6 text-center"><div><Database aria-hidden="true" className="mx-auto size-8 text-primary" /><h1 className="mt-4 text-xl font-semibold">Knowledge Sources</h1><p className="mt-2 max-w-sm text-sm text-muted-foreground">Connect your source management interface here. This frontend shell is ready for your backend data.</p></div></section>}
      </div>
    </main>
  )
}

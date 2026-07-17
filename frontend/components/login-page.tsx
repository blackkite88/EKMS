'use client'

import { ArrowRight, BrainCircuit, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type User = {
  name: string
  title: string
  department: string
  clearance: number
  initials: string
}

export const demoUsers: User[] = [
  { name: 'Raj Patel', title: 'CTO', department: 'Executive', clearance: 5, initials: 'RP' },
  { name: 'Maya Chen', title: 'VP of Product', department: 'Product', clearance: 4, initials: 'MC' },
  { name: 'Elena Rossi', title: 'Security Lead', department: 'Security', clearance: 4, initials: 'ER' },
  { name: 'David Kim', title: 'Staff Engineer', department: 'Engineering', clearance: 3, initials: 'DK' },
  { name: 'Sam Wilson', title: 'Intern', department: 'Engineering', clearance: 1, initials: 'SW' },
]

export function LoginPage({ onLogin }: { onLogin: (user: User) => void }) {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-2xl border bg-card md:min-h-[calc(100vh-4rem)] lg:flex-row">
        <section className="flex flex-1 flex-col justify-between border-b p-6 lg:border-r lg:border-b-0 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainCircuit aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Nexora</p>
              <p className="font-mono text-xs text-muted-foreground">KNOWLEDGE BRAIN / 2.4</p>
            </div>
          </div>
          <div className="flex max-w-xl flex-col gap-5 py-16 lg:py-0">
            <Badge variant="outline" className="w-fit font-mono">SECURE INTERNAL SYSTEM</Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">Company knowledge, with the right context.</h1>
            <p className="max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">Ask questions across trusted company sources. Every answer is permission-aware, traceable, and grounded in citations.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            Identity and access controls enforced
          </div>
        </section>

        <section className="flex w-full items-center justify-center p-5 md:p-10 lg:max-w-xl">
          <Card className="w-full border-0 bg-transparent ring-0">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in to your workspace</CardTitle>
              <CardDescription>Use your company credentials or select a demo identity.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-7">
              <form onSubmit={(event) => { event.preventDefault(); onLogin(demoUsers[0]) }}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Work email</FieldLabel>
                    <Input id="email" type="email" placeholder="name@nexora.ai" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input id="password" type="password" placeholder="Enter your password" required />
                  </Field>
                  <Button type="submit" size="lg" className="w-full">Sign in <ArrowRight data-icon="inline-end" /></Button>
                </FieldGroup>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] text-muted-foreground">SIGN IN AS</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                {demoUsers.map((user) => (
                  <button key={user.name} type="button" onClick={() => onLogin(user)} className="group flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Avatar><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{user.title} · {user.department}</span>
                    </span>
                    <Badge variant={user.clearance === 5 ? 'default' : 'secondary'}>L{user.clearance}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ArrowRight, BrainCircuit, Loader2, ShieldCheck } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { DemoUser } from '@/lib/types'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function LoginPage() {
  const { login } = useAuth()
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .demoUsers()
      .then(setDemoUsers)
      .catch(() => setError('Could not reach the backend. Is it running on port 3001?'))
  }, [])

  async function submit(loginEmail: string, loginPassword: string) {
    setError(null)
    setSubmitting(true)
    try {
      await login(loginEmail, loginPassword)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col overflow-hidden rounded-2xl border bg-card md:min-h-[calc(100vh-4rem)] lg:flex-row">
        <section className="flex flex-1 flex-col justify-between border-b p-6 lg:border-r lg:border-b-0 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainCircuit aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">AssetBrain</p>
              <p className="font-mono text-xs text-muted-foreground">INDUSTRIAL KNOWLEDGE / BPI</p>
            </div>
          </div>
          <div className="flex max-w-xl flex-col gap-5 py-16 lg:py-0">
            <Badge variant="outline" className="w-fit font-mono">
              SECURE INTERNAL SYSTEM
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Your plant, connected and queryable.
            </h1>
            <p className="max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Ask why equipment fails, check compliance, and act — across every maintenance record, inspection, manual, and procedure. Permission-aware and cited.
            </p>
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
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submit(email, password)
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Work email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@bpi.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" /> : <>Sign in <ArrowRight data-icon="inline-end" /></>}
                  </Button>
                </FieldGroup>
              </form>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] text-muted-foreground">SIGN IN AS</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col gap-2">
                {demoUsers.length === 0 && !error && (
                  <p className="text-center text-xs text-muted-foreground">Loading demo identities...</p>
                )}
                {demoUsers.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => submit(user.email, user.password)}
                    className="group flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <Avatar>
                      <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.title} · {user.department}
                      </span>
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

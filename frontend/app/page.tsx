'use client'

import { Dashboard } from '@/components/dashboard'
import { LoginPage } from '@/components/login-page'
import { useAuth } from '@/lib/auth-context'

export default function Page() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-mono text-xs text-muted-foreground">LOADING...</p>
      </main>
    )
  }

  if (!user) return <LoginPage />

  return <Dashboard user={user} onLogout={logout} />
}

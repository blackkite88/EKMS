'use client'

import { useState } from 'react'
import { Dashboard } from '@/components/dashboard'
import { LoginPage, type User } from '@/components/login-page'

export default function Page() {
  const [user, setUser] = useState<User | null>(null)

  if (!user) return <LoginPage onLogin={setUser} />

  return <Dashboard user={user} onLogout={() => setUser(null)} />
}

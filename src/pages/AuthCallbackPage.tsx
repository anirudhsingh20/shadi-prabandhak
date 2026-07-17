import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { isEmailAllowed } from '@/lib/auth/allowed-emails'

export function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user?.email) {
        setError('Could not complete sign in.')
        return
      }
      if (!isEmailAllowed(session.user.email)) {
        await supabase.auth.signOut()
        setError('Access denied. Your email is not authorized.')
        return
      }
      setDone(true)
    })
  }, [])

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <a href="/login" className="text-sm underline">Back to login</a>
      </div>
    )
  }

  if (done) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      Completing sign in…
    </div>
  )
}

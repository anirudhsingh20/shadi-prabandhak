import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isEmailAllowed } from '@/lib/auth/allowed-emails'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function enforceAllowlist(user: User | null) {
  if (!user?.email) return
  if (!isEmailAllowed(user.email)) {
    await supabase.auth.signOut()
    throw new Error('Access denied. Your email is not authorized.')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      try {
        if (s?.user) await enforceAllowlist(s.user)
        setSession(s)
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (s?.user) await enforceAllowlist(s.user)
        setSession(s)
      } catch {
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isEmailAllowed(email)) {
      return { error: 'Access denied. Your email is not authorized.' }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/auth/callback`,
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signInWithMagicLink,
      signOut,
    }),
    [session, loading, signInWithMagicLink, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

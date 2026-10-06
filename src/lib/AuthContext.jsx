import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  // Whether the signed-in e-mail is listed in the `admins` table. The database
  // enforces this on every write anyway; this only decides what the UI shows.
  const [isAdmin, setIsAdmin] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    setIsAdmin(undefined)
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setIsAdmin(data === true)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading: session === undefined || isAdmin === undefined,
      isAdmin: isAdmin === true,
      // Passwordless: Supabase e-mails a one-time sign-in link.
      sendSignInLink: (email) =>
        supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, isAdmin]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

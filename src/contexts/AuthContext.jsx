import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { clearAuthSession, setAuthSession } from '@/utils/auth'

const AuthContext = createContext(null)

async function loadProfile(user, { retryCount = 2, retryDelayMs = 400 } = {}) {
  if (!user) {
    return null
  }

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const profileResult = await fetchProfileByUserId(user.id)

    if (profileResult.success) {
      setAuthSession(profileResult.profile)
      return profileResult.profile
    }

    console.error('[Auth] fetchProfileByUserId failed', {
      attempt: attempt + 1,
      userId: user.id,
      profileResult,
      response: profileResult.response,
      request: profileResult.request,
    })
    console.error(
      '[Auth] Supabase response JSON',
      JSON.stringify(profileResult.response ?? profileResult.error, null, 2),
    )

    if (attempt < retryCount) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, retryDelayMs)
      })
    }
  }

  console.error('[Auth] profile load failed after retries', { userId: user.id })
  return null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (nextSession) => {
    setSession(nextSession)

    if (!nextSession?.user) {
      setProfile(null)
      clearAuthSession()
      return
    }

    const nextProfile = await loadProfile(nextSession.user)

    if (!nextProfile) {
      setProfile(null)
      clearAuthSession()
      return
    }

    setProfile(nextProfile)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('[Auth] getSession failed', error)
      }

      if (!isMounted) {
        return
      }

      await applySession(initialSession)
      setLoading(false)
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      console.log('[Auth] onAuthStateChange', event, nextSession?.user?.email)

      if (!isMounted) {
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        clearAuthSession()
        return
      }

      await applySession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth] signOut failed', error)
      throw error
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoggedIn: Boolean(session?.user && profile),
      loading,
      signOut,
    }),
    [session, profile, loading, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

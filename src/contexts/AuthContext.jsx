import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchProfileByUserId } from '@/services/auth/profile'
import { recoverSessionFromAuthUrl } from '@/services/auth/authCallbackSession'
import { isMissingProfileError } from '@/lib/supabaseErrorLog'
import { clearAuthSession, setAuthSession } from '@/utils/auth'
import { markBrowserSession } from '@/utils/browserSession'
import { logAuthContextProfileDebug } from '@/utils/authRoleDebug'

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

    const missingProfile = isMissingProfileError(profileResult.error)
    const log = missingProfile ? console.info : console.error

    log('[Auth] fetchProfileByUserId failed', {
      attempt: attempt + 1,
      userId: user.id,
      missingProfile,
      profileResult,
      response: profileResult.response,
      request: profileResult.request,
    })

    if (!missingProfile) {
      console.error(
        '[Auth] Supabase response JSON',
        JSON.stringify(profileResult.response ?? profileResult.error, null, 2),
      )
    }

    if (attempt < retryCount) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, retryDelayMs)
      })
    }
  }

  console.info('[Auth] profile not loaded after retries (signup 중 PGRST116 가능)', {
    userId: user.id,
  })
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
    markBrowserSession()
    logAuthContextProfileDebug(nextProfile)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        await recoverSessionFromAuthUrl()
      } catch (error) {
        console.error('[Auth] recoverSessionFromAuthUrl failed', error)
      }

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

    // Never await Supabase calls inside onAuthStateChange — that can deadlock the
    // auth lock and hang every subsequent .from() / .rpc() until a full reload.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log('[Auth] onAuthStateChange', event, nextSession?.user?.email)

      if (event === 'INITIAL_SESSION') {
        // initAuth already applies the session from getSession().
        return
      }

      queueMicrotask(() => {
        if (!isMounted) {
          return
        }

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setProfile(null)
          clearAuthSession()
          return
        }

        void applySession(nextSession)
      })
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
      // 연결된 보조 계정으로 로그인한 경우 대표 auth user id
      effectiveUserId: profile?.effectiveUserId ?? session?.user?.id ?? null,
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

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl?.trim()) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL이 없습니다. 로컬: .env 확인 후 dev 서버 재시작 / 배포: GitHub Actions Secrets 등록 후 재배포',
  )
}

if (!supabaseKey?.trim()) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY가 없습니다. 로컬: .env 확인 후 dev 서버 재시작 / 배포: GitHub Actions Secrets 등록 후 재배포',
  )
}

/**
 * Auth storage MUST be localStorage for PKCE email verification.
 *
 * Why:
 * - signInWithOtp (PKCE) stores a code-verifier in auth storage
 * - The email confirmation link almost always opens in a NEW browser tab
 * - sessionStorage is per-tab, so the callback tab cannot read the verifier
 * - exchangeCodeForSession then fails with "Email link is invalid or has expired"
 * - Even after a successful callback, the signup tab also needs the shared session
 *
 * detectSessionInUrl is disabled because AuthCallback owns URL exchange.
 * Leaving it enabled races with AuthCallback and can consume the one-time code twice.
 */
function migrateLegacyAuthSessionStorageToLocalStorage() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const keysToMigrate = []

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)

      if (!key) {
        continue
      }

      const isSupabaseAuthKey =
        key.startsWith('sb-') &&
        (key.includes('auth-token') || key.includes('code-verifier'))
      const isAppAuthFlag = key === 'skylove_auth' || key === 'skylove_profile'

      if (isSupabaseAuthKey || isAppAuthFlag) {
        keysToMigrate.push(key)
      }
    }

    keysToMigrate.forEach((key) => {
      const value = window.sessionStorage.getItem(key)

      if (value != null && window.localStorage.getItem(key) == null) {
        window.localStorage.setItem(key, value)
      }

      window.sessionStorage.removeItem(key)
    })
  } catch (error) {
    console.warn('[Supabase] legacy auth storage migration failed', error)
  }
}

migrateLegacyAuthSessionStorageToLocalStorage()

console.log('[Supabase] Client initializing', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  authStorage: 'localStorage',
  flowType: 'pkce',
  detectSessionInUrl: false,
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: false,
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

console.log('[Supabase] Client ready')

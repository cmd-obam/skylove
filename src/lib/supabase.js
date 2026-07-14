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
 * 브라우저 종료 시 자동 로그아웃을 위해 sessionStorage에 세션을 저장합니다.
 * - F5 / SPA 이동: sessionStorage 유지 → 로그인 유지
 * - 브라우저(모든 창) 종료 후 재접속: sessionStorage 삭제 → 로그아웃
 *
 * 기존 localStorage에 남아 있던 Supabase auth 키는 sessionStorage로 한 번 이전한 뒤 제거합니다.
 * (현재 열려 있는 탭에서는 로그인 유지, 이후부터는 브라우저 세션 정책 적용)
 */
function migrateLegacyAuthLocalStorageToSessionStorage() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const keysToMigrate = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)

      if (!key) {
        continue
      }

      const isSupabaseAuthKey =
        key.startsWith('sb-') &&
        (key.includes('auth-token') || key.includes('code-verifier'))
      const isAppAuthFlag = key === 'skylove_auth'

      if (isSupabaseAuthKey || isAppAuthFlag) {
        keysToMigrate.push(key)
      }
    }

    keysToMigrate.forEach((key) => {
      const value = window.localStorage.getItem(key)

      if (value != null && window.sessionStorage.getItem(key) == null) {
        window.sessionStorage.setItem(key, value)
      }

      window.localStorage.removeItem(key)
    })
  } catch (error) {
    console.warn('[Supabase] legacy auth storage migration failed', error)
  }
}

migrateLegacyAuthLocalStorageToSessionStorage()

console.log('[Supabase] Client initializing', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  authStorage: 'sessionStorage',
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
  },
})

console.log('[Supabase] Client ready')

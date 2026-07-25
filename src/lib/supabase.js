import { createClient } from '@supabase/supabase-js'
import { assertOtpSendAllowed } from '@/services/auth/otpSendGuard'
import { clearPersistedAuthTokensForEndedBrowserSession } from '@/utils/browserSession'

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
 * PKCE 클라이언트 설정 (이 프로젝트 SPA):
 * - flowType: 'pkce'            → Supabase 권장
 * - storage: localStorage       → 메일 링크·새 탭에서 verifier/세션 공유 (같은 브라우저 세션)
 * - detectSessionInUrl: false   → AuthCallback이 exchangeCodeForSession/verifyOtp를 단일 소유
 * - browser session cookie      → 브라우저를 닫으면 다음 방문 시 auth-token 제거(재로그인)
 *
 * detectSessionInUrl: true 는 문서상 권장이지만, 이 앱은 /auth/callback 전용 페이지가
 * 이미 코드 교환을 수행합니다. true 로 두면 SDK initialize 교환과 AuthCallback 교환·
 * React StrictMode 이중 effect 가 경합하여 세션/UI 상태가 불안정해질 수 있어 false 를 유지합니다.
 */
function migrateLegacyPkceVerifierSessionStorageToLocalStorage() {
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

      // code-verifier 만 탭 간 공유를 위해 localStorage로 옮깁니다.
      // auth-token 은 브라우저 세션 종료 시 지워지도록 여기로 올리지 않습니다.
      if (key.startsWith('sb-') && key.includes('code-verifier')) {
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
    console.warn('[Supabase] legacy PKCE verifier migration failed', error)
  }
}

migrateLegacyPkceVerifierSessionStorageToLocalStorage()
// createClient 가 localStorage 세션을 읽기 전에, 브라우저 재시작 잔여 토큰을 제거합니다.
clearPersistedAuthTokensForEndedBrowserSession()

console.log('[Supabase] Client initializing', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  authStorage: 'localStorage',
  browserSessionBound: true,
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

const originalSignInWithOtp = supabase.auth.signInWithOtp.bind(supabase.auth)

supabase.auth.signInWithOtp = async (credentials) => {
  const source = assertOtpSendAllowed()
  console.log('[OTP] signInWithOtp allowed', {
    source,
    pathname: typeof window !== 'undefined' ? window.location.pathname : null,
    hasEmail: Boolean(credentials && 'email' in credentials),
  })
  return originalSignInWithOtp(credentials)
}

console.log('[Supabase] Client ready')

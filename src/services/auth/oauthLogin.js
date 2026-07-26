import { supabase } from '@/lib/supabase'
import { markBrowserSession } from '@/utils/browserSession'

export const OAUTH_PROVIDERS = {
  kakao: 'kakao',
  naver: 'naver',
}

export function getOAuthCallbackUrl() {
  if (typeof window === 'undefined') {
    return ''
  }

  const origin = window.location.origin
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${origin}${base}/auth/oauth-callback`
}

/**
 * 간편 로그인 시작 (기존 이메일 로그인/회원가입 로직과 무관).
 * @param {'kakao' | 'naver'} provider
 */
export async function startOAuthLogin(provider) {
  if (provider !== OAUTH_PROVIDERS.kakao && provider !== OAUTH_PROVIDERS.naver) {
    return {
      success: false,
      message: '지원하지 않는 로그인 방식입니다.',
    }
  }

  const redirectTo = getOAuthCallbackUrl()

  console.log('[OAuth] signInWithOAuth start', { provider, redirectTo })

  // PKCE verifier 가 콜백 전까지 유지되도록 브라우저 세션 마커를 먼저 둡니다.
  markBrowserSession()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  })

  if (error) {
    console.error('[OAuth] signInWithOAuth failed', error)
    return {
      success: false,
      message: error.message || '간편 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.',
      error,
    }
  }

  return {
    success: true,
    data,
    message: null,
  }
}

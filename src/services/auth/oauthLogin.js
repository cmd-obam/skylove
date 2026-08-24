import { supabase } from '@/lib/supabase'
import { markBrowserSession } from '@/utils/browserSession'

export const OAUTH_PROVIDERS = {
  kakao: 'kakao',
  naver: 'naver',
}

const OAUTH_LINK_PENDING_KEY = 'skylove_oauth_link_pending'
const OAUTH_LINK_RESULT_KEY = 'skylove_oauth_link_result'

export function getOAuthCallbackUrl() {
  if (typeof window === 'undefined') {
    return ''
  }

  const origin = window.location.origin
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${origin}${base}/auth/oauth-callback`
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function writeJson(key, value) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('[OAuth] storage write failed', key, error)
  }
}

function readJson(key) {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('[OAuth] storage read failed', key, error)
    return null
  }
}

function removeKey(key) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(key)
}

export function setPendingOAuthLink(payload) {
  writeJson(OAUTH_LINK_PENDING_KEY, {
    ...payload,
    createdAt: Date.now(),
  })
}

export function getPendingOAuthLink() {
  return readJson(OAUTH_LINK_PENDING_KEY)
}

export function clearPendingOAuthLink() {
  removeKey(OAUTH_LINK_PENDING_KEY)
}

export function setOAuthLinkResult(result) {
  writeJson(OAUTH_LINK_RESULT_KEY, {
    ...result,
    createdAt: Date.now(),
  })
}

export function consumeOAuthLinkResult() {
  const result = readJson(OAUTH_LINK_RESULT_KEY)
  clearOAuthLinkResult()
  return result
}

export function clearOAuthLinkResult() {
  removeKey(OAUTH_LINK_RESULT_KEY)
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

function mapOAuthLinkError(error) {
  const message = String(error?.message || '').toLowerCase()

  if (message.includes('manual linking') || message.includes('not enabled')) {
    return '카카오 계정 연동 기능이 서버에서 활성화되어 있지 않습니다. 관리자에게 문의해주세요.'
  }

  return error?.message || '카카오 로그인 인증에 실패했습니다.'
}

/**
 * 현재 로그인된 이메일 계정에 카카오 identity 를 연결합니다.
 * 새로운 auth.users 를 만들지 않고, 기존 user_id 에 provider 만 추가합니다.
 */
export async function startKakaoIdentityLink(currentUserId) {
  const trimmedUserId = String(currentUserId || '').trim()

  if (!trimmedUserId) {
    return {
      success: false,
      message: '로그인 세션을 확인할 수 없습니다. 다시 로그인한 뒤 시도해주세요.',
    }
  }

  const redirectTo = getOAuthCallbackUrl()

  markBrowserSession()
  clearOAuthLinkResult()
  setPendingOAuthLink({
    provider: OAUTH_PROVIDERS.kakao,
    expectedUserId: trimmedUserId,
    returnTo: '/member/edit',
  })

  const { data, error } = await supabase.auth.linkIdentity({
    provider: OAUTH_PROVIDERS.kakao,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  })

  if (error) {
    clearPendingOAuthLink()
    console.error('[OAuth] linkIdentity failed', {
      code: error.code,
      status: error.status,
      message: error.message,
    })
    return {
      success: false,
      message: mapOAuthLinkError(error),
      error,
    }
  }

  return {
    success: true,
    data,
    message: null,
  }
}

import { supabase } from '@/lib/supabase'
import {
  AUTH_CROSS_BROWSER_HINT,
  AUTH_CROSS_BROWSER_MESSAGE,
  isMissingPkceVerifierError,
} from '@/services/auth/authErrors'

const PROCESSED_CALLBACK_PREFIX = 'skylove_auth_callback_processed'

/** 동일 탭에서 Strict Mode/중복 effect 로 코드 교환이 두 번 돌지 않도록 공유 Promise */
let inFlightCallbackResolution = null

export { AUTH_CROSS_BROWSER_MESSAGE, isMissingPkceVerifierError }

export function parseAuthCallbackParams(url = window.location.href) {
  const parsedUrl = new URL(url)
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''))

  return {
    // PKCE auth code usually arrives as ?code=; keep hash fallback for odd clients.
    code: parsedUrl.searchParams.get('code') ?? hashParams.get('code'),
    type: parsedUrl.searchParams.get('type') ?? hashParams.get('type'),
    tokenHash: parsedUrl.searchParams.get('token_hash') ?? hashParams.get('token_hash'),
    // Implicit-style tokens only appear in the hash fragment.
    accessToken:
      hashParams.get('access_token') ?? parsedUrl.searchParams.get('access_token'),
    refreshToken:
      hashParams.get('refresh_token') ?? parsedUrl.searchParams.get('refresh_token'),
    error: parsedUrl.searchParams.get('error') ?? hashParams.get('error'),
    errorDescription:
      parsedUrl.searchParams.get('error_description') ?? hashParams.get('error_description'),
  }
}

function isInvalidOrExpiredLinkError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()

  return (
    message.includes('invalid or has expired') ||
    message.includes('otp_expired') ||
    message.includes('flow_state_not_found') ||
    isMissingPkceVerifierError(error)
  )
}

function createCrossBrowserAuthError() {
  const error = new Error(`${AUTH_CROSS_BROWSER_MESSAGE}\n\n${AUTH_CROSS_BROWSER_HINT}`)
  error.code = 'AUTH_CROSS_BROWSER'
  return error
}

/** localStorage에 PKCE code_verifier가 있는지 확인 */
export function hasPkceCodeVerifier() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)

      if (!key || !key.includes('code-verifier')) {
        continue
      }

      const value = window.localStorage.getItem(key)

      if (value && value.trim()) {
        return true
      }
    }
  } catch (error) {
    console.warn('[AuthCallback] code_verifier 조회 실패', error)
  }

  return false
}

/** 회원가입 이메일 인증은 email_confirmed_at 만 인정합니다 (confirmed_at 우회 금지). */
export function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at)
}

function getCallbackDedupeKey(params) {
  if (params.code) {
    return `code:${params.code}`
  }

  if (params.tokenHash) {
    return `hash:${params.tokenHash}`
  }

  if (params.accessToken) {
    return `token:${params.accessToken.slice(0, 24)}`
  }

  return null
}

function getCallbackStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function markCallbackProcessed(dedupeKey) {
  if (!dedupeKey) {
    return
  }

  try {
    getCallbackStorage()?.setItem(`${PROCESSED_CALLBACK_PREFIX}:${dedupeKey}`, String(Date.now()))
  } catch (error) {
    console.warn('[AuthCallback] processed key 저장 실패', error)
  }
}

function wasCallbackProcessed(dedupeKey) {
  if (!dedupeKey) {
    return false
  }

  try {
    return Boolean(getCallbackStorage()?.getItem(`${PROCESSED_CALLBACK_PREFIX}:${dedupeKey}`))
  } catch {
    return false
  }
}

function clearAuthParamsFromUrl() {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  const hadSearchParams =
    url.searchParams.has('code') ||
    url.searchParams.has('token_hash') ||
    url.searchParams.has('type') ||
    url.searchParams.has('error')

  if (hadSearchParams) {
    url.searchParams.delete('code')
    url.searchParams.delete('token_hash')
    url.searchParams.delete('type')
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
  }

  const hadHash =
    url.hash.includes('access_token') ||
    url.hash.includes('refresh_token') ||
    url.hash.includes('token_hash')

  if (hadHash) {
    url.hash = ''
  }

  if (hadSearchParams || hadHash) {
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  }
}

async function waitForAutoDetectedSession(maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.email) {
      return session
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 150)
    })
  }

  return null
}

/**
 * Supabase 최신 SPA 권장: detectSessionInUrl이 ?code= 를 자동 교환한 뒤
 * 세션이 생길 때까지 잠시 대기합니다. verifier가 없으면 SDK는 PKCE URL을
 * 처리하지 않으므로 곧바로 null을 반환할 수 있습니다.
 */
async function waitForDetectSessionInUrl(params) {
  if (!params.code && !params.tokenHash) {
    return null
  }

  // token_hash는 SDK auto-detect 대상이 아니므로 짧게만 대기
  const maxAttempts = params.code && hasPkceCodeVerifier() ? 25 : 8
  return waitForAutoDetectedSession(maxAttempts)
}

async function verifyOtpWithFallback(tokenHash, preferredType) {
  const typesToTry = [...new Set([preferredType, 'email', 'signup', 'magiclink'].filter(Boolean))]

  if (typesToTry.length === 0) {
    typesToTry.push('email', 'signup')
  }

  let lastError = null

  for (const type of typesToTry) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error && data.session) {
      return data.session
    }

    lastError = error
  }

  throw lastError ?? new Error('이메일 인증 토큰을 확인하지 못했습니다.')
}

export function hasAuthCallbackParams(url = window.location.href) {
  const params = parseAuthCallbackParams(url)

  return Boolean(
    params.code || params.tokenHash || (params.accessToken && params.refreshToken) || params.error,
  )
}

export async function recoverSessionFromAuthUrl() {
  if (typeof window === 'undefined' || !hasAuthCallbackParams()) {
    return null
  }

  const pathname = window.location.pathname.replace(/\/$/, '')

  // /auth/callback 등은 AuthCallback 전용.
  // /auth/oauth-callback 은 OAuthCallback 이 직접 exchange 하므로 여기서 건드리지 않습니다.
  if (
    pathname.endsWith('/auth/callback') ||
    pathname.endsWith('/auth/oauth-callback') ||
    pathname.endsWith('/auth/confirm') ||
    pathname.endsWith('/email-confirm')
  ) {
    return null
  }

  try {
    return await resolveAuthCallbackSession()
  } catch (error) {
    console.warn('[AuthCallback] recoverSessionFromAuthUrl 실패', error)
    return null
  }
}

/** 다른 탭 인증·URL 토큰 처리 후 현재 탭 Supabase 세션을 최대한 동기화 */
export async function syncSupabaseAuthSession(options = {}) {
  const { retries = 5, retryDelayMs = 200 } = options

  try {
    await recoverSessionFromAuthUrl()
  } catch (error) {
    console.warn('[Auth] recoverSessionFromAuthUrl during sync failed', error)
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const { data, error } = await supabase.auth.refreshSession()

      if (!error && data.session) {
        return data.session
      }

      return session
    }

    if (attempt < retries) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, retryDelayMs)
      })
    }
  }

  return null
}

async function resolveAuthCallbackSessionInner(debugRunId = 'unknown') {
  const log = (step, details = {}) => {
    console.log(`[AuthCallbackSession][run:${debugRunId}][${step}]`, details)
  }

  const params = parseAuthCallbackParams()
  log('parseAuthCallbackParams', { params, url: typeof window !== 'undefined' ? window.location.href : null })

  if (params.error) {
    throw new Error(params.errorDescription || '이메일 인증 처리에 실패했습니다.')
  }

  const {
    data: { session: existingSession },
    error: existingSessionError,
  } = await supabase.auth.getSession()

  log('getSession(initial)', {
    email: existingSession?.user?.email ?? null,
    emailConfirmedAt: existingSession?.user?.email_confirmed_at ?? null,
    error: existingSessionError?.message ?? null,
  })

  if (existingSession?.user?.email && isEmailConfirmed(existingSession.user)) {
    log('getSession(initial) confirmed — early return')
    clearAuthParamsFromUrl()
    return existingSession
  }

  const dedupeKey = getCallbackDedupeKey(params)
  const hasVerifier = hasPkceCodeVerifier()
  log('pkce storage', { hasVerifier })

  // detectSessionInUrl: true 인 경우 SDK 초기화 교환을 먼저 기다립니다.
  const autoSession = await waitForDetectSessionInUrl(params)
  log('waitForDetectSessionInUrl', {
    email: autoSession?.user?.email ?? null,
    emailConfirmedAt: autoSession?.user?.email_confirmed_at ?? null,
  })

  if (autoSession?.user?.email && isEmailConfirmed(autoSession.user)) {
    if (dedupeKey) {
      markCallbackProcessed(dedupeKey)
    }

    clearAuthParamsFromUrl()
    log('autoSession confirmed — return')
    return autoSession
  }

  if (dedupeKey && wasCallbackProcessed(dedupeKey)) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    log('wasCallbackProcessed', {
      dedupeKey,
      email: session?.user?.email ?? null,
    })

    if (session?.user?.email) {
      clearAuthParamsFromUrl()
      return session
    }
  }

  let session = existingSession ?? null

  // token_hash는 PKCE verifier 없이 완료 가능 (다른 브라우저에서도 동작)
  if (params.tokenHash) {
    log('verifyOtpWithFallback start', { type: params.type })
    try {
      session = await verifyOtpWithFallback(params.tokenHash, params.type)
      log('verifyOtpWithFallback result', {
        email: session?.user?.email ?? null,
      })
    } catch (error) {
      log('verifyOtpWithFallback failed', {
        error: error?.message ?? String(error),
      })

      if (params.code) {
        log('falling back to exchangeCodeForSession after token_hash failure')
      } else {
        throw error
      }
    }
  }

  if ((!session || !session.user?.email) && params.accessToken && params.refreshToken) {
    log('setSession start')
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })

    log('setSession result', {
      email: data.session?.user?.email ?? null,
      error: error?.message ?? null,
    })

    if (error) {
      throw error
    }

    session = data.session
  } else if ((!session || !session.user?.email) && params.code) {
    // SDK가 이미 교환했다면 URL의 code가 남아 있어도 세션이 있을 수 있음 — 위에서 처리됨.
    // verifier가 없으면 다른 브라우저/기기이므로 교환을 시도하지 않고 안내합니다.
    if (!hasPkceCodeVerifier()) {
      log('exchangeCodeForSession skipped — missing code_verifier')
      throw createCrossBrowserAuthError()
    }

    log('exchangeCodeForSession start', {
      codePrefix: params.code.slice(0, 8),
      hasVerifier: true,
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)

    log('exchangeCodeForSession result', {
      email: data.session?.user?.email ?? null,
      emailConfirmedAt: data.session?.user?.email_confirmed_at ?? null,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    })

    if (error) {
      const recovered = await waitForAutoDetectedSession(5)

      log('exchangeCodeForSession recover', {
        email: recovered?.user?.email ?? null,
        missingVerifier: isMissingPkceVerifierError(error),
        invalidOrExpired: isInvalidOrExpiredLinkError(error),
      })

      if (recovered?.user?.email) {
        session = recovered
      } else if (isMissingPkceVerifierError(error)) {
        throw createCrossBrowserAuthError()
      } else if (isInvalidOrExpiredLinkError(error)) {
        throw new Error(
          '인증 링크가 만료되었거나 이미 사용되었습니다. 회원가입 페이지에서 인증 메일을 다시 요청한 뒤, 같은 브라우저에서 최신 링크를 열어주세요.',
        )
      } else {
        throw error
      }
    } else {
      session = data.session
    }
  } else if ((!session || !session.user?.email) && autoSession) {
    log('use autoSession fallback')
    session = autoSession
  } else if (!session) {
    const {
      data: { session: fallbackSession },
      error,
    } = await supabase.auth.getSession()

    log('getSession(fallback)', {
      email: fallbackSession?.user?.email ?? null,
      error: error?.message ?? null,
    })

    if (error) {
      throw error
    }

    session = fallbackSession
  }

  if (!session?.user?.email) {
    log('resolveAuthCallbackSession missing session', {
      hasCode: Boolean(params.code),
      hasTokenHash: Boolean(params.tokenHash),
      hasVerifier: hasPkceCodeVerifier(),
    })

    if (params.code && !hasPkceCodeVerifier()) {
      throw createCrossBrowserAuthError()
    }

    throw new Error(
      '이메일 인증 세션을 만들지 못했습니다. 인증 메일을 다시 요청한 뒤, 회원가입을 시작한 같은 브라우저에서 최신 링크를 클릭해주세요.',
    )
  }

  if (dedupeKey) {
    markCallbackProcessed(dedupeKey)
  }

  clearAuthParamsFromUrl()

  log('resolveAuthCallbackSession done', {
    email: session?.user?.email ?? null,
    emailConfirmedAt: session?.user?.email_confirmed_at ?? null,
  })

  return session
}

export async function resolveAuthCallbackSession(debugRunId = 'unknown') {
  if (inFlightCallbackResolution) {
    console.log(`[AuthCallbackSession][run:${debugRunId}] join in-flight resolution`)
    return inFlightCallbackResolution
  }

  inFlightCallbackResolution = resolveAuthCallbackSessionInner(debugRunId).finally(() => {
    inFlightCallbackResolution = null
  })

  return inFlightCallbackResolution
}

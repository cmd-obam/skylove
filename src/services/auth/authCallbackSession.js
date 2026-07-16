import { supabase } from '@/lib/supabase'

const PROCESSED_CALLBACK_PREFIX = 'skylove_auth_callback_processed'

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

function isMissingPkceVerifierError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase()
  const code = String(error?.code ?? '').toLowerCase()

  return (
    message.includes('code verifier') ||
    message.includes('both auth code and code verifier') ||
    message.includes('pkce') ||
    code.includes('pkce')
  )
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

export function isEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at)
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

async function waitForAutoDetectedSession(maxAttempts = 15) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.email) {
      return session
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 100)
    })
  }

  return null
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

  if (
    pathname.endsWith('/auth/callback') ||
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

export async function resolveAuthCallbackSession(debugRunId = 'unknown') {
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
  const autoSession = await waitForAutoDetectedSession()
  log('waitForAutoDetectedSession', {
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

  // Prefer token_hash when present: it does not depend on a PKCE code-verifier in this tab.
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
    log('exchangeCodeForSession start', { codePrefix: params.code.slice(0, 8) })
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
      } else if (isMissingPkceVerifierError(error) || isInvalidOrExpiredLinkError(error)) {
        throw new Error(
          '이메일 인증 링크를 처리하지 못했습니다. 회원가입을 시작한 같은 브라우저에서 인증 메일을 다시 요청한 뒤, 최신 메일의 링크를 클릭해주세요.',
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
    log('resolveAuthCallbackSession missing session')
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

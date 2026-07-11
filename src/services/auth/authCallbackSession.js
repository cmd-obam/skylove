import { supabase } from '@/lib/supabase'

const PROCESSED_CALLBACK_PREFIX = 'skylove_auth_callback_processed'

export function parseAuthCallbackParams(url = window.location.href) {
  const parsedUrl = new URL(url)
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''))

  return {
    code: parsedUrl.searchParams.get('code'),
    type: parsedUrl.searchParams.get('type') ?? hashParams.get('type'),
    tokenHash: parsedUrl.searchParams.get('token_hash') ?? hashParams.get('token_hash'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    error: parsedUrl.searchParams.get('error') ?? hashParams.get('error'),
    errorDescription:
      parsedUrl.searchParams.get('error_description') ?? hashParams.get('error_description'),
  }
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

function markCallbackProcessed(dedupeKey) {
  if (!dedupeKey) {
    return
  }

  try {
    sessionStorage.setItem(`${PROCESSED_CALLBACK_PREFIX}:${dedupeKey}`, String(Date.now()))
  } catch (error) {
    console.warn('[AuthCallback] processed key 저장 실패', error)
  }
}

function wasCallbackProcessed(dedupeKey) {
  if (!dedupeKey) {
    return false
  }

  try {
    return Boolean(sessionStorage.getItem(`${PROCESSED_CALLBACK_PREFIX}:${dedupeKey}`))
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

  if (pathname.endsWith('/auth/callback') || pathname.endsWith('/email-confirm')) {
    return null
  }

  try {
    return await resolveAuthCallbackSession()
  } catch (error) {
    console.warn('[AuthCallback] recoverSessionFromAuthUrl 실패', error)
    return null
  }
}

export async function resolveAuthCallbackSession() {
  const params = parseAuthCallbackParams()

  if (params.error) {
    throw new Error(params.errorDescription || '이메일 인증 처리에 실패했습니다.')
  }

  const dedupeKey = getCallbackDedupeKey(params)
  const autoSession = await waitForAutoDetectedSession()

  if (autoSession?.user?.email && isEmailConfirmed(autoSession.user)) {
    if (dedupeKey) {
      markCallbackProcessed(dedupeKey)
    }

    clearAuthParamsFromUrl()
    return autoSession
  }

  if (dedupeKey && wasCallbackProcessed(dedupeKey)) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.email) {
      clearAuthParamsFromUrl()
      return session
    }
  }

  let session = null

  if (params.accessToken && params.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })

    if (error) {
      throw error
    }

    session = data.session
  } else if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code)

    if (error) {
      const recovered = await waitForAutoDetectedSession(5)

      if (recovered?.user?.email) {
        session = recovered
      } else {
        throw error
      }
    } else {
      session = data.session
    }
  } else if (params.tokenHash) {
    session = await verifyOtpWithFallback(params.tokenHash, params.type)
  } else if (autoSession) {
    session = autoSession
  } else {
    const {
      data: { session: existingSession },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      throw error
    }

    session = existingSession
  }

  if (session && dedupeKey) {
    markCallbackProcessed(dedupeKey)
  }

  clearAuthParamsFromUrl()

  return session
}

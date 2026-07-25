const BROWSER_SESSION_COOKIE = 'skylove_browser_session'

function getCookieAttributes({ maxAge } = {}) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  const maxAgePart = typeof maxAge === 'number' ? `; Max-Age=${maxAge}` : ''
  return `path=/; SameSite=Lax${secure}${maxAgePart}`
}

/** 브라우저를 완전히 닫으면 사라지는 세션 쿠키. 탭 간에는 공유됩니다. */
export function hasBrowserSession() {
  if (typeof document === 'undefined') {
    return false
  }

  return document.cookie.split(';').some((part) => part.trim().startsWith(`${BROWSER_SESSION_COOKIE}=`))
}

export function markBrowserSession() {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${BROWSER_SESSION_COOKIE}=1; ${getCookieAttributes()}`
}

export function clearBrowserSession() {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${BROWSER_SESSION_COOKIE}=; ${getCookieAttributes({ maxAge: 0 })}`
}

function shouldClearPersistedAuthKey(key) {
  if (!key) {
    return false
  }

  const isSupabaseAuthToken = key.startsWith('sb-') && key.includes('auth-token')
  const isAppAuthFlag = key === 'skylove_auth' || key === 'skylove_profile'

  return isSupabaseAuthToken || isAppAuthFlag
}

/**
 * 브라우저를 다시 연 뒤(세션 쿠키 없음) 남아 있는 로그인 토큰만 제거합니다.
 * PKCE code-verifier 는 이메일 인증 링크용으로 유지합니다.
 */
export function clearPersistedAuthTokensForEndedBrowserSession() {
  if (typeof window === 'undefined' || hasBrowserSession()) {
    return
  }

  const storages = [window.localStorage, window.sessionStorage]

  storages.forEach((storage) => {
    try {
      const keysToRemove = []

      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)

        if (shouldClearPersistedAuthKey(key)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach((key) => {
        storage.removeItem(key)
      })
    } catch (error) {
      console.warn('[Auth] persisted auth token cleanup failed', error)
    }
  })
}

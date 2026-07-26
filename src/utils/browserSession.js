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

  if (key === 'skylove_auth' || key === 'skylove_profile') {
    return true
  }

  // Supabase 키:
  // - sb-<ref>-auth-token              → 세션(JWT). 브라우저 종료 후 제거 대상
  // - sb-<ref>-auth-token-code-verifier → PKCE verifier. 절대 제거하면 안 됨
  // includes('auth-token') 은 verifier 키까지 매칭하므로 endsWith 로만 판별합니다.
  if (key.includes('code-verifier')) {
    return false
  }

  return key.startsWith('sb-') && key.endsWith('-auth-token')
}

/**
 * 브라우저를 다시 연 뒤(세션 쿠키 없음) 남아 있는 로그인 토큰만 제거합니다.
 * PKCE code-verifier(`…-auth-token-code-verifier`)는 이메일/OAuth 콜백용으로 유지합니다.
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

const SAVED_LOGIN_ID_KEY = 'skylove_saved_login_id'

export function getSavedLoginId() {
  return localStorage.getItem(SAVED_LOGIN_ID_KEY) ?? ''
}

export function setSavedLoginId(loginId) {
  const trimmed = String(loginId ?? '').trim()

  if (trimmed) {
    localStorage.setItem(SAVED_LOGIN_ID_KEY, trimmed)
    return
  }

  localStorage.removeItem(SAVED_LOGIN_ID_KEY)
}

export function clearSavedLoginId() {
  localStorage.removeItem(SAVED_LOGIN_ID_KEY)
}

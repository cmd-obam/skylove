import { isAdminRole } from '@/services/auth/roles'
import { clearBrowserSession, markBrowserSession } from '@/utils/browserSession'

const AUTH_STORAGE_KEY = 'skylove_auth'
const PROFILE_STORAGE_KEY = 'skylove_profile'

function getBrowserLocalStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

export function isLoggedIn() {
  return getBrowserLocalStorage()?.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function getCurrentProfile() {
  const raw = getBrowserLocalStorage()?.getItem(PROFILE_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setAuthSession(profile) {
  const storage = getBrowserLocalStorage()

  if (!storage) {
    return
  }

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  markBrowserSession()
}

export function clearAuthSession() {
  const storage = getBrowserLocalStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_STORAGE_KEY)
  storage.removeItem(PROFILE_STORAGE_KEY)
  clearBrowserSession()

  // 이전 sessionStorage 기반 잔여 플래그 정리
  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    window.sessionStorage.removeItem(PROFILE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function isAdmin() {
  return isAdminRole(getCurrentProfile()?.role)
}

export function isMember() {
  const profile = getCurrentProfile()
  return profile?.role === 'member'
}

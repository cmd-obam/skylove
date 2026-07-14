import { isAdminRole } from '@/services/auth/roles'

const AUTH_STORAGE_KEY = 'skylove_auth'
const PROFILE_STORAGE_KEY = 'skylove_profile'

function getBrowserSessionStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.sessionStorage
}

export function isLoggedIn() {
  return getBrowserSessionStorage()?.getItem(AUTH_STORAGE_KEY) === 'true'
}

export function getCurrentProfile() {
  const raw = getBrowserSessionStorage()?.getItem(PROFILE_STORAGE_KEY)

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
  const storage = getBrowserSessionStorage()

  if (!storage) {
    return
  }

  storage.setItem(AUTH_STORAGE_KEY, 'true')
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function clearAuthSession() {
  const storage = getBrowserSessionStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_STORAGE_KEY)
  storage.removeItem(PROFILE_STORAGE_KEY)

  // 이전 localStorage 기반 잔여 플래그 정리
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
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
